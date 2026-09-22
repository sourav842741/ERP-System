import express from 'express';
import {
  getProducts, getProductById, createProduct, updateProduct, deleteProduct, bulkUpdateProducts,
  bulkUploadProducts, getCategories, createCategory, updateCategory, deleteCategory
} from '../controllers/productController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

router.use(authenticate);

// Categories
router.get('/categories', requirePermission('product:read'), getCategories);
router.post('/categories', requirePermission('product:create'), createCategory);
router.put('/categories/:id', requirePermission('product:update'), updateCategory);
router.delete('/categories/:id', requirePermission('product:delete'), deleteCategory);

// Products
router.get('/', requirePermission('product:read'), getProducts);
router.get('/:id', requirePermission('product:read'), getProductById);
router.post('/', requirePermission('product:create'), createProduct);
router.post('/bulk-upload', requirePermission('product:create'), bulkUploadProducts);
router.put('/:id', requirePermission('product:update'), updateProduct);
router.delete('/:id', requirePermission('product:delete'), deleteProduct);
router.post('/bulk', requirePermission('product:update'), bulkUpdateProducts);

export default router;
