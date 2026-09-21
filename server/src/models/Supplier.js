import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  company: { type: String, default: '', trim: true },
  phone: { type: String, default: '', trim: true },
  email: { type: String, default: '', lowercase: true, trim: true },
  gstin: { type: String, default: '', uppercase: true, trim: true },
  address: { type: String, default: '' },
  notes: { type: String, default: '' },
  totalPurchases: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  pendingAmount: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

supplierSchema.index({ name: 'text', company: 'text', phone: 'text' });

export const Supplier = mongoose.model('Supplier', supplierSchema);
