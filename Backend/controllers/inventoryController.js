// ─── POST /api/inventory/:id/checkout ───────────────────────────────────────
// Body: { quantity, unit?, destination, notes }
// User is automatically extracted from authenticated request (req.user)
const checkoutConsumable = async (req, res) => {
  const id = isNaN(req.params.id) ? req.params.id : parseInt(req.params.id, 10);
  const { quantity, unit, destination, notes } = req.body;
  // Allow decimal input for length units (e.g., 2.5 ft)
  const rawQty = Number.parseFloat(quantity);
  if (Number.isNaN(rawQty) || rawQty <= 0) {
    return res.status(400).json({ error: 'quantity must be a positive number.' });
  }
  // Convert to base unit (inches) when unit is 'ft'
  const userUnit = String(unit || '').toLowerCase();
  const finalQty = userUnit === 'ft' ? Math.round(rawQty * 12) : Math.round(rawQty);
  if (finalQty <= 0) {
    return res.status(400).json({ error: 'quantity after conversion must be at least 1.' });
  }
  if (!destination) {
    return res.status(400).json({ error: 'destination is required.' });
  }
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const item = await Consumable.findOne({ where: { id, ...ACTIVE_WHERE } });
    if (!item) {
      return res.status(404).json({ error: 'Consumable not found.' });
    }
    if (item.quantity < finalQty) {
      return res.status(400).json({ error: `Insufficient stock. Only ${item.quantity} available.` });
    }
    item.quantity -= finalQty;
    await item.save();

    const performedByUser = req.user?.fullName || req.user?.username || 'System';
    await logHistory({
      consumableId: item.id,
      actionType: 'Checkout',
      quantityChanged: -finalQty,
      description: `Destination: ${destination}${notes ? ' | Notes: ' + notes : ''}`,
      performedBy: performedByUser,
      performedById: req.user?.id || null,
      startDate: null,
      endDate: null,
    });

    // Broadcast stock update to all connected users via Socket.IO
    const io = req.app?.locals?.io;
    if (io) {
      io.emit('stock_updated', {
        id: item.id,
        itemName: item.itemName,
        quantity: item.quantity,
        category: item.category,
        unit: item.unit,
      });
    }

    return res.json(formatItem(item));
  } catch (err) {
    console.error('[checkoutConsumable]', err);
    return res.status(500).json({ error: 'Failed to checkout consumable.' });
  }
};
const Consumable = require('../models/Consumable');
const ConsumableItemStock = require('../models/ConsumableItemStock');
const ConsumableRequest = require('../models/ConsumableRequest');
const InventoryHistory = require('../models/InventoryHistory');
const Notification = require('../models/Notification');
const User = require('../models/User');
const sequelize = require('../config/database');

const ACTIVE_WHERE = { isArchived: false };

/**
 * Send notification to all admin users via Socket.IO
 */
const sendNotificationToAdmins = async (req, notificationType, message, staffName, consumableName, quantity, metadata) => {
  try {
    // Find all admin users
    const admins = await User.findAll({ where: { role: 'admin' } });
    
    // Create notification for each admin
    for (const admin of admins) {
      const notification = await Notification.create({
        userId: admin.id,
        type: notificationType,
        message,
        staffName,
        consumableName,
        quantity,
        metadata,
      });

      // Emit real-time notification via Socket.IO
      const io = req.app?.locals?.io;
      const userSockets = req.app?.locals?.userSockets;
      
      if (io && userSockets && userSockets[admin.id]) {
        io.to(userSockets[admin.id]).emit('new_notification', {
          id: notification.id,
          type: notificationType,
          message,
          staffName,
          consumableName,
          quantity,
          metadata,
          isRead: false,
          createdAt: notification.createdAt,
        });
      }
    }
  } catch (err) {
    console.error('[sendNotificationToAdmins]', err);
  }
};

/**
 * Strips timestamps and returns only the fields the frontend needs.
 * Guarantees the shape: { id, itemName, category, quantity, unit, reorderLevel }
 * location: 'main' | 'annex' determines which location's quantity to return
 */
