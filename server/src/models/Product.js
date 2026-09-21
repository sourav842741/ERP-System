import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
  brand: { type: String, default: '' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  subcategory: { type: String, default: '' },
  description: { type: String, default: '' },
  shortDescription: { type: String, default: '' },
  hsnCode: { type: String, default: '' },
  gst: { type: Number, default: 18 }, // Percentage
  mrp: { type: Number, default: 0 },
  costPrice: { type: Number, default: 0 },
  sellingPrice: { type: Number, required: true, default: 0 },
  weight: { type: Number, default: 0 }, // In grams
  dimensions: {
    length: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 }
  },
  barcode: { type: String, default: '' },
  status: { type: String, enum: ['active', 'inactive', 'draft'], default: 'active' },
  images: [{
    url: { type: String, required: true },
    publicId: { type: String, default: '' }
  }],
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

// Text index for instant global searching
productSchema.index({ name: 'text', sku: 'text', brand: 'text', barcode: 'text' });

export const Product = mongoose.model('Product', productSchema);
