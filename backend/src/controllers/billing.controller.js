import User from "../models/userSchema.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { logActivity } from "../utils/logActivity.js";
import { isPremiumUser } from "../utils/premium.js";
import {
  applySubscriptionToUser,
  isPaddleConfigured,
  paddleApi,
  paddleEnvironment,
  verifyWebhook,
} from "../utils/paddle.js";

// Payments run on Paddle Billing. Checkout and card updates open Paddle's overlay inside the app
// (Paddle.js); cancel / resume happen through the API. The webhook keeps the plan in sync.

const ok = (res, data, message = "OK") => res.status(200).json(new ApiResponse(200, data, message));

// Log the plan change when Premium switches on or off
const logPlanChange = async (user, wasPremium) => {
  const isNow = user.plan === "premium";
  if (wasPremium === isNow) return;
  await logActivity(
    user._id,
    isNow ? "plan_upgraded" : "plan_downgraded",
    isNow ? "Upgraded to Premium" : "Premium ended, back on the Free plan"
  );
};

// The user's most recent Paddle subscription: the stored one, else found through their Paddle customer
const findSubscription = async (user) => {
  if (user.subscription?.subscriptionId) {
    return paddleApi("GET", `/subscriptions/${encodeURIComponent(user.subscription.subscriptionId)}`);
  }
  let customerId = user.subscription?.customerId;
  if (!customerId) {
    const customers = await paddleApi("GET", `/customers?email=${encodeURIComponent(user.email)}`);
    customerId = customers?.[0]?.id;
  }
  if (!customerId) return null;
  const subs = await paddleApi("GET", `/subscriptions?customer_id=${encodeURIComponent(customerId)}&order_by=id[DESC]`);
  // only subscriptions made for this account (checkout passes our user id as custom data)
  return (subs || []).find((s) => !s.custom_data?.userId || s.custom_data.userId === String(user._id)) || null;
};

// What the browser needs to open Paddle's checkout overlay (the client-side token is public)
export const getCheckoutConfig = asyncHandler(async (req, res) => {
  if (!isPaddleConfigured() || !process.env.PADDLE_CLIENT_TOKEN || !process.env.PADDLE_PRICE_ID) {
    throw new ApiError(503, "Payments are not configured on the server");
  }
  return ok(res, {
    environment: paddleEnvironment(),
    clientToken: process.env.PADDLE_CLIENT_TOKEN,
    priceId: process.env.PADDLE_PRICE_ID,
    email: req.user.email,
    userId: String(req.user._id),
    alreadyPremium: isPremiumUser(req.user),
  });
});

// Re-read the subscription from Paddle. Called after checkout (with its transaction id) so Premium
// shows up right away, before the webhook arrives, and after a card update.
export const syncSubscription = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  let sub = null;

  const transactionId = req.body?.transactionId;
  if (transactionId) {
    if (!/^txn_[a-z0-9]+$/i.test(transactionId)) throw new ApiError(400, "Invalid transaction id");
    const txn = await paddleApi("GET", `/transactions/${transactionId}`);
    if (txn.custom_data?.userId && txn.custom_data.userId !== String(user._id)) {
      throw new ApiError(403, "This payment belongs to another account");
    }
    if (txn.subscription_id) sub = await paddleApi("GET", `/subscriptions/${txn.subscription_id}`);
  }
  if (!sub) sub = await findSubscription(user);

  if (sub) {
    const wasPremium = user.plan === "premium";
    applySubscriptionToUser(user, sub);
    await user.save();
    await logPlanChange(user, wasPremium);
  }
  return ok(res, user, "Subscription synced");
});

