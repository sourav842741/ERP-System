import { Setting } from '../models/Setting.js';
import { sendEmail, isEmailConfigured } from '../config/email.js';
import { isCloudinaryConfigured } from '../config/cloudinary.js';
import { EmailLog } from '../models/EmailLog.js';
import { logAudit } from '../middlewares/auditMiddleware.js';

export const getSettings = async (req, res) => {
  try {
    const settings = await Setting.find();
    const settingsMap = settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        settings: settingsMap,
        serviceStatus: {
          emailConfigured: isEmailConfigured(),
          cloudinaryConfigured: isCloudinaryConfigured(),
          redisConfigured: Boolean(process.env.REDIS_URL && process.env.REDIS_URL.trim() !== '')
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const updates = req.body; // { theme: 'dark', accentColor: 'blue', companyName: '...' }

    for (const [key, value] of Object.entries(updates)) {
      await Setting.findOneAndUpdate(
        { key },
        { key, value },
        { upsert: true, new: true }
      );
    }

    await logAudit({
      req,
      action: 'SETTINGS_UPDATED',
      module: 'Settings',
      newValue: updates,
      reason: 'System settings changed'
    });

    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const sendTestEmail = async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ success: false, message: 'Recipient email required' });

    const result = await sendEmail({
      to,
      subject: 'Marketplace ERP - Test Email Delivery',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
          <h2>ERP System Email Verification</h2>
          <p>This is a test notification confirming that your SMTP/Gmail configuration is operational.</p>
          <p style="color: #64748b; font-size: 13px;">Timestamp: ${new Date().toLocaleString()}</p>
        </div>
      `
    });

    await EmailLog.create({
      to,
      subject: 'Test Email Delivery',
      status: result.simulated ? 'SIMULATED' : 'SENT',
      messageId: result.messageId
    });

    res.json({
      success: true,
      message: result.simulated
        ? 'SMTP credentials not configured in .env yet. Email logged safely to console.'
        : `Test email dispatched successfully to ${to}`,
      simulated: result.simulated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: `Email failed: ${err.message}` });
  }
};
