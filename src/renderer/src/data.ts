export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface Account {
  id: string;
  name: string;
  bank: string;
  mask: string;
  type: 'checking' | 'savings' | 'credit';
  balance: number;
}

export interface Transaction {
  id: string;
  date: string;
  account: string;
  category: string;
  merchant: string;
  amount: number;
  note: string;
  pending: boolean;
  recurring?: boolean;
}

export interface Budget {
  categoryId: string;
  monthly: number;
}

const CATEGORIES: Category[] = [
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
  { id: 'uncategorized', name: 'Uncategorized',  color: 'stone',    icon: 'question' },
];

const ACCOUNTS: Account[] = [
  { id: 'checking', name: 'Everyday Checking', bank: 'Northbank',        mask: '••4421', type: 'checking', balance: 8420.55 },
  { id: 'savings',  name: 'Savings',           bank: 'Northbank',        mask: '••9180', type: 'savings',  balance: 21340.12 },
  { id: 'credit',   name: 'Sapphire Card',     bank: 'Meridian',         mask: '••2207', type: 'credit',   balance: -1284.31 },
  { id: 'amex',     name: 'Gold Amex',         bank: 'American Express', mask: '••1009', type: 'credit',   balance: -642.18 },
];

const MERCHANTS: Record<string, string[]> = {
  groceries:     ['Whole Foods Market', "Trader Joe's", 'Safeway', 'Berkeley Bowl', 'Costco Wholesale'],
  dining:        ['Sweetgreen', 'Tartine Bakery', 'Blue Bottle Coffee', 'Souvla', 'Mission Chinese', 'Philz Coffee', 'Kura Sushi'],
  transport:     ['Lyft', 'Uber', 'BART', 'Shell', 'Chevron', 'AAA Parking'],
  housing:       ['Rent — Apartment 4B', 'Allstate Renters Ins.'],
  utilities:     ['PG&E', 'Comcast Xfinity', 'Verizon Wireless', 'EBMUD Water'],
  subscriptions: ['Netflix', 'Spotify Family', 'iCloud+ 2TB', 'NYT Digital', 'Notion', 'Figma Pro'],
  shopping:      ['Amazon', 'Muji', 'Uniqlo', 'Apple Store', 'Etsy', 'REI'],
  health:        ['One Medical', 'Walgreens', 'CVS Pharmacy', 'ClassPass', 'Equinox'],
  entertainment: ['Alamo Drafthouse', 'Spotify Concert', 'Steam', 'AMC Theatres'],
  travel:        ['Alaska Airlines', 'Airbnb', 'Marriott', 'Booking.com'],
  income:        ['Paycheck — Helios Labs', 'Stripe Payout', 'Interest — Savings'],
  transfers:     ['Transfer to Savings', 'Card Payment — Sapphire', 'Card Payment — Amex'],
};

function seed(s: number) {
  let x = s;
  return () => (x = (x * 9301 + 49297) % 233280) / 233280;
}
const rand = seed(7);
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

const TXNS: Transaction[] = [];
let id = 1;
const today = new Date(2026, 4, 13);
const start = new Date(today);
start.setMonth(start.getMonth() - 5);

function addRecurring(
  months: number, day: number, account: string, category: string,
  merchant: string, amount: number, note = '',
): void {
  for (let m = 0; m < months; m++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + m);
    d.setDate(day);
    if (d > today) continue;
    TXNS.push({ id: 't' + id++, date: d.toISOString().slice(0, 10), account, category, merchant, amount, note, pending: false, recurring: true });
  }
}

addRecurring(6, 1,  'checking', 'housing',       'Rent — Apartment 4B',    -2850,   'Monthly rent');
addRecurring(6, 1,  'checking', 'income',        'Paycheck — Helios Labs',  5420.18, 'Bi-monthly');
addRecurring(6, 15, 'checking', 'income',        'Paycheck — Helios Labs',  5420.18, 'Bi-monthly');
addRecurring(6, 5,  'checking', 'utilities',     'PG&E',                   -118.40);
addRecurring(6, 8,  'checking', 'utilities',     'Comcast Xfinity',        -84.99);
addRecurring(6, 12, 'credit',   'subscriptions', 'Netflix',                -22.99);
addRecurring(6, 14, 'credit',   'subscriptions', 'Spotify Family',         -16.99);
addRecurring(6, 18, 'amex',     'subscriptions', 'iCloud+ 2TB',            -9.99);
addRecurring(6, 22, 'credit',   'subscriptions', 'Figma Pro',              -15.00);
addRecurring(6, 3,  'checking', 'utilities',     'Verizon Wireless',       -65.00);

