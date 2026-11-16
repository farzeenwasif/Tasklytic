// Accounts that get Premium for free (owner, testers). Set in .env, comma-separated:
// PREMIUM_EMAILS=someone@example.com,other@example.com
const complimentaryEmails = () =>
  (process.env.PREMIUM_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

export const isComplimentary = (user) =>
  Boolean(user?.email) && complimentaryEmails().includes(String(user.email).toLowerCase());

// Premium = a paid (Paddle) subscription, or a complimentary account
export const isPremiumUser = (user) => user?.plan === "premium" || isComplimentary(user);
