import { useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CreditCard, Loader2, Lock, X } from 'lucide-react'
import { UserContext } from '../context/UserContext'
import { startCardSetup } from '../services/billingService'
import { getErrorMessage } from '../utils/apiClient'

const APPEARANCE = {
  theme: 'stripe',
  variables: {
    borderRadius: '4px',
    colorBackground: '#ffffff',
    colorDanger: '#df1b41',
    colorPrimary: '#0570de',
    colorText: '#30313d',
    fontSizeBase: '16px',
    spacingUnit: '4px',
  },
}

// In-app card update (Stripe Payment Element + SetupIntent). Nothing is charged,
// except a failed renewal is retried on the new card. onDone({ card, paymentRetry }).
export default function UpdateCardModal({ onClose, onDone }) {
  const { saveCard } = useContext(UserContext)
  const containerRef = useRef(null)
  const stripeRef = useRef(null)
  const elementsRef = useRef(null)
  const setupRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
    if (!window.Stripe || !publishableKey) {
      setError(!window.Stripe
        ? 'Could not load Stripe. Check your connection or ad blocker and try again.'
        : 'Payments are not configured (missing VITE_STRIPE_PUBLISHABLE_KEY).')
      setLoading(false)
      return
    }

    let cancelled = false
    let element = null
    // React dev mode runs this effect twice: reuse one SetupIntent
    if (!setupRef.current) setupRef.current = startCardSetup().then((d) => d.client_secret)

    setupRef.current
      .then((clientSecret) => {
        if (cancelled) return
        const stripe = window.Stripe(publishableKey)
        const elements = stripe.elements({ clientSecret, appearance: APPEARANCE })
        element = elements.create('payment', { layout: 'tabs' })
        element.mount(containerRef.current)
        element.on('ready', () => !cancelled && setLoading(false))
        stripeRef.current = stripe
        elementsRef.current = elements
      })
      .catch((err) => {
        if (cancelled) return
        setError(getErrorMessage(err, 'Could not open the card form'))
        setLoading(false)
      })

    return () => {
      cancelled = true
      try { element?.destroy() } catch { /* already gone */ }
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stripeRef.current || !elementsRef.current) return
    setSaving(true)
    setError('')
    try {
      const { error: stripeError, setupIntent } = await stripeRef.current.confirmSetup({
        elements: elementsRef.current,
        redirect: 'if_required',
        confirmParams: { return_url: `${window.location.origin}/profile#subscription` },
      })
      if (stripeError) {
        setError(stripeError.message || 'The card could not be saved')
        return
      }
      const result = await saveCard(setupIntent.id)
      onDone?.(result)
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'The card could not be saved'))
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className='fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4' onClick={saving ? undefined : onClose}>
      <form
        onSubmit={handleSubmit}
        className='modal-pop w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white text-[#30313d] shadow-2xl'
        onClick={(e) => e.stopPropagation()}
        role='dialog'
        aria-modal='true'
        aria-label='Update card'
      >
        <div className='flex items-start justify-between gap-4 px-6 pt-6'>
          <div>
            <h2 className='text-xl font-bold text-[#1a1a1a] flex items-center gap-2'>
              <CreditCard size={20} /> Update card
            </h2>
            <p className='text-sm text-gray-500 mt-1'>Used for your $20/month Premium renewals. You are not charged now.</p>
          </div>
          <button type='button' onClick={onClose} disabled={saving} aria-label='Close' className='p-1 text-gray-400 hover:text-gray-700'>
            <X size={22} />
          </button>
        </div>

        <div className='px-6 py-5'>
          {loading && !error && (
            <div className='flex items-center justify-center gap-2 py-10 text-sm text-gray-500'>
              <Loader2 size={18} className='animate-spin' /> Loading secure card form...
            </div>
          )}
          {error && (
            <p className='mb-4 text-sm text-[#df1b41] bg-red-50 border border-red-200 rounded-lg px-3 py-2'>{error}</p>
          )}
          <div ref={containerRef} />
          <button
            type='submit'
            disabled={loading || saving || !elementsRef.current}
            className='mt-5 w-full rounded-md bg-[#0570de] hover:bg-[#0461c4] text-white font-semibold py-3 inline-flex items-center justify-center gap-2 disabled:opacity-60'
          >
            {saving && <Loader2 size={16} className='animate-spin' />} {saving ? 'Saving card...' : 'Save card'}
          </button>
        </div>

        <p className='flex items-center justify-center gap-1.5 pb-5 text-xs text-gray-400'>
          <Lock size={12} /> Card details go straight to Stripe, never to our servers
        </p>
      </form>
    </div>,
    document.body
  )
}
