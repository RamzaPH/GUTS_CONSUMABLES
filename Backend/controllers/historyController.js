const { Op } = require('sequelize');
const InventoryHistory = require('../models/InventoryHistory');
const Consumable = require('../models/Consumable');
const User = require('../models/User');

const getHistory = async (req, res) => {
  try {
    const { category, itemId } = req.query;

    let historyWhere = {};

    if (itemId) {
      const parsed = parseInt(itemId, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        historyWhere.consumableId = parsed;
      }
    } else if (category) {
      const upper = category.toUpperCase();
      const consumablesInCat = await Consumable.findAll({
        where: { category: upper },
        attributes: ['id'],
      });
      const catIds = consumablesInCat.map((c) => c.id);
      if (catIds.length === 0) {
        return res.json({ logs: [] });
      }
      historyWhere.consumableId = { [Op.in]: catIds };
    }

    const historyRows = await InventoryHistory.findAll({
      where: historyWhere,
      include: [
        {
          model: User,
          as: 'performer',
          attributes: ['id', 'username'],
          required: false,
          foreignKey: 'performedById',
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: 300,
    });

    const ids = [...new Set(historyRows.map((row) => row.consumableId))];
    const consumables = await Consumable.findAll({
      where: { id: ids },
      attributes: ['id', 'itemName', 'unit'],
    });

    const nameMap = consumables.reduce((acc, item) => {
      acc[item.id] = { itemName: item.itemName, unit: item.unit };
      return acc;
    }, {});

    const logs = historyRows.map((row) => {
      const plain = row.get({ plain: true });
      const consumableData = nameMap[plain.consumableId] || { itemName: 'Unknown Item', unit: 'N/A' };
      
      // Get performer name: use current username from User table if performedById exists, otherwise use stored name
      const performerName = plain.performer?.username || plain.performedBy || 'System';
      
      return {
        id: plain.id,
        consumableId: plain.consumableId,
        itemName: consumableData.itemName,
        unit: consumableData.unit,
        actionType: plain.actionType,
        quantityChanged: plain.quantityChanged,
        beginningInventory: plain.beginningInventory,
        endingInventory: plain.endingInventory,
        description: plain.description || '',
        course: plain.course || '',
        trainer: plain.trainer || '',
        purpose: plain.purpose || '',
        performedBy: performerName,
        location: plain.location || 'main',
        startDate: plain.startDate,
        endDate: plain.endDate,
        verificationImages: plain.verificationImages || [],
        createdAt: plain.createdAt,
      };
    });

    return res.json({ logs });
  } catch (err) {
    console.error('[getHistory]', err);
    return res.status(500).json({ error: 'Failed to fetch history logs.' });
  }
};

const updateInventoryHistory = async (req, res) => {
  const t = await InventoryHistory.sequelize.transaction();
  try {
    const { id } = req.params;
    const { quantityChanged, description, course, trainer, purpose } = req.body;

    // Validate input
    if (quantityChanged === undefined || quantityChanged === null) {
      return res.status(400).json({ error: 'quantityChanged is required' });
    }

    // Find the record
    const record = await InventoryHistory.findByPk(id, { transaction: t });
    if (!record) {
      await t.rollback();
      return res.status(404).json({ error: 'History record not found' });
    }

    // Calculate the old difference to detect change
    const oldQuantityChanged = record.quantityChanged;
    const quantityDifference = quantityChanged - oldQuantityChanged;

    // Recalculate ending inventory: beginningInventory + Purchase - Consumption
    // quantityChanged = Purchase (positive) or Consumption (negative)
    const newEndingInventory = record.beginningInventory + quantityChanged;

    // Validate ending inventory is not negative
    if (newEndingInventory < 0) {
      await t.rollback();
      return res.status(400).json({ 
        error: 'Consumption cannot exceed beginning inventory plus purchases',
        details: `Beginning Inv: ${record.beginningInventory}, Quantity Changed: ${quantityChanged}`
      });
    }

    // Get the consumable info to find its name for course inventory lookup
    const consumable = await Consumable.findByPk(record.consumableId, { transaction: t });
    if (!consumable) {
      await t.rollback();
      return res.status(404).json({ error: 'Consumable not found' });
    }

    // AUTO-UPDATE: Handle Stock In (Purchase) - update main consumable quantity
    let stockUpdateAmount = 0;
    if (record.actionType === 'Stock In' && quantityDifference !== 0) {
      stockUpdateAmount = quantityDifference;
      
      const newMainQuantity = consumable.quantity + stockUpdateAmount;
      await consumable.update({
        quantity: Math.max(0, newMainQuantity),
        quantityMain: Math.max(0, (consumable.quantityMain || 0) + stockUpdateAmount),
      }, { transaction: t });

      console.log(`[Stock Update] Added ${stockUpdateAmount} units to ${consumable.itemName} main inventory`);
    }

    // AUTO-REPLENISHMENT: If this is a Stock Out (negative quantityChanged) with a change, update course inventory
    let replenishmentAdjustment = 0;
    if (record.actionType === 'Stock Out' && quantityDifference !== 0 && record.course) {
      const courseConsumable = await Consumable.findOne({
        where: {
          itemName: consumable.itemName,
          category: record.course.toUpperCase(),
        },
        transaction: t
      });

      if (courseConsumable) {
        // For Stock Out edits: if consumption changed by X, replenishment adjustment is -X
        // Example 1: consumption -21 → -20 (less consumed), quantityDifference = +1, adjustment = -1 (remove from training)
        // Example 2: consumption -20 → -21 (more consumed), quantityDifference = -1, adjustment = +1 (add to training)
        replenishmentAdjustment = -quantityDifference;
        
        const newQuantity = courseConsumable.quantity + replenishmentAdjustment;
        
        // Update quantity field based on location
        // When editing main (location='main'), we update the training consumable's quantityAnnex
        // When editing annex (location='annex'), we update the main consumable's quantityMain
        const updateData = {
          quantity: Math.max(0, newQuantity),
        };
        
        if (record.location === 'main') {
          // Editing main inventory → update training consumable's quantityAnnex
          updateData.quantityAnnex = Math.max(0, (courseConsumable.quantityAnnex || 0) + replenishmentAdjustment);
        } else {
          // Editing training inventory → update main consumable's quantityMain
          updateData.quantityMain = Math.max(0, (courseConsumable.quantityMain || 0) + replenishmentAdjustment);
        }
        
        await courseConsumable.update(updateData, { transaction: t });

        const direction = replenishmentAdjustment > 0 ? 'Added' : 'Removed';
        const amount = Math.abs(replenishmentAdjustment);
        console.log(`[Auto-Replenishment] ${direction} ${amount} units to/from ${courseConsumable.itemName} (${record.course})`);
      }
    }

    // Update the edited history record
    await record.update({
      quantityChanged: quantityChanged,
      endingInventory: newEndingInventory,
      description: description || record.description,
      course: course || record.course,
      trainer: trainer || record.trainer,
      purpose: purpose || record.purpose,
    }, { transaction: t });

    // CASCADING RECALCULATION: Find all subsequent records for this consumable
    const subsequentRecords = await InventoryHistory.findAll({
      where: {
        consumableId: record.consumableId,
        createdAt: { [Op.gt]: record.createdAt },
        actionType: { [Op.in]: ['Stock In', 'Stock Out'] }, // Only cascade for these types
      },
      order: [['createdAt', 'ASC']],
      transaction: t,
    });

    let cascadeCount = 0;
    let lastEndingInventory = newEndingInventory;

    // Recalculate each subsequent record's beginning and ending inventory
    for (const subRecord of subsequentRecords) {
      const newBeginning = lastEndingInventory;
      const newEnding = newBeginning + subRecord.quantityChanged;

      // Validate that the cascaded ending inventory is not negative
      if (newEnding < 0) {
        await t.rollback();
        return res.status(400).json({
          error: 'Edit creates negative inventory in subsequent transaction',
          details: `Record ID ${subRecord.id} would have ending inventory of ${newEnding}`,
        });
      }

      await subRecord.update({
        beginningInventory: newBeginning,
        endingInventory: newEnding,
      }, { transaction: t });

      lastEndingInventory = newEnding;
      cascadeCount++;
    }

    // Update Consumable quantity fields based on location to match the final ending inventory
    const finalUpdateData = {
      quantity: Math.max(0, lastEndingInventory),
    };
    
    // Update the appropriate location field based on the history record's location
    if (record.location === 'annex') {
      // For annex/training inventory: update quantityAnnex
      finalUpdateData.quantityAnnex = Math.max(0, lastEndingInventory);
    } else {
      // For main inventory: update quantityMain (default)
      finalUpdateData.quantityMain = Math.max(0, lastEndingInventory);
    }
    
    await consumable.update(finalUpdateData, { transaction: t });

    console.log(`[Cascade Recalculation] Updated ${cascadeCount} subsequent records. Final quantity: ${lastEndingInventory}`);

    // Commit transaction
    await t.commit();

    // Broadcast stock update to all connected users via Socket.IO
    const io = req.app?.locals?.io;
    if (io) {
      io.emit('stock_updated', {
        id: consumable.id,
        itemName: consumable.itemName,
        quantity: lastEndingInventory,
        category: consumable.category,
      });
      // Also emit history update event
      io.emit('history_updated', {
        recordId: id,
        consumableId: consumable.id,
        quantityChanged,
        endingInventory: newEndingInventory,
      });
    }

    // Return updated record with cascade info
    const updated = record.get({ plain: true });
    return res.json({
      success: true,
      message: 'History record updated successfully',
      data: {
        id: updated.id,
        quantityChanged: updated.quantityChanged,
        endingInventory: updated.endingInventory,
        description: updated.description,
        course: updated.course,
        trainer: updated.trainer,
        purpose: updated.purpose,
        stockUpdateAmount: stockUpdateAmount !== 0 ? stockUpdateAmount : Math.abs(quantityDifference),
        replenishmentAdjustment: replenishmentAdjustment,
        cascadeCount: cascadeCount,
        finalQuantity: lastEndingInventory,
        affectedRecordIds: subsequentRecords.map(r => r.id),
      }
    });
  } catch (err) {
    await t.rollback();
    console.error('[updateInventoryHistory]', err);
    return res.status(500).json({ error: 'Failed to update history record.' });
  }
};

// ─── POST /api/history/:consumableId/recalculate ─────────────────────────────
// Recalculates and syncs all ending inventory values for a consumable
// Query param: ?location=main|annex (defaults to 'main')
// Updates the consumable's current stock to match the final ending inventory
const recalculateAndSyncInventory = async (req, res) => {
  const t = await InventoryHistory.sequelize.transaction();
  try {
    const consumableId = parseInt(req.params.consumableId, 10);
    const location = req.query.location || 'main'; // Get location from query param
    
    if (isNaN(consumableId)) {
      return res.status(400).json({ error: 'Invalid consumableId' });
    }

    // Find the consumable
    const consumable = await Consumable.findByPk(consumableId, { transaction: t });
    if (!consumable) {
      await t.rollback();
      return res.status(404).json({ error: 'Consumable not found' });
    }

    // Get all history records for this consumable and location, sorted by date
    const historyRecords = await InventoryHistory.findAll({
      where: { 
        consumableId,
        location: location, // Only get records for the specified location
      },
      order: [['createdAt', 'ASC']],
      transaction: t,
    });

    if (historyRecords.length === 0) {
      // No history records for this location - set ending inventory to current
      await t.rollback();
      return res.json({
        message: `No history records for ${location} inventory to recalculate`,
        consumableId,
        location,
        recordsUpdated: 0,
        currentQuantity: location === 'main' ? consumable.quantityMain : consumable.quantityAnnex,
      });
    }

    // Calculate beginning and ending inventory for each record
    let lastEndingInventory = null;
    let recordsToUpdate = [];

    for (const record of historyRecords) {
      const beginningInventory = lastEndingInventory !== null ? lastEndingInventory : 0;
      const endingInventory = beginningInventory + record.quantityChanged;

      recordsToUpdate.push({
        id: record.id,
        beginningInventory,
        endingInventory: Math.max(0, endingInventory), // Prevent negative inventory
      });

      lastEndingInventory = Math.max(0, endingInventory);
    }

    // Update all history records in transaction
    for (const update of recordsToUpdate) {
      await InventoryHistory.update(
        {
          beginningInventory: update.beginningInventory,
          endingInventory: update.endingInventory,
        },
        {
          where: { id: update.id },
          transaction: t,
        }
      );
    }

    // Update consumable quantity to final ending inventory (location-specific)
    const finalQuantity = lastEndingInventory !== null ? lastEndingInventory : 0;
    
    const updateData = { quantity: finalQuantity };
    if (location === 'main') {
      updateData.quantityMain = finalQuantity;
    } else {
      updateData.quantityAnnex = finalQuantity;
    }

    await consumable.update(updateData, { transaction: t });

    // Commit transaction
    await t.commit();

    // Broadcast update via Socket.IO
    const io = req.app?.locals?.io;
    if (io) {
      io.emit('stock_updated', {
        id: consumable.id,
        itemName: consumable.itemName,
        quantity: finalQuantity,
        location: location,
        category: consumable.category,
      });
      io.emit('history_recalculated', {
        consumableId,
        location,
        finalQuantity,
        recordsUpdated: recordsToUpdate.length,
      });
    }

    console.log(
      `[RecalculateAndSyncInventory] Updated ${recordsToUpdate.length} ${location} inventory records for ${consumable.itemName}. Final quantity: ${finalQuantity}`
    );

    return res.json({
      success: true,
      message: `Inventory history recalculated and synced successfully for ${location} location`,
      consumableId,
      itemName: consumable.itemName,
      location,
      finalQuantity,
      recordsUpdated: recordsToUpdate.length,
    });
  } catch (err) {
    await t.rollback();
    console.error('[recalculateAndSyncInventory]', err);
    return res.status(500).json({ error: 'Failed to recalculate inventory' });
  }
};

module.exports = {
  getHistory,
  updateInventoryHistory,
  recalculateAndSyncInventory,
};
