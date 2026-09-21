import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, required: true }
}, { timestamps: true });

export const Permission = mongoose.model('Permission', permissionSchema);
