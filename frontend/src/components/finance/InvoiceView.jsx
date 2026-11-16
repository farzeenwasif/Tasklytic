import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Plus, Printer, Trash2, X } from 'lucide-react'
import { updateInvoice } from '../../services/financeService'
import { getErrorMessage } from '../../utils/apiClient'
import { dayValue, formatDay, formatMoney } from '../../utils/money'

// One invoice as a printable page. Lines can be edited while it is not paid.
// "Print / Save as PDF" uses the browser's print dialog (the print stylesheet shows only this page).
export default function InvoiceView({ invoice, client, settings, user, onClose, onSaved }) {
  const editable = invoice.status !== 'paid'
  const [items, setItems] = useState(invoice.items.map((i) => ({ ...i })))
  const [notes, setNotes] = useState(invoice.notes || '')
  const [dueDate, setDueDate] = useState(dayValue(invoice.dueDate))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const c = invoice.currency

  const lineAmount = (i) => (Number(i.hours) > 0 ? Math.round(Number(i.hours) * Number(i.rate) * 100) / 100 : Number(i.amount) || 0)
  const total = items.reduce((s, i) => s + lineAmount(i), 0)
  const dirty =
    JSON.stringify(items.map((i) => [i.description, +i.hours, +i.rate, lineAmount(i)])) !==
      JSON.stringify(invoice.items.map((i) => [i.description, i.hours, i.rate, i.amount])) ||
    notes !== (invoice.notes || '') ||
    dueDate !== dayValue(invoice.dueDate)

  const setItem = (idx, k, v) => setItems((list) => list.map((i, j) => (j === idx ? { ...i, [k]: v } : i)))

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const saved = await updateInvoice(invoice._id, {
        items: items.map((i) => ({ description: i.description, hours: Number(i.hours) || 0, rate: Number(i.rate) || 0, amount: lineAmount(i) })),
        notes,
        dueDate,
      })
      onSaved(saved)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save the invoice'))
    } finally {
      setSaving(false)
    }
  }

  const cell = 'bg-transparent border border-gray-300 rounded px-2 py-1 w-full print:border-0 print:p-0'

  return createPortal(
    <div className='invoice-print-root fixed inset-0 modal-overlay flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto' onClick={onClose}>
      <div className='w-full max-w-3xl my-auto' onClick={(e) => e.stopPropagation()}>
        <div className='flex flex-wrap justify-end gap-2 mb-3 print:hidden'>
          {editable && dirty && (
            <button type='button' onClick={save} disabled={saving} className='btn-primary px-4 py-2'>
              {saving && <Loader2 size={15} className='animate-spin' />} Save changes
            </button>
          )}
          <button type='button' onClick={() => window.print()} disabled={dirty} title={dirty ? 'Save your changes first' : ''} className='btn-ghost px-4 py-2'>
            <Printer size={15} /> Print / Save as PDF
          </button>
          <button type='button' onClick={onClose} aria-label='Close' className='btn-ghost px-3 py-2'><X size={18} /></button>
        </div>
        {error && <p className='mb-3 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 print:hidden'>{error}</p>}

        <article className='invoice-page bg-white text-[#1f2937] rounded-2xl shadow-2xl p-6 sm:p-10 text-sm'>
          <header className='flex flex-wrap justify-between gap-6'>
            <div>
              <p className='text-2xl font-bold text-[#111827]'>{settings.businessName || user?.name}</p>
              {user?.email && <p className='text-gray-500'>{user.email}</p>}
            </div>
            <div className='text-right'>
              <p className='text-3xl font-extrabold tracking-tight text-[#111827]'>INVOICE</p>
              <p className='text-gray-500'>{invoice.number}</p>
              <p className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-bold uppercase ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' : invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                {invoice.status}
              </p>
            </div>
          </header>

          <section className='grid grid-cols-2 gap-6 mt-8'>
            <div>
              <p className='text-xs uppercase tracking-wider text-gray-400'>Bill to</p>
              <p className='font-semibold text-[#111827] mt-1'>{client?.name || 'Client'}</p>
              {client?.email && <p className='text-gray-500'>{client.email}</p>}
            </div>
            <div className='text-right space-y-1'>
              <p><span className='text-gray-400'>Issued </span>{formatDay(invoice.issueDate, true)}</p>
              <p className='flex justify-end items-center gap-2'>
                <span className='text-gray-400'>Due</span>
                {editable ? (
                  <input type='date' value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={`${cell} w-auto`} aria-label='Due date' />
                ) : (
                  formatDay(invoice.dueDate, true)
                )}
              </p>
              {invoice.paidAt && <p><span className='text-gray-400'>Paid </span>{formatDay(invoice.paidAt, true)}</p>}
            </div>
          </section>

          <table className='w-full mt-8'>
            <thead>
              <tr className='border-b-2 border-gray-200 text-left text-xs uppercase tracking-wider text-gray-400'>
                <th className='py-2 font-semibold'>Description</th>
                <th className='py-2 font-semibold text-right w-20'>Hours</th>
                <th className='py-2 font-semibold text-right w-28'>Rate</th>
                <th className='py-2 font-semibold text-right w-32'>Amount</th>
                {editable && <th className='w-8 print:hidden' />}
              </tr>
            </thead>
            <tbody>
              {items.map((i, idx) => (
                <tr key={idx} className='border-b border-gray-100 align-top'>
                  <td className='py-2 pr-2'>
                    {editable ? <input value={i.description} onChange={(e) => setItem(idx, 'description', e.target.value)} maxLength={200} aria-label='Description' className={cell} /> : i.description}
                  </td>
                  <td className='py-2 px-1 text-right tabular-nums'>
                    {editable ? <input type='number' min='0' step='0.25' value={i.hours} onChange={(e) => setItem(idx, 'hours', e.target.value)} aria-label='Hours' className={`${cell} text-right`} /> : i.hours || ''}
                  </td>
                  <td className='py-2 px-1 text-right tabular-nums'>
                    {editable ? <input type='number' min='0' step='0.01' value={i.rate} onChange={(e) => setItem(idx, 'rate', e.target.value)} aria-label='Rate' className={`${cell} text-right`} /> : i.hours ? formatMoney(i.rate, c) : ''}
                  </td>
                  <td className='py-2 pl-1 text-right tabular-nums font-medium'>
                    {editable && !(Number(i.hours) > 0) ? (
                      <input type='number' min='0' step='0.01' value={i.amount} onChange={(e) => setItem(idx, 'amount', e.target.value)} aria-label='Amount' className={`${cell} text-right`} />
                    ) : (
                      formatMoney(lineAmount(i), c)
                    )}
                  </td>
                  {editable && (
                    <td className='py-2 text-right print:hidden'>
                      <button type='button' onClick={() => setItems((l) => l.filter((_, j) => j !== idx))} aria-label='Remove line' className='p-1 text-gray-400 hover:text-red-600'><Trash2 size={14} /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {editable && (
            <button type='button' onClick={() => setItems((l) => [...l, { description: '', hours: 0, rate: 0, amount: 0 }])} className='mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 print:hidden'>
              <Plus size={13} /> Add a line (fixed fee, expense...)
            </button>
          )}

          <div className='flex justify-end mt-6'>
            <div className='w-64 space-y-1'>
              <div className='flex justify-between text-base font-bold text-[#111827] border-t-2 border-gray-200 pt-2'>
                <span>Total</span>
                <span className='tabular-nums'>{formatMoney(total, c)}</span>
              </div>
            </div>
          </div>

          {(editable || notes) && (
            <div className='mt-8'>
              <p className='text-xs uppercase tracking-wider text-gray-400 mb-1'>Notes</p>
              {editable ? (
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={500} placeholder='Payment details, bank account, thank-you note...' className={`${cell} resize-y`} />
              ) : (
                <p className='whitespace-pre-wrap text-gray-600'>{notes}</p>
              )}
            </div>
          )}
        </article>
      </div>
    </div>,
    document.body
  )
}
