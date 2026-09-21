import express from 'express';
import {
  getMediaAssets,
  uploadMediaAsset,
  updateMediaAsset,
  deleteMediaAsset
} from '../controllers/mediaController.js';
import { upload } from '../middlewares/uploadMiddleware.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getMediaAssets);
router.post('/upload', upload.single('file'), uploadMediaAsset);
router.put('/:id', updateMediaAsset);
router.delete('/:id', deleteMediaAsset);

export default router;
