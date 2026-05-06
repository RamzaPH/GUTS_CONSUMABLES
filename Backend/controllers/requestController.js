const Consumable = require('../models/Consumable');
const ConsumableRequest = require('../models/ConsumableRequest');
const InventoryHistory = require('../models/InventoryHistory');
const User = require('../models/User');
const Notification = require('../models/Notification');

const emitUserNotification = (userId, notification) => {
  const socketId = global.userSockets?.[userId];
  if (socketId && global.io) {
    global.io.to(socketId).emit('new_notification', notification);
  }
};

const MAX_VERIFICATION_IMAGES = 5;
const MAX_VERIFICATION_IMAGE_BYTES = 2 * 1024 * 1024;

const normalizeVerificationImages = (rawImages, uploaderName) => {
  if (!rawImages) return [];

  let verificationImages = rawImages;
  if (typeof verificationImages === 'string') {
    verificationImages = JSON.parse(verificationImages);
  }

  if (!Array.isArray(verificationImages)) {
    throw new Error('verificationImages must be an array.');
  }

  if (verificationImages.length > MAX_VERIFICATION_IMAGES) {
    throw new Error(`You can upload up to ${MAX_VERIFICATION_IMAGES} verification images.`);
  }

  return verificationImages.map((image, index) => {
    if (!image || typeof image !== 'object') {
      throw new Error(`verificationImages[${index}] is invalid.`);
    }

    const dataUrl = typeof image.dataUrl === 'string' ? image.dataUrl.trim() : '';
    if (!dataUrl.startsWith('data:image/')) {
      throw new Error(`verificationImages[${index}] must be an image data URL.`);
    }

    const mimeMatch = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
    if (!mimeMatch) {
      throw new Error(`verificationImages[${index}] has an invalid image format.`);
    }

    const base64Payload = dataUrl.includes(',') ? dataUrl.split(',')[1] : '';
    const estimatedBytes = Math.ceil((base64Payload.length * 3) / 4);
    const declaredSize = Number(image.size);
    const normalizedSize = Number.isFinite(declaredSize) && declaredSize > 0 ? declaredSize : estimatedBytes;

    if (normalizedSize > MAX_VERIFICATION_IMAGE_BYTES) {
      throw new Error(`verificationImages[${index}] exceeds the 2MB limit.`);
    }

    return {
      fileName: typeof image.fileName === 'string' && image.fileName.trim()
        ? image.fileName.trim()
        : `verification-${index + 1}.jpg`,
      fileType: mimeMatch[1],
      size: normalizedSize,
      dataUrl,
      uploadedAt: image.uploadedAt || new Date().toISOString(),
      uploadedBy: uploaderName,
    };
  });
};

const getRequestActionText = (requestType) => {
  if (requestType === 'Stock In') return 'add';
  if (requestType === 'Stock Out') return 'transfer';
  if (requestType === 'New Consumable') return 'create';
  return 'process';
};

