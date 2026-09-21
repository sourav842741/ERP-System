import express from 'express';
import { getCustomers, getCustomerDetails, createCustomer, updateCustomer, deleteCustomer } from '../controllers/customerController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('customer:read'), getCustomers);
router.get('/:id', requirePermission('customer:read'), getCustomerDetails);
router.post('/', requirePermission('customer:create'), createCustomer);
router.put('/:id', requirePermission('customer:update'), updateCustomer);
router.delete('/:id', requirePermission('customer:delete'), deleteCustomer);

export default router;
