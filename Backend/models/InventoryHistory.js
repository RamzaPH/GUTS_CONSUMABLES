const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InventoryHistory = sequelize.define('InventoryHistory', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  consumableId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    references: {
      model: 'consumables',
      key: 'id',
    },
  },
  actionType: {
    type: DataTypes.ENUM('Stock In', 'Stock Out', 'Update', 'Archive'),
    allowNull: false,
  },
  quantityChanged: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  beginningInventory: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  endingInventory: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  course: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  trainer: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  purpose: {
    type: DataTypes.ENUM('Training', 'Assessment', 'Replenishment'),
    allowNull: true,
  },
  location: {
    type: DataTypes.ENUM('main', 'annex'),
    allowNull: true,
    defaultValue: 'main',
  },
  performedBy: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'System',
  },
  performedById: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  verificationImages: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
}, {
  tableName: 'inventory_history',
  timestamps: true,
  updatedAt: false,
  underscored: true,
});

// Define association with User for performer
InventoryHistory.associate = (models) => {
  const hasPerformerAssociation = Boolean(InventoryHistory.associations?.performer);

  if (!hasPerformerAssociation) {
    InventoryHistory.belongsTo(models.User, {
      foreignKey: 'performedById',
      as: 'performer',
    });
  }
};

module.exports = InventoryHistory;
