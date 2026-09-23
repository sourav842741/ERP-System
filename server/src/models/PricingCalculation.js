import mongoose from 'mongoose';

const pricingCalculationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null,
    index: true
  },
  productSnapshot: {
    name: { type: String, default: '' },
    sku: { type: String, default: '' },
    category: { type: String, default: '' }
  },
  marketplace: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  mode: {
    type: String,
    enum: ['FORWARD', 'REVERSE'],
    default: 'FORWARD'
  },
  inputs: {
    productCost: { type: Number, required: true },
    sellingPrice: { type: Number, default: 0 },
    mrp: { type: Number, default: 0 },
    category: { type: String, default: '' },
    subCategory: { type: String, default: '' },
    productWeight: { type: Number, default: 0 },
    packageWeight: { type: Number, default: 0 },
    dimensions: {
      length: { type: Number, default: 0 },
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 }
    },
    gstRate: { type: Number, default: 18 },
    fulfilmentType: { type: String, default: 'Easy Ship' },
    shippingZone: { type: String, default: 'National' },
    desiredProfit: { type: Number, default: 0 },
    desiredMargin: { type: Number, default: 0 },
    packagingCost: { type: Number, default: 0 },
    couponDiscount: { type: Number, default: 0 },
    promotionalDiscount: { type: Number, default: 0 },
    returnRate: { type: Number, default: 0 },
    rtoRate: { type: Number, default: 0 }
  },
  matchedRules: [{
    ruleId: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketplaceRule' },
    ruleName: { type: String },
    chargeType: { type: String },
    calculationType: { type: String },
    calculationBase: { type: String },
    version: { type: Number },
    appliedValue: { type: mongoose.Schema.Types.Mixed },
    calculatedFee: { type: Number },
    description: { type: String }
  }],
  breakdown: {
    sellerCosts: {
      productCost: { type: Number, default: 0 },
      packagingCost: { type: Number, default: 0 },
      internalLogistics: { type: Number, default: 0 },
      otherSellerCosts: { type: Number, default: 0 },
      totalSellerCost: { type: Number, default: 0 }
    },
    marketplaceFees: {
      referralFee: { type: Number, default: 0 },
      closingFee: { type: Number, default: 0 },
      shippingFee: { type: Number, default: 0 },
      pickPackFee: { type: Number, default: 0 },
      paymentFee: { type: Number, default: 0 },
      returnFee: { type: Number, default: 0 },
      rtoFee: { type: Number, default: 0 },
      storageFee: { type: Number, default: 0 },
      otherFees: { type: Number, default: 0 },
      totalMarketplaceFees: { type: Number, default: 0 }
    },
    taxes: {
      gstOnMarketplaceFees: { type: Number, default: 0 },
      productGstAmount: { type: Number, default: 0 },
      totalTax: { type: Number, default: 0 }
    },
    riskReserve: {
      expectedReturnCost: { type: Number, default: 0 },
      expectedRtoCost: { type: Number, default: 0 },
      totalRiskReserve: { type: Number, default: 0 }
    },
    financials: {
      grossSellingPrice: { type: Number, default: 0 },
      discountsTotal: { type: Number, default: 0 },
      effectiveSellingPrice: { type: Number, default: 0 },
      totalCost: { type: Number, default: 0 },
      netProfit: { type: Number, default: 0 },
      profitMargin: { type: Number, default: 0 }, // %
      roi: { type: Number, default: 0 }           // %
    }
  },
  finalRecommendedPrice: { type: Number, required: true },
  notes: { type: String, default: '' }
}, { timestamps: true });

pricingCalculationSchema.index({ user: 1, createdAt: -1 });

export const PricingCalculation = mongoose.model('PricingCalculation', pricingCalculationSchema);
export default PricingCalculation;
