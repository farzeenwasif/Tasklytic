import { useContext, useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, XCircle } from 'lucide-react'
import Layout from '../components/Layout'
import PricingCards from '../components/PricingCards'
import { UserContext } from '../context/UserContext'
import StripeCheckoutForm from '../components/StripeCheckoutForm'
import { getErrorMessage } from '../utils/apiClient'

const WELCOME = 'Welcome to Premium! Your AI features are unlocked.'

// Plans page for Free users. Premium users manage their subscription on the Profile page.
export default function Billing() {
  const { isPremium, syncSubscription } = useContext(UserContext)
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [showCheckout, setShowCheckout] = useState(false)
  const [notice, setNotice] = useState(null) // { type, text }
  // true while confirming a payment, so the Premium redirect below waits for it
  const [confirming, setConfirming] = useState(params.get('status') === 'success')
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
      .then((u) => {
        if (u?.isPremium) {
          navigate('/profile#subscription', { replace: true, state: { welcome: WELCOME } })
          return
        }
        setNotice({ type: 'info', text: 'Payment received. Premium will switch on in a moment; refresh if it does not.' })
        setConfirming(false)
      })
      .catch((err) => {
        setNotice({ type: 'error', text: getErrorMessage(err, 'Could not confirm the payment yet. Refresh in a minute.') })
        setConfirming(false)
      })
  }, [params, setParams, syncSubscription, navigate])

  // Already Premium: nothing to buy here
  if (isPremium && !confirming) return <Navigate to='/profile#subscription' replace />

  return (
    <Layout>
      <div className='max-w-5xl mx-auto space-y-8'>
        <div className='text-center'>
          <h1 className='text-white text-2xl sm:text-3xl font-bold'>Plans & billing</h1>
          <p className='text-gray-400 text-sm mt-2'>You are on the Free plan.</p>
        </div>

        {notice && (
          <div
            className={`max-w-2xl mx-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm border ${
              notice.type === 'error'
                ? 'bg-red-500/10 border-red-400/40 text-red-200'
                : 'bg-white/5 border-white/10 text-gray-200'
            }`}
          >
            {notice.type === 'loading' && <Loader2 size={18} className='animate-spin shrink-0' />}
            {notice.type === 'error' && <XCircle size={18} className='shrink-0' />}
            {notice.text}
          </div>
        )}

        <PricingCards
          currentPlan='free'
          renderAction={(plan) =>
            plan.id === 'free' ? (
              <button type='button' disabled className='btn-ghost w-full py-3'>Your current plan</button>
            ) : (
              <button type='button' onClick={() => setShowCheckout(true)} disabled={confirming} className='btn-primary w-full py-3'>
                Upgrade for $20/month
              </button>
            )
          }
        />

        <p className='text-center text-xs text-gray-500'>
          Payments are handled securely by Stripe. Cancel anytime from your profile; Premium stays on until the end of the paid month.
        </p>
      </div>
      {showCheckout && <StripeCheckoutForm onClose={() => setShowCheckout(false)} />}
    </Layout>
  )
}
