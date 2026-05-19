import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { TransactionPatch } from '../../db/transactions';
import type { Category } from '../../db/categories';

export interface LedgerAPI {
  getTransactions: () => Promise<unknown[]>;
  importTransactions: (rows: unknown[]) => Promise<number>;
  updateTransaction: (id: string, patch: TransactionPatch) => Promise<void>;
  getMonths: () => Promise<string[]>;
  previewCSV: () => Promise<unknown>;
  previewCSVContents: (contents: string[]) => Promise<unknown>;
  previewPaystub: (uint8Array: Uint8Array) => Promise<unknown>;
  importCSV: (rows: unknown[]) => Promise<number>;
  getBudgets: () => Promise<unknown[]>;
  upsertBudget: (catId: string, monthly: number) => Promise<void>;
  saveRule: (pattern: string, category: string) => Promise<boolean>;
  getCategories: () => Promise<Category[]>;
  createCategory: (name: string) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
  getPathForFile: (file: File) => string;
}

contextBridge.exposeInMainWorld('api', {
  getTransactions:    ()                          => ipcRenderer.invoke('txn:getAll'),
  importTransactions: (rows: unknown[])           => ipcRenderer.invoke('txn:insert', rows),
  updateTransaction:  (id: string, patch: TransactionPatch) => ipcRenderer.invoke('txn:update', id, patch),
  getMonths:          ()                          => ipcRenderer.invoke('txn:getMonths'),

  previewCSV:         ()                          => ipcRenderer.invoke('csv:preview'),
  previewCSVContents: (contents: string[])        => ipcRenderer.invoke('csv:previewContents', contents),
  previewPaystub:     (uint8Array: Uint8Array)    => ipcRenderer.invoke('pdf:previewPaystub', uint8Array),
  importCSV:          (rows: unknown[])           => ipcRenderer.invoke('csv:import', rows),

  getBudgets:         ()                          => ipcRenderer.invoke('budget:getAll'),
  upsertBudget:       (catId: string, monthly: number) => ipcRenderer.invoke('budget:upsert', catId, monthly),

  saveRule:           (pattern: string, category: string) => ipcRenderer.invoke('rule:save', pattern, category),

  getCategories:      ()                          => ipcRenderer.invoke('category:getAll'),
  createCategory:     (name: string)              => ipcRenderer.invoke('category:create', name),
  deleteCategory:     (id: string)                => ipcRenderer.invoke('category:delete', id),

  getPathForFile:     (file: File)                => webUtils.getPathForFile(file),
} satisfies LedgerAPI);
