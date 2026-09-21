import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { emitSocketEvent } from './socketService.js';
import { enqueueEmail } from './emailService.js';

const getEventColor = (type) => {
  switch (type) {
    case 'NEW_ORDER':
      return { bg: '#059669', badge: '#10b981', label: 'NEW ORDER' };
    case 'LOW_STOCK':
      return { bg: '#d97706', badge: '#f59e0b', label: 'LOW STOCK WARNING' };
    case 'OUT_OF_STOCK':
      return { bg: '#dc2626', badge: '#ef4444', label: 'OUT OF STOCK ALERT' };
    case 'INVENTORY_ADDED':
    case 'STOCK_ADJUSTED':
    case 'PURCHASE_RECEIVED':
      return { bg: '#2563eb', badge: '#3b82f6', label: 'INVENTORY UPDATE' };
    case 'USER_ADDED':
      return { bg: '#7c3aed', badge: '#8b5cf6', label: 'TEAM & SECURITY' };
    case 'MARKETPLACE_SYNC':
    case 'MARKETPLACE_LISTING_CREATED':
      return { bg: '#ea580c', badge: '#f97316', label: 'MARKETPLACE SYNC' };
    default:
      return { bg: '#4f46e5', badge: '#6366f1', label: 'SYSTEM ALERT' };
  }
};

const buildEmailHtml = ({ title, message, type, link, metadata = {} }) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const fullLink = link ? (link.startsWith('http') ? link : `${clientUrl}${link}`) : clientUrl;
  const theme = getEventColor(type);

  // Format any metadata entries into clean key-value rows
  const metaRows = Object.entries(metadata)
    .filter(([k, v]) => v !== undefined && v !== null && typeof v !== 'object')
    .map(([key, val]) => `
      <tr>
        <td style="padding: 8px 12px; font-weight: 600; color: #64748b; font-size: 13px; text-transform: capitalize; border-bottom: 1px solid #f1f5f9;">
          ${key.replace(/([A-Z])/g, ' $1')}
        </td>
        <td style="padding: 8px 12px; color: #0f172a; font-size: 13px; font-weight: 500; border-bottom: 1px solid #f1f5f9; text-align: right;">
          ${String(val)}
        </td>
      </tr>
    `).join('');

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 15px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45); border: 1px solid #1e293b;">
            
            <!-- Brand Header -->
            <tr>
              <td style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 28px 32px; border-bottom: 3px solid ${theme.badge};">
                <table width="100%">
                  <tr>
                    <td>
                      <div style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                        ⚡ Nexus <span style="color: #38bdf8;">ERP</span>
                      </div>
                      <div style="font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">
                        Enterprise Autonomous Notification
                      </div>
                    </td>
                    <td align="right">
                      <span style="display: inline-block; background-color: ${theme.badge}; color: #ffffff; padding: 5px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px;">
                        ${theme.label}
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Content Area -->
            <tr>
              <td style="padding: 36px 32px 28px 32px;">
                <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700; line-height: 1.3;">
                  ${title}
                </h2>
                <p style="margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.6;">
                  ${message}
                </p>

                ${metaRows ? `
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px; margin-bottom: 28px;">
                  <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                    Event Details
                  </div>
                  <table width="100%" cellspacing="0" cellpadding="0">
                    ${metaRows}
                  </table>
                </div>
                ` : ''}

                <!-- Action Button -->
                <div style="text-align: center; margin: 30px 0 10px 0;">
                  <a href="${fullLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 13px 30px; border-radius: 10px; font-size: 14px; font-weight: 700; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);">
                    Open in ERP Workspace &rarr;
                  </a>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
                <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.5;">
                  This is an automated real-time notification sent directly to your configured administrator email.
                </p>
                <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 11px;">
                  Nexus ERP &copy; ${new Date().getFullYear()} &bull; Multi-Channel Enterprise Operations
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
};

export const createNotification = async ({
  title,
  message,
  type = 'NEW_ORDER',
  link = '',
  metadata = {},
  targetRole = null,
  targetUser = null,
  skipEmail = false
}) => {
  try {
    const notification = await Notification.create({
      title,
      message,
      type,
      link,
      metadata,
      targetRole,
      targetUser
    });

    // Real-time WebSocket broadcast to all connected clients
    emitSocketEvent('notification:new', notification);

    // Automated Real-Time Email Dispatch to user / admin
    if (!skipEmail) {
      try {
        const recipients = new Set();

        // 1. Primary user email from configuration
        if (process.env.SMTP_USER && process.env.SMTP_USER.trim() !== '') {
          recipients.add(process.env.SMTP_USER.toLowerCase().trim());
        }

        // 2. Specific targetUser if specified
        if (targetUser) {
          if (typeof targetUser === 'string' && targetUser.includes('@')) {
            recipients.add(targetUser.toLowerCase().trim());
          } else {
            try {
              const u = await User.findById(targetUser).select('email status isDeleted');
              if (u && !u.isDeleted && u.status === 'active' && u.email) {
                recipients.add(u.email.toLowerCase().trim());
              }
            } catch (e) {
              // ignore
            }
          }
        }

        // 3. Dispatch styled HTML email to all gathered recipients
        const emailHtml = buildEmailHtml({ title, message, type, link, metadata });
        for (const recipient of recipients) {
          enqueueEmail({
            to: recipient,
            subject: `[Nexus ERP Alert] ${title}`,
            html: emailHtml,
            template: type
          }).catch((err) => {
            console.error(`[Email Notification Error] Could not enqueue email for ${recipient}:`, err.message);
          });
        }
      } catch (emailErr) {
        console.error(`[Email Notification Dispatch Failed]: ${emailErr.message}`);
      }
    }

    return notification;
  } catch (error) {
    console.error(`[Notification Error] Failed to create notification: ${error.message}`);
    return null;
  }
};
