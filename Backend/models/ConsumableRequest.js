const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ConsumableRequest = sequelize.define('ConsumableRequest', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  consumableId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  requestedById: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  requestType: {
    type: DataTypes.ENUM('Stock In', 'Stock Out', 'New Consumable'),
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: { args: [1], msg: 'Quantity must be at least 1.' },
    },
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  purpose: {
    type: DataTypes.ENUM('Training', 'Assessment', 'Replenishment'),
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
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending',
  },
  approvedById: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  approvalNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  requestedItemName: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  requestedCategory: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  requestedUnit: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  requestedReorderLevel: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  requestedLocation: {
    type: DataTypes.ENUM('main', 'annex'),
    allowNull: true,
    defaultValue: 'main',
  },
}, {
  tableName: 'consumable_requests',
  timestamps: true,
  underscored: true,
});

// Define associations
ConsumableRequest.associate = (models) => {
  if (!ConsumableRequest.associations?.consumable) {
    ConsumableRequest.belongsTo(models.Consumable, {
      foreignKey: 'consumableId',
      as: 'consumable',
      constraints: false,
    });
  }

  if (!ConsumableRequest.associations?.requestedBy) {
    ConsumableRequest.belongsTo(models.User, {
      foreignKey: 'requestedById',
      as: 'requestedBy',
    });
  }

  if (!ConsumableRequest.associations?.approvedBy) {
    ConsumableRequest.belongsTo(models.User, {
      foreignKey: 'approvedById',
      as: 'approvedBy',
    });
  }
};

module.exports = ConsumableRequest;