// Create a new stock modification request (staff only)
exports.createRequest = async (req, res) => {
  try {
    const { consumableId, requestType, quantity, reason, purpose, course, trainer, startDate, endDate, verificationImages } = req.body;
    const userId = req.user.id;
    const requesterName = req.user.username;

    // Validate required fields
    if (!consumableId || !requestType || !quantity) {
      return res.status(400).json({ error: 'consumableId, requestType, and quantity are required.' });
    }

    if (!['Stock In', 'Stock Out'].includes(requestType)) {
      return res.status(400).json({ error: 'requestType must be "Stock In" or "Stock Out".' });
    }

    if (quantity < 1 || !Number.isInteger(quantity)) {
      return res.status(400).json({ error: 'quantity must be a positive integer.' });
    }

    let normalizedVerificationImages = [];
    try {
      normalizedVerificationImages = normalizeVerificationImages(verificationImages, requesterName);
    } catch (imageError) {
      return res.status(400).json({ error: imageError.message });
    }

    // Get consumable
    const consumable = await Consumable.findByPk(consumableId);
    if (!consumable) {
      return res.status(404).json({ error: 'Consumable not found.' });
    }

    // For Stock Out requests, validate against current main inventory
    if (requestType === 'Stock Out' && quantity > consumable.quantityMain) {
      return res.status(400).json({ 
        error: `Cannot request ${quantity} units. Only ${consumable.quantityMain} units available in main inventory.` 
      });
    }

    // Create the request
    const request = await ConsumableRequest.create({
      consumableId,
      requestedById: userId,
      requestType,
      quantity,
      reason: reason || null,
      purpose: purpose || null,
      course: course || null,
      trainer: trainer || null,
      startDate: startDate || null,
      endDate: endDate || null,
      verificationImages: normalizedVerificationImages,
      status: 'pending',
    });

    // Keep request creation successful even if notification side-effects fail.
    try {
      const admins = await User.findAll({ where: { role: 'admin' } });
      const adminIds = admins.map(a => a.id);

      if (adminIds.length > 0) {
        const metadata = {
          requestId: request.id,
          consumableId,
          requesterId: userId,
          requesterName,
          itemName: consumable.itemName,
          quantity,
          requestType,
          target: 'pending-requests',
        };

        const notifications = await Notification.bulkCreate(
          adminIds.map((adminId) => ({
            userId: adminId,
            type: 'stock_requested',
            message: `${requesterName} requested ${requestType === 'Stock In' ? 'to add' : 'to transfer'} ${quantity} units of ${consumable.itemName}`,
            metadata: JSON.stringify(metadata),
            isRead: false,
          })),
          { returning: true }
        );

        if (global.io) {
          const userSockets = global.userSockets || {};
          notifications.forEach((notification) => {
            const socketId = userSockets[notification.userId];
            if (socketId) {
              global.io.to(socketId).emit('new_notification', notification);
            }
          });
        }
      }
    } catch (notifyError) {
      console.error('Request created but notification failed:', notifyError);
    }

    res.status(201).json({
      message: 'Stock modification request submitted successfully!',
      request,
    });
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ error: 'Failed to create stock modification request.' });
  }
};

// Get all pending requests (admin only)
exports.getRequests = async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 10 } = req.query;

    const requests = await ConsumableRequest.findAndCountAll({
      where: { status },
      include: [
        { model: Consumable, as: 'consumable' },
        { model: User, as: 'requestedBy', attributes: ['id', 'username', 'fullName'] },
        { model: User, as: 'approvedBy', attributes: ['id', 'username', 'fullName'] },
      ],
      order: [['createdAt', 'DESC']],
      offset: (page - 1) * limit,
      limit: parseInt(limit),
    });

    res.json({
      requests: requests.rows,
      total: requests.count,
      page: parseInt(page),
      totalPages: Math.ceil(requests.count / limit),
    });
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Failed to fetch stock modification requests.' });
  }
};

// Get request history (all approved/rejected requests)
exports.getRequestHistory = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const whereClause = status ? { status: ['approved', 'rejected'] } : { status: ['approved', 'rejected'] };
    if (status && ['approved', 'rejected'].includes(status)) {
      whereClause.status = status;
    }

    const requests = await ConsumableRequest.findAndCountAll({
      where: whereClause,
      include: [
        { model: Consumable, as: 'consumable' },
        { model: User, as: 'requestedBy', attributes: ['id', 'username', 'fullName'] },
        { model: User, as: 'approvedBy', attributes: ['id', 'username', 'fullName'] },
      ],
      order: [['approvedAt', 'DESC']],
      offset: (page - 1) * limit,
      limit: parseInt(limit),
    });

    res.json({
      requests: requests.rows,
      total: requests.count,
      page: parseInt(page),
      totalPages: Math.ceil(requests.count / limit),
    });
  } catch (error) {
    console.error('Error fetching request history:', error);
    res.status(500).json({ error: 'Failed to fetch request history.' });
  }
};