const formatItem = (instance, location = 'main') => {
  const plain = instance.get({ plain: true });
  const quantityField = location === 'main' ? plain.quantityMain : plain.quantityAnnex;
  return { 
    id: plain.id, 
    itemName: plain.itemName, 
    category: plain.category, 
    quantity: quantityField !== undefined ? quantityField : plain.quantity,
    unit: plain.unit, 
    reorderLevel: plain.reorderLevel,
    stocks: (plain.stocks || []).map(s => ({ id: s.id, lengthLabel: s.lengthLabel, quantity: s.quantity }))
  };
};

const parsePayload = ({ itemName, category, quantity, unit, reorderLevel, location = 'main' }) => {
  const parsedQty = quantity !== undefined ? parseInt(quantity, 10) : 0;
  return {
    itemName: String(itemName).trim(),
    category: String(category).toUpperCase(),
    quantity: parsedQty,
    quantityMain: location === 'annex' ? 0 : parsedQty,
    quantityAnnex: location === 'annex' ? parsedQty : 0,
    unit: String(unit).trim(),
    reorderLevel: reorderLevel !== undefined ? parseInt(reorderLevel, 10) : 10,
  };
};

// Parse a length label like "10ft", "10 ft", "8 in", "8 inch" into inches (integer)
const parseLengthLabelToInches = (label) => {
  if (!label) return null;
  const m = String(label).trim().toLowerCase().match(/^([0-9]*\.?[0-9]+)\s*(ft|feet|in|inch|inches)?$/i);
  if (!m) return null;
  const value = Number.parseFloat(m[1]);
  const unit = (m[2] || '').toLowerCase();
  if (unit.startsWith('ft')) return Math.round(value * 12);
  // default to inches if unit missing or is inch
  return Math.round(value);
}

const logHistory = async ({ consumableId, actionType, quantityChanged, description, performedBy, performedById, beginningInventory, endingInventory, course, trainer, batch, purpose, location, startDate, endDate }) => {
  await InventoryHistory.create({
    consumableId,
    actionType,
    quantityChanged,
    description: description || null,
    performedBy: performedBy || 'System',
    performedById: performedById || null,
    beginningInventory: beginningInventory || null,
    endingInventory: endingInventory || null,
    course: course || null,
    trainer: trainer || null,
    batch: batch || null,
    purpose: purpose || null,
    location: location || 'main',
    startDate: startDate || null,
    endDate: endDate || null,
  });
};

// ─── GET /api/inventory ────────────────────────────────────────────────────────
// Returns { tracks: { eim: [...], smaw: [...], css: [...] } }
// Used by the Dashboard page to show totals and low-stock alerts.
const getInventory = async (req, res) => {
  const queryCategory = req.query.category?.toUpperCase();
  const archivedOnly = String(req.query.archived || '').toLowerCase() === 'true';
  const location = req.query.location || 'main';

  try {
    const where = { isArchived: archivedOnly };
    if (queryCategory) {
      where.category = queryCategory;
    }

    const rows = await Consumable.findAll({ where, order: [['itemName', 'ASC']], include: [{ model: ConsumableItemStock, as: 'stocks' }] });

    if (queryCategory) {
      return res.json({ items: rows.map(row => formatItem(row, location)) });
    }

    const tracks = { eim: [], smaw: [], css: [] };
    for (const row of rows) {
      const key = row.category.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(tracks, key)) {
        tracks[key].push(formatItem(row, location));
      }
    }

    return res.json({ tracks });
  } catch (err) {
    console.error('[getInventory]', err);
    return res.status(500).json({ error: 'Failed to fetch inventory.' });
  }
};

// ─── GET /api/inventory/:category ─────────────────────────────────────────────
// Returns { items: [...] }
// Used by the EIM, SMAW, and CSS inventory pages.
// :category is lowercase from the frontend ('eim', 'smaw', 'css').
const getInventoryByCategory = async (req, res) => {
  const upperCategory = req.params.category.toUpperCase();
  const archivedOnly = String(req.query.archived || '').toLowerCase() === 'true';
  const location = req.query.location || 'main';

  console.log(`[getInventoryByCategory] Fetching ${upperCategory} at location ${location}, archivedOnly: ${archivedOnly}`);

  try {
    const rows = await Consumable.findAll({
      where: { category: upperCategory, isArchived: archivedOnly },
      order: [['itemName', 'ASC']],
      include: [{ model: ConsumableItemStock, as: 'stocks' }],
    });

    console.log(`[getInventoryByCategory] Found ${rows.length} items for category ${upperCategory}`);
    
    return res.json({ items: rows.map(row => formatItem(row, location)) });
  } catch (err) {
    console.error('[getInventoryByCategory]', err);
    return res.status(500).json({ error: 'Failed to fetch inventory.' });
  }
};

