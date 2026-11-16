import { useState } from 'react'
import { Check, Loader2, Plus, Trash2 } from 'lucide-react'
import { saveSettings } from '../../services/financeService'
import { getErrorMessage } from '../../utils/apiClient'

// Currency, monthly budgets per category, and what goes on invoices
export default function FinanceSettingsPanel({ settings, options, onSaved }) {
  const [form, setForm] = useState({
    currency: settings.currency,
    budgets: settings.budgets.map((b) => ({ ...b, limit: String(b.limit) })),
    businessName: settings.businessName,
    invoicePrefix: settings.invoicePrefix,
    invoiceNote: settings.invoiceNote,
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const unused = options.expenseCategories.filter((c) => !form.budgets.some((b) => b.category === c))

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const saved = await saveSettings({ ...form, budgets: form.budgets.map((b) => ({ category: b.category, limit: Number(b.limit) || 0 })) })
      onSaved(saved)
      setMsg({ ok: true, text: 'Saved' })
    } catch (err) {
      setMsg({ ok: false, text: getErrorMessage(err, 'Could not save') })
    } finally {
      setSaving(false)
    }
  }

  const setBudget = (i, k, v) => setForm((f) => ({ ...f, budgets: f.budgets.map((b, j) => (j === i ? { ...b, [k]: v } : b)) }))

  return (
    <form onSubmit={save} className='space-y-6 max-w-2xl'>
      <section className='glass-card rounded-2xl p-5 sm:p-6 space-y-3'>
        <h3 className='text-white font-semibold'>Currency</h3>
        <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} aria-label='Currency' className='glass-input px-3 py-2.5 rounded-xl text-sm w-40'>
          {options.currencies.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <p className='text-xs text-gray-500'>Changing it does not convert amounts you already entered.</p>
      </section>

      <section className='glass-card rounded-2xl p-5 sm:p-6 space-y-3'>
        <h3 className='text-white font-semibold'>Monthly budgets</h3>
        <p className='text-sm text-gray-400'>Set a limit for the categories you want to keep an eye on. The overview warns you when you go over.</p>
        {form.budgets.map((b, i) => (
          <div key={b.category} className='flex items-center gap-2'>
            <span className='flex-1 text-sm text-gray-200'>{b.category}</span>
            <input type='number' min='0' step='1' value={b.limit} onChange={(e) => setBudget(i, 'limit', e.target.value)} aria-label={`${b.category} budget`} className='glass-input px-3 py-2 rounded-xl text-sm w-36' />
            <button type='button' onClick={() => setForm((f) => ({ ...f, budgets: f.budgets.filter((_, j) => j !== i) }))} aria-label={`Remove ${b.category} budget`} className='p-1.5 text-gray-400 hover:text-red-400'><Trash2 size={15} /></button>
          </div>
        ))}
        {unused.length > 0 && (
          <div className='flex items-center gap-2'>
            <select
              value=''
              onChange={(e) => e.target.value && setForm((f) => ({ ...f, budgets: [...f.budgets, { category: e.target.value, limit: '' }] }))}
              aria-label='Add a budget'
              className='glass-input px-3 py-2 rounded-xl text-sm'
            >
              <option value=''>+ Add a budget for...</option>
              {unused.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <Plus size={15} className='text-gray-500' />
          </div>
        )}
      </section>

      <section className='glass-card rounded-2xl p-5 sm:p-6 space-y-3'>
        <h3 className='text-white font-semibold'>Invoices</h3>
        <div className='grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]'>
          <label className='text-sm text-gray-300'>
            <span className='block mb-1'>Your name or business</span>
            <input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} maxLength={80} className='glass-input w-full px-3 py-2.5 rounded-xl text-sm' />
          </label>
          <label className='text-sm text-gray-300'>
            <span className='block mb-1'>Number prefix</span>
            <input value={form.invoicePrefix} onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })} maxLength={10} className='glass-input w-full px-3 py-2.5 rounded-xl text-sm' />
          </label>
        </div>
        <label className='text-sm text-gray-300 block'>
          <span className='block mb-1'>Default note (payment details, bank account...)</span>
          <textarea value={form.invoiceNote} onChange={(e) => setForm({ ...form, invoiceNote: e.target.value })} rows={3} maxLength={300} className='glass-input w-full px-3 py-2.5 rounded-xl text-sm resize-y' />
        </label>
      </section>

      <div className='flex items-center gap-3'>
        <button type='submit' disabled={saving} className='btn-primary px-5 py-2.5'>
          {saving ? <Loader2 size={15} className='animate-spin' /> : <Check size={15} />} Save settings
        </button>
        {msg && <span className={`text-sm ${msg.ok ? 'text-emerald-300' : 'text-red-400'}`}>{msg.text}</span>}
      </div>
    </form>
  )
}
