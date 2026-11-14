# Stripe Integration: To-do

Tasklytic sells **Premium at $20/month** through Stripe's **embedded payment form** (Checkout Session with `ui_mode: "form"`). The form opens inside the app, on the Billing page. This file lists everything still needed to make it work.

---

## Values to Replace

The code itself has no hard-coded placeholders. `mode` is already `"subscription"`, and `line_items` reads the real price from an environment variable. The values left to fill in are environment variables.

**Files containing placeholders:**
- [backend/.env](backend/.env) (not committed) / template: [backend/.env.example](backend/.env.example)
- [frontend/.env](frontend/.env)

| Field | Current Value | What to Set |
|-------|--------------|-------------|
| `STRIPE_SECRET_KEY` (backend) | empty | Secret key from https://dashboard.stripe.com/test/apikeys (`sk_test_...`, later `sk_live_...`). Server only. |
| `STRIPE_PRICE_ID` (backend), used as `line_items[].price` | empty | ID of your **$20 / month recurring** price from https://dashboard.stripe.com/prices (`price_...`). |
| `STRIPE_WEBHOOK_SECRET` (backend) | empty | Signing secret of your webhook endpoint (`whsec_...`). See step 4 below. |
| `FRONTEND_URL` (backend) | your local or live URL | Base URL used for `return_url` (`<FRONTEND_URL>/billing?status=success`). Must be your deployed frontend in production. |
| `VITE_STRIPE_PUBLISHABLE_KEY` (frontend) | empty | Publishable key (`pk_test_...`, later `pk_live_...`). It must keep the `VITE_` prefix so Vite exposes it to the browser. |

---

## Configured Parameters

These parameters were configured in Checkout Studio and are already set correctly.

**Files containing these parameters:**
- [backend/src/controllers/billing.controller.js](backend/src/controllers/billing.controller.js): Checkout Session creation
- [frontend/src/components/StripeCheckoutForm.jsx](frontend/src/components/StripeCheckoutForm.jsx): form appearance and layout

| Parameter | Value |
|-----------|-------|
| ui_mode | `form` |
| billing_address_collection | `auto` |
| phone_number_collection | `{ enabled: false }` |
| automatic_tax | `{ enabled: false }` |
| payment_method_collection | `always` (subscription mode) |
| submit_type | `auto` |
| integration_identifier | `custom_embedded_web_0001` |
| appearance | `stripe` theme, spaced inputs, 4px radius (see the component) |
| form layout | `expanded` |

**Kept from the existing integration** (needed so payments turn into Premium accounts):

| Parameter | Value | Why |
|-----------|-------|-----|
| mode | `subscription` | Premium is billed monthly |
| line_items | `[{ price: STRIPE_PRICE_ID, quantity: 1 }]` | The real $20/month price |
| customer | the user's Stripe customer | Lets the webhook find the user, and reuses the customer for the billing portal |
| client_reference_id | the user's id | Links the session to the account |
| subscription_data.metadata.userId | the user's id | The webhook uses it to switch Premium on or off |
| return_url | `<FRONTEND_URL>/billing?status=success` | Replaces `success_url`/`cancel_url`, which `ui_mode: "form"` does not accept |

**API version:** the backend uses `stripe@23.1.0`, which pins API version `2026-10-28.endive`. That is later than `2026-03-25.dahlia`, as `ui_mode: "form"` requires. The frontend loads Stripe.js from `https://js.stripe.com/dahlia/stripe.js`.

---

## Setup

1. **Dependencies** are already installed (`stripe` in `backend/`). Stripe.js is loaded with a `<script>` tag in [frontend/index.html](frontend/index.html). Never bundle or self-host it (PCI requirement).
2. **Create the product (test mode first):** Product catalog → Add product → "Tasklytic Premium" → Recurring, **$20.00 USD, Monthly**. Copy the `price_...` ID into `STRIPE_PRICE_ID`.
3. **API keys:** Developers → API keys. Put the secret key in `backend/.env` and the publishable key in `frontend/.env`.
4. **Webhook:**
   - Local:
     ```bash
     stripe login
     stripe listen --forward-to localhost:8000/api/billing/webhook
     ```
     Use the printed `whsec_...` as `STRIPE_WEBHOOK_SECRET`.
   - Production: Developers → Webhooks → Add endpoint `https://<your-backend>/api/billing/webhook` with these events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
5. **Customer portal:** Settings → Billing → Customer portal → Activate. Allow cancelling and updating the payment method. The app's "Manage subscription" button opens it.
6. Restart the backend and frontend after editing the `.env` files.

## New and changed files

```
frontend/index.html                               + Stripe.js (dahlia) script tag
frontend/.env                                     + VITE_STRIPE_PUBLISHABLE_KEY
frontend/src/components/StripeCheckoutForm.jsx    NEW: embedded payment form in a dialog
frontend/src/pages/Billing.jsx                    "Upgrade" now opens the embedded form
frontend/src/services/billingService.js           startCheckout() now returns { client_secret }
backend/src/controllers/billing.controller.js     Checkout Session uses the Checkout Studio parameters
```

## How it works

1. The user clicks **Upgrade for $20/month** on `/billing`.
2. `StripeCheckoutForm` calls `POST /api/billing/checkout`. The backend creates (or reuses) the user's Stripe customer, then a subscription Checkout Session, and returns `client_secret`.
3. `stripe.initCheckoutFormSdk({ clientSecret, appearance })` renders the payment form in a Stripe-hosted iframe inside the dialog.
4. On confirm, Stripe processes the payment and sends the browser to `return_url` (`/billing?status=success`).
5. The Billing page calls `POST /api/billing/sync` so Premium shows up straight away.
6. Stripe also sends webhooks to `/api/billing/webhook`, which keep the plan in sync for renewals, failed payments and cancellations.

## Testing

Use **test mode** keys. Test cards (any future expiry date, any CVC, any postcode):

| Card | Result |
|------|--------|
| `4242 4242 4242 4242` | Succeeds |
| `4000 0025 0000 3155` | Requires 3-D Secure authentication |
| `4000 0000 0000 9995` | Declined (insufficient funds) |
| `4000 0000 0000 0341` | Attaches, then fails on renewal |

Check:
- After paying, the PRO badge appears and the AI features unlock.
- Cancelling in the portal shows "Premium ends on …".
- Deliveries show as succeeded in the Stripe webhook logs.

## Next steps

- **Go live:** activate your Stripe account, recreate the product, price, webhook and portal settings in **live mode**, and set the live keys, price ID and webhook secret on your hosting services.
- **Tax:** `automatic_tax` is off. Turn it on in Checkout Studio, and here in the code, if you need to collect sales tax or VAT.
- **Promotions:** promotion codes were removed because they weren't configured in Checkout Studio. Add `allow_promotion_codes: true` back if you want coupons.
- **Pricing changes:** create a new price in Stripe and update `STRIPE_PRICE_ID`. Also update the display price in `frontend/src/constants/plans.js`.
- **Fulfilment** is already handled: the webhook sets `plan: "premium"` on the user, and payment history lives in the Stripe Dashboard.

## Resources

- Stripe support: https://support.stripe.com
- Stripe MCP: https://docs.stripe.com/mcp
