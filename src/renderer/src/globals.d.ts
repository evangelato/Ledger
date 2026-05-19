import type { LedgerAPI } from '../../preload';

declare global {
  interface Window {
    api: LedgerAPI;
  }
}

export {};
