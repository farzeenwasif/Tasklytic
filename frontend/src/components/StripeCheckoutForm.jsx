import { useEffect, useRef, useState } from 'react'
import { Loader2, Lock, X } from 'lucide-react'
import { startCheckout } from '../services/billingService'
import { getErrorMessage } from '../utils/apiClient'

// Appearance configured in Stripe Checkout Studio
const APPEARANCE = {
  theme: 'stripe',
  labels: 'auto',
  inputs: 'spaced',
  variables: {
    borderRadius: '4px',
    colorBackground: '#ffffff',
    colorDanger: '#df1b41',
    colorPrimary: '#0570de',
    colorSuccess: '#00c853',
    colorText: '#30313d',
    fontFamily: 'default',
    fontSizeBase: '16px',
    spacingUnit: '4px',
  },
}

// Stripe's embedded payment form (Checkout Session with ui_mode "form").
// On success Stripe sends the browser to the session's return_url (/billing?status=success).
export default function StripeCheckoutForm({ onClose }) {
  const containerRef = useRef(null)
  const sessionRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
    if (!window.Stripe) {
      setError('Could not load Stripe. Check your connection or ad blocker and try again.')
      setLoading(false)
      return
    }
    if (!publishableKey) {
      setError('Payments are not configured (missing VITE_STRIPE_PUBLISHABLE_KEY).')
      setLoading(false)
      return
    }

    let cancelled = false
    let form = null
    const stripe = window.Stripe(publishableKey)

    // React dev mode runs this effect twice: reuse one Checkout Session instead of creating two
    if (!sessionRef.current) sessionRef.current = startCheckout().then((data) => data.client_secret)
    const clientSecret = sessionRef.current
    clientSecret.catch((err) => {
      if (!cancelled) {
        setError(getErrorMessage(err, 'Could not start checkout'))
        setLoading(false)
      }
    })

    ;(async () => {
      try {
        const checkout = stripe.initCheckoutFormSdk({ clientSecret, appearance: APPEARANCE })
        form = checkout.createForm({ layout: 'expanded' })
        form.mount(containerRef.current)

        const loadActionsResult = await checkout.loadActions()
        if (cancelled) return
        setLoading(false)
        if (loadActionsResult.type === 'success') {
          form.on('confirm', async (event) => {
            setError('')
            try {
              const result = await loadActionsResult.actions.confirm({ formConfirmEvent: event })
              if (result?.type === 'error') setError(result.error?.message || 'Payment failed')
            } catch (err) {
              console.error('Payment confirmation error:', err)
              setError(err?.message || 'Payment failed. Please try again.')
            }
          })
        } else if (loadActionsResult.error) {
          setError(loadActionsResult.error.message || 'Could not load the payment form')
        }
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, 'Could not load the payment form'))
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
      try { form?.unmount?.() } catch { /* already gone */ }
    }
  }, [])

  return (
    <div className='fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4' onClick={onClose}>
      <div
        className='modal-pop w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white text-[#30313d] shadow-2xl'
        onClick={(e) => e.stopPropagation()}
        role='dialog'
        aria-modal='true'
        aria-label='Upgrade to Premium'
      >
        <div className='flex items-start justify-between gap-4 px-6 pt-6'>
          <div>
            <h2 className='text-xl font-bold text-[#1a1a1a]'>Upgrade to Premium</h2>
            <p className='text-sm text-gray-500 mt-1'>$20 per month · cancel anytime</p>
          </div>
          <button type='button' onClick={onClose} aria-label='Close' className='p-1 text-gray-400 hover:text-gray-700'>
            <X size={22} />
          </button>
        </div>

        <div className='px-6 py-5'>
          {loading && !error && (
            <div className='flex items-center justify-center gap-2 py-10 text-sm text-gray-500'>
              <Loader2 size={18} className='animate-spin' /> Loading secure payment form...
            </div>
          )}
          {error && (
            <p className='mb-4 text-sm text-[#df1b41] bg-red-50 border border-red-200 rounded-lg px-3 py-2'>{error}</p>
          )}
          <div id='checkout-form' ref={containerRef} />
        </div>

        <p className='flex items-center justify-center gap-1.5 pb-5 text-xs text-gray-400'>
          <Lock size={12} /> Payments are processed securely by Stripe
        </p>
      </div>
    </div>
  )
}
