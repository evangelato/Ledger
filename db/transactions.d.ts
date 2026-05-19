import { ParsedTransaction } from '../parsers';

export interface Transaction extends ParsedTransaction {
  id: string;
  note: string;
  pending: boolean;
  recurring: boolean;
  imported_at: string;
}

export interface TransactionPatch {
  category?: string;
  note?: string;
  merchant?: string;
  pending?: boolean;
  recurring?: boolean;
}

export function getAll(): Transaction[];
export function getByMonth(yearMonth: string): Transaction[];
export function getMonths(): string[];
export function insert(rows: Partial<Transaction>[]): number;
export function update(id: string, patch: TransactionPatch): void;
export function remove(id: string): void;
