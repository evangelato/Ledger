// Wells Fargo CSV format — NO header row
// Columns: Date, Amount, *, Check Number, Description
// Date format: MM/DD/YYYY
// Amount: negative = debit, positive = credit

const { categorize } = require('./categorize');

// Wells Fargo has no headers — detect by checking if the first column looks
// like a date and the second looks like a dollar amount
function detect(headers) {
  // headers[] will be the first row since there's no header
  if (!headers || headers.length < 5) return false;
  const looksLikeDate   = /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(headers[0]?.trim());
  const looksLikeAmount = /^-?\d+\.\d{2}$/.test(headers[1]?.trim());
  return looksLikeDate && looksLikeAmount;
}

function parse(allRows) {
  // allRows includes the "header" row (which is actually the first data row for WF)
  return allRows
    .filter((r) => r.length >= 5)
    .map((r) => {
      const rawDate = r[0]?.trim();
      const amount  = parseFloat(r[1]?.trim());
      const merchant = r[4]?.trim() || '';

      if (!rawDate || isNaN(amount)) return null;

      return {
        date:     parseDate(rawDate),
        merchant,
        amount,
        category: categorize(merchant),
        bank:     'Wells Fargo',
      };
    })
    .filter(Boolean);
}

function parseDate(s) {
  const [m, d, y] = s.split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

module.exports = { detect, parse };
