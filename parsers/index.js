const chase        = require('./chase');
const capitalOne   = require('./capitalOne');
const bankOfAmerica = require('./bankOfAmerica');
const wellsFargo   = require('./wellsFargo');
const appleCard    = require('./appleCard');

// Simple CSV parser — handles quoted fields with commas inside
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  return lines.map((line) => {
    const cols = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cols.push(cur.trim().replace(/^"|"$/g, ''));
        cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim().replace(/^"|"$/g, ''));
    return cols;
  }).filter((r) => r.some((c) => c.length > 0));
}

function parseFile(csvText, accountLabel = '') {
  const rows = parseCSV(csvText);
  if (rows.length === 0) throw new Error('Empty file');

  const firstRow = rows[0];

  // Wells Fargo has no headers — check first row as data
  if (wellsFargo.detect(firstRow)) {
    return { bank: 'Wells Fargo', transactions: wellsFargo.parse(rows) };
  }

  // All other banks have a header row
  const headers = firstRow;
  const dataRows = rows.slice(1).filter((r) => r.some((c) => c.length > 0));

  if (chase.detect(headers)) {
    return { bank: 'Chase', transactions: chase.parse(dataRows, headers) };
  }
  if (capitalOne.detect(headers)) {
    return { bank: 'Capital One', transactions: capitalOne.parse(dataRows, headers) };
  }
  if (bankOfAmerica.detect(headers)) {
    return { bank: 'Bank of America', transactions: bankOfAmerica.parse(dataRows, headers) };
  }
  if (appleCard.detect(headers)) {
    return { bank: 'Apple Card', transactions: appleCard.parse(dataRows, headers) };
  }

  throw new Error(`Unrecognized CSV format. Headers found: ${headers.slice(0, 4).join(', ')}`);
}

module.exports = { parseFile };
