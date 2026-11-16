import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { EXPENSE_COLOR, INCOME_COLOR, OVER_COLOR, formatMoney, monthLabel } from '../../utils/money'

// A headline number
export function StatTile({ label, value, sub, tone = 'text-white' }) {
  return (
    <div className='glass-card rounded-2xl p-4 sm:p-5 min-w-0'>
      <p className='text-xs uppercase tracking-wider text-gray-400'>{label}</p>
      <p className={`text-xl sm:text-2xl font-bold mt-1 tabular-nums truncate ${tone}`}>{value}</p>
      {sub && <p className='text-xs text-gray-500 mt-1 truncate'>{sub}</p>}
    </div>
  )
}

function Legend() {
  return (
    <div className='flex items-center gap-4 text-xs text-gray-300'>
      <span className='flex items-center gap-1.5'><span className='w-2.5 h-2.5 rounded-sm' style={{ background: INCOME_COLOR }} /> Income</span>
      <span className='flex items-center gap-1.5'><span className='w-2.5 h-2.5 rounded-sm' style={{ background: EXPENSE_COLOR }} /> Expenses</span>
    </div>
  )
}

// Income vs expenses for the last 6 months: paired bars, one axis, hover for the numbers
export function TrendChart({ trend, currency }) {
  const [hover, setHover] = useState(null)
  const [asTable, setAsTable] = useState(false)
  const max = Math.max(1, ...trend.flatMap((t) => [t.income, t.expense]))
  const H = 140

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <Legend />
        <button type='button' onClick={() => setAsTable((v) => !v)} className='text-xs text-gray-400 hover:text-white'>
          {asTable ? 'Show chart' : 'Show as table'}
        </button>
      </div>
      {asTable ? (
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-xs text-gray-400'>
              <th className='font-medium py-1'>Month</th>
              <th className='font-medium py-1 text-right'>Income</th>
              <th className='font-medium py-1 text-right'>Expenses</th>
              <th className='font-medium py-1 text-right'>Net</th>
            </tr>
          </thead>
          <tbody>
            {trend.map((t) => (
              <tr key={t.month} className='border-t border-white/5 text-gray-200 tabular-nums'>
                <td className='py-1.5'>{monthLabel(t.month, 'short')}</td>
                <td className='py-1.5 text-right'>{formatMoney(t.income, currency)}</td>
                <td className='py-1.5 text-right'>{formatMoney(t.expense, currency)}</td>
                <td className='py-1.5 text-right'>{formatMoney(t.income - t.expense, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className='relative'>
          {/* recessive guide lines */}
          <div className='absolute inset-x-0 top-0 pointer-events-none' style={{ height: H }}>
            {[0, 0.5, 1].map((f) => (
              <div key={f} className='absolute inset-x-0 border-t border-white/5' style={{ top: H * f }} />
            ))}
          </div>
          <div className='relative grid grid-cols-6 gap-2 sm:gap-4'>
            {trend.map((t, i) => (
              <div
                key={t.month}
                className='flex flex-col items-center gap-1.5 cursor-default'
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`${monthLabel(t.month)}: income ${formatMoney(t.income, currency)}, expenses ${formatMoney(t.expense, currency)}`}
              >
                <div className='flex items-end justify-center gap-[2px] w-full' style={{ height: H }}>
                  {[
                    { v: t.income, c: INCOME_COLOR },
                    { v: t.expense, c: EXPENSE_COLOR },
                  ].map((bar, j) => (
                    <div
                      key={j}
                      className='w-full max-w-[18px] rounded-t transition-opacity'
                      style={{
                        height: bar.v > 0 ? Math.max(2, (bar.v / max) * H) : 0,
                        background: bar.c,
                        opacity: hover === null || hover === i ? 1 : 0.45,
                      }}
                    />
                  ))}
                </div>
                <span className={`text-[11px] ${hover === i ? 'text-white' : 'text-gray-400'}`}>{monthLabel(t.month, 'short')}</span>
              </div>
            ))}
          </div>
          {hover !== null && (
            <div
              className='absolute -top-2 z-10 pointer-events-none rounded-lg bg-[#111113] border border-white/15 px-3 py-2 text-xs shadow-xl'
              style={{ left: `${(hover + 0.5) * (100 / 6)}%`, transform: `translate(${hover > 3 ? '-100%' : hover < 2 ? '0' : '-50%'}, -100%)` }}
            >
              <p className='text-white font-semibold mb-1'>{monthLabel(trend[hover].month)}</p>
              <p className='flex items-center gap-1.5 text-gray-200 tabular-nums'>
                <span className='w-2 h-2 rounded-sm' style={{ background: INCOME_COLOR }} /> Income {formatMoney(trend[hover].income, currency)}
              </p>
              <p className='flex items-center gap-1.5 text-gray-200 tabular-nums'>
                <span className='w-2 h-2 rounded-sm' style={{ background: EXPENSE_COLOR }} /> Expenses {formatMoney(trend[hover].expense, currency)}
              </p>
              <p className='text-gray-400 tabular-nums mt-0.5'>Net {formatMoney(trend[hover].income - trend[hover].expense, currency)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Spending per category this month, with the budget limit as a tick when one is set
export function CategoryBars({ rows, budgets, currency }) {
  const limitOf = new Map(budgets.map((b) => [b.category, b.limit]))
  // categories with a budget but no spending still show (0 of limit)
  const all = [...rows]
  budgets.forEach((b) => !all.some((r) => r.category === b.category) && all.push({ category: b.category, amount: 0 }))
  if (!all.length) return <p className='text-sm text-gray-400'>No spending this month yet.</p>
  const max = Math.max(1, ...all.map((r) => Math.max(r.amount, limitOf.get(r.category) || 0)))

  return (
    <ul className='space-y-3'>
      {all.map((r) => {
        const limit = limitOf.get(r.category)
        const over = limit && r.amount > limit
        return (
          <li key={r.category} className='space-y-1' title={limit ? `${formatMoney(r.amount, currency)} of ${formatMoney(limit, currency)} budget` : formatMoney(r.amount, currency)}>
            <div className='flex items-center justify-between gap-3 text-sm'>
              <span className='text-gray-200 truncate'>{r.category}</span>
              <span className='tabular-nums text-gray-300 shrink-0 flex items-center gap-1.5'>
                {over && (
                  <span className='inline-flex items-center gap-1 text-xs font-semibold' style={{ color: OVER_COLOR }}>
                    <AlertTriangle size={12} /> Over budget
                  </span>
                )}
                {formatMoney(r.amount, currency)}
                {limit ? <span className='text-gray-500'>/ {formatMoney(limit, currency)}</span> : null}
              </span>
            </div>
            <div className='relative h-2 rounded-full bg-white/[0.06]'>
              <div
                className='absolute inset-y-0 left-0 rounded-full'
                style={{ width: `${(r.amount / max) * 100}%`, background: over ? OVER_COLOR : EXPENSE_COLOR }}
              />
              {limit ? (
                <div className='absolute -top-1 -bottom-1 w-[2px] bg-white/80 rounded' style={{ left: `calc(${(limit / max) * 100}% - 1px)` }} />
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
