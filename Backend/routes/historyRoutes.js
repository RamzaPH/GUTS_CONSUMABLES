const router = require('express').Router();
const { getHistory, getConsumptionReport, updateInventoryHistory, recalculateAndSyncInventory } = require('../controllers/historyController');

router.get('/', getHistory);
router.get('/consumption-report', getConsumptionReport);
router.put('/:id', updateInventoryHistory);
router.post('/:consumableId/recalculate', recalculateAndSyncInventory);

module.exports = router;
