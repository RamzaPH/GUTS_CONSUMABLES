const db = require('./config/database');
const C = require('./models/Consumable');

const updates = [
  { id: 1, category: 'SMAW', reorderLevel: 50 },
  { id: 2, category: 'SMAW', reorderLevel: 50 },
  { id: 3, category: 'SMAW', reorderLevel: 20 },
  { id: 4, category: 'SMAW', reorderLevel: 20 },
  { id: 5, category: 'SMAW', reorderLevel: 15 },
  { id: 6, category: 'EIM', reorderLevel: 5 },
  { id: 7, category: 'EIM', reorderLevel: 10 },
];

(async () => {
  try {
    await db.authenticate();
    for (const update of updates) {
      await C.update(update, { where: { id: update.id } });
      console.log(`Updated item ${update.id} -> category: ${update.category}`);
    }
    console.log('\n✔  All items updated with categories!');
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
