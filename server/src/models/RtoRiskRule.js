import mongoose from 'mongoose';

const rtoRiskRuleSchema = new mongoose.Schema({
  ruleName: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  riskType: {
    type: String,
    enum: ['pincode', 'order_value', 'address_quality', 'customer_history', 'carrier_logistics', 'payment_method'],
    required: true
  },
  conditions: {
    // For order_value
    minOrderValue: { type: Number },
    maxOrderValue: { type: Number },
    // For address_quality
    minAddressLength: { type: Number },
    requireLandmark: { type: Boolean, default: false },
    // For customer_history
    minPastOrders: { type: Number },
    maxRtoPercentage: { type: Number },
    // For pincode
    pincodePrefixes: [{ type: String }],
    pincodes: [{ type: String }],
    // For payment_method
    paymentMethod: { type: String }
  },
  riskWeight: {
    type: Number,
    required: true,
    default: 15,
    min: 1,
    max: 100
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  isActive: { type: Boolean, default: true },
  priority: { type: Number, default: 10 }
}, { timestamps: true });

const rtoBlacklistSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['phone', 'pincode', 'customer_email', 'device'],
    required: true
  },
  value: {
    type: String,
    required: true,
    trim: true
  },
  action: {
    type: String,
    enum: ['BLOCK', 'FLAG_REVIEW', 'ALLOW_WHITELIST'],
    default: 'BLOCK'
  },
  reason: {
    type: String,
    default: 'Repeat COD RTO Cancellation'
  },
  riskScorePenalty: {
    type: Number,
    default: 50
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

rtoBlacklistSchema.index({ type: 1, value: 1 }, { unique: true });

export const RtoRiskRule = mongoose.model('RtoRiskRule', rtoRiskRuleSchema);
export const RtoBlacklist = mongoose.model('RtoBlacklist', rtoBlacklistSchema);
