import User from "../models/userSchema.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { logActivity } from "../utils/logActivity.js";
import { getFrontendUrl } from "../utils/frontendUrl.js";
import { getStripe, applySubscriptionToUser } from "../utils/stripe.js";
import { isPremiumUser } from "../utils/premium.js";

// Stripe customer for this user, created on first checkout.
// Two checkout requests can arrive at the same time (e.g. a double click), so:
// - the idempotency key makes Stripe return the SAME customer for both calls
// - the conditional update only stores an id if none is stored yet
const ensureCustomer = async (stripe, user) => {
  if (user.subscription?.stripeCustomerId) return user.subscription.stripeCustomerId;

  const customer = await stripe.customers.create(
    { email: user.email, name: user.name, metadata: { userId: String(user._id) } },
    { idempotencyKey: `tasklytic-customer-${user._id}` }
  );

  const saved = await User.findOneAndUpdate(
    { _id: user._id, "subscription.stripeCustomerId": { $in: [null, ""] } },
    { $set: { "subscription.stripeCustomerId": customer.id } },
    { new: true }
  );
  if (saved) return customer.id;

  // Another request stored a customer first: use that one
  const fresh = await User.findById(user._id);
  return fresh.subscription?.stripeCustomerId || customer.id;
};

// The user's most recent subscription: by stored customer, then by the userId we put in metadata
// (covers payments made under a different customer)
const findLatestSubscription = async (stripe, user) => {
  const customer = user.subscription?.stripeCustomerId;
  if (customer) {
    const { data } = await stripe.subscriptions.list({ customer, status: "all", limit: 1 });
    if (data[0]) return data[0];
  }
  const { data } = await stripe.subscriptions.search({
    query: `metadata['userId']:'${String(user._id)}'`,
    limit: 10,
  });
  return data.sort((a, b) => b.created - a.created)[0] || null;
};

// Start a $20/month Premium checkout. Returns a client_secret for the embedded
// Stripe payment form (ui_mode "form") that the Billing page renders.
export const createCheckoutSession = asyncHandler(async (req, res) => {
  const stripe = getStripe();
  if (!process.env.STRIPE_PRICE_ID) throw new ApiError(503, "Premium price is not configured");

  const user = await User.findById(req.user._id);
  if (isPremiumUser(user)) throw new ApiError(400, "You already have Premium");

  const customer = await ensureCustomer(stripe, user);
  const frontend = getFrontendUrl();
  const session = await stripe.checkout.sessions.create({
    // Configured in Stripe Checkout Studio
    ui_mode: "form",
    billing_address_collection: "auto",
    phone_number_collection: { enabled: false },
    automatic_tax: { enabled: false },
    payment_method_collection: "always",
    submit_type: "auto",
    integration_identifier: "custom_embedded_web_0001",

    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],

    // Links the payment to this user so the webhook can switch on Premium
    customer,
    client_reference_id: String(user._id),
    subscription_data: { metadata: { userId: String(user._id) } },

    // Where Stripe sends the user after the embedded form confirms
    return_url: `${frontend}/billing?status=success`,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { client_secret: session.client_secret }, "Checkout started"));
});

// Re-read the subscription from Stripe. Called after checkout so Premium shows up
// right away even if the webhook hasn't arrived yet.
export const syncSubscription = asyncHandler(async (req, res) => {
  const stripe = getStripe();
  const user = await User.findById(req.user._id);
  const sub = await findLatestSubscription(stripe, user);

  if (sub) {
    const wasPremium = user.plan === "premium";
    applySubscriptionToUser(user, sub);
    await user.save();
    if (!wasPremium && user.plan === "premium") {
      await logActivity(user._id, "plan_upgraded", "Upgraded to Premium");
    }
  }
  return res.status(200).json(new ApiResponse(200, user, "Subscription synced"));
});

// Stripe webhook: the source of truth for plan changes (renewals, cancellations, failed payments).
// Mounted with express.raw() so the signature can be verified against the exact body.
export const handleStripeWebhook = async (req, res) => {
  let event;
  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
    event = getStripe().webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Stripe webhook rejected:", err.message);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  try {
    let sub = null;
    if (event.type === "checkout.session.completed" && event.data.object.subscription) {
      sub = await getStripe().subscriptions.retrieve(event.data.object.subscription);
    } else if (
      ["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)
    ) {
      sub = event.data.object;
    }

    if (sub) {
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
      const user =
        (sub.metadata?.userId && (await User.findById(sub.metadata.userId))) ||
        (await User.findOne({ "subscription.stripeCustomerId": customerId }));

      // Ignore late events about an older subscription once a newer one is active
      const isOlderSub =
        user?.subscription?.stripeSubscriptionId &&
        user.subscription.stripeSubscriptionId !== sub.id &&
        user.plan === "premium";

      if (user && !isOlderSub) {
        const wasPremium = user.plan === "premium";
        applySubscriptionToUser(user, sub);
        await user.save();
        if (wasPremium !== (user.plan === "premium")) {
          await logActivity(
            user._id,
            user.plan === "premium" ? "plan_upgraded" : "plan_downgraded",
            user.plan === "premium" ? "Upgraded to Premium" : "Premium ended, back on the Free plan"
          );
        }
      }
    }
    return res.json({ received: true });
  } catch (err) {
    // 500 makes Stripe retry later
    console.error("Stripe webhook failed:", err);
    return res.status(500).json({ received: false });
  }
};

