function getCategories() {
  try {
    const { getDb } = require('../db/database');
    return getDb().prepare(`SELECT id FROM categories WHERE id != 'uncategorized'`).all().map((r) => r.id);
  } catch (e) {
    return ['groceries','dining','transport','housing','utilities','subscriptions','shopping','health','entertainment','travel','income','transfers','miscellaneous'];
  }
}

let classifierPromise = null;

function getClassifier() {
  if (!classifierPromise) {
    classifierPromise = (async () => {
      const { pipeline, env } = await import('@xenova/transformers');
      const { app } = require('electron');
      const path = require('path');
      env.cacheDir = path.join(app.getPath('userData'), 'models');
      return pipeline('zero-shot-classification', 'Xenova/nli-deberta-v3-small');
    })();
  }
  return classifierPromise;
}

async function mlCategorize(merchants) {
  if (merchants.length === 0) return [];
  const clf = await getClassifier();
  const results = await clf(merchants, getCategories(), { multi_label: false });
  const arr = Array.isArray(results) ? results : [results];
  return arr.map((r) => r.labels[0]);
}

module.exports = { mlCategorize };
