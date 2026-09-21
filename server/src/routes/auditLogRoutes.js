import express from 'express';
import { getAuditLogs } from '../controllers/auditLogController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('settings:view'), getAuditLogs);

export default router;
