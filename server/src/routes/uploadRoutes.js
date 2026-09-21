import express from 'express';
import { handleFileUpload } from '../controllers/uploadController.js';
import { upload } from '../middlewares/uploadMiddleware.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.post('/', upload.single('file'), handleFileUpload);

export default router;
