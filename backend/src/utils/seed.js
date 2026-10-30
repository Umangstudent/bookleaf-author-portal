const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const bcrypt = require('bcryptjs');
const fs = require('fs');
const { getDb, initializeDatabase } = require('../config/database');

// Try multiple locations for the data file
const DATA_PATHS = [
  path.join(__dirname, '../../data/bookleaf_sample_data.json'),
  path.join(__dirname, '../../../bookleaf_sample_data.json'),
  path.join(__dirname, '../../../../bookleaf_sample_data.json'),
  'C:/Users/umang/Downloads/bookleaf_sample_data.json'
];

async function seed() {
  console.log('🌱 Starting database seed...\n');
  await initializeDatabase();
  const db = getDb();

  // Clear existing data in dependency order
  await db('ticket_messages').del();
  await db('tickets').del();
  await db('books').del();
  await db('authors').del();
  await db('admins').del();
  console.log('🗑️  Cleared existing data');

  // Seed admins
  const adminPassword = bcrypt.hashSync('admin123', 10);
  await db('admins').insert([
    { name: 'BookLeaf Admin', email: 'admin@bookleaf.com', password_hash: adminPassword },
    { name: 'Support Team',   email: 'support@bookleaf.com', password_hash: adminPassword }
  ]);
  console.log('✅ Seeded 2 admin accounts');

  // Find data file
  let DATA_PATH = DATA_PATHS.find(p => fs.existsSync(p));
  if (!DATA_PATH) {
    console.error('❌ bookleaf_sample_data.json not found. Tried:');
    DATA_PATHS.forEach(p => console.error('   -', p));
    process.exit(1);
  }
  console.log(`📂 Loading data from: ${DATA_PATH}`);

  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  const defaultPassword = bcrypt.hashSync('password123', 10);
  let totalBooks = 0;

  for (const author of data.authors) {
    await db('authors').insert({
      author_id: author.author_id, name: author.name, email: author.email,
      password_hash: defaultPassword, phone: author.phone, city: author.city,
      joined_date: author.joined_date
    });
    for (const book of author.books) {
      await db('books').insert({
        book_id: book.book_id, author_id: author.author_id, title: book.title,
        isbn: book.isbn, genre: book.genre, publication_date: book.publication_date,
        status: book.status, mrp: book.mrp, author_royalty_per_copy: book.author_royalty_per_copy,
        total_copies_sold: book.total_copies_sold, total_royalty_earned: book.total_royalty_earned,
        royalty_paid: book.royalty_paid, royalty_pending: book.royalty_pending,
        last_royalty_payout_date: book.last_royalty_payout_date, print_partner: book.print_partner,
        available_on: JSON.stringify(book.available_on || [])
      });
      totalBooks++;
    }
  }
  console.log(`✅ Seeded ${data.authors.length} authors and ${totalBooks} books`);

  // Sample tickets
  const tickets = [
    {
      ticket_id: 'TKT-001-DEMO', author_id: 'AUTH001', book_id: 'BK001',
      subject: 'Royalty payment not received for Q3',
      description: 'Hi, I published my book "Mumbai Monsoons" in early 2023. According to my dashboard I have ₹12,750 in pending royalties from Q3. The quarter ended in September but I still have not received any payment. My bank details are correctly linked. Could you please check what is happening?',
      status: 'Open', category: 'Royalty & Payments', priority: 'High',
      ai_classification_reasoning: 'Author reporting overdue quarterly royalty payment with specific amount.', ai_priority_reasoning: 'Payment overdue for a full quarter warrants High priority.',
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(), updated_at: new Date(Date.now() - 3 * 86400000).toISOString()
    },
    {
      ticket_id: 'TKT-002-DEMO', author_id: 'AUTH002', book_id: 'BK003',
      subject: 'Book showing wrong ISBN on Amazon India',
      description: 'I noticed my book "Chai & Philosophy" is showing a completely different ISBN on Amazon India vs the physical copy. The ISBN on my book is 978-93-5XXXX-03-5 but Amazon shows something different. This needs to be fixed immediately.',
      status: 'In Progress', category: 'ISBN & Metadata Issues', priority: 'Critical',
      ai_classification_reasoning: 'ISBN mismatch between physical copy and online platform is a data integrity issue.', ai_priority_reasoning: 'ISBN discrepancy has direct commercial and legal implications.',
      created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      ticket_id: 'TKT-003-DEMO', author_id: 'AUTH007', book_id: 'BK011',
      subject: 'Can you explain the royalty calculation for my book?',
      description: 'I sold 1567 copies of "The Algorithm of Love" (MRP ₹299) and earned ₹39,175. I want to understand what deductions were made — platform commission, printing cost, etc. Can you share a detailed breakdown?',
      status: 'Open', category: 'Royalty & Payments', priority: 'Medium',
      ai_classification_reasoning: 'Author requesting detailed royalty breakdown — informational query.', ai_priority_reasoning: 'Informational request, no payment issue detected.',
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(), updated_at: new Date(Date.now() - 5 * 86400000).toISOString()
    },
    {
      ticket_id: 'TKT-004-DEMO', author_id: 'AUTH005', book_id: 'BK009',
      subject: '"Letters from Lakshadweep" showing unavailable on Amazon US',
      description: 'My book has been showing "Currently Unavailable" on Amazon US for a week. It is live on Amazon India and BookLeaf store. Please fix this — I might be losing international sales.',
      status: 'Resolved', category: 'Distribution & Availability', priority: 'High',
      ai_classification_reasoning: 'Book unavailable on a specific marketplace indicates distribution issue.', ai_priority_reasoning: 'Active sales platform unavailability warrants High priority.',
      created_at: new Date(Date.now() - 7 * 86400000).toISOString(), updated_at: new Date(Date.now() - 6 * 86400000).toISOString()
    },
    {
      ticket_id: 'TKT-005-DEMO', author_id: 'AUTH009', book_id: 'BK015',
      subject: 'Book stuck in typesetting for 3 weeks — any update?',
      description: 'My book "Raising Roots" has been in the typesetting stage for almost 3 weeks. I submitted all files on time. Is there a delay? What is the expected timeline?',
      status: 'Open', category: 'Book Status & Production Updates', priority: 'Medium',
      ai_classification_reasoning: 'Author enquiring about production timeline for book in typesetting.', ai_priority_reasoning: '3-week delay in typesetting is notable but not yet critical.',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(), updated_at: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    {
      ticket_id: 'TKT-006-DEMO', author_id: 'AUTH003', book_id: null,
      subject: 'How do I update my bank account for royalty payments?',
      description: 'I recently changed my bank account and need to update the details in my BookLeaf dashboard. Can you guide me? Will this affect any pending payments?',
      status: 'Resolved', category: 'General Inquiry', priority: 'Low',
      ai_classification_reasoning: 'General account management inquiry about payment details.', ai_priority_reasoning: 'Account info update request is low urgency.',
      created_at: new Date(Date.now() - 10 * 86400000).toISOString(), updated_at: new Date(Date.now() - 9 * 86400000).toISOString()
    }
  ];

  for (const t of tickets) {
    await db('tickets').insert(t);
  }

  // Messages
  const msgs = [
    {
      ticket_id: 'TKT-002-DEMO', sender_role: 'admin', sender_id: 1, sender_name: 'BookLeaf Admin',
      content: `Dear Rohit,\n\nThank you for flagging this — an ISBN mismatch between the physical copy and Amazon is a serious issue and we're treating it as high priority.\n\nI've escalated this immediately to our production team. They will investigate the discrepancy between the registered ISBN (978-93-5XXXX-03-5) and what Amazon is currently displaying.\n\nExpected timeline: Our team will investigate and update you within 48 hours. If a correction is needed on the Amazon listing, that typically takes an additional 2–3 business days to reflect.\n\nI'll personally follow up once we have a resolution.\n\nWarm regards,\nBookLeaf Support Team`,
      is_internal: false, created_at: new Date(Date.now() - 20 * 3600000).toISOString()
    },
    {
      ticket_id: 'TKT-002-DEMO', sender_role: 'admin', sender_id: 1, sender_name: 'BookLeaf Admin',
      content: 'INTERNAL: Confirmed with production team — ISBN was accidentally swapped with BK004 during a batch metadata update last week. Fix is being processed. ETA 24hrs. Will close ticket once confirmed on Amazon.',
      is_internal: true, created_at: new Date(Date.now() - 18 * 3600000).toISOString()
    },
    {
      ticket_id: 'TKT-004-DEMO', sender_role: 'admin', sender_id: 2, sender_name: 'Support Team',
      content: `Dear Meera,\n\nThank you for reaching out. The "Currently Unavailable" status on Amazon US is a stock sync issue on their end — your book data is fully intact on our side.\n\nI've triggered a re-sync with our distribution team right now. Your book should be showing as available on Amazon US within 24–48 hours.\n\nI'll confirm once it's live again. Sorry for the inconvenience!\n\nBest,\nBookLeaf Support Team`,
      is_internal: false, created_at: new Date(Date.now() - 6 * 86400000).toISOString()
    },
    {
      ticket_id: 'TKT-006-DEMO', sender_role: 'admin', sender_id: 2, sender_name: 'Support Team',
      content: `Dear Ananya,\n\nTo update your bank account details, log into your BookLeaf author dashboard → Account Settings → Payment Details. You can update your information directly there.\n\nImportant: Payments already scheduled in the current cycle will go to your old account. Future payments will use the new details. So please update as soon as possible if a payout is due soon.\n\nLet us know if you face any difficulty!\n\nWarm regards,\nBookLeaf Support Team`,
      is_internal: false, created_at: new Date(Date.now() - 9 * 86400000).toISOString()
    }
  ];

  for (const m of msgs) {
    await db('ticket_messages').insert(m);
  }
  console.log(`✅ Seeded ${tickets.length} sample tickets with messages`);

  console.log('\n🎉 Database seeding complete!\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  TEST CREDENTIALS');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Admin:  admin@bookleaf.com      / admin123');
  console.log('          support@bookleaf.com    / admin123');
  console.log('\n  Authors (all use password: password123):');
  data.authors.forEach(a => console.log(`    ${a.email.padEnd(38)} / password123`));
  console.log('═══════════════════════════════════════════════════════\n');

  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
