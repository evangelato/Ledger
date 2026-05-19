// Apple Card CSV format:
// Transaction Date,Clearing Date,Description,Merchant,Category,Type,Amount (USD)
// Date format: MM/DD/YYYY
// Amount: positive = purchase (debit), negative = payment/credit

const { categorize } = require('./categorize');

const HEADERS = ['transaction date', 'clearing date', 'description', 'merchant', 'category', 'type', 'amount (usd)'];

function detect(headers) {
  const h = headers.map((s) => s.toLowerCase().trim());
  return HEADERS.every((col) => h.includes(col));
}

function parse(rows, headers) {
  const h = headers.map((s) => s.toLowerCase().trim());
  const col = (name) => h.indexOf(name);

  return rows
    .filter((r) => r.length > 5)
    .map((r) => {
      const rawDate = r[col('transaction date')]?.trim();
      // Apple Card provides a clean Merchant name — prefer it over Description
      const merchant = (r[col('merchant')] || r[col('description')] || '').trim();
      const rawAmount = parseFloat(r[col('amount (usd)')]?.replace(/,/g, ''));
      const type = r[col('type')]?.trim().toLowerCase();

      if (!rawDate || isNaN(rawAmount)) return null;

      // Apple Card: positive amount = purchase (we want negative), negative = payment (positive)
      // Payments should be categorized as transfers
      const amount = type === 'payment' ? Math.abs(rawAmount) : -Math.abs(rawAmount);

      return {
        date:     parseDate(rawDate),
        merchant,
        amount,
        category: type === 'payment' ? 'transfers' : categorize(merchant),
        bank:     'Apple Card',
      };
    })
    .filter(Boolean);
}

function parseDate(s) {
  const [m, d, y] = s.split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

module.exports = { detect, parse };
