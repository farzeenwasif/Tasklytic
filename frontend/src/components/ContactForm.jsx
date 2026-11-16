import { useState } from 'react'
import { CheckCircle2, Loader2, Mail, Send } from 'lucide-react'
import api, { getErrorMessage } from '../utils/apiClient'

export const SUPPORT_EMAIL = 'farzeenwasif15@gmail.com'
const TOPICS = ['General question', 'Problem / bug', 'Billing & Premium', 'Feature idea']

// "Need help?" form: the message is emailed to support, and the reply comes back to the sender's email
export default function ContactForm({ name: initialName = '', email: initialEmail = '' }) {
  const [form, setForm] = useState({ name: initialName, email: initialEmail, topic: TOPICS[0], message: '', website: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSending(true)
    setError('')
    try {
      await api.post('/api/contact', form)
      setSent(true)
    } catch (err) {
      setError(getErrorMessage(err, `Could not send your message. Please email ${SUPPORT_EMAIL} directly.`))
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className='text-center py-8 space-y-3'>
        <CheckCircle2 size={40} className='mx-auto text-emerald-400' />
        <p className='text-white text-lg font-semibold'>Thanks, your message is on its way</p>
        <p className='text-sm text-gray-400'>We reply to <span className='text-gray-200'>{form.email}</span>, usually within a day.</p>
        <button type='button' onClick={() => { setSent(false); setForm((f) => ({ ...f, message: '' })) }} className='text-sm text-emerald-300 hover:text-emerald-200'>
          Send another message
        </button>
      </div>
    )
  }

  const input = 'w-full px-4 py-2.5 rounded-xl text-sm bg-white/[0.06] border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-400/60'
  return (
    <form onSubmit={submit} className='space-y-4 text-left'>
      <div className='grid gap-4 sm:grid-cols-2'>
        <label className='block text-sm text-gray-300'>
          <span className='block mb-1.5'>Your name</span>
          <input required value={form.name} onChange={set('name')} maxLength={80} autoComplete='name' className={input} />
        </label>
        <label className='block text-sm text-gray-300'>
          <span className='block mb-1.5'>Your email</span>
          <input required type='email' value={form.email} onChange={set('email')} maxLength={120} autoComplete='email' className={input} />
        </label>
      </div>
      <label className='block text-sm text-gray-300'>
        <span className='block mb-1.5'>What is it about?</span>
        <select value={form.topic} onChange={set('topic')} className={`${input} [&>option]:bg-[#1c1c1f]`}>
          {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <label className='block text-sm text-gray-300'>
        <span className='block mb-1.5'>How can we help?</span>
        <textarea required value={form.message} onChange={set('message')} rows={5} minLength={10} maxLength={3000} className={`${input} resize-y`} placeholder='Tell us what happened or what you need. Roman Urdu is fine.' />
      </label>
      {/* Hidden from people; bots fill it in and get ignored */}
      <input type='text' name='website' value={form.website} onChange={set('website')} tabIndex={-1} autoComplete='off' aria-hidden='true' className='hidden' />
      {error && <p className='text-sm text-red-400'>{error}</p>}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <a href={`mailto:${SUPPORT_EMAIL}`} className='inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white'>
          <Mail size={15} /> {SUPPORT_EMAIL}
        </a>
        <button type='submit' disabled={sending} className='inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-[#0B0B0C] bg-white hover:bg-zinc-200 disabled:opacity-60 transition-colors'>
          {sending ? <Loader2 size={16} className='animate-spin' /> : <Send size={16} />} Send message
        </button>
      </div>
    </form>
  )
}