const catWeights = ['groceries','groceries','groceries','dining','dining','dining','dining','transport','transport','shopping','health','entertainment'];
for (let m = 0; m < 6; m++) {
  const monthStart = new Date(start);
  monthStart.setMonth(monthStart.getMonth() + m);
  monthStart.setDate(1);
  const daysIn = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  const n = 35 + Math.floor(rand() * 18);
  for (let i = 0; i < n; i++) {
    const d = new Date(monthStart);
    d.setDate(1 + Math.floor(rand() * daysIn));
    if (d > today) continue;
    const cat = pick(catWeights);
    const merchant = pick(MERCHANTS[cat]);
    let amt: number;
    if (cat === 'groceries') amt = -(15 + rand() * 110);
    else if (cat === 'dining') amt = -(6 + rand() * 65);
    else if (cat === 'transport') amt = -(4 + rand() * 38);
    else if (cat === 'shopping') amt = -(12 + rand() * 240);
    else if (cat === 'health') amt = -(15 + rand() * 180);
    else amt = -(8 + rand() * 60);
    amt = Math.round(amt * 100) / 100;
    const account = rand() < 0.55 ? 'credit' : rand() < 0.7 ? 'amex' : 'checking';
    TXNS.push({ id: 't' + id++, date: d.toISOString().slice(0, 10), account, category: cat, merchant, amount: amt, note: '', pending: false, recurring: false });
  }
}

TXNS.push({ id: 't' + id++, date: '2026-03-22', account: 'credit',   category: 'travel',         merchant: 'Alaska Airlines',    amount: -384.20, note: 'SFO→SEA',         pending: false });
TXNS.push({ id: 't' + id++, date: '2026-03-23', account: 'credit',   category: 'travel',         merchant: 'Airbnb',             amount: -612.00, note: 'Capitol Hill stay', pending: false });
TXNS.push({ id: 't' + id++, date: '2026-05-13', account: 'credit',   category: 'dining',         merchant: 'Tartine Bakery',     amount: -18.40,  note: '',                 pending: true });
TXNS.push({ id: 't' + id++, date: '2026-05-12', account: 'checking', category: 'uncategorized',  merchant: 'SQ *MISSION CORNER', amount: -42.15,  note: 'Needs review',     pending: true });
TXNS.push({ id: 't' + id++, date: '2026-05-11', account: 'amex',     category: 'shopping',       merchant: 'Amazon',             amount: -64.32,  note: '',                 pending: true });

TXNS.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

const BUDGETS: Budget[] = [
  { categoryId: 'groceries',     monthly: 650 },
  { categoryId: 'dining',        monthly: 400 },
  { categoryId: 'transport',     monthly: 180 },
  { categoryId: 'shopping',      monthly: 250 },
  { categoryId: 'subscriptions', monthly: 90 },
  { categoryId: 'entertainment', monthly: 120 },
];

const SAMPLE_CSV_ROWS: string[][] = [
  ['2026-05-10', 'TST* TARTINE BAKERY 415', '-18.40', 'USD'],
  ['2026-05-09', 'WHOLE FOODS MKT #10342',  '-84.22', 'USD'],
  ['2026-05-09', 'LYFT *RIDE TUE 9AM',      '-14.60', 'USD'],
  ['2026-05-08', 'AMAZON MKTPLACE PMTS',    '-29.99', 'USD'],
  ['2026-05-08', 'NETFLIX.COM',             '-22.99', 'USD'],
  ['2026-05-07', 'PHILZ COFFEE #14',        '-7.50',  'USD'],
  ['2026-05-07', 'SQ *MISSION CORNER',      '-42.15', 'USD'],
  ['2026-05-06', 'BART-CLIPPER-AUTOLOAD',   '-25.00', 'USD'],
  ['2026-05-05', 'PG&E WEB ONLINE',         '-118.40','USD'],
  ['2026-05-04', "TRADER JOE'S #178",       '-62.81', 'USD'],
  ['2026-05-04', 'UBER TRIP',               '-12.20', 'USD'],
  ['2026-05-03', 'VERIZON WIRELESS',        '-65.00', 'USD'],
];

export const LEDGER_DATA = {
  CATEGORIES,
  ACCOUNTS,
  TXNS,
  BUDGETS,
  SAMPLE_CSV_ROWS,
  TODAY: today.toISOString().slice(0, 10),
};
