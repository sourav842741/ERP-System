import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  physicalStock: { type: Number, required: true, default: 0, min: 0 },
  reservedStock: { type: Number, required: true, default: 0, min: 0 },
  damagedStock: { type: Number, required: true, default: 0, min: 0 },
  minimumStock: { type: Number, default: 10 }, // Low stock threshold
  maximumStock: { type: Number, default: 1000 },
  availableStock: { type: Number, required: true, default: 0 }
}, { timestamps: true });

// Compound unique index so there is exactly one inventory record per variant per warehouse
inventorySchema.index({ variantId: 1, warehouseId: 1 }, { unique: true });
inventorySchema.index({ productId: 1 });

// Ensure availableStock is always computed accurately before save
inventorySchema.pre('save', function (next) {
  this.availableStock = Math.max(0, this.physicalStock - this.reservedStock - this.damagedStock);
  next();
});

export const Inventory = mongoose.model('Inventory', inventorySchema);
