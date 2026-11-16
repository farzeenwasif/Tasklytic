import { useContext, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Camera, FileText, Lock, PieChart, Receipt, Sparkles, Wallet } from 'lucide-react'
import Layout from '../components/Layout'
import { UserContext } from '../context/UserContext'
import { getSettings } from '../services/financeService'
import { getErrorMessage } from '../utils/apiClient'
import { monthOf } from '../utils/money'
import Overview from '../components/finance/Overview'
import Transactions from '../components/finance/Transactions'
import Bills from '../components/finance/Bills'
import Clients from '../components/finance/Clients'
import FinanceSettingsPanel from '../components/finance/FinanceSettingsPanel'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'money', label: 'Expenses & income' },
  { id: 'bills', label: 'Bills' },
  { id: 'clients', label: 'Clients & invoices' },
  { id: 'settings', label: 'Budgets & settings' },
]

// What Free users see instead
function Upsell() {
  const points = [
    { icon: Receipt, title: 'Bills that remind you', text: 'Rent, electricity, internet and subscriptions become tasks; ticking them off records the payment.' },
    { icon: Camera, title: 'Snap a receipt', text: 'AI reads the total, shop and date from a photo. No typing.' },
    { icon: PieChart, title: 'Budgets & AI money coach', text: 'See where the money goes, get warned before you overspend, and get advice on your real numbers.' },
    { icon: FileText, title: 'Freelance invoices', text: 'Focus time on client tasks turns into earnings and a ready-to-send invoice in one click.' },
  ]
  return (
    <div className='max-w-4xl mx-auto space-y-6'>
      <div className='text-center space-y-2'>
        <span className='inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/40'>
          <Lock size={12} /> PREMIUM
        </span>
        <h1 className='text-white text-2xl sm:text-3xl font-bold'>Your money, next to your tasks</h1>
        <p className='text-gray-400 max-w-xl mx-auto'>Bills, spending, budgets and freelance income in the same place you plan your day.</p>
      </div>
      <div className='grid gap-4 sm:grid-cols-2'>
        {points.map((p) => (
          <div key={p.title} className='glass-card rounded-2xl p-5 flex gap-4'>
            <span className='w-10 h-10 shrink-0 rounded-xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center'><p.icon size={18} /></span>
            <div>
              <p className='text-white font-semibold'>{p.title}</p>
              <p className='text-sm text-gray-400 mt-1'>{p.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className='text-center'>
        <Link to='/billing' className='btn-primary px-6 py-3'><Sparkles size={16} /> Upgrade for $20/month</Link>
      </div>
    </div>
  )
}

export default function Finance() {
  const { isPremium } = useContext(UserContext)
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'overview'
  const [month, setMonth] = useState(monthOf(0))
  const [data, setData] = useState(null) // { settings, options }
  const [error, setError] = useState('')
  // bumped after any change so the overview reloads its numbers
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!isPremium) return
    getSettings()
      .then(setData)
      .catch((err) => setError(getErrorMessage(err, 'Could not load your finances')))
  }, [isPremium])

  if (!isPremium) return <Layout><Upsell /></Layout>

  const goTo = (id) => setParams(id === 'overview' ? {} : { tab: id })
  const onChange = () => setRefreshKey((k) => k + 1)
  const common = data ? { settings: data.settings, options: data.options, onChange } : null

  return (
    <Layout>
      <div className='max-w-6xl mx-auto space-y-6'>
        <h1 className='text-white text-2xl sm:text-3xl font-bold flex items-center gap-2'>
          <Wallet size={26} className='text-emerald-300' /> Finance
        </h1>

        <nav className='flex gap-2 overflow-x-auto pb-1 -mx-1 px-1' aria-label='Finance sections'>
          {TABS.map((t) => (
            <button
              key={t.id}
              type='button'
              onClick={() => goTo(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm border transition-colors ${
                tab === t.id ? 'bg-white text-[#0b0b0c] border-white font-semibold' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {error ? (
          <p className='text-red-400 text-sm'>{error}</p>
        ) : !data ? (
          <div className='glass-card rounded-2xl h-40 animate-pulse' />
        ) : tab === 'overview' ? (
          <Overview month={month} setMonth={setMonth} goTo={goTo} refreshKey={refreshKey} />
        ) : tab === 'money' ? (
          <Transactions month={month} setMonth={setMonth} {...common} />
        ) : tab === 'bills' ? (
          <Bills {...common} />
        ) : tab === 'clients' ? (
          <Clients {...common} />
        ) : (
          <FinanceSettingsPanel
            {...common}
            onSaved={(settings) => {
              setData((d) => ({ ...d, settings }))
              onChange()
            }}
          />
        )}
      </div>
    </Layout>
  )
}
