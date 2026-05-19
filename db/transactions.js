const { getDb } = require('./database');
const { randomUUID } = require('crypto');

function getAll() {
  return getDb().prepare(`
    SELECT * FROM transactions ORDER BY date DESC, imported_at DESC
  `).all();
}

function getByMonth(yearMonth) {
  return getDb().prepare(`
    SELECT * FROM transactions WHERE date LIKE ? ORDER BY date DESC
  `).all(`${yearMonth}%`);
}

function insert(rows) {
  const stmt = getDb().prepare(`
    INSERT OR IGNORE INTO transactions
      (id, date, merchant, amount, category, account, bank, note, pending, recurring)
    VALUES
      (@id, @date, @merchant, @amount, @category, @account, @bank, @note, @pending, @recurring)
  `);

  const insertMany = getDb().transaction((rows) => {
    let inserted = 0;
    for (const row of rows) {
      const result = stmt.run({
        id:        row.id || randomUUID(),
        date:      row.date,
        merchant:  row.merchant,
        amount:    row.amount,
        category:  row.category || 'uncategorized',
        account:   row.account || '',
        bank:      row.bank || '',
        note:      row.note || '',
        pending:   row.pending ? 1 : 0,
        recurring: row.recurring ? 1 : 0,
      });
      if (result.changes > 0) inserted++;
    }
    return inserted;
  });

  return insertMany(rows);
}

function update(id, patch) {
  const allowed = ['category', 'note', 'merchant', 'pending', 'recurring'];
  const fields = Object.keys(patch).filter((k) => allowed.includes(k));
  if (fields.length === 0) return;

  const set = fields.map((f) => `${f} = @${f}`).join(', ');
  getDb().prepare(`UPDATE transactions SET ${set} WHERE id = @id`).run({ ...patch, id });
}

function remove(id) {
  getDb().prepare(`DELETE FROM transactions WHERE id = ?`).run(id);
}

function getMonths() {
  return getDb().prepare(`
    SELECT DISTINCT substr(date, 1, 7) as month FROM transactions ORDER BY month DESC
  `).all().map((r) => r.month);
}

module.exports = { getAll, getByMonth, getMonths, insert, update, remove };
