import mongoose from 'mongoose';

const productVariantSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
  barcode: { type: String, default: '' },
  color: { type: String, default: '' },
  size: { type: String, default: '' },
  price: { type: Number, required: true, default: 0 },
  costPrice: { type: Number, default: 0 },
  weight: { type: Number, default: 0 },
  images: [{
    url: { type: String, required: true },
    publicId: { type: String, default: '' }
  }],
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

productVariantSchema.index({ productId: 1, color: 1, size: 1 });

export const ProductVariant = mongoose.model('ProductVariant', productVariantSchema);
