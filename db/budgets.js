const { getDb } = require('./database');

const DEFAULTS = [
  { category_id: 'groceries',     monthly: 650 },
  { category_id: 'dining',        monthly: 400 },
  { category_id: 'transport',     monthly: 180 },
  { category_id: 'shopping',      monthly: 250 },
  { category_id: 'subscriptions', monthly: 90  },
  { category_id: 'entertainment', monthly: 120 },
];

function getAll() {
  const rows = getDb().prepare(`SELECT * FROM budgets`).all();
  if (rows.length === 0) {
    seedDefaults();
    return getDb().prepare(`SELECT * FROM budgets`).all();
  }
  return rows;
}

function upsert(categoryId, monthly) {
  getDb().prepare(`
    INSERT INTO budgets (category_id, monthly) VALUES (?, ?)
    ON CONFLICT(category_id) DO UPDATE SET monthly = excluded.monthly
  `).run(categoryId, monthly);
}

function seedDefaults() {
  const stmt = getDb().prepare(`INSERT OR IGNORE INTO budgets (category_id, monthly) VALUES (?, ?)`);
  const seed = getDb().transaction(() => {
    for (const b of DEFAULTS) stmt.run(b.category_id, b.monthly);
  });
  seed();
}

module.exports = { getAll, upsert };
