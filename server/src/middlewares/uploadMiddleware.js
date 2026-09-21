import multer from 'multer';

// Memory storage for piping to Cloudinary or local storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf' || file.mimetype.includes('spreadsheet') || file.mimetype.includes('csv') || file.mimetype.includes('excel')) {
    cb(null, true);
  } else {
    cb(new Error('Only images, PDFs, CSV, and Excel documents are allowed!'), false);
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter
});
