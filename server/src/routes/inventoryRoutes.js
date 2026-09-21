import express from 'express';
import { getInventoryOverview, getInventoryTransactions, adjustStock } from '../controllers/inventoryController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/overview', requirePermission('inventory:view'), getInventoryOverview);
router.get('/transactions', requirePermission('inventory:view'), getInventoryTransactions);
router.post('/adjust', requirePermission('inventory:adjust'), adjustStock);

export default router;
