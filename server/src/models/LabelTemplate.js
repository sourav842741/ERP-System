import mongoose from 'mongoose';

const labelTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['shipping_label', 'sku_barcode_tag', 'packing_slip'],
    required: true
  },
  dimensions: {
    width: { type: Number, required: true, default: 4 }, // in inches or mm
    height: { type: Number, required: true, default: 6 },
    unit: { type: String, enum: ['in', 'mm'], default: 'in' }
  },
  settings: {
    showMRP: { type: Boolean, default: true },
    showStoreLogo: { type: Boolean, default: true },
    showStoreName: { type: Boolean, default: true },
    storeName: { type: String, default: 'Nexus Retail Enterprise' },
    storeAddress: { type: String, default: 'Warehouse Hub 1, Sector 62, Noida, UP, 201301' },
    storeGSTIN: { type: String, default: '09AAECN1234F1Z5' },
    showQR: { type: Boolean, default: true },
    barcodeType: { type: String, enum: ['CODE128', 'EAN13', 'QR'], default: 'CODE128' },
    barcodeHeight: { type: Number, default: 45 },
    showReturnAddress: { type: Boolean, default: true },
    disclaimerText: { type: String, default: 'All disputes subject to local jurisdiction. Check parcel seal before accepting delivery.' }
  },
  isDefault: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export const LabelTemplate = mongoose.model('LabelTemplate', labelTemplateSchema);
