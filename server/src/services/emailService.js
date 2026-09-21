import { sendEmail } from '../config/email.js';
import { EmailLog } from '../models/EmailLog.js';
import { jobQueue } from '../config/queue.js';

// Register background job handler for email queue
jobQueue.registerHandler('EMAIL_QUEUE', async (data) => {
  const { to, subject, html, text, template } = data;
  try {
    const result = await sendEmail({ to, subject, html, text });
    await EmailLog.create({
      to,
      subject,
      template: template || 'standard',
      status: result.simulated ? 'SIMULATED' : 'SENT',
      messageId: result.messageId
    });
  } catch (err) {
    await EmailLog.create({
      to,
      subject,
      template: template || 'standard',
      status: 'FAILED',
      error: err.message
    });
    throw err; // Trigger retry in queue
  }
});

export const enqueueEmail = async ({ to, subject, html, text, template }) => {
  if (!to) return;
  await jobQueue.addJob('EMAIL_QUEUE', 'send_email', { to, subject, html, text, template });
};