// Cancel at the end of the paid month, or undo that. Premium stays until the period ends;
// the webhook (subscription.canceled) switches the plan to Free when it does.
const setCancelAtPeriodEnd = (cancel) =>
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    let sub = await findSubscription(user);
    if (!sub || sub.status === "canceled") throw new ApiError(400, "No active subscription to change");

    const scheduledCancel = sub.scheduled_change?.action === "cancel";
    if (cancel && !scheduledCancel) {
      sub = await paddleApi("POST", `/subscriptions/${sub.id}/cancel`, { effective_from: "next_billing_period" });
    } else if (!cancel && scheduledCancel) {
      sub = await paddleApi("PATCH", `/subscriptions/${sub.id}`, { scheduled_change: null });
    }
    if (cancel !== scheduledCancel) {
      await logActivity(
        user._id,
        cancel ? "subscription_cancelled" : "subscription_resumed",
        cancel ? "Cancelled Premium; it stays active until the end of the billing period" : "Resumed Premium auto-renewal"
      );
    }

    applySubscriptionToUser(user, sub);
    await user.save();
    return ok(res, user, cancel ? "Subscription cancelled" : "Subscription resumed");
  });

export const cancelSubscription = setCancelAtPeriodEnd(true);
export const resumeSubscription = setCancelAtPeriodEnd(false);

// ---- Card on file ----

const cardFrom = (txn) => {
  const payments = txn?.payments || [];
  const paid = payments.find((p) => p.status === "captured" && p.method_details?.card) || payments.find((p) => p.method_details?.card);
  const card = paid?.method_details?.card;
  return card ? { brand: card.type, last4: card.last4, expMonth: card.expiry_month, expYear: card.expiry_year } : null;
};

// The card used for the latest successful payment of the subscription
export const getPaymentMethod = asyncHandler(async (req, res) => {
  const subId = req.user.subscription?.subscriptionId;
  if (!subId) return ok(res, { card: null });
  const txns = await paddleApi(
    "GET",
    `/transactions?subscription_id=${encodeURIComponent(subId)}&status=completed&order_by=billed_at[DESC]&per_page=5`
  );
  const card = (txns || []).map(cardFrom).find(Boolean) || null;
  return ok(res, { card }, "Card loaded");
});

// A transaction for Paddle's "update payment method" checkout. For an overdue subscription it is the
// unpaid renewal, so entering a new card also pays what is due.
export const createCardUpdate = asyncHandler(async (req, res) => {
  const subId = req.user.subscription?.subscriptionId;
  if (!subId) throw new ApiError(400, "No subscription found for this account");
  const txn = await paddleApi("GET", `/subscriptions/${encodeURIComponent(subId)}/update-payment-method-transaction`);
  return ok(res, { transactionId: txn.id, pastDue: txn.status === "past_due" }, "Card update ready");
});

// ---- Webhook: the source of truth for renewals, cancellations and failed payments ----
// Mounted with express.raw() so the signature is checked against the exact body.
export const handlePaddleWebhook = async (req, res) => {
  let event;
  try {
    const raw = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body || "");
    event = verifyWebhook(raw, req.headers["paddle-signature"], process.env.PADDLE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Paddle webhook rejected:", err.message);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  try {
    let sub = null;
    const type = String(event.event_type || "");
    if (type.startsWith("subscription.")) {
      sub = event.data;
    } else if (["transaction.completed", "transaction.past_due", "transaction.payment_failed"].includes(type) && event.data?.subscription_id) {
      sub = await paddleApi("GET", `/subscriptions/${event.data.subscription_id}`);
    }

    if (sub?.id) {
      const userId = sub.custom_data?.userId;
      const user =
        (userId && /^[a-f0-9]{24}$/i.test(userId) && (await User.findById(userId))) ||
        (await User.findOne({ "subscription.customerId": sub.customer_id }));

      // Ignore late events about an older subscription once a newer one is active
      const isOlderSub =
        user?.subscription?.subscriptionId && user.subscription.subscriptionId !== sub.id && user.plan === "premium";

      if (user && !isOlderSub) {
        const wasPremium = user.plan === "premium";
        applySubscriptionToUser(user, sub);
        await user.save();
        await logPlanChange(user, wasPremium);
      }
    }
    return res.json({ received: true });
  } catch (err) {
    // a non-2xx response makes Paddle retry later
    console.error("Paddle webhook failed:", err);
    return res.status(500).json({ received: false });
  }
};
