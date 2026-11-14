# Tasklytic

A full-stack task and hours dashboard. Plan tasks, log the hours you spend, and see your progress at a glance. A **Premium** plan ($20/month) adds a built-in **AI assistant**.

---

## Plans

| | **Free** | **Premium** ($20/month) |
|---|:---:|:---:|
| Unlimited tasks with status, priority, category and due date | ✅ | ✅ |
| Hours tracking with progress per task | ✅ | ✅ |
| Dashboard: stats, hours-by-month chart, activity log | ✅ | ✅ |
| Profile with photo, password reset by email | ✅ | ✅ |
| **Create a task from a sentence** ("report by Friday, 3h, high priority") | | ✅ |
| **AI subtask breakdown** with hour estimates | | ✅ |
| **AI description writer** | | ✅ |
| **Weekly AI insights** on the dashboard | | ✅ |
| **Spoken daily briefing** of today's tasks when you log in | | ✅ |

Payments are handled by **Stripe Checkout** (monthly subscription). Users manage or cancel the subscription in the **Stripe Customer Portal**. Premium stays on until the end of the paid month.

---

## Features

- **Authentication:** register, log in, JWT sessions, password reset by email. Logged-in users are kept out of the landing, login and signup pages until they sign out.
- **Tasks:** card grid with search, status filters, bulk select and delete, and view, edit and delete actions.
- **Add Task page:** sectioned form with a live card preview, priority and status pickers, and quick presets for hours and due date.
- **Dashboard:** summary cards, a gauge, an hours-by-month line chart that highlights the current month, and an activity log.
- **Profile:** edit your details and upload a profile photo (stored on Cloudinary).
- **Premium AI:** the server holds the API key, so the browser never sees it. AI routes only work for Premium accounts and are rate limited per user.
- **Responsive:** sidebar on desktop, bottom navigation on phones.

---

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | React 19, Vite 7, React Router 7, Tailwind CSS 4, Motion, Three.js (landing hero), lucide-react |
| Backend | Node.js, Express 5, Mongoose 8 (MongoDB) |
| Auth | JWT, bcrypt |
| Payments | Stripe (Checkout, Customer Portal, webhooks) |
| AI | Built-in AI assistant (server-side) |
| Files & email | Cloudinary, Nodemailer (SMTP) |

---

## Project structure

```
Tasklytic/
├── backend/          Express API
│   └── src/
│       ├── controllers/   auth, task, activity, billing, ai
│       ├── middlewares/   auth (JWT), premium + AI rate limit, multer
│       ├── models/        User, Tasks, Activity
│       ├── routes/
│       └── utils/         stripe, ai, premium, cloudinary, email, ...
└── frontend/         React app (Vite)
    └── src/
        ├── pages/         Landing, Login, Signup, Dashboard, Tasks, AddTask, Profile, Billing, ...
        ├── components/    TaskCard, Chart, AIAssistant, PricingCards, ...
        ├── context/       UserContext, TaskContext
        └── services/      API calls (auth, tasks, activity, billing, ai)
```

---

## Getting started (local)

### 1. Clone

```bash
git clone https://github.com/Farzeensiddiquie/admin-dashboard.git
cd admin-dashboard
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env      # then fill in the values (see below)
npm run dev               # http://localhost:8000
```

### 3. Frontend

```bash
cd frontend
npm install
# frontend/.env
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev               # http://localhost:5173
```

---

## Environment variables

### Backend (`backend/.env`)

See [`backend/.env.example`](backend/.env.example) for a template.

| Variable | Required | Description |
|---|:---:|---|
| `PORT` | | API port (default `8000`) |
| `MONGO_URI` | ✅ | MongoDB connection string |
| `CORS_ORIGIN` | ✅ | Allowed frontend origin(s), comma-separated |
| `FRONTEND_URL` | | Base URL for email links and Stripe redirects (defaults to the first `CORS_ORIGIN`) |
| `ACCESS_TOKEN_SECRET` | ✅ | Long random string used to sign JWTs |
| `ACCESS_TOKEN_EXPIRY` | | JWT lifetime (default `1d`) |
| `CLOUD_NAME`, `API_KEY`, `API_SECRET` | ✅ | Cloudinary credentials for profile photos |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | prod | Email for password reset (printed to the console when empty in development) |
| `STRIPE_SECRET_KEY` | Premium | Stripe secret key (`sk_test_...` / `sk_live_...`) |
| `STRIPE_PRICE_ID` | Premium | ID of the $20/month recurring price (`price_...`) |
| `STRIPE_WEBHOOK_SECRET` | Premium | Signing secret of the webhook endpoint (`whsec_...`) |
| `AI_API_KEY` | Premium | API key for the AI assistant (from Google AI Studio) |
| `AI_MODEL` | | Optional model override |
| `PREMIUM_EMAILS` | | Comma-separated emails that get Premium for free (owner, testers) |
| `AI_RATE_LIMIT` | | Max AI requests per user per 10 minutes (default `40`) |

