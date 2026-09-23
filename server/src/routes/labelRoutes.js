import express from 'express';
import {
  getLabelTemplates,
  createLabelTemplate,
  updateLabelTemplate,
  deleteLabelTemplate,
  getOrderShippingLabelData,
  getProductBarcodeTagsData
} from '../controllers/labelController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

// Template CRUD
router.get('/templates', getLabelTemplates);
router.post('/templates', createLabelTemplate);
router.put('/templates/:id', updateLabelTemplate);
router.delete('/templates/:id', deleteLabelTemplate);

// Label Generation Data
router.get('/order-shipping-label/:orderId', getOrderShippingLabelData);
router.post('/product-barcode-tags', getProductBarcodeTagsData);

export default router;
