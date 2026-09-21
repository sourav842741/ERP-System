import mongoose from 'mongoose';

const mediaAssetSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  url: { type: String, required: true }, // Direct public Cloudinary URL
  publicId: { type: String, required: true },
  format: { type: String, default: '' },
  size: { type: Number, default: 0 }, // in bytes
  width: { type: Number, default: 0 },
  height: { type: Number, default: 0 },
  source: { type: String, enum: ['cloudinary', 'local'], default: 'cloudinary' },
  category: { type: String, default: 'General', trim: true },
  tags: [{ type: String, trim: true }],
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploaderName: { type: String, default: 'Administrator' },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

mediaAssetSchema.index({ createdAt: -1 });
mediaAssetSchema.index({ title: 'text', category: 'text' });

export const MediaAsset = mongoose.model('MediaAsset', mediaAssetSchema);
