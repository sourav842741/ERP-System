import { AuditLog } from '../models/AuditLog.js';

export const logAudit = async ({
  req,
  userId = null,
  userName = 'System',
  action,
  module,
  entityId = '',
  oldValue = null,
  newValue = null,
  reason = ''
}) => {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '') : '127.0.0.1';
    const userAgent = req ? (req.headers['user-agent'] || '') : 'System Worker';
    const uId = userId || (req && req.user ? req.user._id : null);
    const uName = userName || (req && req.user ? req.user.name : 'System');

    await AuditLog.create({
      userId: uId,
      userName: uName,
      action,
      module,
      entityId: String(entityId),
      oldValue,
      newValue,
      reason,
      ip,
      userAgent
    });
  } catch (error) {
    console.error(`[Audit Log Error] Failed to record audit log: ${error.message}`);
  }
};
