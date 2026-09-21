import mongoose from 'mongoose';
import { ORDER_SOURCES } from '../config/constants.js';

const marketplaceListingSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', default: null },
  marketplace: {
    type: String,
    enum: Object.values(ORDER_SOURCES),
    required: true
  },
  marketplaceProductId: { type: String, default: '', trim: true },
  marketplaceSKU: { type: String, required: true, trim: true },
  listingTitle: { type: String, required: true, trim: true },
  listingDescription: { type: String, default: '' },
  price: { type: Number, required: true },
  mrp: { type: Number, default: 0 },
  listingStatus: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'BLOCKED', 'DRAFT'],
    default: 'ACTIVE'
  },
  listingUrl: { type: String, default: '' },
  images: [{ type: String }],
  notes: { type: String, default: '' }
}, { timestamps: true });

marketplaceListingSchema.index({ marketplace: 1, marketplaceSKU: 1 }, { unique: true });
marketplaceListingSchema.index({ productId: 1 });

export const MarketplaceListing = mongoose.model('MarketplaceListing', marketplaceListingSchema);
