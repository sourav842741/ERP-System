import mongoose from 'mongoose';
import { NOTIFICATION_TYPES } from '../config/constants.js';

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: Object.values(NOTIFICATION_TYPES),
    default: NOTIFICATION_TYPES.NEW_ORDER
  },
  isRead: { type: Boolean, default: false },
  link: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  targetRole: { type: String, default: null }, // e.g., 'Super Admin', or null for all
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

notificationSchema.index({ createdAt: -1, isRead: 1 });

export const Notification = mongoose.model('Notification', notificationSchema);
