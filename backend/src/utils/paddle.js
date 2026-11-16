import crypto from "node:crypto";
import { ApiError } from "./apiError.js";

// Paddle Billing over its REST API (https://developer.paddle.com/api-reference).
// PADDLE_ENV=production uses the live API; anything else uses the sandbox.
const isLive = () => process.env.PADDLE_ENV === "production";
export const paddleEnvironment = () => (isLive() ? "production" : "sandbox");
const baseUrl = () => (isLive() ? "https://api.paddle.com" : "https://sandbox-api.paddle.com");

export const isPaddleConfigured = () => Boolean(process.env.PADDLE_API_KEY);

// Call the Paddle API; returns the `data` of the response, throws ApiError on failure
export const paddleApi = async (method, path, body) => {
  if (!isPaddleConfigured()) throw new ApiError(503, "Payments are not configured on the server");
  const res = await fetch(baseUrl() + path, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = json?.error?.detail || json?.error?.code || `Paddle request failed (${res.status})`;
    console.error(`Paddle ${method} ${path} failed:`, res.status, json?.error?.code, detail);
    throw new ApiError(res.status >= 500 ? 502 : 400, detail);
  }
  return json.data;
};

// Webhook signature check (Paddle-Signature: "ts=<unix>;h1=<hex>").
// The signed payload is "<ts>:<raw body>", HMAC-SHA256 with the notification destination's secret key.
const MAX_AGE_SECONDS = 5 * 60;
export const verifyWebhook = (rawBody, header, secret) => {
  if (!secret) throw new Error("PADDLE_WEBHOOK_SECRET is not set");
  const parts = Object.fromEntries(
    String(header || "")
      .split(";")
      .map((p) => p.split("="))
      .filter((kv) => kv.length === 2)
  );
  const ts = Number(parts.ts);
  if (!ts || !parts.h1) throw new Error("Missing Paddle-Signature");
  if (Math.abs(Date.now() / 1000 - ts) > MAX_AGE_SECONDS) throw new Error("Webhook timestamp is too old");
  const expected = crypto.createHmac("sha256", secret).update(`${parts.ts}:${rawBody}`).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(String(parts.h1), "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error("Invalid webhook signature");
  return JSON.parse(rawBody);
};

// These Paddle statuses keep Premium on (past_due: Paddle is still retrying the card)
const PREMIUM_STATUSES = new Set(["active", "trialing", "past_due"]);

// Copy a Paddle subscription (REST shape, snake_case) onto the user document (caller saves)
export const applySubscriptionToUser = (user, sub) => {
  const periodEnd = sub.current_billing_period?.ends_at || sub.scheduled_change?.effective_at || sub.next_billed_at;
  user.subscription = {
    ...(user.subscription?.toObject?.() ?? user.subscription ?? {}),
    provider: "paddle",
    customerId: sub.customer_id,
    subscriptionId: sub.id,
    status: sub.status,
    currentPeriodEnd: periodEnd ? new Date(periodEnd) : undefined,
    cancelAtPeriodEnd: sub.scheduled_change?.action === "cancel",
  };
  user.plan = PREMIUM_STATUSES.has(sub.status) ? "premium" : "free";
};
