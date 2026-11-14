import api from "../utils/apiClient";

// Creates a Checkout Session for the embedded payment form; returns { client_secret }
export const startCheckout = async () => (await api.post("/api/billing/checkout")).data.data;

// Returns { url } to redirect the browser to Stripe's billing portal
export const openBillingPortal = async () => (await api.post("/api/billing/portal")).data.data;

// Re-reads the subscription from Stripe; returns the updated user
export const syncSubscription = async () => (await api.post("/api/billing/sync")).data.data;
