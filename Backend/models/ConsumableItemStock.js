const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ConsumableItemStock = sequelize.define('ConsumableItemStock', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  consumableId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  lengthLabel: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'lengthLabel cannot be empty.' },
    },
  },
  location: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'annex',
    validate: {
      isIn: { args: [['main', 'annex']], msg: 'location must be either main or annex.' }
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'quantity cannot be negative.' },
    },
  },
}, {
  tableName: 'consumable_item_stocks',
  timestamps: true,
  underscored: true,
});

module.exports = ConsumableItemStock;
