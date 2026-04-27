const router = require('express').Router();
const {
  getInventory,
  getInventoryByCategory,
  addConsumable,
  updateConsumable,
  updateStock,
  checkoutConsumable,
  archiveItem,
  restoreItem,
  deleteItem,
} = require('../controllers/inventoryController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Checkout a consumable (deducts stock, logs destination, notes)
// POST /api/inventory/:id/checkout
// Admin only - staff cannot checkout items
router.post('/:id/checkout', verifyToken, requireRole('admin'), checkoutConsumable);

// ┌──────────────────────────────────────────────────────────┐
// │  Base path: /api/inventory  (mounted in server.js)       │
// └──────────────────────────────────────────────────────────┘

// Dashboard: all tracks grouped  →  { tracks: { eim, smaw, css } }
router.get('/', getInventory);

// Single track: items for a category  →  { items: [...] }
// :category is lowercase from the frontend ('eim', 'smaw', 'css')
router.get('/:category', getInventoryByCategory);

// Create a new consumable
router.post('/', verifyToken, addConsumable);

// Update an existing consumable
router.put('/:id', updateConsumable);

// Archive an item (soft delete)
router.patch('/:id/archive', archiveItem);

// Restore an archived item
router.patch('/:id/restore', restoreItem);

// Stock-in / stock-out for a specific item
// Body: { type: 'in' | 'out', amount: number }
// Staff can only modify training inventory (annex), admins can modify both
router.patch('/:id/stock', verifyToken, updateStock);

// Remove an item
router.delete('/:id', deleteItem);

module.exports = router;
