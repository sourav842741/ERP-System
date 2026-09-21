import express from 'express';
import { getDashboardSummary, getFinanceReport, exportReportCSV } from '../controllers/reportController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/dashboard', requirePermission('dashboard:view'), getDashboardSummary);
router.get('/finance', requirePermission('report:view'), getFinanceReport);
router.get('/export/:type', requirePermission('report:export'), exportReportCSV);

export default router;
