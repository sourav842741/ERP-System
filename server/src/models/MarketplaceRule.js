import mongoose from 'mongoose';

const marketplaceRuleSchema = new mongoose.Schema({
  marketplace: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  ruleName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  chargeType: {
    type: String,
    required: true,
    enum: [
      'referral',      // Marketplace commission
      'closing',       // Fixed fee per transaction
      'shipping',      // Weight handling & delivery logistics
      'pick_pack',     // Fulfilment packaging / handling
      'payment',       // Payment gateway / collection fee
      'return_fee',    // Customer return reverse charge
      'rto_fee',       // Return to origin undelivered charge
      'storage_fee',   // FBA / warehouse warehousing fee
      'other'          // Miscellaneous regulatory or marketing fees
    ],
    index: true
  },
  calculationType: {
    type: String,
    required: true,
    enum: [
      'percentage',
      'fixed',
      'price_slab',
      'weight_slab',
      'percentage_plus_fixed',
      'formula',
      'conditional'
    ]
  },
  calculationBase: {
    type: String,
    enum: ['sellingPrice', 'effectivePrice', 'mrp', 'netRevenue', 'fixedAmount'],
    default: 'sellingPrice'
  },
  conditions: {
    category: { type: String, default: null, trim: true },
    subCategory: { type: String, default: null, trim: true },
    minPrice: { type: Number, default: 0 },
    maxPrice: { type: Number, default: null },
    minWeight: { type: Number, default: 0 }, // In grams
    maxWeight: { type: Number, default: null }, // In grams
    fulfilmentType: { type: String, default: null, trim: true }, // 'FBA', 'Easy Ship', 'Self Ship', etc.
    shippingZone: { type: String, default: null, trim: true },   // 'Local', 'Regional', 'National', etc.
    productType: { type: String, default: null, trim: true }
  },
  calculation: {
    percentage: { type: Number, default: 0 },
    fixedAmount: { type: Number, default: 0 },
    formula: { type: String, default: null }, // Safe algebraic expression without eval()
    priceSlabs: [{
      minPrice: { type: Number, required: true },
      maxPrice: { type: Number, default: null },
      fee: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 }
    }],
    weightSlabs: [{
      minWeight: { type: Number, required: true }, // In grams
      maxWeight: { type: Number, default: null },   // In grams
      fee: { type: Number, default: 0 },
      additionalWeightStep: { type: Number, default: 0 }, // e.g. 500g steps
      additionalFee: { type: Number, default: 0 }
    }],
    conditionalOptions: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  priority: {
    type: Number,
    default: 10,
    index: true
  },
  effectiveFrom: {
    type: Date,
    default: Date.now,
    index: true
  },
  effectiveTo: {
    type: Date,
    default: null,
    index: true
  },
  version: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isSystemSeed: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Compound indexes for high-speed rule matching & versioning audits
marketplaceRuleSchema.index({ marketplace: 1, chargeType: 1, isActive: 1, priority: -1 });
marketplaceRuleSchema.index({ marketplace: 1, effectiveFrom: 1, effectiveTo: 1 });

export const MarketplaceRule = mongoose.model('MarketplaceRule', marketplaceRuleSchema);
export default MarketplaceRule;