// ─── POST /api/inventory ───────────────────────────────────────────────────────
// Body: { itemName, category, quantity?, unit, reorderLevel? }
// Returns the newly created consumable.
const addConsumable = async (req, res) => {
  const { itemName, category, quantity, unit, reorderLevel, location } = req.body;

  if (!itemName || !category || !unit) {
    return res.status(400).json({ error: 'itemName, category, and unit are required.' });
  }

  const upperCategory = String(category).toUpperCase();
  const requestedLocation = location === 'annex' ? 'annex' : 'main';

  try {
    const requesterRole = req.user?.role;
    const requesterName = req.user?.username || 'Staff';
    const parsedQty = Number.parseInt(quantity, 10);
    const parsedReorderLevel = reorderLevel !== undefined ? Number.parseInt(reorderLevel, 10) : 10;

    // Staff cannot directly create consumables. Their submission becomes an admin-reviewed request.
    if (requesterRole === 'staff') {
      if (Number.isNaN(parsedQty) || parsedQty <= 0) {
        return res.status(400).json({ error: 'quantity must be a positive integer for new consumable requests.' });
      }

      const request = await ConsumableRequest.create({
        consumableId: null,
        requestedById: req.user.id,
        requestType: 'New Consumable',
        quantity: parsedQty,
        reason: req.body.reason || 'Request to add a new consumable item.',
        purpose: req.body.purpose || 'Replenishment',
        course: req.body.course || upperCategory,
        trainer: req.body.trainer || null,
        startDate: req.body.startDate || new Date(),
        endDate: req.body.endDate || new Date(),
        status: 'pending',
        requestedItemName: String(itemName).trim(),
        requestedCategory: upperCategory,
        requestedUnit: String(unit).trim(),
        requestedReorderLevel: Number.isNaN(parsedReorderLevel) ? 10 : parsedReorderLevel,
        requestedLocation,
      });

      const trackName = upperCategory.toLowerCase();
      const notificationMetadata = {
        requestId: request.id,
        requestType: 'New Consumable',
        requesterId: req.user.id,
        requesterName,
        itemName: String(itemName).trim(),
        category: upperCategory,
        quantity: parsedQty,
        unit: String(unit).trim(),
        reorderLevel: Number.isNaN(parsedReorderLevel) ? 10 : parsedReorderLevel,
        location: requestedLocation,
        track: trackName,
        target: 'pending-requests',
      };

      await sendNotificationToAdmins(
        req,
        'stock_requested',
        `${requesterName} requested a new consumable: ${String(itemName).trim()} (${parsedQty} ${String(unit).trim()})`,
        requesterName,
        String(itemName).trim(),
        parsedQty,
        notificationMetadata
      );

      return res.status(202).json({
        message: 'New consumable request submitted for admin approval.',
        createdAsRequest: true,
        request,
      });
    }

    console.log(`[addConsumable] Creating new item: ${itemName}, category: ${upperCategory}, location: ${requestedLocation}`);
    
    const item = await Consumable.create(parsePayload({
      itemName,
      category: upperCategory,
      quantity,
      unit,
      reorderLevel,
      location: requestedLocation,
    }));

    console.log(`[addConsumable] Item created successfully:`, { id: item.id, itemName: item.itemName, category: item.category });

    const providedStart = req.body.startDate ? new Date(req.body.startDate) : null;
    const providedEnd = req.body.endDate ? new Date(req.body.endDate) : null;

    await logHistory({
      consumableId: item.id,
      actionType: 'Stock In',
      quantityChanged: item.quantity,
      description: 'Initial stock from new consumable creation.',
      performedBy: req.body.performedBy || requesterName,
      performedById: req.user?.id || null,
      location: requestedLocation,
      startDate: providedStart,
      endDate: providedEnd,
    });

    // Send notification to admins
    const staffName = req.body.performedBy || requesterName;
    const trackName = upperCategory.toLowerCase();
    await sendNotificationToAdmins(
      req,
      'consumable_added',
      `${staffName} added a new consumable: ${itemName}`,
      staffName,
      itemName,
      quantity,
      { itemId: item.id, track: trackName, category: upperCategory }
    );

    return res.status(201).json(formatItem(item));
  } catch (err) {
    if (err.name === 'SequelizeValidationError') {
      const messages = err.errors.map((e) => e.message);
      return res.status(400).json({ error: messages.join(' ') });
    }
    console.error('[addConsumable]', err);
    return res.status(500).json({ error: 'Failed to add consumable.' });
  }
};

