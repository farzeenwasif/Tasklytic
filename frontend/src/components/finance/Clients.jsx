import { useContext, useEffect, useState } from 'react'
import { Check, FileText, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import * as fin from '../../services/financeService'
import { UserContext } from '../../context/UserContext'
import { refreshClients } from '../../hooks/useClients'
import { getErrorMessage } from '../../utils/apiClient'
import { formatDay, formatMoney } from '../../utils/money'
import InvoiceView from './InvoiceView'

const COLORS = ['#34d399', '#3987e5', '#d95926', '#c98500', '#d55181', '#9085e9', '#199e70', '#e66767']
const STATUS_STYLE = {
  draft: 'bg-white/10 text-gray-300 border-white/15',
  sent: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
  paid: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
}
const blank = () => ({ name: '', email: '', hourlyRate: '', color: COLORS[0] })

// Freelance: clients with hourly rates, unbilled time, and invoices made from it
export default function Clients({ settings, onChange }) {
  const { user } = useContext(UserContext)
  const [clients, setClients] = useState(null)
  const [unbilled, setUnbilled] = useState([])
  const [invoices, setInvoices] = useState([])
  const [form, setForm] = useState(null)
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const c = settings.currency

  const load = async () => {
    try {
      const [cl, ub, inv] = await Promise.all([fin.listClients(), fin.getUnbilled(), fin.listInvoices()])
      setClients(cl)
      setUnbilled(ub)
      setInvoices(inv)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load clients'))
    }
  }
  useEffect(() => { load() }, [])

  const clientById = new Map((clients || []).map((cl) => [cl._id, cl]))
  const unbilledOf = new Map(unbilled.map((u) => [u.clientId, u]))

  const save = async (e) => {
    e.preventDefault()
    setBusy('save')
    setError('')
    try {
      const data = { ...form, hourlyRate: Number(form.hourlyRate) || 0 }
      if (editing) await fin.updateClient(editing, data)
      else await fin.addClient(data)
      setForm(null)
      setEditing(null)
      await Promise.all([load(), refreshClients()])
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save the client'))
    } finally {
      setBusy('')
    }
  }

  const remove = async (cl) => {
    if (!window.confirm(`Remove ${cl.name}? Their open tasks are kept but no longer billable. Invoices stay.`)) return
    try {
      await fin.deleteClient(cl._id)
      await Promise.all([load(), refreshClients()])
    } catch (err) {
      setError(getErrorMessage(err, 'Could not remove the client'))
    }
  }

  const invoice = async (cl) => {
    setBusy(`inv-${cl._id}`)
    setError('')
    try {
      const created = await fin.createInvoice(cl._id, 14)
      await load()
      setViewing(created)
      onChange()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create the invoice'))
    } finally {
      setBusy('')
    }
  }

  const setStatus = async (inv, status) => {
    setBusy(`st-${inv._id}`)
    setError('')
    try {
      await fin.updateInvoice(inv._id, { status })
      await load()
      onChange()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not update the invoice'))
    } finally {
      setBusy('')
    }
  }

  const removeInvoice = async (inv) => {
    if (!window.confirm(`Delete invoice ${inv.number}? Its time goes back to "not invoiced".`)) return
    try {
      await fin.deleteInvoice(inv._id)
      await load()
      onChange()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete the invoice'))
    }
  }

  return (
    <div className='space-y-6'>
      <section className='space-y-3'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h3 className='text-white font-semibold text-lg'>Clients</h3>
            <p className='text-sm text-gray-400'>Link a task to a client (task "More options") and its focus time becomes billable.</p>
          </div>
          {!form && (
            <button type='button' onClick={() => { setForm(blank()); setEditing(null) }} className='btn-primary px-4 py-2'>
              <Plus size={15} /> Add client
            </button>
          )}
        </div>

        {form && (
          <form onSubmit={save} className='glass-card rounded-2xl p-4 sm:p-5 space-y-3'>
            <div className='flex items-center justify-between'>
              <h4 className='text-white font-semibold'>{editing ? 'Edit client' : 'New client'}</h4>
              <button type='button' onClick={() => { setForm(null); setEditing(null) }} aria-label='Close' className='p-1 text-gray-400 hover:text-white'><X size={18} /></button>
            </div>
            <div className='grid gap-3 sm:grid-cols-3'>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} placeholder='Client name' aria-label='Client name' className='glass-input px-3 py-2.5 rounded-xl text-sm' />
              <input type='email' value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={120} placeholder='Email (optional)' aria-label='Email' className='glass-input px-3 py-2.5 rounded-xl text-sm' />
              <input type='number' min='0' step='0.01' value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} placeholder={`Hourly rate (${c})`} aria-label='Hourly rate' className='glass-input px-3 py-2.5 rounded-xl text-sm' />
            </div>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div className='flex gap-2' role='radiogroup' aria-label='Colour'>
                {COLORS.map((col) => (
                  <button
                    key={col}
                    type='button'
                    onClick={() => setForm({ ...form, color: col })}
                    aria-label={`Colour ${col}`}
                    aria-checked={form.color === col}
                    role='radio'
                    className={`w-6 h-6 rounded-full border-2 ${form.color === col ? 'border-white' : 'border-transparent'}`}
                    style={{ background: col }}
                  />
                ))}
              </div>
              <button type='submit' disabled={busy === 'save'} className='btn-primary px-4 py-2'>
                {busy === 'save' ? <Loader2 size={15} className='animate-spin' /> : <Check size={15} />} Save
              </button>
            </div>
          </form>
        )}

        {clients === null ? (
          <div className='glass-card rounded-2xl h-24 animate-pulse' />
        ) : clients.length === 0 ? (
          !form && <div className='glass-card rounded-2xl p-8 text-center text-gray-400 text-sm'>No clients yet.</div>
        ) : (
          <ul className='grid gap-3 sm:grid-cols-2'>
            {clients.map((cl) => {
              const u = unbilledOf.get(cl._id)
              return (
                <li key={cl._id} className='glass-card rounded-2xl p-4 space-y-3'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0 flex items-center gap-2.5'>
                      <span className='w-3 h-3 rounded-full shrink-0' style={{ background: cl.color }} />
                      <div className='min-w-0'>
                        <p className='text-white font-semibold truncate'>{cl.name}</p>
                        <p className='text-xs text-gray-400 truncate'>{formatMoney(cl.hourlyRate, c)}/hour{cl.email ? ` · ${cl.email}` : ''}</p>
                      </div>
                    </div>
                    <span className='flex shrink-0'>
                      <button type='button' onClick={() => { setEditing(cl._id); setForm({ name: cl.name, email: cl.email, hourlyRate: String(cl.hourlyRate), color: cl.color }) }} aria-label='Edit' className='p-1.5 text-gray-400 hover:text-white'><Pencil size={14} /></button>
                      <button type='button' onClick={() => remove(cl)} aria-label='Remove' className='p-1.5 text-gray-400 hover:text-red-400'><Trash2 size={14} /></button>
                    </span>
                  </div>
                  <div className='flex items-center justify-between gap-3'>
                    <span className='text-sm text-gray-300'>
                      {u ? <>Not invoiced: <strong className='text-white tabular-nums'>{u.hours}h · {formatMoney(u.amount, c)}</strong></> : <span className='text-gray-500'>No unbilled time</span>}
                    </span>
                    <button type='button' onClick={() => invoice(cl)} disabled={!u || busy === `inv-${cl._id}`} className='btn-primary px-3 py-1.5 text-sm'>
                      {busy === `inv-${cl._id}` ? <Loader2 size={14} className='animate-spin' /> : <FileText size={14} />} Invoice
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {error && <p className='text-sm text-red-400'>{error}</p>}

      <section className='space-y-3'>
        <h3 className='text-white font-semibold text-lg'>Invoices</h3>
        {invoices.length === 0 ? (
          <div className='glass-card rounded-2xl p-6 text-center text-gray-400 text-sm'>Invoices you create appear here.</div>
        ) : (
          <div className='glass-card rounded-2xl overflow-hidden'>
            <ul className='divide-y divide-white/5'>
              {invoices.map((inv) => {
                const cl = clientById.get(inv.clientId)
                const overdue = inv.status === 'sent' && new Date(inv.dueDate) < new Date(new Date().toISOString().slice(0, 10))
                return (
                  <li key={inv._id} className='flex flex-wrap items-center gap-3 px-4 py-3'>
                    <button type='button' onClick={() => setViewing(inv)} className='min-w-0 flex-1 text-left'>
                      <p className='text-sm text-white font-medium hover:underline underline-offset-4'>{inv.number} · {cl?.name || 'Client'}</p>
                      <p className={`text-xs ${overdue ? 'text-red-400' : 'text-gray-400'}`}>
                        Issued {formatDay(inv.issueDate)} · due {formatDay(inv.dueDate)}{overdue ? ' · overdue' : ''}
                      </p>
                    </button>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLE[inv.status]}`}>{inv.status}</span>
                    <span className='tabular-nums text-sm font-semibold text-white w-28 text-right'>{formatMoney(inv.total, inv.currency)}</span>
                    <span className='flex items-center gap-1'>
                      {inv.status === 'draft' && <button type='button' onClick={() => setStatus(inv, 'sent')} disabled={busy === `st-${inv._id}`} className='btn-ghost px-2.5 py-1 text-xs'>Mark sent</button>}
                      {inv.status !== 'paid' && <button type='button' onClick={() => setStatus(inv, 'paid')} disabled={busy === `st-${inv._id}`} className='btn-primary px-2.5 py-1 text-xs'>Mark paid</button>}
                      {inv.status === 'paid' && <button type='button' onClick={() => setStatus(inv, 'sent')} disabled={busy === `st-${inv._id}`} className='btn-ghost px-2.5 py-1 text-xs'>Undo paid</button>}
                      {inv.status !== 'paid' && <button type='button' onClick={() => removeInvoice(inv)} aria-label='Delete invoice' className='p-1.5 text-gray-400 hover:text-red-400'><Trash2 size={14} /></button>}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </section>

      {viewing && (
        <InvoiceView
          invoice={viewing}
          client={clientById.get(viewing.clientId)}
          settings={settings}
          user={user}
          onClose={() => setViewing(null)}
          onSaved={(saved) => {
            setViewing(saved)
            load()
          }}
        />
      )}
    </div>
  )
}
