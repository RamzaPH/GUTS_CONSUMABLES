const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Consumable = sequelize.define('Consumable', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  itemName: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'itemName cannot be empty.' },
    },
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'category cannot be empty.' },
    },
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'quantity cannot be negative.' },
    },
  },
  quantityMain: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'quantityMain cannot be negative.' },
    },
  },
  quantityAnnex: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'quantityAnnex cannot be negative.' },
    },
  },
  unit: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'unit cannot be empty.' },
    },
  },
  reorderLevel: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10,
    validate: {
      min: { args: [0], msg: 'reorderLevel cannot be negative.' },
    },
  },
  isArchived: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  tableName: 'consumables',
  timestamps: true,
  // Maps camelCase JS names to snake_case DB columns:
  // itemName → item_name, reorderLevel → reorder_level
  // toJSON() still returns camelCase keys.
  underscored: true,
});

// Associate with ConsumableItemStock (one-to-many)
try {
  const ConsumableItemStock = require('./ConsumableItemStock');
  Consumable.hasMany(ConsumableItemStock, { foreignKey: 'consumableId', as: 'stocks' });
  ConsumableItemStock.belongsTo(Consumable, { foreignKey: 'consumableId', as: 'consumable' });
} catch (err) {
  // If the other model isn't available at load time, skip association setup — it's okay.
  // Associations may be initialized later when both models are required.
}

module.exports = Consumable;
