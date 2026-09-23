import express from 'express';
import {
  getWarehouseBins,
  createWarehouseBin,
  batchGenerateBins,
  updateWarehouseBin,
  deleteWarehouseBin,
  assignSkuToBin,
  locateSku,
  autoSlotWarehouseInventory,
  getWarehouseStockableProducts,
  clearAllWarehouseBins,
  deleteAisleBins
} from '../controllers/warehouseBinController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getWarehouseBins);
router.post('/', createWarehouseBin);
router.post('/batch-generate', batchGenerateBins);
router.post('/auto-slot', autoSlotWarehouseInventory);
router.post('/clear-all', clearAllWarehouseBins);
router.post('/delete-aisle', deleteAisleBins);
router.get('/stockable-products', getWarehouseStockableProducts);
router.get('/locate/:sku', locateSku);
router.put('/:id', updateWarehouseBin);
router.delete('/:id', deleteWarehouseBin);
router.post('/:id/assign-sku', assignSkuToBin);

export default router;
