const express = require('express');
const { getDb } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/admin/stats
 * Provides summary metrics for the Admin Dashboard.
 */
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const db = getDb();

    // 1. Ticket status metrics
    const [totalTicketsRow] = await db('tickets').count('* as count');
    const [openTicketsRow] = await db('tickets').where({ status: 'Open' }).count('* as count');
    const [inProgressRow] = await db('tickets').where({ status: 'In Progress' }).count('* as count');
    const [resolvedRow] = await db('tickets').whereIn('status', ['Resolved', 'Closed']).count('* as count');

    // Urgent tickets that are still unresolved
    const [criticalOpenRow] = await db('tickets')
      .where({ priority: 'Critical' })
      .whereNotIn('status', ['Resolved', 'Closed'])
      .count('* as count');

    const [highOpenRow] = await db('tickets')
      .where({ priority: 'High' })
      .whereNotIn('status', ['Resolved', 'Closed'])
      .count('* as count');

    const [unassignedRow] = await db('tickets')
      .whereNull('assigned_to')
      .whereNotIn('status', ['Resolved', 'Closed'])
      .count('* as count');

    // Breakdown aggregations
    const byCategory = await db('tickets')
      .select('category')
      .count('* as count')
      .groupBy('category')
      .orderBy('count', 'desc');

    const byStatus = await db('tickets')
      .select('status')
      .count('* as count')
      .groupBy('status');

    // 2. Authors and Books metrics
    const [totalAuthorsRow] = await db('authors').count('* as count');
    const [totalBooksRow] = await db('books').count('* as count');
    const [publishedBooksRow] = await db('books').where({ status: 'Published & Live' }).count('* as count');
    const [inProductionRow] = await db('books').where('status', 'like', 'In Production%').count('* as count');
    const [pendingRoyaltyRow] = await db('books').sum('royalty_pending as total');

    // 3. Five most recent tickets with author name
    const recentTickets = await db('tickets as t')
      .join('authors as a', 't.author_id', 'a.author_id')
      .select(
        't.ticket_id',
        't.subject',
        't.status',
        't.priority',
        't.category',
        't.created_at',
        'a.name as author_name'
      )
      .orderBy('t.created_at', 'desc')
      .limit(5);

    res.json({
      tickets: {
        total: totalTicketsRow.count,
        open: openTicketsRow.count,
        inProgress: inProgressRow.count,
        resolved: resolvedRow.count,
        criticalOpen: criticalOpenRow.count,
        highOpen: highOpenRow.count,
        unassigned: unassignedRow.count,
        byCategory,
        byStatus
      },
      authors: {
        total: totalAuthorsRow.count
      },
      books: {
        total: totalBooksRow.count,
        published: publishedBooksRow.count,
        inProduction: inProductionRow.count
      },
      royalties: {
        totalPending: pendingRoyaltyRow.total || 0
      },
      recent: recentTickets
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/authors
 * List all authors along with their total published book count and pending royalties.
 */
router.get('/authors', authenticate, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const authors = await db('authors as a')
      .leftJoin('books as b', 'a.author_id', 'b.author_id')
      .select('a.author_id', 'a.name', 'a.email', 'a.phone', 'a.city', 'a.joined_date')
      .count('b.id as book_count')
      .sum('b.total_copies_sold as total_copies_sold')
      .sum('b.royalty_pending as total_pending')
      .groupBy('a.author_id')
      .orderBy('a.joined_date', 'desc');

    res.json({ authors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/authors/:authorId
 * Fetch full profile of a single author, including all their books and tickets.
 */
router.get('/authors/:authorId', authenticate, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const author = await db('authors')
      .where({ author_id: req.params.authorId })
      .select('author_id', 'name', 'email', 'phone', 'city', 'joined_date')
      .first();

    if (!author) {
      return res.status(404).json({ error: 'Author not found.', code: 'NOT_FOUND' });
    }

    const books = await db('books')
      .where({ author_id: req.params.authorId })
      .orderBy('publication_date', 'desc');

    const tickets = await db('tickets')
      .where({ author_id: req.params.authorId })
      .select('ticket_id', 'subject', 'status', 'category', 'priority', 'created_at')
      .orderBy('created_at', 'desc');

    res.json({
      author,
      tickets,
      books: books.map(book => ({
        ...book,
        available_on: book.available_on ? JSON.parse(book.available_on) : []
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/admins
 * List all BookLeaf administrative staff members for ticket assignment.
 */
router.get('/admins', authenticate, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const admins = await db('admins').select('id', 'name', 'email', 'created_at');
    res.json({ admins });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
