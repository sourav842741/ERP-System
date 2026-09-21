import express from 'express';
import {
  getMarketplaceListings, createMarketplaceListing,
  updateMarketplaceListing, deleteMarketplaceListing,
  syncMarketplaces
} from '../controllers/marketplaceController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('marketplace:read'), getMarketplaceListings);
router.post('/sync', requirePermission('marketplace:manage'), syncMarketplaces);
router.post('/', requirePermission('marketplace:manage'), createMarketplaceListing);
router.put('/:id', requirePermission('marketplace:manage'), updateMarketplaceListing);
router.delete('/:id', requirePermission('marketplace:manage'), deleteMarketplaceListing);

export default router;
