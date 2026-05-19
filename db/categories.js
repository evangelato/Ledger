const { getDb } = require('./database');

const DEFAULTS = [
  { id: 'groceries',     name: 'Groceries',     color: 'sage',     icon: 'basket' },
  { id: 'dining',        name: 'Dining',         color: 'peach',    icon: 'fork' },
  { id: 'transport',     name: 'Transport',      color: 'sky',      icon: 'car' },
  { id: 'housing',       name: 'Housing',        color: 'lavender', icon: 'home' },
  { id: 'utilities',     name: 'Utilities',      color: 'butter',   icon: 'bolt' },
  { id: 'subscriptions', name: 'Subscriptions',  color: 'rose',     icon: 'repeat' },
  { id: 'shopping',      name: 'Shopping',       color: 'mint',     icon: 'bag' },
  { id: 'health',        name: 'Health',         color: 'coral',    icon: 'heart' },
  { id: 'entertainment', name: 'Entertainment',  color: 'violet',   icon: 'play' },
  { id: 'travel',        name: 'Travel',         color: 'ocean',    icon: 'plane' },
  { id: 'income',        name: 'Income',         color: 'moss',     icon: 'arrowDown' },
  { id: 'transfers',     name: 'Transfers',      color: 'stone',    icon: 'swap' },
  { id: 'miscellaneous', name: 'Miscellaneous',  color: 'stone',    icon: 'question' },
];

const COLORS = ['sage', 'peach', 'sky', 'lavender', 'butter', 'rose', 'mint', 'coral', 'violet', 'ocean', 'moss', 'stone'];

function seed() {
  const stmt = getDb().prepare(
    `INSERT OR IGNORE INTO categories (id, name, color, icon, is_default, sort_order)
     VALUES (@id, @name, @color, @icon, 1, @sort_order)`
  );
  const insertAll = getDb().transaction(() => {
    DEFAULTS.forEach((c, i) => stmt.run({ ...c, sort_order: i }));
  });
  insertAll();
}

function getAll() {
  return getDb().prepare(
    `SELECT * FROM categories ORDER BY is_default DESC, sort_order ASC, name ASC`
  ).all();
}

function create(name) {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const color = COLORS[getAll().length % COLORS.length];
  getDb().prepare(
    `INSERT OR IGNORE INTO categories (id, name, color, icon, is_default, sort_order)
     VALUES (?, ?, ?, 'question', 0, 999)`
  ).run(id, name, color);
  return getDb().prepare(`SELECT * FROM categories WHERE id = ?`).get(id);
}

function remove(id) {
  const db = getDb();
  // Reassign transactions using this category to miscellaneous
  db.prepare(`UPDATE transactions SET category = 'miscellaneous' WHERE category = ?`).run(id);
  db.prepare(`DELETE FROM categories WHERE id = ? AND is_default = 0`).run(id);
}

module.exports = { seed, getAll, create, remove };
