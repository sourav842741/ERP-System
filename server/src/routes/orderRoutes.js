import express from 'express';
import { getOrders, getOrderById, createOrder, updateOrderStatus, processReturn } from '../controllers/orderController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('order:read'), getOrders);
router.get('/:id', requirePermission('order:read'), getOrderById);
router.post('/', requirePermission('order:create'), createOrder);
router.patch('/:id/status', requirePermission('order:update'), updateOrderStatus);
router.post('/:id/return', requirePermission('order:update'), processReturn);

export default router;
