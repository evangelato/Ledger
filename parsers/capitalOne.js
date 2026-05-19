// Capital One CSV format:
// Transaction Date,Posted Date,Card No.,Description,Category,Debit,Credit
// Date format: YYYY-MM-DD
// Debit column = money out (positive number), Credit column = money in (positive number)

const { categorize } = require('./categorize');

const HEADERS = ['transaction date', 'posted date', 'card no.', 'description', 'debit', 'credit'];

function detect(headers) {
  const h = headers.map((s) => s.toLowerCase().trim());
  return HEADERS.every((col) => h.includes(col));
}

function parse(rows, headers) {
  const h = headers.map((s) => s.toLowerCase().trim());
  const col = (name) => h.indexOf(name);

  return rows
    .filter((r) => r.length > 4)
    .map((r) => {
      const rawDate = r[col('transaction date')]?.trim();
      const merchant = r[col('description')]?.trim() || '';
      const debit  = parseFloat(r[col('debit')])  || 0;
      const credit = parseFloat(r[col('credit')]) || 0;

      if (!rawDate) return null;

      // Debit = spending (make negative), Credit = income/payment (positive)
      const amount = credit > 0 ? credit : -debit;
      if (amount === 0) return null;

      return {
        date:     rawDate, // already YYYY-MM-DD
        merchant,
        amount,
        category: categorize(merchant),
        bank:     'Capital One',
      };
    })
    .filter(Boolean);
}

module.exports = { detect, parse };
