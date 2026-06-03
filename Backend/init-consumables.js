require('dotenv').config();
const sequelize = require('./config/database');
const Consumable = require('./models/Consumable');
const InventoryHistory = require('./models/InventoryHistory');

const sampleConsumables = [
  // EIM Track
  { itemName: 'PVC Conduit 20mm', category: 'EIM', quantity: 48, quantityMain: 48, quantityAnnex: 0, unit: 'pcs', reorderLevel: 15 },
  { itemName: 'Electrical Tape', category: 'EIM', quantity: 12, quantityMain: 12, quantityAnnex: 0, unit: 'rolls', reorderLevel: 8 },
  { itemName: 'Toggle Switch', category: 'EIM', quantity: 7, quantityMain: 7, quantityAnnex: 0, unit: 'pcs', reorderLevel: 10 },
  { itemName: 'Junction Box', category: 'EIM', quantity: 4, quantityMain: 4, quantityAnnex: 0, unit: 'pcs', reorderLevel: 5 },
  
  // SMAW Track
  { itemName: 'E6011 Welding Rod 3.2mm', category: 'SMAW', quantity: 26, quantityMain: 26, quantityAnnex: 0, unit: 'kg', reorderLevel: 20 },
  { itemName: 'E6013 Welding Rod 3.2mm', category: 'SMAW', quantity: 15, quantityMain: 15, quantityAnnex: 0, unit: 'kg', reorderLevel: 20 },
  { itemName: 'Chipping Hammer', category: 'SMAW', quantity: 15, quantityMain: 15, quantityAnnex: 0, unit: 'pcs', reorderLevel: 10 },
  { itemName: 'Welding Gloves', category: 'SMAW', quantity: 9, quantityMain: 9, quantityAnnex: 0, unit: 'pairs', reorderLevel: 12 },
  { itemName: 'Face Shield Lens', category: 'SMAW', quantity: 3, quantityMain: 3, quantityAnnex: 0, unit: 'pcs', reorderLevel: 5 },
  
  // CSS Track
  { itemName: 'RJ45 Connector', category: 'CSS', quantity: 210, quantityMain: 210, quantityAnnex: 0, unit: 'pcs', reorderLevel: 100 },
  { itemName: 'Cat6 Cable', category: 'CSS', quantity: 58, quantityMain: 58, quantityAnnex: 0, unit: 'meters', reorderLevel: 30 },
  { itemName: 'Crimping Tool', category: 'CSS', quantity: 11, quantityMain: 11, quantityAnnex: 0, unit: 'pcs', reorderLevel: 8 },
  { itemName: 'LAN Tester Battery', category: 'CSS', quantity: 5, quantityMain: 5, quantityAnnex: 0, unit: 'pcs', reorderLevel: 3 },
];

const initializeConsumables = async () => {
  try {
    await sequelize.authenticate();
    console.log('✔  Database connected.');

    await sequelize.sync({ alter: true });
    console.log('✔  Tables synchronized.');

    // Check if consumables already exist
    const existingCount = await Consumable.count();
    if (existingCount > 0) {
      console.log(`ℹ  Database already has ${existingCount} consumables. Skipping initialization.`);
      process.exit(0);
    }

    // Insert sample consumables
    for (const consumable of sampleConsumables) {
      await Consumable.create(consumable);
      console.log(`✔  Created: ${consumable.itemName}`);
    }

    console.log(`\n✔  Initialized ${sampleConsumables.length} sample consumables!`);
    process.exit(0);
  } catch (err) {
    console.error('✖  Initialization failed:', err.message);
    process.exit(1);
  }
};

initializeConsumables();
