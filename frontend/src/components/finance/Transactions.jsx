import { useEffect, useRef, useState } from 'react'
import { Camera, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import * as fin from '../../services/financeService'
import { scanReceipt } from '../../services/aiService'
import { getErrorMessage } from '../../utils/apiClient'
import { imageForm } from '../../utils/image'
import { localToday } from '../../utils/taskUtils'
import { EXPENSE_COLOR, INCOME_COLOR, dayValue, formatDay, formatMoney } from '../../utils/money'
import { MonthPicker } from './Overview'

const blank = (type = 'expense') => ({ type, amount: '', category: '', note: '', date: localToday() })

export default function Transactions({ month, setMonth, settings, options, onChange }) {
  const [items, setItems] = useState(null)
  const [form, setForm] = useState(blank())
  const [editing, setEditing] = useState(null) // id
  const [filter, setFilter] = useState('all')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const fileRef = useRef(null)
  const c = settings.currency

  useEffect(() => {
    let cancelled = false
    setItems(null)
    fin.listTransactions(month)
      .then((list) => !cancelled && setItems(list))
      .catch((err) => !cancelled && setError(getErrorMessage(err, 'Could not load entries')))
    return () => { cancelled = true }
  }, [month])

  const categories = form.type === 'income' ? options.incomeCategories : options.expenseCategories
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const save = async (e) => {
    e.preventDefault()
    setBusy('save')
    setError('')
    try {
      const entry = { ...form, amount: Number(form.amount), category: form.category || categories[0] }
      const saved = editing ? await fin.updateTransaction(editing, entry) : await fin.addTransaction(entry)
      const inMonth = dayValue(saved.date).slice(0, 7) === month
      setItems((list) => {
        const rest = (list || []).filter((t) => t._id !== saved._id)
        return inMonth ? [saved, ...rest].sort((a, b) => String(b.date).localeCompare(String(a.date))) : rest
      })
      setNotice(inMonth ? '' : `Saved to ${formatDay(saved.date, true)}.`)
      setForm(blank(form.type))
      setEditing(null)
      onChange()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save'))
    } finally {
      setBusy('')
    }
  }

  const edit = (t) => {
    setEditing(t._id)
    setForm({ type: t.type, amount: String(t.amount), category: t.category, note: t.note, date: dayValue(t.date) })
  }

  const remove = async (t) => {
    if (!window.confirm(`Delete "${t.note || t.category}" (${formatMoney(t.amount, c)})?`)) return
    setError('')
    try {
      await fin.deleteTransaction(t._id)
      setItems((list) => list.filter((x) => x._id !== t._id))
      onChange()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete'))
    }
  }

  // AI reads a receipt photo and fills the form (nothing is saved until you press Save)
  const scan = async (file) => {
    if (!file) return
    setBusy('scan')
    setError('')
    setNotice('')
    try {
      const r = await scanReceipt(await imageForm(file))
      setEditing(null)
      setForm({ type: 'expense', amount: String(r.amount), category: r.category, note: r.note, date: r.date })
      setNotice(
        r.currency && r.currency !== c
          ? `The receipt is in ${r.currency}; your currency is ${c}. Check the amount before saving.`
          : 'Receipt read. Check the details and press Save.'
      )
    } catch (err) {
      setError(getErrorMessage(err, err.message || 'Could not read the receipt'))
    } finally {
      setBusy('')
    }
  }

  const shown = (items || []).filter((t) => filter === 'all' || t.type === filter)
  const total = (type) => (items || []).filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0)

  return (
    <div className='space-y-5'>
      <form onSubmit={save} className='glass-card rounded-2xl p-4 sm:p-5 space-y-3'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div className='grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/5 border border-white/10'>
            {['expense', 'income'].map((t) => (
              <button
                key={t}
                type='button'
                onClick={() => setForm((f) => ({ ...f, type: t, category: '' }))}
                aria-pressed={form.type === t}
                className={`px-4 py-1.5 rounded-lg text-sm capitalize transition-colors ${form.type === t ? 'bg-white text-[#0b0b0c] font-semibold' : 'text-gray-300 hover:text-white'}`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className='flex items-center gap-2'>
            {editing && (
              <button type='button' onClick={() => { setEditing(null); setForm(blank(form.type)) }} className='btn-ghost px-3 py-1.5 text-sm'>
                <X size={14} /> Cancel edit
              </button>
            )}
            <button type='button' onClick={() => fileRef.current?.click()} disabled={busy === 'scan'} className='btn-ghost px-3 py-1.5 text-sm' title='AI reads the total, shop and date from a photo'>
              {busy === 'scan' ? <Loader2 size={14} className='animate-spin' /> : <Camera size={14} />} Scan receipt
            </button>
            <input ref={fileRef} type='file' accept='image/*' capture='environment' className='hidden' onChange={(e) => { scan(e.target.files?.[0]); e.target.value = '' }} />
          </div>
        </div>
        <div className='grid gap-2 sm:grid-cols-[140px_170px_minmax(0,1fr)_150px_auto]'>
          <input
            type='number' min='0' step='0.01' required value={form.amount} onChange={(e) => set('amount', e.target.value)}
            placeholder={`Amount (${c})`} aria-label='Amount' className='glass-input px-3 py-2.5 rounded-xl text-sm'
          />
          <select value={form.category || categories[0]} onChange={(e) => set('category', e.target.value)} aria-label='Category' className='glass-input px-3 py-2.5 rounded-xl text-sm'>
            {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <input value={form.note} onChange={(e) => set('note', e.target.value)} maxLength={200} placeholder='What was it? (optional)' aria-label='Note' className='glass-input px-3 py-2.5 rounded-xl text-sm' />
          <input type='date' value={form.date} onChange={(e) => set('date', e.target.value)} aria-label='Date' className='glass-input px-3 py-2.5 rounded-xl text-sm' />
          <button type='submit' disabled={busy === 'save' || !(Number(form.amount) > 0)} className='btn-primary px-4 py-2.5'>
            {busy === 'save' ? <Loader2 size={15} className='animate-spin' /> : <Plus size={15} />} {editing ? 'Save' : 'Add'}
          </button>
        </div>
        {notice && <p className='text-sm text-emerald-300'>{notice}</p>}
        {error && <p className='text-sm text-red-400'>{error}</p>}
      </form>

      <div className='flex flex-wrap items-center justify-between gap-3'>
        <MonthPicker month={month} setMonth={setMonth} />
        <div className='flex gap-2'>
          {['all', 'expense', 'income'].map((f) => (
            <button
              key={f}
              type='button'
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-sm border capitalize ${filter === f ? 'bg-white text-[#0b0b0c] border-white font-semibold' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'}`}
            >
              {f === 'all' ? 'All' : `${f}s`}
            </button>
          ))}
        </div>
      </div>

      {items === null ? (
        <div className='glass-card rounded-2xl h-40 animate-pulse' />
      ) : shown.length === 0 ? (
        <div className='glass-card rounded-2xl p-8 text-center text-gray-400 text-sm'>Nothing recorded for this month.</div>
      ) : (
        <div className='glass-card rounded-2xl overflow-hidden'>
          <div className='flex justify-between gap-3 px-4 py-3 border-b border-white/10 text-sm'>
            <span className='text-gray-400'>{shown.length} entr{shown.length === 1 ? 'y' : 'ies'}</span>
            <span className='tabular-nums text-gray-300'>
              In {formatMoney(total('income'), c)} · Out {formatMoney(total('expense'), c)}
            </span>
          </div>
          <ul className='divide-y divide-white/5'>
            {shown.map((t) => (
              <li key={t._id} className={`flex items-center gap-3 px-4 py-3 ${editing === t._id ? 'bg-white/[0.06]' : ''}`}>
                <span className='w-1 self-stretch rounded-full shrink-0' style={{ background: t.type === 'income' ? INCOME_COLOR : EXPENSE_COLOR }} aria-hidden='true' />
                <div className='min-w-0 flex-1'>
                  <p className='text-sm text-white truncate'>{t.note || t.category}</p>
                  <p className='text-xs text-gray-400'>
                    {formatDay(t.date)} · {t.category}{t.billId ? ' · bill' : ''}{t.invoiceId ? ' · invoice' : ''}
                  </p>
                </div>
                <span className={`tabular-nums text-sm font-semibold shrink-0 ${t.type === 'income' ? 'text-emerald-300' : 'text-gray-100'}`}>
                  {t.type === 'income' ? '+' : '−'}{formatMoney(t.amount, c)}
                </span>
                <button type='button' onClick={() => edit(t)} aria-label='Edit' className='p-1.5 text-gray-400 hover:text-white'><Pencil size={14} /></button>
                <button type='button' onClick={() => remove(t)} aria-label='Delete' className='p-1.5 text-gray-400 hover:text-red-400'><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
