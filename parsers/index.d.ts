export interface ParsedTransaction {
  date: string;
  merchant: string;
  amount: number;
  category: string;
  bank: string;
  account?: string;
  note?: string;
  pending?: boolean;
  recurring?: boolean;
}

export interface ParseResult {
  bank: string;
  transactions: ParsedTransaction[];
}

export function parseFile(csvText: string, accountLabel?: string): ParseResult;
