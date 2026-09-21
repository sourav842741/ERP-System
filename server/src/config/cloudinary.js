import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export const isCloudinaryConfigured = () => {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

export const uploadMedia = async (fileBuffer, fileName, mimetype, folder = 'erp_marketplace') => {
  if (isCloudinaryConfigured()) {
    try {
      const cloudinary = await import('cloudinary');
      cloudinary.v2.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      });

      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.v2.uploader.upload_stream(
          {
            folder,
            resource_type: 'auto'
          },
          (error, result) => {
            if (error) return reject(error);
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              format: result.format || mimetype?.split('/')[1] || 'jpg',
              size: result.bytes || fileBuffer.length,
              width: result.width || 0,
              height: result.height || 0,
              source: 'cloudinary'
            });
          }
        );
        uploadStream.end(fileBuffer);
      });
    } catch (err) {
      console.warn(`[Cloudinary] Upload failed (${err.message}). Falling back to local storage.`);
    }
  }

  // Local storage fallback
  const uniqueName = `${Date.now()}-${fileName.replace(/\s+/g, '_')}`;
  const filePath = path.join(uploadsDir, uniqueName);
  fs.writeFileSync(filePath, fileBuffer);

  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
  return {
    url: `${baseUrl}/uploads/${uniqueName}`,
    publicId: uniqueName,
    format: mimetype?.split('/')[1] || 'jpg',
    size: fileBuffer.length,
    width: 0,
    height: 0,
    source: 'local'
  };
};

export const deleteMedia = async (publicId) => {
  if (!publicId) return { success: true };

  if (isCloudinaryConfigured() && !publicId.includes('.')) {
    try {
      const cloudinary = await import('cloudinary');
      cloudinary.v2.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      });
      await cloudinary.v2.uploader.destroy(publicId);
      return { success: true };
    } catch (err) {
      console.warn(`[Cloudinary] Delete failed: ${err.message}`);
    }
  }

  // Local storage delete
  try {
    const filePath = path.join(uploadsDir, publicId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn(`[Local Delete Failed]: ${err.message}`);
  }

  return { success: true };
};
