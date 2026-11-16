import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { getSummary } from '../../services/financeService'
import { getFinanceInsights } from '../../services/aiService'
import { getErrorMessage } from '../../utils/apiClient'
import { formatDay, formatMoney, monthLabel, monthOf, shiftMonth } from '../../utils/money'
import { CategoryBars, StatTile, TrendChart } from './FinanceCharts'

export function MonthPicker({ month, setMonth }) {
  const isCurrent = month === monthOf(0)
  return (
    <div className='flex items-center gap-1'>
      <button type='button' onClick={() => setMonth(shiftMonth(month, -1))} aria-label='Previous month' className='p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10'>
        <ChevronLeft size={18} />
      </button>
      <span className='text-white font-semibold min-w-[140px] text-center'>{monthLabel(month)}</span>
      <button
        type='button'
        onClick={() => setMonth(shiftMonth(month, 1))}
        disabled={isCurrent}
        aria-label='Next month'
        className='p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30'
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}

function Panel({ title, action, children }) {
  return (
    <section className='glass-card rounded-2xl p-5 sm:p-6 space-y-4 min-w-0'>
      <div className='flex items-center justify-between gap-3'>
        <h3 className='text-white font-semibold'>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

// AI money coach for the month
function Insights({ month }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setData(await getFinanceInsights(month))
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load insights'))
    } finally {
      setLoading(false)
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setData(null) }, [month])

  return (
    <section className='rounded-2xl p-5 sm:p-6 border border-emerald-400/25 bg-gradient-to-br from-emerald-500/[0.08] to-white/[0.02] space-y-3'>
      <div className='flex items-center justify-between gap-3'>
        <h3 className='text-white font-semibold flex items-center gap-2'><Sparkles size={17} className='text-emerald-300' /> AI money coach</h3>
        {data && (
          <button type='button' onClick={load} disabled={loading} title='Refresh' className='p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10'>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>
      {data ? (
        <>
          <p className='text-sm text-gray-200 leading-relaxed'>{data.summary}</p>
          {data.tips.length > 0 && (
            <ul className='space-y-1.5'>
              {data.tips.map((t) => <li key={t} className='text-sm text-gray-300 flex gap-2'><span className='text-amber-300'>→</span>{t}</li>)}
            </ul>
          )}
        </>
      ) : (
        <div className='flex flex-wrap items-center gap-3'>
          <p className='text-sm text-gray-400 flex-1 min-w-[200px]'>Get a plain-language read on this month: where the money went and what to change.</p>
          <button type='button' onClick={load} disabled={loading} className='btn-primary px-4 py-2'>
            {loading ? <Loader2 size={15} className='animate-spin' /> : <Sparkles size={15} />} Analyse my month
          </button>
        </div>
      )}
      {error && <p className='text-sm text-red-400'>{error}</p>}
    </section>
  )
}

export default function Overview({ month, setMonth, goTo, refreshKey }) {
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setError('')
    getSummary(month)
      .then((s) => !cancelled && setSummary(s))
      .catch((err) => !cancelled && setError(getErrorMessage(err, 'Could not load your finances')))
    return () => { cancelled = true }
  }, [month, refreshKey])

  if (error) return <p className='text-red-400 text-sm'>{error}</p>
  if (!summary) return <div className='grid gap-4 sm:grid-cols-4'>{[0, 1, 2, 3].map((i) => <div key={i} className='glass-card rounded-2xl h-24 animate-pulse' />)}</div>

  const c = summary.currency
  const f = summary.freelance
  const hasFreelance = f.hours > 0 || f.unbilledAmount > 0 || f.outstandingCount > 0

  return (
    <div className='space-y-6'>
      <div className='flex justify-center sm:justify-start'><MonthPicker month={month} setMonth={setMonth} /></div>

      <div className='grid gap-4 grid-cols-2 lg:grid-cols-4'>
        <StatTile label='Income' value={formatMoney(summary.income, c)} />
        <StatTile label='Spent' value={formatMoney(summary.expense, c)} />
        <StatTile
          label='Left over'
          value={formatMoney(summary.net, c)}
          tone={summary.net < 0 ? 'text-red-400' : 'text-emerald-300'}
          sub={summary.income > 0 ? `${Math.round((summary.net / summary.income) * 100)}% of income saved` : ''}
        />
        <StatTile label='Bills per month' value={formatMoney(summary.bills.monthlyTotal, c)} sub={`${summary.bills.count} recurring`} />
      </div>

      <Insights month={month} />

      <div className='grid gap-6 lg:grid-cols-2'>
        <Panel title='Last 6 months'>
          <TrendChart trend={summary.trend} currency={c} />
        </Panel>
        <Panel
          title='Where the money went'
          action={<button type='button' onClick={() => goTo('settings')} className='text-xs text-emerald-300 hover:text-emerald-200'>Set budgets</button>}
        >
          <CategoryBars rows={summary.expenseByCategory} budgets={summary.budgets} currency={c} />
        </Panel>
      </div>

      <div className='grid gap-6 lg:grid-cols-2'>
        <Panel title='Upcoming bills' action={<button type='button' onClick={() => goTo('bills')} className='text-xs text-emerald-300 hover:text-emerald-200'>All bills</button>}>
          {summary.bills.upcoming.length ? (
            <ul className='divide-y divide-white/5'>
              {summary.bills.upcoming.map((b) => (
                <li key={b._id} className='flex items-center justify-between gap-3 py-2 text-sm'>
                  <span className='text-gray-200 truncate'>{b.name}</span>
                  <span className='text-gray-400 shrink-0 tabular-nums'>{formatDay(b.nextDueDate)} · {formatMoney(b.amount, c)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className='text-sm text-gray-400'>Add rent, electricity, internet and subscriptions. Each becomes a reminder task, and ticking it off records the payment.</p>
          )}
        </Panel>
        <Panel title='Freelance' action={<button type='button' onClick={() => goTo('clients')} className='text-xs text-emerald-300 hover:text-emerald-200'>Clients & invoices</button>}>
          {hasFreelance ? (
            <div className='space-y-3'>
              <div className='grid grid-cols-3 gap-3 text-center'>
                <div><p className='text-lg font-bold text-white tabular-nums'>{formatMoney(f.earned, c)}</p><p className='text-xs text-gray-400'>earned ({f.hours}h)</p></div>
                <div><p className='text-lg font-bold text-white tabular-nums'>{formatMoney(f.unbilledAmount, c)}</p><p className='text-xs text-gray-400'>not invoiced</p></div>
                <div><p className='text-lg font-bold text-white tabular-nums'>{formatMoney(f.outstandingAmount, c)}</p><p className='text-xs text-gray-400'>awaiting payment</p></div>
              </div>
              {f.byClient.length > 0 && (
                <ul className='space-y-1.5'>
                  {f.byClient.map((r) => (
                    <li key={r.clientId} className='flex items-center justify-between gap-3 text-sm'>
                      <span className='flex items-center gap-2 text-gray-200 truncate'><span className='w-2 h-2 rounded-full shrink-0' style={{ background: r.color }} />{r.name}</span>
                      <span className='text-gray-400 tabular-nums shrink-0'>{r.hours}h · {formatMoney(r.earned, c)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className='text-sm text-gray-400'>Add a client with an hourly rate, link tasks to them, and the focus timer turns your time into earnings and invoices.</p>
          )}
        </Panel>
      </div>
    </div>
  )
}
