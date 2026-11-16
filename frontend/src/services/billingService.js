import api from "../utils/apiClient";

// Payments run on Paddle. Every function returns the backend's ApiResponse.data payload.

// What Paddle.js needs: { environment, clientToken, priceId, email, userId }
export const getCheckoutConfig = async () => (await api.get("/api/billing/config")).data.data;

// Re-reads the subscription from Paddle (pass the checkout's transaction id right after paying); returns the user
export const syncSubscription = async (transactionId) =>
  (await api.post("/api/billing/sync", transactionId ? { transactionId } : {})).data.data;

// Turns off auto-renew (Premium stays until the period ends); returns the updated user
export const cancelSubscription = async () => (await api.post("/api/billing/cancel")).data.data;

// Turns auto-renew back on; returns the updated user
export const resumeSubscription = async () => (await api.post("/api/billing/resume")).data.data;

// Card on file: { card: { brand, last4, expMonth, expYear } | null }
export const getCard = async () => (await api.get("/api/billing/card")).data.data;

// Transaction for Paddle's "update payment method" checkout: { transactionId, pastDue }
export const startCardUpdate = async () => (await api.post("/api/billing/card/update")).data.data;
