import { ParsedTransaction } from './index';

export function detect(text: string): boolean;
export function parse(text: string): ParsedTransaction[] | null;
