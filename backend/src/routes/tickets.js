const express = require('express');
const { getDb } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const {
  classifyAndPrioritize,
  generateDraftResponse,
  CATEGORIES,
  PRIORITIES,
} = require('../services/aiService');

const router = express.Router();

/**
 * Generate a unique readable ticket ID like: TKT-LOQ8XYZ-A1B2
 */
function generateTicketId() {
  const timestampPart = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TKT-${timestampPart}-${randomPart}`;
}

/**
 * GET /api/tickets
 * - Authors only see their own tickets.
 * - Admins see all tickets, with search and filtering by status, category, and priority.
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const db = getDb();
    const isAdmin = req.user.role === 'admin';

    if (isAdmin) {
      const { status, category, priority, search } = req.query;

      let query = db('tickets as t')
        .join('authors as a', 't.author_id', 'a.author_id')
        .leftJoin('books as b', 't.book_id', 'b.book_id')
        .leftJoin('admins as adm', 't.assigned_to', 'adm.id')
        .select(
          't.*',
          'a.name as author_name',
          'a.email as author_email',
          'a.city as author_city',
          'b.title as book_title',
          'adm.name as assigned_to_name'
        );

      if (status) query = query.where('t.status', status);
      if (category) query = query.where('t.category', category);
      if (priority) query = query.where('t.priority', priority);

      if (search) {
        const searchPattern = `%${search}%`;
        query = query.where(function () {
          this.where('t.subject', 'like', searchPattern)
            .orWhere('a.name', 'like', searchPattern)
            .orWhere('t.ticket_id', 'like', searchPattern);
        });
      }

      // Order tickets so most critical & open issues appear first
      query = query.orderByRaw(`
        CASE t.priority
          WHEN 'Critical' THEN 1
          WHEN 'High'     THEN 2
          WHEN 'Medium'   THEN 3
          WHEN 'Low'      THEN 4
        END,
        CASE t.status
          WHEN 'Open'        THEN 1
          WHEN 'In Progress' THEN 2
          WHEN 'Resolved'    THEN 3
          WHEN 'Closed'      THEN 4
        END,
        t.created_at ASC
      `);

      const tickets = await query;
      return res.json({ tickets });
    }

    // For authors: return only their tickets
    const tickets = await db('tickets as t')
      .leftJoin('books as b', 't.book_id', 'b.book_id')
      .select('t.*', 'b.title as book_title')
      .where('t.author_id', req.user.authorId)
      .orderBy('t.created_at', 'desc');

    res.json({ tickets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/tickets
 * Allows authors to submit a new ticket. Runs AI classification in the background.
 */
router.post('/', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'author') {
      return res.status(403).json({ error: 'Only authors can submit tickets.', code: 'FORBIDDEN' });
    }

    const { book_id, subject, description, category } = req.body;

    if (!subject?.trim() || !description?.trim()) {
      return res.status(400).json({
        error: 'Subject and description are required.',
        code: 'VALIDATION_ERROR',
      });
    }

    const db = getDb();

    // Verify book belongs to the author if book_id is provided
    const isSpecificBook = book_id && book_id !== 'general';
    if (isSpecificBook) {
      const book = await db('books')
        .where({ book_id })
        .select('author_id')
        .first();

      if (!book || book.author_id !== req.user.authorId) {
        return res.status(403).json({ error: 'Invalid book selection.', code: 'FORBIDDEN' });
      }
    }

    // Prepare book context to help the AI classifier
    let bookContext = '';
    if (isSpecificBook) {
      const book = await db('books')
        .where({ book_id })
        .select('title', 'status')
        .first();
      if (book) {
        bookContext = `Book: "${book.title}", Status: ${book.status}`;
      }
    }

    // Run AI classification & priority scoring
    const aiResult = await classifyAndPrioritize(
      subject.trim(),
      description.trim(),
      bookContext
    );

    const ticketId = generateTicketId();
    const now = new Date().toISOString();

    await db('tickets').insert({
      ticket_id: ticketId,
      author_id: req.user.authorId,
      book_id: isSpecificBook ? book_id : null,
      subject: subject.trim(),
      description: description.trim(),
      status: 'Open',
      category: aiResult.category || category || 'General Inquiry',
      priority: aiResult.priority || 'Medium',
      ai_category: aiResult.category,
      ai_priority: aiResult.priority,
      ai_classification_reasoning: aiResult.categoryReasoning,
      ai_priority_reasoning: aiResult.priorityReasoning,
      created_at: now,
      updated_at: now,
    });

    const ticket = await db('tickets').where({ ticket_id: ticketId }).first();
    res.status(201).json({ ticket });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/tickets/:ticketId
 * Fetch ticket details and conversation thread.
 * Author can only see public messages; Admin can also see internal notes.
 */
router.get('/:ticketId', authenticate, async (req, res) => {
  try {
    const db = getDb();
    const ticket = await db('tickets as t')
      .join('authors as a', 't.author_id', 'a.author_id')
      .leftJoin('books as b', 't.book_id', 'b.book_id')
      .leftJoin('admins as adm', 't.assigned_to', 'adm.id')
      .select(
        't.*',
        'a.name as author_name',
        'a.email as author_email',
        'a.city as author_city',
        'b.title as book_title',
        'b.genre as book_genre',
        'adm.name as assigned_to_name'
      )
      .where('t.ticket_id', req.params.ticketId)
      .first();

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.', code: 'NOT_FOUND' });
    }

    // Ensure authors can only view their own ticket
    if (req.user.role === 'author' && ticket.author_id !== req.user.authorId) {
      return res.status(403).json({ error: 'Access denied.', code: 'FORBIDDEN' });
    }

    const isAdmin = req.user.role === 'admin';
    let messagesQuery = db('ticket_messages')
      .where({ ticket_id: req.params.ticketId })
      .orderBy('created_at', 'asc');

    // Hide internal staff notes from authors
    if (!isAdmin) {
      messagesQuery = messagesQuery.where({ is_internal: false });
    }

    const messages = await messagesQuery;
    res.json({ ticket, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/tickets/:ticketId
 * Allows admins to update status, category, priority, or assigned agent.
 */
router.patch('/:ticketId', authenticate, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const { ticketId } = req.params;
    const { status, category, priority, assigned_to } = req.body;

    const ticket = await db('tickets').where({ ticket_id: ticketId }).first();
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.', code: 'NOT_FOUND' });
    }

    const validStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value.', code: 'VALIDATION_ERROR' });
    }
    if (category && !CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category value.', code: 'VALIDATION_ERROR' });
    }
    if (priority && !PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority value.', code: 'VALIDATION_ERROR' });
    }

    const updates = { updated_at: new Date().toISOString() };
    if (status !== undefined) updates.status = status;
    if (category !== undefined) updates.category = category;
    if (priority !== undefined) updates.priority = priority;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to;

    await db('tickets').where({ ticket_id: ticketId }).update(updates);

    const updated = await db('tickets as t')
      .leftJoin('admins as adm', 't.assigned_to', 'adm.id')
      .select('t.*', 'adm.name as assigned_to_name')
      .where('t.ticket_id', ticketId)
      .first();

    res.json({ ticket: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/tickets/:ticketId/messages
 * Posts a reply to the ticket thread. Supports internal notes by admins.
 */
router.post('/:ticketId/messages', authenticate, async (req, res) => {
  try {
    const db = getDb();
    const { ticketId } = req.params;
    const { content, is_internal } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({
        error: 'Message content is required.',
        code: 'VALIDATION_ERROR',
      });
    }

    const ticket = await db('tickets').where({ ticket_id: ticketId }).first();
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.', code: 'NOT_FOUND' });
    }

    // Role check for authors
    if (req.user.role === 'author') {
      if (ticket.author_id !== req.user.authorId) {
        return res.status(403).json({ error: 'Access denied.', code: 'FORBIDDEN' });
      }
      if (ticket.status === 'Closed') {
        return res.status(400).json({
          error: 'Cannot add messages to a closed ticket.',
          code: 'TICKET_CLOSED',
        });
      }
    }

    // Only admins can make internal notes
    const isInternalNote = req.user.role === 'admin' && Boolean(is_internal);
    const now = new Date().toISOString();

    const [messageId] = await db('ticket_messages').insert({
      ticket_id: ticketId,
      sender_role: req.user.role,
      sender_id: req.user.id,
      sender_name: req.user.name,
      content: content.trim(),
      is_internal: isInternalNote ? 1 : 0,
      created_at: now,
    });

    // Automatically transition 'Open' tickets to 'In Progress' upon first public admin reply
    if (req.user.role === 'admin' && !isInternalNote && ticket.status === 'Open') {
      await db('tickets')
        .where({ ticket_id: ticketId })
        .update({ status: 'In Progress', updated_at: now });
    } else {
      await db('tickets')
        .where({ ticket_id: ticketId })
        .update({ updated_at: now });
    }

    const message = await db('ticket_messages').where({ id: messageId }).first();
    res.status(201).json({ message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/tickets/:ticketId/ai-draft
 * Admin-only: Uses OpenAI or the internal knowledge base to draft a reply.
 */
router.get('/:ticketId/ai-draft', authenticate, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const ticket = await db('tickets')
      .where({ ticket_id: req.params.ticketId })
      .first();

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.', code: 'NOT_FOUND' });
    }

    const author = await db('authors')
      .where({ author_id: ticket.author_id })
      .select('name', 'author_id', 'city', 'joined_date')
      .first();

    let bookData = null;
    if (ticket.book_id) {
      const book = await db('books').where({ book_id: ticket.book_id }).first();
      if (book) {
        bookData = {
          ...book,
          available_on: book.available_on ? JSON.parse(book.available_on) : [],
        };
      }
    }

    const result = await generateDraftResponse(ticket, author, bookData);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/tickets/:ticketId/stream
 * Server-Sent Events (SSE) connection for real-time chat updates without polling.
 */
router.get('/:ticketId/stream', authenticate, async (req, res) => {
  try {
    const db = getDb();
    const ticket = await db('tickets')
      .where({ ticket_id: req.params.ticketId })
      .select('author_id')
      .first();

    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    if (req.user.role === 'author' && ticket.author_id !== req.user.authorId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:5173');
    res.flushHeaders();

    const isAdmin = req.user.role === 'admin';
    let lastMessageId = parseInt(req.query.lastMessageId || '0', 10);
    let lastUpdatedTimestamp = '';

    const checkUpdates = async () => {
      try {
        let messagesQuery = db('ticket_messages')
          .where('ticket_id', req.params.ticketId)
          .where('id', '>', lastMessageId)
          .orderBy('created_at', 'asc');

        if (!isAdmin) {
          messagesQuery = messagesQuery.where({ is_internal: false });
        }

        const newMessages = await messagesQuery;
        if (newMessages.length > 0) {
          lastMessageId = newMessages[newMessages.length - 1].id;
          res.write(`event: messages\ndata: ${JSON.stringify({ messages: newMessages })}\n\n`);
        }

        const currentTicket = await db('tickets')
          .where({ ticket_id: req.params.ticketId })
          .select('status', 'category', 'priority', 'updated_at', 'assigned_to')
          .first();

        if (currentTicket && currentTicket.updated_at !== lastUpdatedTimestamp) {
          lastUpdatedTimestamp = currentTicket.updated_at;
          res.write(`event: ticketUpdate\ndata: ${JSON.stringify({ ticket: currentTicket })}\n\n`);
        }

        res.write(': ping\n\n');
      } catch (err) {
        // Stream connection closed
      }
    };

    await checkUpdates();
    const intervalId = setInterval(checkUpdates, 3000);
    req.on('close', () => clearInterval(intervalId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
