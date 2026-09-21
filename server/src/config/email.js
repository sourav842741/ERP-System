import nodemailer from 'nodemailer';

export const isEmailConfigured = () => {
  return Boolean(
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_USER.trim() !== ''
  );
};

export const getTransporter = () => {
  if (!isEmailConfigured()) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

export const sendEmail = async ({ to, subject, html, text }) => {
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@erp.local';
  const from = `"${process.env.SMTP_FROM_NAME || 'Nexus ERP Enterprise'}" <${fromEmail}>`;
  
  if (!isEmailConfigured()) {
    console.log(`[Email Simulation] To: ${to} | Subject: ${subject}`);
    return { success: true, simulated: true, messageId: `sim_${Date.now()}` };
  }

  const transporter = getTransporter();
  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html
  });

  return { success: true, simulated: false, messageId: info.messageId };
};
