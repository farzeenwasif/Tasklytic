import api from "../utils/apiClient";

// Creates a Checkout Session for the embedded payment form; returns { client_secret }
export const startCheckout = async () => (await api.post("/api/billing/checkout")).data.data;

// Re-reads the subscription from Stripe; returns the updated user
export const syncSubscription = async () => (await api.post("/api/billing/sync")).data.data;

// Turns off auto-renew (Premium stays until the period ends); returns the updated user
export const cancelSubscription = async () => (await api.post("/api/billing/cancel")).data.data;

// Turns auto-renew back on; returns the updated user
export const resumeSubscription = async () => (await api.post("/api/billing/resume")).data.data;

// Card on file: { card: { brand, last4, expMonth, expYear } | null }
export const getCard = async () => (await api.get("/api/billing/card")).data.data;

// SetupIntent for the in-app card form; returns { client_secret }
export const startCardSetup = async () => (await api.post("/api/billing/card/setup")).data.data;

// Makes the confirmed card the default; returns { user, card, paymentRetry }
export const saveCard = async (setupIntentId) =>
  (await api.post("/api/billing/card", { setupIntentId })).data.data;
