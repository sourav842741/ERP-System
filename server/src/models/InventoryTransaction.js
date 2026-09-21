import mongoose from 'mongoose';
import { INVENTORY_TRANSACTION_TYPES } from '../config/constants.js';

const inventoryTransactionSchema = new mongoose.Schema({
  variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  type: {
    type: String,
    enum: Object.values(INVENTORY_TRANSACTION_TYPES),
    required: true
  },
  quantity: { type: Number, required: true }, // Positive for addition, negative for deduction
  previousStock: { type: Number, required: true },
  newStock: { type: Number, required: true },
  referenceType: { type: String, default: null }, // e.g., 'Order', 'PurchaseOrder', 'WarehouseTransfer', 'ManualAdjustment'
  referenceId: { type: String, default: null },
  reason: { type: String, default: '' }, // Mandatory for adjustments
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

inventoryTransactionSchema.index({ variantId: 1, createdAt: -1 });
inventoryTransactionSchema.index({ warehouseId: 1 });
inventoryTransactionSchema.index({ type: 1 });

export const InventoryTransaction = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
