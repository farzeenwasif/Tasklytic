// Same policy as backend/src/utils/password.js
export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'letter', label: 'Contains a letter', test: (p) => /[A-Za-z]/.test(p) },
  { id: 'number', label: 'Contains a number', test: (p) => /\d/.test(p) },
]

export const isPasswordValid = (p) => PASSWORD_RULES.every((r) => r.test(p))

// 0-4 score for the strength meter
export const passwordStrength = (p) => {
  if (!p) return 0
  let score = 0
  if (p.length >= 8) score++
  if (p.length >= 12) score++
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++
  if (!isPasswordValid(p)) score = Math.min(score, 1)
  return Math.max(score, 1)
}

export const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong']
