const router = require('express').Router();
const { getHistory, getConsumptionReport, updateInventoryHistory, recalculateAndSyncInventory, deleteHistory, archiveHistory, restoreHistory } = require('../controllers/historyController');

router.get('/', getHistory);
router.get('/consumption-report', getConsumptionReport);
router.put('/:id', updateInventoryHistory);
router.patch('/:id/archive', archiveHistory);
router.put('/:id/restore', restoreHistory);
router.delete('/:id', deleteHistory);
router.post('/:consumableId/recalculate', recalculateAndSyncInventory);

module.exports = router;
