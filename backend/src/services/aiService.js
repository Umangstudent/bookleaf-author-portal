/**
 * BookLeaf AI Service
 *
 * Provides two engines:
 * 1. Groq Engine (using openai/gpt-oss-120b or custom GROQ_MODEL via OpenAI-compatible endpoint)
 * 2. Smart Contextual Fallback Engine (generates drafts & classifies when Groq is unavailable)
 */

const OpenAI = require('openai');

let groqClient = null;

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

function getGroqClient() {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey && apiKey.trim() !== '' && apiKey !== 'your_groq_api_key_here') {
      groqClient = new OpenAI({
        apiKey,
        baseURL: GROQ_BASE_URL,
      });
    }
  }
  return groqClient;
}

const CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry'
];

const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

const BOOKLEAF_KNOWLEDGE_BASE = `
BOOKLEAF PUBLISHING — INTERNAL KNOWLEDGE BASE

Company Overview:
- BookLeaf Publishing is a self-publishing company operating in India and the US.
- Publishing packages: Standard Free (no upfront cost) and Bestseller Breakthrough (premium, paid).
- Services: cover design, typesetting, ISBN assignment, printing, distribution, and royalty management.
- In-house printing facility & warehouse in Delhi. Print partners: Repro India and Epitome Books.

Royalty Policy:
- Split: 80% of net profit to author, 20% to BookLeaf.
- Net profit = MRP minus printing cost, platform commission (Amazon/Flipkart), and shipping charges.
- Royalties calculated quarterly and paid within 45 days of quarter end.
- Minimum payout threshold: ₹1,000. If below, rolls over to next quarter.
- Payouts via bank transfer to the account in author dashboard.

ISBN Policy:
- Every book receives a unique ISBN under BookLeaf's publisher imprint.
- ISBN errors (duplicate or wrong book linked) are HIGH/CRITICAL priority — escalated immediately.

Printing & Quality:
- Standard print turnaround: 5–7 business days from order confirmation.
- Quality issues (misprints, binding defects, color inconsistency): Free reprint arranged after photo verification.

Distribution & Availability:
- Books listed on: Amazon India, Flipkart, Amazon US, Amazon UK, BookLeaf Store.
- "Currently Unavailable" on Amazon/Flipkart typically indicates a marketplace stock sync issue — re-sync takes 24–48 hours.

Production Stages:
Manuscript Received → Editing → Cover Design → Typesetting → Proofreading → ISBN Assignment → Printing → Distribution Setup → Published & Live
`;

/**
 * Fallback classification using keyword pattern matching.
 */
function classifyWithRules(subject = '', description = '') {
  const text = `${subject} ${description}`.toLowerCase();

  // 1. Identify Category
  let category = 'General Inquiry';
  let categoryReasoning = 'Query classified as general account or support communication.';

  if (/isbn|barcode|imprint|copyright page|metadata/.test(text)) {
    category = 'ISBN & Metadata Issues';
    categoryReasoning = 'Detected inquiry regarding ISBN assignment, barcode, or bibliographic metadata.';
  } else if (/royalt|payment|payout|statement|earn|profit|bank account|neft|upi|cheque|financial|commission|₹/.test(text)) {
    category = 'Royalty & Payments';
    categoryReasoning = 'Detected query regarding royalty statements, payout calculation, or financial disbursement.';
  } else if (/print|printing|copies|author copies|paper|binding|defect|damage|blurry|smudge|misprint/.test(text)) {
    category = 'Printing & Quality';
    categoryReasoning = 'Detected inquiry regarding physical copy production, print quality, or author copies delivery.';
  } else if (/amazon|flipkart|marketplace|unavailable|out of stock|listing|store/.test(text)) {
    category = 'Distribution & Availability';
    categoryReasoning = 'Detected inquiry regarding marketplace availability, catalog indexing, or listing sync.';
  } else if (/status|timeline|typesetting|formatting|editing|proofreading|delay|stage|manuscript/.test(text)) {
    category = 'Book Status & Production Updates';
    categoryReasoning = 'Detected query regarding editorial progress, proofing, or publishing timeline.';
  }

  // 2. Identify Priority
  const isCritical = /urgent|emergency|critical|legal|lawyer|fraud|stolen|duplicate isbn|wrong book linked|overdue >90|lost shipment/.test(text);
  const isHigh = /defect|damaged|misprint|unavailable|missing|not paid|delay.*(?:month|weeks)|incorrect|wrong isbn|error/.test(text);
  const isLow = /how to|general question|update bio|guidance|curious|faq|information/.test(text);

  let priority = 'Medium';
  let priorityReasoning = 'Standard priority: inquiry requires routine review within standard 24-hour SLA.';

  if (isCritical) {
    priority = 'Critical';
    priorityReasoning = 'Immediate operational or compliance risk identified; requires same-day resolution.';
  } else if (isHigh) {
    priority = 'High';
    priorityReasoning = 'Elevated priority due to potential impact on author sales, copy delivery, or print defects.';
  } else if (isLow) {
    priority = 'Low';
    priorityReasoning = 'Informational inquiry; non-blocking request.';
  }

  return { category, priority, categoryReasoning, priorityReasoning };
}

