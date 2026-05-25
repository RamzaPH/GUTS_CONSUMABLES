const db = require('./config/database');
const C = require('./models/Consumable');

const quantityUpdates = [
  { id: 2, quantityMain: 85, quantity: 85, reorderLevel: 50 },
  { id: 3, quantityMain: 12, quantity: 12, reorderLevel: 20 },
  { id: 4, quantityMain: 8, quantity: 8, reorderLevel: 20 },
  { id: 5, quantityMain: 25, quantity: 25, reorderLevel: 15 },
  { id: 7, quantityMain: 150, quantity: 150, reorderLevel: 10 },
];

(async () => {
  try {
    await db.authenticate();
    for (const update of quantityUpdates) {
      await C.update(update, { where: { id: update.id } });
      console.log(`Updated item ${update.id}: qty=${update.quantity}`);
    }
    console.log('\n✔  All items updated with quantities!');
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
