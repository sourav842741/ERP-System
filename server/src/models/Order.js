import mongoose from 'mongoose';
import { ORDER_STATUSES, ORDER_SOURCES } from '../config/constants.js';

const orderItemSchema = new mongoose.Schema({
  variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  sku: { type: String, required: true },
  title: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  costPrice: { type: Number, default: 0 },
  subtotal: { type: Number, required: true }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true, uppercase: true },
  source: {
    type: String,
    enum: Object.values(ORDER_SOURCES),
    default: ORDER_SOURCES.MANUAL
  },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerSnapshot: {
    name: { type: String, required: true },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    address: { type: String, default: '' }
  },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  items: [orderItemSchema],
  subtotal: { type: Number, required: true, default: 0 },
  discount: { type: Number, default: 0 },
  shippingFee: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true, default: 0 },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
    default: 'PENDING'
  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'Cash', 'UPI', 'Credit/Debit Card', 'Net Banking', 'Marketplace Prepaid', 'Other'],
    default: 'COD'
  },
  shippingCarrier: { type: String, default: '' },
  trackingNumber: { type: String, default: '' },
  invoiceNumber: { type: String, default: '' },
  orderStatus: {
    type: String,
    enum: Object.values(ORDER_STATUSES),
    default: ORDER_STATUSES.PENDING
  },
  shippingAddress: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    postalCode: { type: String, default: '' }
  },
  billingAddress: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    postalCode: { type: String, default: '' }
  },
  notes: { type: String, default: '' },
  isStockDeducted: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancellationReason: { type: String, default: '' },
  returnDetails: {
    requestedAt: { type: Date },
    receivedAt: { type: Date },
    reason: { type: String, default: '' },
    condition: { type: String, enum: ['GOOD', 'DAMAGED'], default: 'GOOD' },
    inspectionNotes: { type: String, default: '' },
    isRestocked: { type: Boolean, default: false }
  },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

orderSchema.index({ orderNumber: 'text', 'customerSnapshot.name': 'text', 'customerSnapshot.phone': 'text' });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ source: 1 });

export const Order = mongoose.model('Order', orderSchema);
