export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  is_default: number;
  sort_order: number;
}

export function seed(): void;
export function getAll(): Category[];
export function create(name: string): Category;
export function remove(id: string): void;
