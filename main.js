const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { getDb } = require('./db/database');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 600,
    title: 'Ledger',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadFile('index.html');

  // Prevent Electron from navigating when files are dropped onto the window
  win.webContents.on('will-navigate', (e) => e.preventDefault());
}

app.whenReady().then(() => {
  // Register IPC handlers after app is ready (so app.getPath works in database.js)
  const txns       = require('./db/transactions');
  const budgets    = require('./db/budgets');
  const categories = require('./db/categories');
  const { parseFile } = require('./parsers');
  const adp = require('./parsers/adp');
  const fs = require('fs');

  ipcMain.handle('txn:getAll',    () => txns.getAll());
  ipcMain.handle('txn:insert',    (_, rows) => txns.insert(rows));
  ipcMain.handle('txn:update',    (_, id, patch) => txns.update(id, patch));
  ipcMain.handle('txn:getMonths', () => txns.getMonths());

  ipcMain.handle('budget:getAll',  () => budgets.getAll());
  ipcMain.handle('budget:upsert',  (_, catId, monthly) => budgets.upsert(catId, monthly));

  ipcMain.handle('category:getAll', () => categories.getAll());
  ipcMain.handle('category:create', (_, name) => categories.create(name));
  ipcMain.handle('category:delete', (_, id) => categories.remove(id));

  ipcMain.handle('rule:save', (_, pattern, category) => {
    getDb().prepare(`INSERT INTO category_rules (pattern, category) VALUES (?, ?)`).run(pattern, category);
    return true;
  });

  // Load saved category rules and apply them on top of auto-detection
  function applyRules(transactions) {
    const rules = getDb().prepare(`SELECT pattern, category FROM category_rules`).all();
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

  // Shared helper: apply rules + ML fallback + duplicate check
  async function buildPreview(parsedTransactions, banks) {
    const withRules = applyRules(parsedTransactions);

    // ML categorization for anything still uncategorized
    const uncategorizedIdxs = withRules.reduce((acc, t, i) => {
      if (t.category === 'uncategorized') acc.push(i);
      return acc;
    }, []);

    if (uncategorizedIdxs.length > 0) {
      try {
        const { mlCategorize } = require('./ml/categorize');
        const merchants = uncategorizedIdxs.map((i) => withRules[i].merchant);
        const categories = await mlCategorize(merchants);
        uncategorizedIdxs.forEach((idx, i) => {
          withRules[idx] = { ...withRules[idx], category: categories[i] };
        });
      } catch (e) {
        console.error('[ML categorize error]', e);
      }
    }

    const existing = txns.getAll();
    const existingKeys = new Set(existing.map((t) => `${t.date}|${t.merchant}|${t.amount}`));
    const rows = withRules.map((t) => ({
      ...t,
      include:     true,
      isDuplicate: existingKeys.has(`${t.date}|${t.merchant}|${t.amount}`),
    }));
    return { canceled: false, banks, rows };
  }

  // CSV preview from dropped file contents — parses, returns rows WITHOUT saving
  ipcMain.handle('csv:previewContents', async (_, contents) => {
    const allTransactions = [];
    const banks = [];
    for (const text of contents) {
      const { bank, transactions } = parseFile(text);
      allTransactions.push(...transactions);
      if (!banks.includes(bank)) banks.push(bank);
    }
    return buildPreview(allTransactions, banks);
  });

  // CSV preview — opens file picker, parses, returns rows WITHOUT saving
  ipcMain.handle('csv:preview', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Select bank statement',
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      properties: ['openFile', 'multiSelections'],
    });
    if (canceled || filePaths.length === 0) return { canceled: true };

    const allTransactions = [];
    const banks = [];
    for (const filePath of filePaths) {
      const text = fs.readFileSync(filePath, 'utf-8');
      const { bank, transactions } = parseFile(text);
      allTransactions.push(...transactions);
      if (!banks.includes(bank)) banks.push(bank);
    }
    return buildPreview(allTransactions, banks);
  });

  // PDF paystub preview — accepts file bytes from renderer, returns rows WITHOUT saving
  ipcMain.handle('pdf:previewPaystub', async (_, uint8Array) => {
    const pdfParse = require('pdf-parse');
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
      include:     true,
      isDuplicate: existingKeys.has(`${t.date}|${t.merchant}|${t.amount}`),
    }));
    return { canceled: false, banks: ['ADP'], rows };
  });

  // CSV import — saves previewed rows to the database
  ipcMain.handle('csv:import', async (_, rows) => {
    return txns.insert(rows);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
