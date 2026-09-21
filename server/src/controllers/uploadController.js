import { uploadMedia } from '../config/cloudinary.js';

export const handleFileUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const result = await uploadMedia(req.file.buffer, req.file.originalname, req.file.mimetype);

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: result
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
