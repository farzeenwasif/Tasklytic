import { ApiError } from "../utils/apiError.js";
import { isPremiumUser } from "../utils/premium.js";

// Runs after verifyJWT: only Premium users (paid or complimentary) get through
export const requirePremium = (req, res, next) => {
  if (!isPremiumUser(req.user)) {
    return next(new ApiError(403, "This is a Premium feature. Upgrade to use AI."));
  }
  next();
};

// Simple in-memory limit per user so one account can't burn through the AI quota.
// (Per server instance; good enough for a single-instance deploy.)
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = Number(process.env.AI_RATE_LIMIT || 40);
const hits = new Map();

// drop users with no recent requests so the map doesn't grow forever
setInterval(() => {
  const now = Date.now();
  for (const [key, times] of hits) {
    if (!times.some((t) => now - t < WINDOW_MS)) hits.delete(key);
  }
}, WINDOW_MS).unref();

export const aiRateLimit = (req, res, next) => {
  const key = String(req.user._id);
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    return next(new ApiError(429, "Too many AI requests. Please wait a few minutes."));
  }
  recent.push(now);
  hits.set(key, recent);
  next();
};