// Approve a request (admin only)
exports.approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;

    // Find the request
    const request = await ConsumableRequest.findByPk(id, {
      include: [
        { model: Consumable, as: 'consumable' },
        { model: User, as: 'requestedBy', attributes: ['id', 'username', 'fullName'] },
      ],
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: `Cannot approve a ${request.status} request.` });
    }

    let consumable = null;
    let actionType = request.requestType === 'Stock Out' ? 'Stock Out' : 'Stock In';
    let quantityChanged = request.requestType === 'Stock Out' ? -request.quantity : request.quantity;
    let beginningInventory = 0;
    let endingInventory = request.quantity;
    let historyLocation = 'main';
    let mainBeginningInventory = 0;
    let mainEndingInventory = 0;
    let annexBeginningInventory = 0;
    let annexEndingInventory = 0;
    const verificationImages = request.verificationImages || [];

    if (request.requestType === 'New Consumable') {
      if (!request.requestedItemName || !request.requestedCategory || !request.requestedUnit) {
        return res.status(400).json({ error: 'Request is missing new consumable details.' });
      }

      const normalizedLocation = request.requestedLocation === 'annex' ? 'annex' : 'main';
      historyLocation = normalizedLocation;
      consumable = await Consumable.create({
        itemName: request.requestedItemName,
        category: request.requestedCategory,
        unit: request.requestedUnit,
        reorderLevel: request.requestedReorderLevel ?? 10,
        quantity: request.quantity,
        quantityMain: normalizedLocation === 'main' ? request.quantity : 0,
        quantityAnnex: normalizedLocation === 'annex' ? request.quantity : 0,
      });
    } else {
      consumable = await Consumable.findByPk(request.consumableId);
      if (!consumable) {
        return res.status(404).json({ error: 'Consumable not found.' });
      }

      if (request.requestType === 'Stock Out' && request.quantity > consumable.quantityMain) {
        return res.status(400).json({
          error: `Insufficient stock. Only ${consumable.quantityMain} units available.`,
        });
      }

      if (request.requestType === 'Stock In') {
        beginningInventory = consumable.quantityMain;
        consumable.quantityMain += request.quantity;
        consumable.quantity += request.quantity;
        endingInventory = consumable.quantityMain;
        mainBeginningInventory = beginningInventory;
        mainEndingInventory = endingInventory;
      } else {
        // Transfer from main inventory to annex inventory.
        beginningInventory = consumable.quantityMain;
        mainBeginningInventory = consumable.quantityMain;
        annexBeginningInventory = consumable.quantityAnnex;

        consumable.quantityMain -= request.quantity;
        consumable.quantityAnnex += request.quantity;

        mainEndingInventory = consumable.quantityMain;
        annexEndingInventory = consumable.quantityAnnex;
        endingInventory = mainEndingInventory;
      }

      await consumable.save();
    }

    await InventoryHistory.create({
      consumableId: consumable.id,
      actionType,
      quantityChanged,
      beginningInventory,
      endingInventory,
      description: request.requestType === 'Stock Out'
        ? `Approved transfer request from ${request.requestedBy.username}${request.reason ? ': ' + request.reason : ''}`
        : `Approved request from ${request.requestedBy.username}${request.reason ? ': ' + request.reason : ''}`,
      course: request.course,
      trainer: request.trainer,
      purpose: request.purpose,
      location: historyLocation,
      performedBy: adminName,
      performedById: adminId,
      startDate: request.startDate,
      endDate: request.endDate,
      verificationImages,
    });

    if (request.requestType === 'Stock Out') {
      await InventoryHistory.create({
        consumableId: consumable.id,
        actionType: 'Stock In',
        quantityChanged: request.quantity,
        beginningInventory: annexBeginningInventory,
        endingInventory: annexEndingInventory,
        description: `Transfer from main approved for ${request.requestedBy.username}${request.reason ? ': ' + request.reason : ''}`,
        course: request.course,
        trainer: request.trainer,
        purpose: request.purpose,
        location: 'annex',
        performedBy: adminName,
        performedById: adminId,
        startDate: request.startDate,
        endDate: request.endDate,
        verificationImages,
      });
    }

    // Update request status
    request.status = 'approved';
    request.approvedById = adminId;
    request.approvalNotes = notes || null;
    request.approvedAt = new Date();
    await request.save();

    // Keep approval successful even if notification side-effects fail.
    try {
      await Notification.create({
        userId: request.requestedById,
        type: 'request_approved',
        message: request.requestType === 'New Consumable'
          ? `Your request to create new consumable ${consumable.itemName} (${request.quantity} ${consumable.unit}) has been approved.`
          : request.requestType === 'Stock Out'
            ? `Your request to transfer ${request.quantity} units of ${consumable.itemName} from main inventory to annex has been approved.`
            : `Your request to add ${request.quantity} units of ${consumable.itemName} has been approved.`,
        metadata: JSON.stringify({
          requestId: request.id,
          consumableId: consumable.id,
          itemName: consumable.itemName,
          quantity: request.quantity,
          requestType: request.requestType,
          approvalNotes: notes,
        }),
        isRead: false,
      });

      emitUserNotification(request.requestedById, {
        userId: request.requestedById,
        type: 'request_approved',
        message: request.requestType === 'New Consumable'
          ? `Your request to create new consumable ${consumable.itemName} (${request.quantity} ${consumable.unit}) has been approved.`
          : request.requestType === 'Stock Out'
            ? `Your request to transfer ${request.quantity} units of ${consumable.itemName} from main inventory to annex has been approved.`
            : `Your request to add ${request.quantity} units of ${consumable.itemName} has been approved.`,
        metadata: {
          requestId: request.id,
          consumableId: consumable.id,
          itemName: consumable.itemName,
          quantity: request.quantity,
          requestType: request.requestType,
          approvalNotes: notes,
        },
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      // Broadcast to staff user's socket if connected
      global.io?.emit('request_approved', {
        requestId: request.id,
        userId: request.requestedById,
        itemName: consumable.itemName,
        message: request.requestType === 'New Consumable'
          ? `Your request to create new consumable ${consumable.itemName} has been approved.`
          : request.requestType === 'Stock Out'
            ? `Your request to transfer ${request.quantity} units from main inventory to annex has been approved.`
            : `Your request to add ${request.quantity} units has been approved.`,
      });
    } catch (notifyError) {
      console.error('Request approved but notification failed:', notifyError);
    }

    res.json({
      message: 'Request approved successfully!',
      request,
    });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ error: 'Failed to approve request.' });
  }
};

