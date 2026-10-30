const knex = require('knex');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/bookleaf.db');

let db;

/**
 * Get singleton knex instance
 */
function getDb() {
  if (!db) {
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    db = knex({
      client: 'sqlite3',
      connection: { filename: DB_PATH },
      useNullAsDefault: true,
      pool: { min: 1, max: 1 }  // SQLite: single connection
    });
  }
  return db;
}

/**
 * Create all tables if they don't exist
 */
async function initializeDatabase() {
  const db = getDb();

  await db.schema.hasTable('admins').then(async exists => {
    if (!exists) {
      await db.schema.createTable('admins', t => {
        t.increments('id').primary();
        t.string('name').notNullable();
        t.string('email').unique().notNullable();
        t.string('password_hash').notNullable();
        t.datetime('created_at').defaultTo(db.fn.now());
      });
    }
  });

  await db.schema.hasTable('authors').then(async exists => {
    if (!exists) {
      await db.schema.createTable('authors', t => {
        t.increments('id').primary();
        t.string('author_id').unique().notNullable();
        t.string('name').notNullable();
        t.string('email').unique().notNullable();
        t.string('password_hash').notNullable();
        t.string('phone');
        t.string('city');
        t.string('joined_date');
        t.datetime('created_at').defaultTo(db.fn.now());
      });
    }
  });

  await db.schema.hasTable('books').then(async exists => {
    if (!exists) {
      await db.schema.createTable('books', t => {
        t.increments('id').primary();
        t.string('book_id').unique().notNullable();
        t.string('author_id').notNullable().references('author_id').inTable('authors');
        t.string('title').notNullable();
        t.string('isbn');
        t.string('genre');
        t.string('publication_date');
        t.string('status');
        t.float('mrp');
        t.float('author_royalty_per_copy');
        t.integer('total_copies_sold').defaultTo(0);
        t.float('total_royalty_earned').defaultTo(0);
        t.float('royalty_paid').defaultTo(0);
        t.float('royalty_pending').defaultTo(0);
        t.string('last_royalty_payout_date');
        t.string('print_partner');
        t.text('available_on');  // JSON string
      });
    }
  });

  await db.schema.hasTable('tickets').then(async exists => {
    if (!exists) {
      await db.schema.createTable('tickets', t => {
        t.increments('id').primary();
        t.string('ticket_id').unique().notNullable();
        t.string('author_id').notNullable().references('author_id').inTable('authors');
        t.string('book_id');
        t.string('subject').notNullable();
        t.text('description').notNullable();
        t.string('status').defaultTo('Open');
        t.string('category').defaultTo('General Inquiry');
        t.string('priority').defaultTo('Medium');
        t.integer('assigned_to');
        t.text('ai_category');
        t.text('ai_priority');
        t.text('ai_classification_reasoning');
        t.text('ai_priority_reasoning');
        t.datetime('created_at').defaultTo(db.fn.now());
        t.datetime('updated_at').defaultTo(db.fn.now());
      });
    }
  });

  await db.schema.hasTable('ticket_messages').then(async exists => {
    if (!exists) {
      await db.schema.createTable('ticket_messages', t => {
        t.increments('id').primary();
        t.string('ticket_id').notNullable().references('ticket_id').inTable('tickets');
        t.string('sender_role').notNullable();   // 'author' or 'admin'
        t.integer('sender_id').notNullable();
        t.string('sender_name').notNullable();
        t.text('content').notNullable();
        t.boolean('is_internal').defaultTo(false);
        t.boolean('ai_generated').defaultTo(false);
        t.datetime('created_at').defaultTo(db.fn.now());
      });
    }
  });

  console.log('✅ Database initialized');
  return db;
}

module.exports = { getDb, initializeDatabase };