Without the Stripe or AI keys the app still runs. The upgrade and AI endpoints return a clear "not configured" error.

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL, e.g. `https://your-api.onrender.com` |

---

## Setting up Premium

### Stripe

1. In the [Stripe Dashboard](https://dashboard.stripe.com) (start in **test mode**), create a product **Tasklytic Premium** with a **recurring price of $20 / month**. Copy its price ID into `STRIPE_PRICE_ID`.
2. Copy your secret key into `STRIPE_SECRET_KEY`.
3. Turn on the **Customer Portal** (Settings → Billing → Customer portal) so users can cancel or update their card.
4. Add a webhook endpoint at `https://<your-api>/api/billing/webhook` with these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

   Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.

**Local testing** with the [Stripe CLI](https://docs.stripe.com/stripe-cli):

```bash
stripe listen --forward-to localhost:8000/api/billing/webhook
# use the printed whsec_... as STRIPE_WEBHOOK_SECRET
```

Pay with the test card `4242 4242 4242 4242`, any future expiry date, and any CVC.

### AI assistant

Create an API key in [Google AI Studio](https://aistudio.google.com/apikey) and set `AI_API_KEY` on the backend. The key is only used on the server.

> The spoken daily briefing uses the browser's built-in text-to-speech (Web Speech API), so it needs no extra service.

---

## API reference

All routes except register, login, password reset and the Stripe webhook need `Authorization: Bearer <token>`.

### Auth & profile (`/api/users`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/register` | Create an account |
| POST | `/login` | Log in, returns `{ user, token }` |
| POST | `/forgot-password` | Email a password reset link |
| GET / POST | `/reset-password/:token` | Check a reset token / set a new password |
| GET / PATCH | `/me` | Get / update the current user |
| POST / DELETE | `/me/avatar` | Upload / remove the profile photo |

### Tasks (`/api/tasks`)

| Method | Endpoint | Description |
|---|---|---|
| GET / POST | `/` | List your tasks / create a task |
| GET / PATCH / DELETE | `/:id` | Get / update / delete a task |
| POST | `/bulk-delete` | Delete several tasks |

### Activity (`/api/activities`)

| Method | Endpoint | Description |
|---|---|---|
| GET / DELETE | `/` | Get / clear your activity log |

### Billing (`/api/billing`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/checkout` | Start a Premium checkout, returns `{ url }` |
| POST | `/portal` | Open the Stripe Customer Portal, returns `{ url }` |
| POST | `/sync` | Re-read the subscription from Stripe |
| POST | `/webhook` | Stripe webhook (signature verified, no JWT) |

### AI (`/api/ai`): Premium only, rate limited

| Method | Endpoint | Description |
|---|---|---|
| POST | `/parse-task` | `{ text }` → task fields for the form |
| POST | `/subtasks` | `{ title, description, category }` → suggested steps with hours |
| POST | `/describe` | `{ title, description, category }` → written description |
| GET | `/insights` | Weekly summary, highlights and focus items |
| GET | `/briefing` | Short spoken briefing of today's tasks |

---

## Deployment

**Frontend (Vercel or Netlify)**
- Root directory: `frontend`. Build command: `npm run build`. Output directory: `dist`.
- Set `VITE_API_URL` to the backend URL in the host's environment settings.
- SPA routing is already configured (`vercel.json` and `public/_redirects`).

**Backend (Render, Railway or similar)**
- Root directory: `backend`. Start command: `npm start`.
- Set every variable from the backend table. `CORS_ORIGIN` and `FRONTEND_URL` must be the deployed frontend URL.
- In Stripe, point the webhook at `https://<backend>/api/billing/webhook` and use **live** keys when you go live.

**Checklist before going live**
- [ ] `ACCESS_TOKEN_SECRET` is a long random value
- [ ] SMTP is configured so password reset emails are delivered
- [ ] Stripe live keys, live price ID and live webhook secret are set
- [ ] `AI_API_KEY` is set, and billing or quota is enabled on the Google side

---

## Author

**Farzeen**

## License

This project is licensed under the MIT License.
