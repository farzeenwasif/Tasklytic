import Stripe from "stripe";
import { ApiError } from "./apiError.js";

let client = null;

// Created on first use so the env vars are loaded; a clear error if billing isn't set up
export const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new ApiError(503, "Payments are not configured on the server");
  }
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
};

// These Stripe statuses keep Premium on (past_due: Stripe is still retrying the card)
const PREMIUM_STATUSES = new Set(["active", "trialing", "past_due"]);

// Copy a Stripe subscription onto the user document (caller saves)
export const applySubscriptionToUser = (user, sub) => {
  // newer Stripe API versions keep the billing period on the subscription item
  const periodEnd = sub.items?.data?.[0]?.current_period_end ?? sub.current_period_end;
  user.subscription = {
    ...(user.subscription?.toObject?.() ?? user.subscription ?? {}),
    stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
    stripeSubscriptionId: sub.id,
    status: sub.status,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
  };
  user.plan = PREMIUM_STATUSES.has(sub.status) ? "premium" : "free";
};
