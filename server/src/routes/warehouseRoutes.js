import express from 'express';
import { getWarehouses, createWarehouse, updateWarehouse, transferStock, getTransfers } from '../controllers/warehouseController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('inventory:view'), getWarehouses);
router.post('/', requirePermission('inventory:adjust'), createWarehouse);
router.put('/:id', requirePermission('inventory:adjust'), updateWarehouse);
router.post('/transfer', requirePermission('inventory:transfer'), transferStock);
router.get('/transfers/list', requirePermission('inventory:view'), getTransfers);

export default router;
