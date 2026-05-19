// Chase CSV format:
// Transaction Date,Post Date,Description,Category,Type,Amount,Memo
// Date format: MM/DD/YYYY
// Amount: negative = debit (purchase), positive = credit (payment)

const { categorize } = require('./categorize');

const HEADERS = ['transaction date', 'post date', 'description', 'category', 'type', 'amount'];

function detect(headers) {
  const h = headers.map((s) => s.toLowerCase().trim());
  return HEADERS.every((col) => h.includes(col));
}

function parse(rows, headers) {
  const h = headers.map((s) => s.toLowerCase().trim());
  const col = (name) => h.indexOf(name);

  return rows
    .filter((r) => r.length > 3)
    .map((r) => {
      const rawDate = r[col('transaction date')]?.trim();
      const merchant = r[col('description')]?.trim() || '';
      const amount = parseFloat(r[col('amount')]);

      if (!rawDate || isNaN(amount)) return null;

      return {
        date:     parseDate(rawDate),
        merchant,
        amount,
        category: categorize(merchant),
        bank:     'Chase',
      };
    })
    .filter(Boolean);
}

function parseDate(s) {
  const [m, d, y] = s.split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

module.exports = { detect, parse };
