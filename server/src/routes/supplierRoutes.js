import express from 'express';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../controllers/purchaseController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('purchase:read'), getSuppliers);
router.post('/', requirePermission('purchase:create'), createSupplier);
router.put('/:id', requirePermission('purchase:update'), updateSupplier);
router.delete('/:id', requirePermission('purchase:delete'), deleteSupplier);

export default router;

