import express from 'express';
import {
  getRiskRules,
  createRiskRule,
  updateRiskRule,
  deleteRiskRule,
  getBlacklist,
  addToBlacklist,
  deleteFromBlacklist,
  evaluateOrderRiskById,
  orderRiskAction,
  getRiskStats
} from '../controllers/rtoRiskController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/stats', getRiskStats);

// Rule CRUD
router.get('/rules', getRiskRules);
router.post('/rules', createRiskRule);
router.put('/rules/:id', updateRiskRule);
router.delete('/rules/:id', deleteRiskRule);

// Blacklist / Whitelist CRUD
router.get('/blacklist', getBlacklist);
router.post('/blacklist', addToBlacklist);
router.delete('/blacklist/:id', deleteFromBlacklist);

// Order Risk Evaluation & Actions
router.post('/evaluate/:orderId', evaluateOrderRiskById);
router.post('/orders/:orderId/action', orderRiskAction);

export default router;
