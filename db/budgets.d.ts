export interface Budget {
  category_id: string;
  monthly: number;
}

export function getAll(): Budget[];
export function upsert(categoryId: string, monthly: number): void;
