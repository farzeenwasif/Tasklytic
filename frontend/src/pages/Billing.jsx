import { useContext, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import Layout from '../components/Layout'
import PricingCards from '../components/PricingCards'
import { UserContext } from '../context/UserContext'
import { openBillingPortal } from '../services/billingService'
import StripeCheckoutForm from '../components/StripeCheckoutForm'
import { getErrorMessage } from '../utils/apiClient'

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''

export default function Billing() {
  const { user, isPremium, syncSubscription } = useContext(UserContext)
  const [params, setParams] = useSearchParams()
  const [busy, setBusy] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(null) // { type, text }
  const handledReturn = useRef(false)

  // Coming back from Stripe Checkout
  useEffect(() => {
    const status = params.get('status')
    if (!status || handledReturn.current) return
    handledReturn.current = true
    setParams({}, { replace: true })

    if (status === 'cancelled') {
      setNotice({ type: 'info', text: 'Checkout cancelled. You have not been charged.' })
      return
    }
    setNotice({ type: 'loading', text: 'Confirming your payment...' })
    syncSubscription()
      .then((u) =>
        setNotice(
          u?.isPremium
            ? { type: 'success', text: 'Welcome to Premium! Your AI features are unlocked.' }
            : { type: 'info', text: 'Payment received. Premium will switch on in a moment; refresh if it does not.' }
        )
      )
      .catch((err) => setNotice({ type: 'error', text: getErrorMessage(err, 'Could not confirm the payment yet. Refresh in a minute.') }))
  }, [params, setParams, syncSubscription])

  const go = (request) => async () => {
    setBusy(true)
    setError('')
    try {
      const { url } = await request()
      window.location.assign(url)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not reach the payment page'))
      setBusy(false)
    }
  }

  const sub = user?.subscription || {}
  const hasStripeSub = Boolean(sub.status)
  const complimentary = Boolean(user?.complimentary)

  return (
    <Layout>
      <div className='max-w-5xl mx-auto space-y-8'>
        <div className='text-center'>
          <h1 className='text-white text-2xl sm:text-3xl font-bold'>Plans & billing</h1>
          <p className='text-gray-400 text-sm mt-2'>
            {complimentary
              ? 'Your account has complimentary Premium access. No payment needed.'
              : isPremium ? 'You are on Premium.' : 'You are on the Free plan.'}{' '}
            {isPremium && !complimentary && sub.currentPeriodEnd &&
              (sub.cancelAtPeriodEnd
                ? `Premium ends on ${formatDate(sub.currentPeriodEnd)}.`
                : `Renews on ${formatDate(sub.currentPeriodEnd)}.`)}
            {sub.status === 'past_due' && ' Your last payment failed. Please update your card.'}
          </p>
        </div>

        {notice && (
          <div
            className={`max-w-2xl mx-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm border ${
              notice.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-400/40 text-emerald-200'
                : notice.type === 'error'
                  ? 'bg-red-500/10 border-red-400/40 text-red-200'
                  : 'bg-white/5 border-white/10 text-gray-200'
            }`}
          >
            {notice.type === 'loading' && <Loader2 size={18} className='animate-spin shrink-0' />}
            {notice.type === 'success' && <CheckCircle2 size={18} className='shrink-0' />}
            {notice.type === 'error' && <XCircle size={18} className='shrink-0' />}
            {notice.text}
          </div>
        )}
        {error && <p className='text-center text-red-400 text-sm'>{error}</p>}

        <PricingCards
          currentPlan={isPremium ? 'premium' : 'free'}
          renderAction={(plan) => {
            if (complimentary) {
              return (
                <button type='button' disabled className={`${plan.id === 'premium' ? 'btn-primary' : 'btn-ghost'} w-full py-3`}>
                  {plan.id === 'premium' ? 'Included with your account' : 'Premium is active'}
                </button>
              )
            }
            if (plan.id === 'free') {
              return isPremium && hasStripeSub ? (
                <button type='button' onClick={go(openBillingPortal)} disabled={busy} className='btn-ghost w-full py-3'>
                  Cancel or change plan
                </button>
              ) : (
                <button type='button' disabled className='btn-ghost w-full py-3'>Your current plan</button>
              )
            }
            return isPremium ? (
              <button type='button' onClick={go(openBillingPortal)} disabled={busy || !hasStripeSub} className='btn-primary w-full py-3'>
                {busy ? <Loader2 size={16} className='animate-spin' /> : null} Manage subscription
              </button>
            ) : (
              <button type='button' onClick={() => setShowCheckout(true)} disabled={busy} className='btn-primary w-full py-3'>
                {busy ? <Loader2 size={16} className='animate-spin' /> : null} Upgrade for $20/month
              </button>
            )
          }}
        />

        <p className='text-center text-xs text-gray-500'>
          Payments are handled securely by Stripe. Cancel anytime; Premium stays on until the end of the paid month.
        </p>
      </div>
      {showCheckout && <StripeCheckoutForm onClose={() => setShowCheckout(false)} />}
    </Layout>
  )
}
