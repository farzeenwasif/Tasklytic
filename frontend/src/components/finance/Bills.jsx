import { useContext, useEffect, useState } from 'react'
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import * as fin from '../../services/financeService'
import { TaskContext } from '../../context/BillContext'
import { getErrorMessage } from '../../utils/apiClient'
import { dateFromToday, daysUntilDue, localToday } from '../../utils/taskUtils'
import { dayValue, formatDay, formatMoney } from '../../utils/money'

const FREQ_LABEL = { weekly: 'Every week', monthly: 'Every month', yearly: 'Every year' }
const blank = () => ({ name: '', amount: '', category: 'Bills & Utilities', frequency: 'monthly', nextDueDate: dateFromToday(7) })

// Recurring bills & subscriptions. Each has a "Pay ..." task in the task list;
// paying here or ticking the task off records the expense and schedules the next one.
export default function Bills({ settings, options, onChange }) {
  const { refreshTasks, mergeTasks, removeLocal } = useContext(TaskContext)
  const [bills, setBills] = useState(null)
  const [form, setForm] = useState(null) // null = closed
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const c = settings.currency

  const load = () => fin.listBills().then(setBills).catch((err) => setError(getErrorMessage(err, 'Could not load bills')))
  useEffect(() => { load() }, [])

  const save = async (e) => {
    e.preventDefault()
    setBusy('save')
    setError('')
    try {
      const data = { ...form, amount: Number(form.amount) }
      const saved = editing ? await fin.updateBill(editing, data) : await fin.addBill(data)
      if (saved.task) mergeTasks([saved.task])
      setForm(null)
      setEditing(null)
      await load()
      onChange()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save the bill'))
    } finally {
      setBusy('')
    }
  }

  const pay = async (bill) => {
    setBusy(bill._id)
    setError('')
    try {
      const { task, next } = await fin.payBill(bill._id, localToday())
      mergeTasks([task, next])
      await load()
      onChange()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not record the payment'))
    } finally {
      setBusy('')
    }
  }

  const remove = async (bill) => {
    if (!window.confirm(`Stop tracking "${bill.name}"? Past payments stay in your expenses.`)) return
    setError('')
    try {
      const { taskId } = await fin.deleteBill(bill._id)
      if (taskId) removeLocal([taskId])
      setBills((list) => list.filter((b) => b._id !== bill._id))
      refreshTasks()
      onChange()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not remove the bill'))
    }
  }

  const monthly = (bills || []).reduce((s, b) => s + b.amount * ({ weekly: 52 / 12, monthly: 1, yearly: 1 / 12 }[b.frequency] || 1), 0)

  return (
    <div className='space-y-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <p className='text-sm text-gray-400'>
          {bills?.length ? <>About <strong className='text-white tabular-nums'>{formatMoney(monthly, c)}</strong> a month in recurring bills.</> : 'Track rent, utilities, internet, school fees and subscriptions.'}
        </p>
        {!form && (
          <button type='button' onClick={() => { setForm(blank()); setEditing(null) }} className='btn-primary px-4 py-2'>
            <Plus size={15} /> Add bill
          </button>
        )}
      </div>

      {form && (
        <form onSubmit={save} className='glass-card rounded-2xl p-4 sm:p-5 space-y-3'>
          <div className='flex items-center justify-between'>
            <h3 className='text-white font-semibold'>{editing ? 'Edit bill' : 'New bill'}</h3>
            <button type='button' onClick={() => { setForm(null); setEditing(null) }} aria-label='Close' className='p-1 text-gray-400 hover:text-white'><X size={18} /></button>
          </div>
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-5'>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} placeholder='Name (e.g. Electricity)' aria-label='Name' className='glass-input px-3 py-2.5 rounded-xl text-sm lg:col-span-2' />
            <input required type='number' min='0' step='0.01' value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder={`Amount (${c})`} aria-label='Amount' className='glass-input px-3 py-2.5 rounded-xl text-sm' />
            <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} aria-label='How often' className='glass-input px-3 py-2.5 rounded-xl text-sm'>
              {options.billFrequencies.map((f) => <option key={f} value={f}>{FREQ_LABEL[f]}</option>)}
            </select>
            <input required type='date' value={form.nextDueDate} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} aria-label='Next due date' className='glass-input px-3 py-2.5 rounded-xl text-sm' />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} aria-label='Category' className='glass-input px-3 py-2.5 rounded-xl text-sm lg:col-span-2'>
              {options.expenseCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div className='flex justify-end'>
            <button type='submit' disabled={busy === 'save'} className='btn-primary px-4 py-2'>
              {busy === 'save' ? <Loader2 size={15} className='animate-spin' /> : <Check size={15} />} Save
            </button>
          </div>
          <p className='text-xs text-gray-500'>A "Pay {form.name || '...'}" task appears in your task list on the due date. Ticking it off records the payment.</p>
        </form>
      )}

      {error && <p className='text-sm text-red-400'>{error}</p>}

      {bills === null ? (
        <div className='glass-card rounded-2xl h-32 animate-pulse' />
      ) : bills.length === 0 ? (
        !form && <div className='glass-card rounded-2xl p-8 text-center text-gray-400 text-sm'>No bills yet.</div>
      ) : (
        <ul className='grid gap-3 sm:grid-cols-2'>
          {bills.map((b) => {
            const days = daysUntilDue({ dueDate: dayValue(b.nextDueDate) })
            const tone = days < 0 ? 'text-red-400' : days <= 3 ? 'text-amber-300' : 'text-gray-400'
            const when = days < 0 ? `overdue since ${formatDay(b.nextDueDate)}` : days === 0 ? 'due today' : days === 1 ? 'due tomorrow' : `due ${formatDay(b.nextDueDate)}`
            return (
              <li key={b._id} className='glass-card rounded-2xl p-4 flex flex-col gap-3'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <p className='text-white font-semibold truncate'>{b.name}</p>
                    <p className='text-xs text-gray-400'>{FREQ_LABEL[b.frequency]} · {b.category}</p>
                  </div>
                  <p className='text-lg font-bold text-white tabular-nums shrink-0'>{formatMoney(b.amount, c)}</p>
                </div>
                <div className='flex items-center justify-between gap-2'>
                  <span className={`text-sm ${tone}`}>{when}</span>
                  <span className='flex items-center'>
                    <button type='button' onClick={() => { setEditing(b._id); setForm({ name: b.name, amount: String(b.amount), category: b.category, frequency: b.frequency, nextDueDate: dayValue(b.nextDueDate) }) }} aria-label='Edit' className='p-1.5 text-gray-400 hover:text-white'><Pencil size={14} /></button>
                    <button type='button' onClick={() => remove(b)} aria-label='Remove' className='p-1.5 text-gray-400 hover:text-red-400'><Trash2 size={14} /></button>
                    <button type='button' onClick={() => pay(b)} disabled={busy === b._id} className='btn-primary px-3 py-1.5 text-sm ml-1'>
                      {busy === b._id ? <Loader2 size={14} className='animate-spin' /> : <Check size={14} />} Paid
                    </button>
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
