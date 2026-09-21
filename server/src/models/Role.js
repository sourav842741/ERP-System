import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  permissions: [{ type: String }], // Array of permission codes, e.g. 'inventory:view'
  isSystem: { type: Boolean, default: false } // System roles cannot be deleted
}, { timestamps: true });

export const Role = mongoose.model('Role', roleSchema);
