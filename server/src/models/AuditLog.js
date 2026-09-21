import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  userName: { type: String, default: 'System' },
  action: { type: String, required: true }, // e.g. 'PRODUCT_CREATED', 'STOCK_ADJUSTED', 'ORDER_CANCELLED'
  module: { type: String, required: true }, // 'Products', 'Inventory', 'Orders', 'Purchases', 'Settings', 'Auth'
  entityId: { type: String, default: '' },
  oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
  newValue: { type: mongoose.Schema.Types.Mixed, default: null },
  reason: { type: String, default: '' },
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' }
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1, module: 1 });
auditLogSchema.index({ userId: 1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
