import express from 'express';
import {
  getPurchaseOrders,
  createPurchaseOrder,
  receivePurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder
} from '../controllers/purchaseController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('purchase:read'), getPurchaseOrders);
router.post('/', requirePermission('purchase:create'), createPurchaseOrder);
router.put('/:id', requirePermission('purchase:update'), updatePurchaseOrder);
router.delete('/:id', requirePermission('purchase:delete'), deletePurchaseOrder);
router.post('/:id/receive', requirePermission('purchase:update'), receivePurchaseOrder);

export default router;

