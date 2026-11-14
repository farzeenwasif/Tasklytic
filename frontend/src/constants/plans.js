// Shown on the landing page and the billing page. The real price lives in Stripe (STRIPE_PRICE_ID).
export const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    tagline: 'Everything you need to track tasks and hours.',
    features: [
      'Unlimited tasks',
      'Status, priority and categories',
      'Hours tracking and progress',
      'Dashboard, charts and activity log',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$20',
    period: 'per month',
    tagline: 'Your tasks, with a built-in AI assistant.',
    features: [
      'Everything in Free',
      'Create tasks from a sentence',
      'AI subtask breakdown with hour estimates',
      'AI description writer',
      'Weekly AI insights on your dashboard',
      'Spoken daily briefing when you log in',
    ],
  },
]
