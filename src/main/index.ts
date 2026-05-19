import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { getDb } from '../../db/database';
import * as txns from '../../db/transactions';
import * as budgets from '../../db/budgets';
import * as categories from '../../db/categories';
import { parseFile, ParsedTransaction } from '../../parsers';
import * as adp from '../../parsers/adp';

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 600,
    title: 'Ledger',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  win.webContents.on('will-navigate', (e) => e.preventDefault());
}

function applyRules(transactions: ParsedTransaction[]): ParsedTransaction[] {
  const rules = getDb().prepare(`SELECT pattern, category FROM category_rules`).all() as { pattern: string; category: string }[];
  if (rules.length === 0) return transactions;
  return transactions.map((t) => {
    for (const rule of rules) {
      if (t.merchant.toLowerCase().includes(rule.pattern.toLowerCase())) {
        return { ...t, category: rule.category };
      }
    }
    return t;
  });
}

async function buildPreview(parsedTransactions: ParsedTransaction[], banks: string[]) {
  const withRules = applyRules(parsedTransactions);

  const uncategorizedIdxs = withRules.reduce<number[]>((acc, t, i) => {
    if (t.category === 'uncategorized') acc.push(i);
    return acc;
  }, []);

  if (uncategorizedIdxs.length > 0) {
    try {
      const { mlCategorize } = await import('../../ml/categorize');
      const merchants = uncategorizedIdxs.map((i) => withRules[i].merchant);
      const mlCategories = await mlCategorize(merchants);
      uncategorizedIdxs.forEach((idx, i) => {
        withRules[idx] = { ...withRules[idx], category: mlCategories[i] };
      });
    } catch (e) {
      console.error('[ML categorize error]', e);
    }
  }

  const existing = txns.getAll();
  const existingKeys = new Set(existing.map((t) => `${t.date}|${t.merchant}|${t.amount}`));
  const rows = withRules.map((t) => ({
    ...t,
    include: true,
    isDuplicate: existingKeys.has(`${t.date}|${t.merchant}|${t.amount}`),
  }));
  return { canceled: false, banks, rows };
}

app.whenReady().then(() => {
  ipcMain.handle('txn:getAll',    () => txns.getAll());
  ipcMain.handle('txn:insert',    (_e, rows) => txns.insert(rows));
  ipcMain.handle('txn:update',    (_e, id: string, patch) => txns.update(id, patch));
  ipcMain.handle('txn:getMonths', () => txns.getMonths());

  ipcMain.handle('budget:getAll',  () => budgets.getAll());
  ipcMain.handle('budget:upsert',  (_e, catId: string, monthly: number) => budgets.upsert(catId, monthly));

  ipcMain.handle('category:getAll', () => categories.getAll());
  ipcMain.handle('category:create', (_e, name: string) => categories.create(name));
  ipcMain.handle('category:delete', (_e, id: string) => categories.remove(id));

  ipcMain.handle('rule:save', (_e, pattern: string, category: string) => {
    getDb().prepare(`INSERT INTO category_rules (pattern, category) VALUES (?, ?)`).run(pattern, category);
    return true;
  });

  ipcMain.handle('csv:previewContents', async (_e, contents: string[]) => {
    const allTransactions: ParsedTransaction[] = [];
    const banks: string[] = [];
    for (const text of contents) {
      const { bank, transactions } = parseFile(text);
      allTransactions.push(...transactions);
      if (!banks.includes(bank)) banks.push(bank);
    }
    return buildPreview(allTransactions, banks);
  });

  ipcMain.handle('csv:preview', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Select bank statement',
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      properties: ['openFile', 'multiSelections'],
    });
    if (canceled || filePaths.length === 0) return { canceled: true };

    const allTransactions: ParsedTransaction[] = [];
    const banks: string[] = [];
    for (const filePath of filePaths) {
      const text = fs.readFileSync(filePath, 'utf-8');
      const { bank, transactions } = parseFile(text);
      allTransactions.push(...transactions);
      if (!banks.includes(bank)) banks.push(bank);
    }
    return buildPreview(allTransactions, banks);
  });

  ipcMain.handle('pdf:previewPaystub', async (_e, uint8Array: Uint8Array) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
    const buffer = Buffer.from(uint8Array);
    const { text } = await pdfParse(buffer);

    if (!adp.detect(text)) {
      return { error: 'Unrecognized paystub format. Only ADP Earnings Statements are supported.' };
    }

    const transactions = adp.parse(text);
    if (!transactions) {
      return { error: 'Could not extract pay date or net pay from this statement.' };
    }

    const existing = txns.getAll();
    const existingKeys = new Set(existing.map((t) => `${t.date}|${t.merchant}|${t.amount}`));
    const rows = transactions.map((t) => ({
      ...t,
      include: true,
      isDuplicate: existingKeys.has(`${t.date}|${t.merchant}|${t.amount}`),
    }));
    return { canceled: false, banks: ['ADP'], rows };
  });

  ipcMain.handle('csv:import', (_e, rows) => txns.insert(rows));

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
