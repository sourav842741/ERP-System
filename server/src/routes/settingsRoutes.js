import express from 'express';
import { getSettings, updateSettings, sendTestEmail } from '../controllers/settingsController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('settings:view'), getSettings);
router.post('/save', requirePermission('settings:update'), updateSettings);
router.post('/test-email', requirePermission('settings:update'), sendTestEmail);

export default router;
