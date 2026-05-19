const RULES = [
  // Groceries
  { pattern: /whole foods|trader joe|safeway|kroger|albertsons|costco|walmart grocery|sprouts|publix|aldi|wegmans|berkeley bowl/i, category: 'groceries' },
  // Dining
  { pattern: /restaurant|cafe|coffee|bakery|pizza|sushi|burger|taco|mcdonald|starbucks|chipotle|sweetgreen|tartine|philz|blue bottle|souvla|doordash|grubhub|uber eats|postmates/i, category: 'dining' },
  // Transport
  { pattern: /lyft|uber(?! eats)|bart|muni|metro|shell|chevron|exxon|bp |arco|parking|caltrain|amtrak|aaa/i, category: 'transport' },
  // Housing
  { pattern: /rent|mortgage|apartment|hoa |property management/i, category: 'housing' },
  // Utilities
  { pattern: /pg&e|pacific gas|comcast|xfinity|verizon|at&t|t-mobile|sprint|water|ebmud|sewage|electric|internet/i, category: 'utilities' },
  // Subscriptions
  { pattern: /netflix|spotify|apple\.com\/bill|icloud|hulu|disney\+|youtube premium|amazon prime|notion|figma|github|dropbox|adobe|nyt|new york times|wsj|substack/i, category: 'subscriptions' },
  // Shopping
  { pattern: /amazon(?! prime)|etsy|ebay|target|best buy|apple store|muji|uniqlo|rei|nordstrom|macy|gap|zara|h&m|wayfair/i, category: 'shopping' },
  // Health
  { pattern: /pharmacy|cvs|walgreens|rite aid|medical|dental|vision|doctor|hospital|clinic|classpass|equinox|gym|fitness|one medical/i, category: 'health' },
  // Entertainment
  { pattern: /cinema|theatre|theater|alamo|amc|regal|steam|playstation|xbox|ticketmaster|eventbrite|concert|spotify concert/i, category: 'entertainment' },
  // Travel
  { pattern: /airline|airways|airbnb|hotel|marriott|hilton|hyatt|booking\.com|expedia|vrbo|alaska air|united|delta|southwest/i, category: 'travel' },
  // Income
  { pattern: /paycheck|payroll|direct deposit|salary|stripe payout|venmo credit|zelle credit|interest.*savings/i, category: 'income' },
  // Transfers — credit card payments, bank transfers, autopay
  { pattern: /transfer|autopay|card payment|mobile pymt|online pymt|online payment|bill pay|pymt to|payment to|thank you.*payment|payment.*thank you|capital one|citi.*pay|chase.*pay|amex.*pay|discover.*pay/i, category: 'transfers' },
];

function categorize(merchant) {
  const m = (merchant || '').trim();
  for (const rule of RULES) {
    if (rule.pattern.test(m)) return rule.category;
  }
  return 'uncategorized';
}

module.exports = { categorize };