// Turn auto-renew off or back on. Premium stays until the end of the paid period either way;
// the webhook (customer.subscription.deleted) switches the plan to Free when the period ends.
const setCancelAtPeriodEnd = (cancel) =>
  asyncHandler(async (req, res) => {
    const stripe = getStripe();
    const user = await User.findById(req.user._id);

    let sub = user.subscription?.stripeSubscriptionId
      ? await stripe.subscriptions.retrieve(user.subscription.stripeSubscriptionId)
      : await findLatestSubscription(stripe, user);
    if (!sub || ["canceled", "incomplete_expired"].includes(sub.status)) {
      throw new ApiError(400, "No active subscription to change");
    }

    if (Boolean(sub.cancel_at_period_end) !== cancel) {
      sub = await stripe.subscriptions.update(sub.id, { cancel_at_period_end: cancel });
      await logActivity(
        user._id,
        cancel ? "subscription_cancelled" : "subscription_resumed",
        cancel ? "Cancelled Premium; it stays active until the end of the billing period" : "Resumed Premium auto-renewal"
      );
    }

    applySubscriptionToUser(user, sub);
    await user.save();
    return res
      .status(200)
      .json(new ApiResponse(200, user, cancel ? "Subscription cancelled" : "Subscription resumed"));
  });

export const cancelSubscription = setCancelAtPeriodEnd(true);
export const resumeSubscription = setCancelAtPeriodEnd(false);

// ---- Card on file (updated in the app with a SetupIntent; nothing is charged) ----

const cardSummary = (pm) =>
  pm?.card
    ? { brand: pm.card.brand, last4: pm.card.last4, expMonth: pm.card.exp_month, expYear: pm.card.exp_year }
    : null;

// The card Stripe charges for renewals: the subscription's own default, else the customer's
const getDefaultCard = async (stripe, user) => {
  const customerId = user.subscription?.stripeCustomerId;
  if (!customerId) return null;
  const subId = user.subscription?.stripeSubscriptionId;
  if (subId) {
    const sub = await stripe.subscriptions.retrieve(subId, { expand: ["default_payment_method"] });
    if (sub.default_payment_method?.card) return cardSummary(sub.default_payment_method);
  }
  const customer = await stripe.customers.retrieve(customerId, {
    expand: ["invoice_settings.default_payment_method"],
  });
  return cardSummary(customer.invoice_settings?.default_payment_method);
};

export const getPaymentMethod = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const card = await getDefaultCard(getStripe(), user);
  return res.status(200).json(new ApiResponse(200, { card }, "Card loaded"));
});

// Step 1: a SetupIntent the in-app card form confirms
export const createCardSetup = asyncHandler(async (req, res) => {
  const stripe = getStripe();
  const customer = req.user.subscription?.stripeCustomerId;
  if (!customer) throw new ApiError(400, "No subscription found for this account");

  const intent = await stripe.setupIntents.create({
    customer,
    usage: "off_session",
    metadata: { userId: String(req.user._id) },
  });
  return res
    .status(200)
    .json(new ApiResponse(200, { client_secret: intent.client_secret }, "Card form ready"));
});

// Step 2: after the form confirms, make the new card the default for renewals.
// If the last payment failed (past_due), retry that invoice with the new card right away.
export const saveCard = asyncHandler(async (req, res) => {
  const stripe = getStripe();
  const { setupIntentId } = req.body || {};
  if (!setupIntentId || typeof setupIntentId !== "string") throw new ApiError(400, "setupIntentId is required");

  const user = await User.findById(req.user._id);
  const customerId = user.subscription?.stripeCustomerId;
  const intent = await stripe.setupIntents.retrieve(setupIntentId);
  const intentCustomer = typeof intent.customer === "string" ? intent.customer : intent.customer?.id;
  if (!customerId || intentCustomer !== customerId) throw new ApiError(403, "This card setup does not belong to you");
  if (intent.status !== "succeeded") throw new ApiError(400, "The card has not been confirmed yet");

  const pmId = typeof intent.payment_method === "string" ? intent.payment_method : intent.payment_method?.id;
  await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: pmId } });

  let paymentRetry = null; // "paid" | "failed" | null (nothing was due)
  const subId = user.subscription?.stripeSubscriptionId;
  if (subId) {
    let sub = await stripe.subscriptions.update(subId, { default_payment_method: pmId });

    const invoiceId = typeof sub.latest_invoice === "string" ? sub.latest_invoice : sub.latest_invoice?.id;
    if (sub.status === "past_due" && invoiceId) {
      const invoice = await stripe.invoices.retrieve(invoiceId);
      if (invoice.status === "open") {
        try {
          await stripe.invoices.pay(invoiceId, { payment_method: pmId });
          paymentRetry = "paid";
        } catch (err) {
          console.error("Retrying the failed invoice did not work:", err.message);
          paymentRetry = "failed";
        }
        sub = await stripe.subscriptions.retrieve(subId);
      }
    }
    applySubscriptionToUser(user, sub);
    await user.save();
  }

  const pm = await stripe.paymentMethods.retrieve(pmId);
  return res
    .status(200)
    .json(new ApiResponse(200, { user, card: cardSummary(pm), paymentRetry }, "Card updated"));
});
