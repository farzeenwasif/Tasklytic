import { useContext, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, CreditCard, Loader2, RotateCcw, Sparkles } from 'lucide-react'
import { UserContext } from '../context/UserContext'
import { getCard } from '../services/billingService'
import { getErrorMessage } from '../utils/apiClient'
import UpdateCardModal from './UpdateCardModal'

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''

// Premium subscription details on the Profile page. Cancel / resume happen in the app (no redirect).
export default function SubscriptionCard({ welcome = '' }) {
  const { user, isPremium, cancelSubscription, resumeSubscription } = useContext(UserContext)
  const [busy, setBusy] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [msg, setMsg] = useState(welcome ? { type: 'success', text: welcome } : null)

  const [card, setCard] = useState(null) // { brand, last4, expMonth, expYear }
  const [showCardForm, setShowCardForm] = useState(false)

  const sub = user?.subscription || {}
  const paid = isPremium && !user?.complimentary && Boolean(sub.status)

  // Card on file for renewals
  useEffect(() => {
    if (!paid) return
    let cancelled = false
    getCard()
      .then((d) => !cancelled && setCard(d.card))
      .catch(() => { /* the card line just stays hidden */ })
    return () => { cancelled = true }
  }, [paid])

  if (!isPremium) return null

  const onCardSaved = ({ card: newCard, paymentRetry }) => {
    if (newCard) setCard(newCard)
    setMsg(
      paymentRetry === 'failed'
        ? { type: 'error', text: 'Card saved, but the overdue payment was declined on it. Please try another card.' }
        : { type: 'success', text: paymentRetry === 'paid' ? 'Card updated and the overdue payment went through.' : 'Card updated. It will be used for your next renewal.' }
    )
  }
  const end = formatDate(sub.currentPeriodEnd)

  const changeRenewal = (cancel) => async () => {
    setBusy(true)
    setMsg(null)
    try {
      const u = await (cancel ? cancelSubscription() : resumeSubscription())
      const until = formatDate(u?.subscription?.currentPeriodEnd)
      setMsg(
        cancel
          ? { type: 'info', text: `Subscription cancelled. You keep Premium${until ? ` until ${until}` : ' until the end of this billing period'} and will not be charged again.` }
          : { type: 'success', text: 'Subscription resumed. Premium will renew as usual.' }
      )
      setConfirmCancel(false)
    } catch (err) {
      setMsg({ type: 'error', text: getErrorMessage(err, cancel ? 'Could not cancel the subscription' : 'Could not resume the subscription') })
    } finally {
      setBusy(false)
    }
  }

  let status
  if (user.complimentary) status = <span className='text-emerald-300'>Complimentary, no payment needed</span>
  else if (sub.status === 'past_due') status = <span className='text-amber-300'>Last payment failed, please update your card</span>
  else if (sub.cancelAtPeriodEnd) status = <span className='text-amber-300'>Cancelled, access until {end}</span>
  else status = <span className='text-emerald-300'>Active{end ? `, renews ${end}` : ''}</span>

  return (
    <div id='subscription' className='glass-card rounded-2xl p-5 sm:p-6 space-y-4 scroll-mt-24'>
      <div className='flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between'>
        <div className='flex items-start gap-3'>
          <span className='w-10 h-10 shrink-0 rounded-xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center'>
            <Sparkles size={18} />
          </span>
          <div>
            <h3 className='text-xl font-bold'>Subscription</h3>
            <p className='text-sm text-gray-400 mt-0.5'>
              Premium{user.complimentary ? '' : ' · $20/month'} · {status}
            </p>
            {paid && card && (
              <p className='text-sm text-gray-400 mt-1 flex items-center gap-1.5'>
                <CreditCard size={14} />
                <span className='capitalize'>{card.brand}</span> ending in {card.last4} · expires {String(card.expMonth).padStart(2, '0')}/{String(card.expYear).slice(-2)}
              </p>
            )}
          </div>
        </div>

        {paid && (
          <div className='flex flex-col sm:flex-row gap-2 shrink-0'>
          <button type='button' onClick={() => setShowCardForm(true)} disabled={busy} className='btn-ghost px-4 py-2 inline-flex items-center justify-center gap-2'>
            <CreditCard size={16} /> Update card
          </button>
          {sub.cancelAtPeriodEnd ? (
            <button type='button' onClick={changeRenewal(false)} disabled={busy} className='btn-primary px-4 py-2 inline-flex items-center justify-center gap-2'>
              {busy ? <Loader2 size={16} className='animate-spin' /> : <RotateCcw size={16} />} Resume subscription
            </button>
          ) : (
            <button
              type='button'
              onClick={() => setConfirmCancel(true)}
              disabled={busy}
              className='px-4 py-2 rounded-lg font-medium border border-red-400/40 text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-50'
            >
              Cancel subscription
            </button>
          )}
          </div>
        )}
      </div>

      {msg && (
        <div
          className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm border ${
            msg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-400/40 text-emerald-200'
              : msg.type === 'error'
                ? 'bg-red-500/10 border-red-400/40 text-red-200'
                : 'bg-white/5 border-white/10 text-gray-200'
          }`}
        >
          {msg.type === 'success' && <CheckCircle2 size={16} className='shrink-0' />}
          {msg.text}
        </div>
      )}

      {showCardForm && <UpdateCardModal onClose={() => setShowCardForm(false)} onDone={onCardSaved} />}

      {/* Rendered on <body>: the card's blur would otherwise trap a fixed overlay inside it */}
      {confirmCancel && createPortal(
        <div className='fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4'>
          <div className='glass-panel modal-pop rounded-2xl w-full max-w-md overflow-hidden'>
            <div className='p-6 text-center border-b border-white/10'>
              <div className='flex justify-center mb-4'>
                <div className='bg-red-500/20 p-4 rounded-full border border-red-500/50'>
                  <AlertTriangle size={32} className='text-red-400' />
                </div>
              </div>
              <h2 className='text-xl sm:text-2xl font-bold text-white'>Cancel Premium?</h2>
            </div>
            <div className='px-6 py-4 text-center space-y-2 text-sm'>
              <p className='text-gray-300'>
                You will not be charged again. Premium and the AI features stay on
                {end ? <> until <span className='font-semibold text-white'>{end}</span></> : ' until the end of this billing period'},
                then your account moves to the Free plan.
              </p>
              <p className='text-gray-400'>Your tasks and data are kept. You can resume anytime before then.</p>
            </div>
            <div className='flex gap-3 px-6 py-4 bg-white/5 border-t border-white/10'>
              <button type='button' onClick={() => setConfirmCancel(false)} disabled={busy} className='flex-1 px-4 py-2 btn-ghost'>
                Keep Premium
              </button>
              <button
                type='button'
                onClick={changeRenewal(true)}
                disabled={busy}
                className='flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60'
              >
                {busy && <Loader2 size={16} className='animate-spin' />} Cancel subscription
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
