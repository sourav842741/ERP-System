import mongoose from 'mongoose';

const marketplaceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, lowercase: true, trim: true },
  logo: { type: String, default: '' },
  badgeColor: { type: String, default: '#2563eb' },
  isActive: { type: Boolean, default: true },
  currency: { type: String, default: 'INR' },
  fulfilmentTypes: [{ type: String, trim: true }],
  shippingZones: [{ type: String, trim: true }],
  settings: {
    defaultReturnRate: { type: Number, default: 5 }, // 5%
    defaultRtoRate: { type: Number, default: 3 },    // 3%
    defaultReturnCost: { type: Number, default: 50 }, // Flat cost per return
    defaultRtoCost: { type: Number, default: 45 },    // Flat cost per RTO
    gstRateOnFees: { type: Number, default: 18 }      // 18% standard GST on service fees
  },
  description: { type: String, default: '' }
}, { timestamps: true });

marketplaceSchema.index({ code: 1, isActive: 1 });

export const Marketplace = mongoose.model('Marketplace', marketplaceSchema);
export default Marketplace;