// ─── PUT /api/inventory/:id ───────────────────────────────────────────────────
// Body: { itemName, category, quantity, unit, reorderLevel }
const updateConsumable = async (req, res) => {
  const id = isNaN(req.params.id) ? req.params.id : parseInt(req.params.id, 10);
  const { itemName, category, quantity, unit, reorderLevel } = req.body;

  if (!itemName || !category || !unit) {
    return res.status(400).json({ error: 'itemName, category, and unit are required.' });
  }

  const upperCategory = String(category).toUpperCase();

  try {
    const item = await Consumable.findOne({ where: { id, ...ACTIVE_WHERE } });
    if (!item) {
      return res.status(404).json({ error: 'Consumable not found.' });
    }

    const previousQuantity = item.quantity;

    const payload = parsePayload({
      itemName,
      category: upperCategory,
      quantity,
      unit,
      reorderLevel,
    });

    Object.assign(item, payload);
    await item.save();

    const delta = item.quantity - previousQuantity;
    const actionType = delta > 0 ? 'Stock In' : delta < 0 ? 'Stock Out' : 'Update';

    await logHistory({
      consumableId: item.id,
      actionType,
      quantityChanged: delta,
      description: actionType === 'Update' ? 'Item details updated.' : 'Quantity adjusted through item update.',
      performedBy: req.body.performedBy,
    });

    // Broadcast stock update to all connected users via Socket.IO
    const io = req.app?.locals?.io;
    if (io) {
      io.emit('stock_updated', {
        id: item.id,
        itemName: item.itemName,
        quantity: item.quantity,
        category: item.category,
      });
    }

    return res.json(formatItem(item));
  } catch (err) {
    if (err.name === 'SequelizeValidationError') {
      const messages = err.errors.map((e) => e.message);
      return res.status(400).json({ error: messages.join(' ') });
    }
    console.error('[updateConsumable]', err);
    return res.status(500).json({ error: 'Failed to update consumable.' });
  }
};

