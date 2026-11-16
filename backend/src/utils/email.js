import nodemailer from "nodemailer";

const isConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter;
const getTransporter = () => {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 465;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // 465 = TLS from the start, 587 = STARTTLS
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
};

/**
 * Send an email. Returns { delivered: boolean }.
 * Without SMTP settings (local development) the message is printed to the
 * server console instead, so the reset flow can still be tried out.
 */
export const sendEmail = async ({ to, subject, html, text, replyTo }) => {
  if (!isConfigured()) {
    if (process.env.NODE_ENV === "production") {
      console.error("SMTP is not configured: email was NOT sent. Set SMTP_HOST, SMTP_USER and SMTP_PASS.");
    } else {
      console.log(`\n----- EMAIL (SMTP not configured, printing instead) -----\nTo: ${to}\nSubject: ${subject}\n\n${text}\n----------------------------------------------------------\n`);
    }
    return { delivered: false };
  }

  await getTransporter().sendMail({
    from: process.env.MAIL_FROM || `"Tasklytic" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    text,
    ...(replyTo ? { replyTo } : {}),
  });
  return { delivered: true };
};

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Shared dark email layout
const layout = (title, bodyHtml) => `
<div style="background:#0d0d0f;padding:32px 16px;font-family:Segoe UI,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#18181b;border:1px solid #2a2a2e;border-radius:16px;padding:32px;">
    <p style="margin:0 0 24px;font-size:20px;font-weight:800;color:#ffffff;">Task<span style="color:#10B981;">lytic</span></p>
    <h1 style="margin:0 0 16px;font-size:22px;color:#ffffff;">${title}</h1>
    ${bodyHtml}
  </div>
</div>`;

const p = (html) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#c4c4c8;">${html}</p>`;

export const sendPasswordResetEmail = (user, resetUrl, minutes) =>
  sendEmail({
    to: user.email,
    subject: "Reset your Tasklytic password",
    text: `Hi ${user.name},\n\nWe received a request to reset your Tasklytic password.\nOpen this link to choose a new one (valid for ${minutes} minutes, one use only):\n\n${resetUrl}\n\nIf you didn't ask for this, you can ignore this email. Your password will not change.`,
    html: layout(
      "Reset your password",
      p(`Hi ${escapeHtml(user.name)},`) +
        p(`We received a request to reset your Tasklytic password. This link is valid for <b style="color:#fff;">${minutes} minutes</b> and can be used once.`) +
        `<p style="margin:24px 0;"><a href="${resetUrl}" style="display:inline-block;background:#10B981;color:#ffffff;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:10px;">Choose a new password</a></p>` +
        p(`If the button doesn't work, copy this link:<br><a href="${resetUrl}" style="color:#10B981;word-break:break-all;">${resetUrl}</a>`) +
        p(`If you didn't ask for this, you can ignore this email. Your password will not change.`)
    ),
  });

export const sendPasswordChangedEmail = (user) =>
  sendEmail({
    to: user.email,
    subject: "Your Tasklytic password was changed",
    text: `Hi ${user.name},\n\nYour Tasklytic password was just changed. You have been logged out on all devices.\n\nIf this wasn't you, reset your password again immediately from the login page.`,
    html: layout(
      "Your password was changed",
      p(`Hi ${escapeHtml(user.name)},`) +
        p(`Your Tasklytic password was just changed. You have been logged out on all devices.`) +
        p(`If this wasn't you, reset your password again immediately from the login page.`)
    ),
  });
