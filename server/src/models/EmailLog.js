import mongoose from 'mongoose';

const emailLogSchema = new mongoose.Schema({
  to: { type: String, required: true },
  subject: { type: String, required: true },
  template: { type: String, default: 'standard' },
  status: { type: String, enum: ['SENT', 'SIMULATED', 'FAILED'], default: 'SENT' },
  messageId: { type: String, default: '' },
  error: { type: String, default: null }
}, { timestamps: true });

export const EmailLog = mongoose.model('EmailLog', emailLogSchema);
