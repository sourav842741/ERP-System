import express from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import productRoutes from './productRoutes.js';
import inventoryRoutes from './inventoryRoutes.js';
import orderRoutes from './orderRoutes.js';
import customerRoutes from './customerRoutes.js';
import supplierRoutes from './supplierRoutes.js';
import purchaseRoutes from './purchaseRoutes.js';
import warehouseRoutes from './warehouseRoutes.js';
import marketplaceRoutes from './marketplaceRoutes.js';
import expenseRoutes from './expenseRoutes.js';
import reportRoutes from './reportRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import auditLogRoutes from './auditLogRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import mediaRoutes from './mediaRoutes.js';
import { globalSearch } from '../controllers/globalSearchController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public / Auth
router.use('/auth', authRoutes);

// Global Instant Search (Section 31)
router.get('/search', authenticate, globalSearch);

// Core Modules
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/orders', orderRoutes);
router.use('/customers', customerRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/warehouses', warehouseRoutes);
router.use('/marketplaces', marketplaceRoutes);
router.use('/expenses', expenseRoutes);
router.use('/reports', reportRoutes);
router.use('/notifications', notificationRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/settings', settingsRoutes);
router.use('/upload', uploadRoutes);
router.use('/media', mediaRoutes);

export default router;
