const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Transactions
  getTransactions:  ()           => ipcRenderer.invoke('txn:getAll'),
  importTransactions: (rows)     => ipcRenderer.invoke('txn:insert', rows),
  updateTransaction:  (id, patch) => ipcRenderer.invoke('txn:update', id, patch),
  getMonths:        ()           => ipcRenderer.invoke('txn:getMonths'),

  // CSV import
  previewCSV:         ()           => ipcRenderer.invoke('csv:preview'),
  previewCSVContents: (contents)   => ipcRenderer.invoke('csv:previewContents', contents),
  previewPaystub:     (uint8Array) => ipcRenderer.invoke('pdf:previewPaystub', uint8Array),
  importCSV:          (rows)       => ipcRenderer.invoke('csv:import', rows),

  // Budgets
  getBudgets: ()                 => ipcRenderer.invoke('budget:getAll'),
  upsertBudget: (catId, monthly) => ipcRenderer.invoke('budget:upsert', catId, monthly),

  // Category rules
  saveRule: (pattern, category) => ipcRenderer.invoke('rule:save', pattern, category),

  // Categories
  getCategories:    ()     => ipcRenderer.invoke('category:getAll'),
  createCategory:   (name) => ipcRenderer.invoke('category:create', name),
  deleteCategory:   (id)   => ipcRenderer.invoke('category:delete', id),

  // File path resolution (Electron 32+ replacement for file.path)
  getPathForFile: (file) => webUtils.getPathForFile(file),
});
