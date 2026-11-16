// Money helpers for the Finance pages

const formatters = new Map()

// 1234.5, "USD" -> "$1,234.50"
export const formatMoney = (amount, currency = 'USD', { compact = false } = {}) => {
  const key = `${currency}-${compact}`
  if (!formatters.has(key)) {
    try {
      formatters.set(
        key,
        new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency,
          ...(compact ? { notation: 'compact', maximumFractionDigits: 1 } : { maximumFractionDigits: 2 }),
        })
      )
    } catch {
      formatters.set(key, { format: (n) => `${currency} ${Number(n).toFixed(2)}` })
    }
  }
  return formatters.get(key).format(Number(amount) || 0)
}

// "YYYY-MM" for this month, or `offset` months away
export const monthOf = (offset = 0) => {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const shiftMonth = (month, by) => {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + by, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const monthLabel = (month, style = 'long') => {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: style, year: style === 'long' ? 'numeric' : undefined })
}

// "2026-11-17T00:00:00.000Z" -> "Nov 17" (dates are stored as calendar days in UTC)
export const formatDay = (value, withYear = false) => {
  if (!value) return ''
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) })
}

export const dayValue = (value) => (value ? String(value).slice(0, 10) : '')

// Series colours (validated for the dark surface): income blue, expense orange
export const INCOME_COLOR = '#3987e5'
export const EXPENSE_COLOR = '#d95926'
export const OVER_COLOR = '#d03b3b' // status: critical