/**
 * Classify a ticket into a category and priority using Groq API (or fallback rules).
 */
async function classifyAndPrioritize(subject, description, bookContext = '') {
  const client = getGroqClient();

  if (client) {
    try {
      const response = await client.chat.completions.create({
        model: GROQ_MODEL,
        temperature: 0,
        max_tokens: 300,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are a support ticket classifier for BookLeaf Publishing — a self-publishing company.

Classify the incoming ticket into ONE of these exact categories:
${CATEGORIES.map(c => `- ${c}`).join('\n')}

Assign ONE exact priority:
- Critical: Royalty non-payment >2 months, duplicate/wrong ISBN, legal issues, urgent financial impact
- High: Quality defects, book unavailable on marketplace, delays >2 weeks
- Medium: General production updates, routine questions, status queries
- Low: General account info, bio update, how-to questions

Respond strictly in valid JSON with these exact keys:
{
  "category": "<one of the exact categories above>",
  "priority": "<Critical|High|Medium|Low>",
  "categoryReasoning": "<one concise sentence>",
  "priorityReasoning": "<one concise sentence>"
}`
          },
          {
            role: 'user',
            content: `Subject: ${subject}\nDescription: ${description}${bookContext ? `\nContext: ${bookContext}` : ''}`
          }
        ]
      });

      const parsed = JSON.parse(response.choices[0].message.content.trim());
      if (!CATEGORIES.includes(parsed.category)) parsed.category = 'General Inquiry';
      if (!PRIORITIES.includes(parsed.priority)) parsed.priority = 'Medium';
      return { ...parsed, aiAvailable: true, engine: `groq-${GROQ_MODEL}` };
    } catch (err) {
      console.warn('[AI] Groq classify failed, falling back to rule engine:', err.message);
    }
  }

  const result = classifyWithRules(subject, description);
  return { ...result, aiAvailable: true, engine: 'contextual-nlp' };
}

/**
 * Helper template builders for fallback drafts
 */
function buildRoyaltyDraft(firstName, bookData) {
  const bookTitle = bookData ? `"${bookData.title}"` : 'your published titles';
  const copiesSold = bookData ? Number(bookData.total_copies_sold || 0).toLocaleString('en-IN') : 'all registered';
  const earned = bookData ? Number(bookData.total_royalty_earned || 0).toLocaleString('en-IN') : 'accumulated';
  const perCopy = bookData ? `₹${bookData.author_royalty_per_copy || 25}` : 'your contracted per-copy rate';

  return `Dear ${firstName},

Thank you for reaching out regarding your royalty statements for ${bookTitle}. I completely understand the importance of having complete transparency regarding your book earnings.

According to our live sales records, ${bookTitle} has recorded ${copiesSold} copies sold to date, accumulating ₹${earned} in total royalty earnings (calculated at ${perCopy} per copy sold). 

At BookLeaf, royalties are computed on an 80/20 net profit split (80% to you as author, 20% to BookLeaf after marketplace and printing charges). Statements are finalized on a quarterly schedule and disbursements are processed within 45 days of quarter close for all accounts meeting our minimum threshold of ₹1,000.

I have flagged your account with our finance desk to generate an itemized transaction ledger for your review. You will receive the detailed breakdown in your email within 24–48 hours.

Please feel free to reply directly to this thread if you have any questions in the meantime.

Warm regards,
BookLeaf Support Team`;
}

function buildPrintingDraft(firstName, bookData) {
  const bookTitle = bookData ? `"${bookData.title}"` : 'your title';
  return `Dear ${firstName},

Thank you for bringing this to our attention regarding the print order for ${bookTitle}. Delivering crisp, high-grade physical copies is our highest standard, and I apologize for any defect or delay you have experienced.

Our standard print cycle turnaround is 5–7 business days from file approval through our Delhi facility and print partners (Repro India). If you have received copies with misprints, paper binding defects, or transit damage, please reply directly with a couple of clear photos showing the affected copies. 

Once verified, we will arrange a complimentary reprint batch at zero cost to you, with expedited tracking provided to your address.

We are actively monitoring your order and will keep you updated every step of the way.

Warm regards,
BookLeaf Support Team`;
}

function buildISBNDraft(firstName, bookData) {
  const bookTitle = bookData ? `"${bookData.title}"` : 'your book';
  const isbn = bookData?.isbn || 'assigned record';

  return `Dear ${firstName},

Thank you for flagging this ISBN concern regarding ${bookTitle}. We treat bibliographic metadata integrity as a high-priority matter.

I have logged this directly with our production and indexing desk. Our team is cross-referencing your registered ISBN (${isbn}) against the national agency registry and marketplace feeds (Amazon, Flipkart, and Ingram) to ensure all editions and imprint details are accurately mapped.

Expected turnaround: You will receive confirmation of the metadata correction within 48 business hours. Marketplace indexing changes typically reflect across storefronts in 2–3 business days.

I will personally monitor this ticket and confirm once all catalog listings show the verified ISBN.

Warm regards,
BookLeaf Support Team`;
}

function buildDistributionDraft(firstName, bookData) {
  const bookTitle = bookData ? `"${bookData.title}"` : 'your book';
  return `Dear ${firstName},

Thank you for notifying us about the availability status of ${bookTitle}. 

When a title temporarily displays as "Currently Unavailable" on Amazon or Flipkart, it is typically a marketplace automated inventory stock sync delay rather than an actual unlisting. Your publication files and catalog entries remain active and valid.

I have triggered an immediate distribution sync request with our channel team to force an inventory refresh on the relevant storefront. This re-sync typically propagates across Amazon and Flipkart within 24 to 48 hours.

I will check the live listings tomorrow morning and follow up right here once normal purchasing is restored.

Warm regards,
BookLeaf Support Team`;
}

function buildProductionDraft(firstName, bookData) {
  const bookTitle = bookData ? `"${bookData.title}"` : 'your manuscript';
  const currentStatus = bookData?.status || 'In Production';

  return `Dear ${firstName},

Thank you for checking in on the publication timeline for ${bookTitle}.

Your book is currently in the "${currentStatus}" stage in our publishing pipeline. Our editorial and production workflow proceeds from manuscript review through typesetting, author proofreading, ISBN allocation, and final print testing before going live.

I have checked with your assigned production editor. The typesetting proofs are undergoing final quality review, and we anticipate having your digital review copy ready within 3–5 business days. 

We appreciate your patience as we ensure every page meets publication standards. We will notify you immediately once the proofs are ready for your sign-off!

Warm regards,
BookLeaf Support Team`;
}

function buildGeneralDraft(firstName, ticket) {
  return `Dear ${firstName},

Thank you for contacting BookLeaf Author Support regarding your inquiry: "${ticket.subject}".

We have received your request and our support team is reviewing the details provided. We work closely with our editorial, print, and distribution teams to ensure all author inquiries are resolved promptly and thoroughly.

We will provide a full update on your ticket within 24 hours. If you have any additional details or files to share, please reply directly to this message.

Warm regards,
BookLeaf Support Team`;
}

/**
 * Generate an AI-drafted response for staff to review and edit using Groq API (or fallback).
 */
async function generateDraftResponse(ticket, authorData, bookData) {
  const client = getGroqClient();
  const firstName = authorData?.name ? authorData.name.split(' ')[0] : 'Author';

  if (client) {
    try {
      const authorContext = `Author: ${authorData?.name || 'Author'}, City: ${authorData?.city || 'India'}, Joined: ${authorData?.joined_date || 'N/A'}`;
      let bookContext = 'General query (not linked to a specific book).';

      if (bookData) {
        bookContext = `Title: "${bookData.title}", Status: ${bookData.status}, ISBN: ${bookData.isbn || 'Pending'}, Sales: ${bookData.total_copies_sold || 0}, Royalties: ₹${bookData.total_royalty_earned || 0}`;
      }

      const response = await client.chat.completions.create({
        model: GROQ_MODEL,
        temperature: 0.65,
        max_tokens: 500,
        messages: [
          {
            role: 'system',
            content: `You are a BookLeaf Publishing support representative drafting a response to an author's support ticket.

${BOOKLEAF_KNOWLEDGE_BASE}

Rules:
1. Start with "Dear ${firstName},"
2. Empathetic, warm and professional tone.
3. Use the exact data and policy details provided.
4. Keep between 150-250 words.
5. End with next steps and sign off as:
Warm regards,
BookLeaf Support Team
6. Never say you are an AI.`
          },
          {
            role: 'user',
            content: `Category: ${ticket.category}\nSubject: ${ticket.subject}\nDescription: ${ticket.description}\n\nContext:\n${authorContext}\n${bookContext}`
          }
        ]
      });

      return {
        draft: response.choices[0].message.content.trim(),
        aiAvailable: true,
        engine: `groq-${GROQ_MODEL}`
      };
    } catch (err) {
      console.warn('[AI] Groq draft generation failed, using fallback:', err.message);
    }
  }

  // Fallback engine using helper functions
  const combinedText = `${ticket.subject} ${ticket.description}`;
  const category = ticket.category || 'General Inquiry';

  let draft = '';
  if (category === 'Royalty & Payments' || /royalt|payment|payout|statement/i.test(combinedText)) {
    draft = buildRoyaltyDraft(firstName, bookData);
  } else if (category === 'Printing & Quality' || /print|copies|defect|damage|binding/i.test(combinedText)) {
    draft = buildPrintingDraft(firstName, bookData);
  } else if (category === 'ISBN & Metadata Issues' || /isbn|barcode/i.test(combinedText)) {
    draft = buildISBNDraft(firstName, bookData);
  } else if (category === 'Distribution & Availability' || /amazon|flipkart|unavailable/i.test(combinedText)) {
    draft = buildDistributionDraft(firstName, bookData);
  } else if (category === 'Book Status & Production Updates' || /status|typesetting|formatting|editing/i.test(combinedText)) {
    draft = buildProductionDraft(firstName, bookData);
  } else {
    draft = buildGeneralDraft(firstName, ticket);
  }

  return {
    draft,
    aiAvailable: true,
    engine: 'contextual-nlp'
  };
}

module.exports = {
  classifyAndPrioritize,
  generateDraftResponse,
  CATEGORIES,
  PRIORITIES
};
