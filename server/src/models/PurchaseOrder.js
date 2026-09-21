import mongoose from 'mongoose';
import { PURCHASE_STATUSES } from '../config/constants.js';

const purchaseItemSchema = new mongoose.Schema({
  variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  sku: { type: String, required: true },
  title: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  receivedQuantity: { type: Number, default: 0 },
  unitCost: { type: Number, required: true },
  taxPercent: { type: Number, default: 0 },
  subtotal: { type: Number, required: true }
}, { _id: false });

const purchaseOrderSchema = new mongoose.Schema({
  poNumber: { type: String, required: true, unique: true, uppercase: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  items: [purchaseItemSchema],
  subtotal: { type: Number, required: true, default: 0 },
  taxTotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  shippingCost: { type: Number, default: 0 },
  total: { type: Number, required: true, default: 0 },
  status: {
    type: String,
    enum: Object.values(PURCHASE_STATUSES),
    default: PURCHASE_STATUSES.ORDERED
  },
  paymentStatus: {
    type: String,
    enum: ['UNPAID', 'PARTIALLY_PAID', 'PAID'],
    default: 'UNPAID'
  },
  paidAmount: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receivedAt: { type: Date },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

purchaseOrderSchema.index({ poNumber: 'text' });
purchaseOrderSchema.index({ status: 1, createdAt: -1 });

export const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);
