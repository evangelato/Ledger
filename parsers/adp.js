// ADP Earnings Statement PDF parser
// Handles ADP Workforce Now format — text extracted via pdf-parse
// Numbers in extracted text have spaces instead of commas/decimals: "$3 888 79" = $3,888.79

// pdf-parse strips spaces between words — insert space at lowercase→uppercase boundary
function normalize(text) {
  return text.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function detect(text) {
  const t = normalize(text);
  return /Earnings Statement/i.test(t) && /Pay Date:/i.test(t);
}

// "$3 888 79" or "3 888 79" → 3888.79
function parseAmount(raw) {
  const digits = raw.replace(/[^\d]/g, '');
  return parseInt(digits, 10) / 100;
}

function parseDate(raw) {
  // MM/DD/YYYY → YYYY-MM-DD
  const m = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}

function parse(rawText) {
  const text = normalize(rawText);

  // Pay date
  const dateMatch = text.match(/Pay Date:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  const date = dateMatch ? parseDate(dateMatch[1]) : null;

  // Net pay — space before $ is optional, capture digits+spaces on same line only
  const netMatch = text.match(/Net Pay\s*\$\s*([\d ]+)/i);
  const amount = netMatch ? parseAmount(netMatch[1]) : null;

  // Employer — line just before "ATTN:"
  const employerMatch = text.match(/([A-Z][A-Z0-9\s\.,&]+?)\s*\n\s*ATTN:/);
  const employer = employerMatch ? employerMatch[1].trim() : 'Employer';

  if (!date || !amount) return null;

  return [{
    date,
    merchant: employer,
    amount,
    category: 'income',
    bank:     'ADP',
    account:  'payroll',
    note:     'Paystub import',
    pending:  false,
    recurring: true,
  }];
}

module.exports = { detect, parse };
