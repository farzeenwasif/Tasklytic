import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendEmail } from "../utils/email.js";

// Help messages go to this inbox; "Reply" in the inbox answers the sender directly
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "farzeenwasif15@gmail.com";

const TOPICS = ["General question", "Problem / bug", "Billing & Premium", "Feature idea"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// At most 5 messages per hour from one address, so the form can't be used to spam the inbox
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const recent = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [ip, times] of recent) if (!times.some((t) => now - t < WINDOW_MS)) recent.delete(ip);
}, WINDOW_MS).unref();

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const sendContactMessage = asyncHandler(async (req, res) => {
  const b = req.body || {};
  // Hidden "website" field: people never fill it in, bots usually do
  if (b.website) return res.status(200).json(new ApiResponse(200, null, "Message sent"));

  const name = String(b.name ?? "").trim().slice(0, 80);
  const email = String(b.email ?? "").trim().toLowerCase().slice(0, 120);
  const topic = TOPICS.includes(b.topic) ? b.topic : TOPICS[0];
  const message = String(b.message ?? "").trim().slice(0, 3000);
  if (!name) throw new ApiError(400, "Please tell us your name");
  if (!EMAIL_RE.test(email)) throw new ApiError(400, "Please enter a valid email so we can reply");
  if (message.length < 10) throw new ApiError(400, "Please describe how we can help (at least 10 characters)");

  const ip = req.ip || "unknown";
  const now = Date.now();
  const times = (recent.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (times.length >= MAX_PER_WINDOW) {
    throw new ApiError(429, `Too many messages. Please wait a while or email ${SUPPORT_EMAIL} directly.`);
  }
  times.push(now);
  recent.set(ip, times);

  const text = `New help request from Tasklytic\n\nName: ${name}\nEmail: ${email}\nTopic: ${topic}\n\n${message}\n\n(Reply to this email to answer ${name}.)`;
  const html = `
<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;color:#1f2937">
  <h2 style="margin:0 0 12px">New help request</h2>
  <p style="margin:0 0 4px"><b>Name:</b> ${escapeHtml(name)}</p>
  <p style="margin:0 0 4px"><b>Email:</b> ${escapeHtml(email)}</p>
  <p style="margin:0 0 16px"><b>Topic:</b> ${escapeHtml(topic)}</p>
  <div style="white-space:pre-wrap;background:#f3f4f6;border-radius:8px;padding:12px">${escapeHtml(message)}</div>
  <p style="margin:16px 0 0;color:#6b7280;font-size:13px">Reply to this email to answer ${escapeHtml(name)} directly.</p>
</div>`;

  try {
    const { delivered } = await sendEmail({
      to: SUPPORT_EMAIL,
      subject: `[Tasklytic help] ${topic}: ${name}`,
      text,
      html,
      replyTo: `"${name.replace(/"/g, "")}" <${email}>`,
    });
    if (!delivered && process.env.NODE_ENV === "production") throw new Error("SMTP not configured");
  } catch (err) {
    console.error("Help message could not be sent:", err.message);
    throw new ApiError(502, `Your message could not be sent right now. Please email ${SUPPORT_EMAIL} directly.`);
  }
  return res.status(200).json(new ApiResponse(200, null, "Message sent"));
});