// ─── PATCH /api/inventory/:id/stock ───────────────────────────────────────────
// Body: { type: 'in' | 'out', amount: number }
// Returns the updated consumable.
const updateStock = async (req, res) => {
  const id = isNaN(req.params.id) ? req.params.id : parseInt(req.params.id, 10);
  const { type, amount, unit, lengthLabel, pieces } = req.body;

  if (!['in', 'out'].includes(type)) {
    return res.status(400).json({ error: "type must be 'in' or 'out'." });
  }
  // Determine the delta in base unit (inches).
  let parsedAmount = 0

  // If a lengthLabel is provided, the client intends to add/remove pieces of that fixed length.
  if (lengthLabel) {
    const pieceCount = Number.parseInt(pieces === undefined ? amount : pieces, 10);
    if (Number.isNaN(pieceCount) || pieceCount <= 0) {
      return res.status(400).json({ error: 'pieces must be a positive integer for length-labeled stock changes.' });
    }
    const pieceInches = parseLengthLabelToInches(lengthLabel);
    if (pieceInches === null) {
      return res.status(400).json({ error: 'Invalid lengthLabel format. Use formats like "10ft", "8 in".' });
    }
    parsedAmount = pieceCount * pieceInches;
  } else {
    // Allow decimal entry for length units (ft). Convert to base unit (inches) before applying.
    const rawAmount = Number.parseFloat(amount)
    if (Number.isNaN(rawAmount) || rawAmount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number.' });
    }
    const userUnit = String(unit || '').toLowerCase()
    parsedAmount = userUnit === 'ft' ? Math.round(rawAmount * 12) : Math.round(rawAmount)
  }

  try {
    // If a lengthLabel is provided, enforce that this operation applies to the Annex (training inventory).
    let currentLocation = req.body.location || 'main';
    if (lengthLabel) currentLocation = 'annex';
    const deductMode = req.body.deductMode || 'training';

    // Role-based access control: Staff can only modify training inventory
    if (req.user?.role === 'staff' && currentLocation === 'main') {
      return res.status(403).json({ 
        error: 'Staff members can only modify training inventory. Contact an administrator to modify main inventory.' 
      });
    }

    if (type === 'out' && currentLocation === 'main' && deductMode === 'stock_out' && !req.body.description?.trim()) {
      return res.status(400).json({
        error: 'Remarks are required for Stock Out.',
      });
    }

    const quantityField = currentLocation === 'main' ? 'quantityMain' : 'quantityAnnex';

    // Run the stock updates inside a transaction to ensure atomicity between Consumable and ConsumableItemStock
    const result = await sequelize.transaction(async (t) => {
      const item = await Consumable.findOne({ where: { id, ...ACTIVE_WHERE }, transaction: t });
      if (!item) {
        throw new Error('Consumable not found.');
      }

      const beginningQty = item[quantityField];
      const newQuantity = type === 'in' ? item[quantityField] + parsedAmount : item[quantityField] - parsedAmount;
      if (newQuantity < 0) {
        throw new Error(`Insufficient stock. Cannot deduct ${parsedAmount} from current quantity of ${item[quantityField]}.`);
      }

      // Update current location's quantity
      item[quantityField] = newQuantity;

      // If length-labeled, update or create the stock row constrained to annex location
      let stockRow = null;
      let pieceCount = 0;
      if (lengthLabel) {
        pieceCount = Number.parseInt(pieces === undefined ? amount : pieces, 10);
        if (Number.isNaN(pieceCount) || pieceCount <= 0) {
          throw new Error('pieces must be a positive integer for length-labeled stock changes.');
        }

        stockRow = await ConsumableItemStock.findOne({ where: { consumableId: item.id, lengthLabel, location: 'annex' }, transaction: t });
        if (!stockRow) {
          if (type === 'out') {
            throw new Error(`No stock row found for length ${lengthLabel}.`);
          }
          stockRow = await ConsumableItemStock.create({ consumableId: item.id, lengthLabel, quantity: 0, location: 'annex' }, { transaction: t });
        }

        const newPieces = type === 'in' ? stockRow.quantity + pieceCount : stockRow.quantity - pieceCount;
        if (newPieces < 0) {
          throw new Error(`Insufficient pieces of ${lengthLabel}. Only ${stockRow.quantity} available.`);
        }
        stockRow.quantity = newPieces;
        await stockRow.save({ transaction: t });
      }

      await item.save({ transaction: t });

      return { itemId: item.id, beginningQty: item[quantityField] - (type === 'in' ? parsedAmount : -parsedAmount), newQuantity: item[quantityField], stockRow, pieceCount };
    });

    // If transaction returned an error message string, handle it
    if (!result) {
      return res.status(500).json({ error: 'Failed to update stock.' });
    }

    // After successful transaction, log histories (outside transaction)
    const performedByUser = req.user?.fullName || req.user?.username || 'System';
    await logHistory({
      consumableId: result.itemId,
      actionType: type === 'in' ? 'Stock In' : 'Stock Out',
      quantityChanged: type === 'in' ? parsedAmount : -parsedAmount,
      description: req.body.description || null,
      performedBy: performedByUser,
      performedById: req.user?.id || null,
      beginningInventory: result.beginningQty,
      endingInventory: result.newQuantity,
      course: req.body.course || null,
      trainer: req.body.trainer || null,
      batch: req.body.batch || null,
      purpose: req.body.purpose || null,
      location: lengthLabel ? 'annex' : (req.body.location || 'main'),
      startDate: req.body.startDate || null,
      endDate: req.body.endDate || null,
    });

    // If deducting from MAIN (transfer to annex) and not a stock_out, record that transfer as Stock In for annex
    if (type === 'out' && req.body.location === 'main' && (req.body.deductMode || 'training') !== 'stock_out') {
      const oppositeBeginningQty = 0; // not computed here; history already recorded above for source
      await logHistory({
        consumableId: result.itemId,
        actionType: 'Stock In',
        quantityChanged: parsedAmount,
        description: req.body.description ? `Transfer from main: ${req.body.description}` : `Transfer from main`,
        performedBy: performedByUser,
        performedById: req.user?.id || null,
        beginningInventory: oppositeBeginningQty,
        endingInventory: oppositeBeginningQty + parsedAmount,
        course: req.body.course || null,
        trainer: req.body.trainer || null,
        batch: req.body.batch || null,
        purpose: req.body.purpose || null,
        location: 'annex',
        startDate: req.body.startDate || null,
        endDate: req.body.endDate || null,
      });
    }

    // Send notification to admins
    const staffName = req.user?.fullName || req.user?.username || 'System';
    const actionText = type === 'in' ? 'added' : 'deducted';
    const trackName = (await Consumable.findByPk(result.itemId)).category.toLowerCase();
    await sendNotificationToAdmins(
      req,
      type === 'in' ? 'stock_added' : 'stock_removed',
      `${staffName} ${actionText} ${parsedAmount} units of item ID ${result.itemId}`,
      staffName,
      (await Consumable.findByPk(result.itemId)).itemName,
      parsedAmount,
      { itemId: result.itemId, type, parsedAmount }
    );

    // Broadcast updated item to clients
    const updatedItem = await Consumable.findByPk(result.itemId, { include: [{ model: ConsumableItemStock, as: 'stocks' }] });
    const io = req.app?.locals?.io;
    if (io) {
      io.emit('stock_updated', {
        id: updatedItem.id,
        itemName: updatedItem.itemName,
        category: updatedItem.category,
        quantity: lengthLabel ? updatedItem.quantityAnnex : (req.body.location === 'main' ? updatedItem.quantityMain : updatedItem.quantityAnnex),
        unit: updatedItem.unit,
        reorderLevel: updatedItem.reorderLevel,
        actionType: type === 'in' ? 'Stock In' : 'Stock Out',
        staffName,
        parsedAmount,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json(formatItem(updatedItem, lengthLabel ? 'annex' : (req.body.location || 'main')));
  } catch (err) {
    console.error('[updateStock]', err);
    const msg = err.message || 'Failed to update stock.';
    return res.status(400).json({ error: msg });
  }
};

// ─── PATCH /api/inventory/:id/archive ─────────────────────────────────────────
const archiveItem = async (req, res) => {
  const id = isNaN(req.params.id) ? req.params.id : parseInt(req.params.id, 10);

  try {
    const item = await Consumable.findOne({ where: { id, ...ACTIVE_WHERE } });
    if (!item) {
      return res.status(404).json({ error: 'Consumable not found.' });
    }

    item.isArchived = true;
    await item.save();

    await logHistory({
      consumableId: item.id,
      actionType: 'Archive',
      quantityChanged: 0,
      description: 'Item archived from inventory list.',
      performedBy: req.body?.performedBy,
      performedById: req.user?.id || null,
      startDate: null,
      endDate: null,
    });

    return res.json({ message: 'Item archived successfully.', id });
  } catch (err) {
    console.error('[archiveItem]', err);
    return res.status(500).json({ error: 'Failed to archive item.' });
  }
};

// ─── PATCH /api/inventory/:id/restore ─────────────────────────────────────────
const restoreItem = async (req, res) => {
  const id = isNaN(req.params.id) ? req.params.id : parseInt(req.params.id, 10);

  try {
    const item = await Consumable.findOne({ where: { id, isArchived: true } });
    if (!item) {
      return res.status(404).json({ error: 'Archived consumable not found.' });
    }

    item.isArchived = false;
    await item.save();

    await logHistory({
      consumableId: item.id,
      actionType: 'Update',
      quantityChanged: 0,
      description: 'Item restored from archive.',
      performedBy: req.body?.performedBy,
    });

    return res.json({ message: 'Item restored successfully.', id });
  } catch (err) {
    console.error('[restoreItem]', err);
    return res.status(500).json({ error: 'Failed to restore item.' });
  }
};

// ─── DELETE /api/inventory/:id ─────────────────────────────────────────────────
// Returns { message, id } on success.
const deleteItem = async (req, res) => {
  const id = isNaN(req.params.id) ? req.params.id : parseInt(req.params.id, 10);

  try {
    const item = await Consumable.findByPk(id);
    if (!item) {
      return res.status(404).json({ error: 'Consumable not found.' });
    }

    await item.destroy();
    return res.json({ message: 'Item deleted successfully.', id });
  } catch (err) {
    console.error('[deleteItem]', err);
    return res.status(500).json({ error: 'Failed to delete item.' });
  }
};

module.exports = {
  getInventory,
  getInventoryByCategory,
  addConsumable,
  updateConsumable,
  updateStock,
  checkoutConsumable,
  archiveItem,
  restoreItem,
  deleteItem,
};
