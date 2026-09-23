import express from 'express';
import {
  getMarketplaces,
  saveMarketplace,
  getMarketplaceRules,
  createMarketplaceRule,
  updateMarketplaceRule,
  duplicateMarketplaceRule,
  toggleRuleStatus,
  deleteMarketplaceRule,
  getMarketplaceRuleById
} from '../controllers/marketplaceRuleController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

router.use(authenticate);

// Marketplaces metadata (readable by all authenticated users, editable by admin/supervisor)
router.get('/marketplaces', getMarketplaces);
router.post('/marketplaces', requirePermission('pricing:manage', 'marketplace:manage', 'product:update'), saveMarketplace);

// Marketplace Rules (readable by authenticated users, editable by admin/supervisor)
router.get('/', getMarketplaceRules);
router.get('/:id', getMarketplaceRuleById);
router.post('/', requirePermission('pricing:manage', 'marketplace:manage', 'product:update'), createMarketplaceRule);
router.put('/:id', requirePermission('pricing:manage', 'marketplace:manage', 'product:update'), updateMarketplaceRule);
router.post('/:id/duplicate', requirePermission('pricing:manage', 'marketplace:manage', 'product:update'), duplicateMarketplaceRule);
router.patch('/:id/status', requirePermission('pricing:manage', 'marketplace:manage', 'product:update'), toggleRuleStatus);
router.delete('/:id', requirePermission('pricing:manage', 'marketplace:manage', 'product:update'), deleteMarketplaceRule);

export default router;
