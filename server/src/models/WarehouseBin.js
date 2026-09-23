import mongoose from 'mongoose';

const assignedSkuSchema = new mongoose.Schema({
  sku: { type: String, required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' },
  productName: { type: String, default: '' },
  quantity: { type: Number, required: true, default: 0, min: 0 }
}, { _id: false });

const warehouseBinSchema = new mongoose.Schema({
  warehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true,
    index: true
  },
  zone: {
    type: String,
    required: true,
    trim: true,
    default: 'Zone A'
  },
  aisle: {
    type: String,
    required: true,
    trim: true,
    default: 'Aisle 1'
  },
  rack: {
    type: String,
    required: true,
    trim: true,
    default: 'Rack 1'
  },
  shelf: {
    type: String,
    required: true,
    trim: true,
    default: 'Level 1'
  },
  binCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  type: {
    type: String,
    enum: ['standard', 'pallet', 'cold_storage', 'hazardous', 'oversized'],
    default: 'standard'
  },
  maxCapacity: {
    type: Number,
    required: true,
    default: 100,
    min: 1
  },
  currentUnits: {
    type: Number,
    default: 0,
    min: 0
  },
  assignedSkus: [assignedSkuSchema],
  coordinates: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    width: { type: Number, default: 1 },
    height: { type: Number, default: 1 }
  },
  status: {
    type: String,
    enum: ['available', 'full', 'maintenance', 'reserved'],
    default: 'available'
  },
  notes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

warehouseBinSchema.index({ warehouseId: 1, binCode: 1 }, { unique: true });
warehouseBinSchema.index({ warehouseId: 1, zone: 1, aisle: 1 });
warehouseBinSchema.index({ 'assignedSkus.sku': 1 });

export const WarehouseBin = mongoose.model('WarehouseBin', warehouseBinSchema);
