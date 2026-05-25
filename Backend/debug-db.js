const db = require('./config/database');
const C = require('./models/Consumable');

(async () => {
  try {
    await db.authenticate();
    const items = await C.findAll();
    console.log('Total items:', items.length);
    items.forEach(i => {
      console.log(`ID: ${i.id}, Name: ${i.itemName}, Qty: ${i.quantity}, Main: ${i.quantityMain}, Annex: ${i.quantityAnnex}, Archived: ${i.isArchived}`);
    });
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
