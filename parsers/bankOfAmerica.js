// Bank of America CSV format (from activity page):
// Posted Date,Reference Number,Payee,Address,Amount
// Date format: MM/DD/YYYY
// Amount: negative = debit, positive = credit

const { categorize } = require('./categorize');

const HEADERS = ['posted date', 'reference number', 'payee', 'address', 'amount'];

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
      const rawDate = r[col('posted date')]?.trim();
      const merchant = r[col('payee')]?.trim() || '';
      const amount = parseFloat(r[col('amount')]?.replace(/,/g, ''));

      if (!rawDate || isNaN(amount)) return null;

      return {
        date:     parseDate(rawDate),
        merchant,
        amount,
        category: categorize(merchant),
        bank:     'Bank of America',
      };
    })
    .filter(Boolean);
}

function parseDate(s) {
  const [m, d, y] = s.split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

module.exports = { detect, parse };
