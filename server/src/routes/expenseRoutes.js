import express from 'express';
import { getExpenses, createExpense, deleteExpense } from '../controllers/expenseController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('finance:view'), getExpenses);
router.post('/', requirePermission('finance:manage'), createExpense);
router.delete('/:id', requirePermission('finance:manage'), deleteExpense);

export default router;
