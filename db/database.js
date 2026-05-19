const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db;

function getDb() {
  if (db) return db;

  const dbPath = path.join(app.getPath('userData'), 'ledger.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id          TEXT PRIMARY KEY,
      date        TEXT NOT NULL,
      merchant    TEXT NOT NULL,
      amount      REAL NOT NULL,
      category    TEXT NOT NULL DEFAULT 'uncategorized',
      account     TEXT NOT NULL,
      bank        TEXT NOT NULL,
      note        TEXT NOT NULL DEFAULT '',
      pending     INTEGER NOT NULL DEFAULT 0,
      recurring   INTEGER NOT NULL DEFAULT 0,
      imported_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date     ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
    CREATE INDEX IF NOT EXISTS idx_transactions_account  ON transactions(account);

    CREATE TABLE IF NOT EXISTS budgets (
      category_id TEXT PRIMARY KEY,
      monthly     REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS category_rules (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern     TEXT NOT NULL,
      category    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      color      TEXT NOT NULL DEFAULT 'stone',
      icon       TEXT NOT NULL DEFAULT 'question',
      is_default INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 999
    );
  `);

  require('./categories').seed();

  return db;
}

module.exports = { getDb };