// Reject a request (admin only)
exports.rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required.' });
    }

    // Find the request
    const request = await ConsumableRequest.findByPk(id, {
      include: [
        { model: Consumable, as: 'consumable' },
        { model: User, as: 'requestedBy', attributes: ['id', 'username', 'fullName'] },
      ],
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: `Cannot reject a ${request.status} request.` });
    }

    // Update request status
    request.status = 'rejected';
    request.approvedById = adminId;
    request.approvalNotes = reason;
    request.rejectionReason = reason;
    request.approvedAt = new Date();
    await request.save();

    // Get consumable for notification (new-consumable requests may not have consumableId yet)
    const consumable = request.consumableId ? await Consumable.findByPk(request.consumableId) : null;
    const requestedItemName = request.requestedItemName || consumable?.itemName || 'item';

    // Keep rejection successful even if notification side-effects fail.
    try {
      await Notification.create({
        userId: request.requestedById,
        type: 'request_rejected',
        message: request.requestType === 'New Consumable'
          ? `Your request to create new consumable ${requestedItemName} has been rejected.`
          : `Your request to ${getRequestActionText(request.requestType)} ${request.quantity} units of ${requestedItemName} has been rejected.`,
        metadata: JSON.stringify({
          requestId: request.id,
          consumableId: request.consumableId,
          itemName: requestedItemName,
          quantity: request.quantity,
          requestType: request.requestType,
          rejectionReason: reason,
          requesterUsername: request.requestedBy?.username || '',
          requesterFullName: request.requestedBy?.fullName || '',
        }),
        isRead: false,
      });

      emitUserNotification(request.requestedById, {
        userId: request.requestedById,
        type: 'request_rejected',
        message: request.requestType === 'New Consumable'
          ? `Your request to create new consumable ${requestedItemName} has been rejected.`
          : `Your request to ${getRequestActionText(request.requestType)} ${request.quantity} units of ${requestedItemName} has been rejected.`,
        metadata: {
          requestId: request.id,
          consumableId: request.consumableId,
          itemName: requestedItemName,
          quantity: request.quantity,
          requestType: request.requestType,
          rejectionReason: reason,
          requesterUsername: request.requestedBy?.username || '',
          requesterFullName: request.requestedBy?.fullName || '',
        },
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      // Broadcast to staff user's socket if connected
      global.io?.emit('request_rejected', {
        requestId: request.id,
        userId: request.requestedById,
        itemName: requestedItemName,
        reason,
        message: request.requestType === 'New Consumable'
          ? `Your request to create new consumable ${requestedItemName} has been rejected: ${reason}`
          : `Your request to ${getRequestActionText(request.requestType)} ${request.quantity} units has been rejected: ${reason}`,
      });
    } catch (notifyError) {
      console.error('Request rejected but notification failed:', notifyError);
    }

    res.json({
      message: 'Request rejected successfully!',
      request,
    });
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({ error: 'Failed to reject request.' });
  }
};
