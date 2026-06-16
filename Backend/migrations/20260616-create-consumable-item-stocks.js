'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('consumable_item_stocks', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      consumable_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'consumables', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      length_label: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      location: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'annex',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('consumable_item_stocks');
  }
};
