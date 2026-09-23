import express from 'express';
import {
  calculatePricing,
  reverseCalculatePricing,
  compareMarketplaces,
  getPricingHistory,
  getPricingHistoryById
} from '../controllers/pricingController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

// Public to all authenticated ERP users / sellers
router.post('/calculate', calculatePricing);
router.post('/reverse-calculate', reverseCalculatePricing);
router.post('/compare', compareMarketplaces);

// History & Auditing
router.get('/history', getPricingHistory);
router.get('/history/:id', getPricingHistoryById);

export default router;
