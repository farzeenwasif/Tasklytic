// Shown on the landing page and the billing page. The real price lives in Paddle (PADDLE_PRICE_ID).
export const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    tagline: 'A fast, modern task list. No forms to fill in.',
    features: [
      'Unlimited tasks, added in one line',
      'Dates, times and repeats understood as you type',
      'Focus timer that tracks your time for you',
      'Steps, Today view, dashboard and charts',
      'Daily briefing, read aloud with one tap',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$20',
    period: 'per month',
    tagline: 'Your tasks, your day and your money, with AI doing the busywork.',
    features: [
      'Everything in Free',
      'AI capture: speak, type or snap a photo, get tasks',
      'Plan my day: AI time-blocks your schedule',
      'Finance: bills, expenses, budgets and AI money coach',
      'Receipt scanning with AI',
      'Freelance clients, earnings and invoices',
      'AI steps, descriptions, weekly insights and briefing',
    ],
  },
]
