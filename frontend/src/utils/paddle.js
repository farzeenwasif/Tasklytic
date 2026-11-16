// Paddle.js v2: loads the checkout script once and opens Paddle's overlay inside the app.
// Docs: https://developer.paddle.com/paddlejs/overview
import { getCheckoutConfig } from '../services/billingService'

const SCRIPT_URL = 'https://cdn.paddle.com/paddle/v2/paddle.js'

let ready = null // Promise<{ Paddle, config }>
let handlers = null // callbacks of the checkout that is open right now

const loadScript = () =>
  new Promise((resolve, reject) => {
    if (window.Paddle) return resolve(window.Paddle)
    const el = document.createElement('script')
    el.src = SCRIPT_URL
    el.async = true
    el.onload = () => (window.Paddle ? resolve(window.Paddle) : reject(new Error('Paddle did not load')))
    el.onerror = () => reject(new Error('Could not load the payment form. Check your connection or ad blocker and try again.'))
    document.head.appendChild(el)
  })

// Load + initialise once; returns { Paddle, config } (config comes from the server)
export const getPaddle = () => {
  if (!ready) {
    ready = Promise.all([getCheckoutConfig(), loadScript()])
      .then(([config, Paddle]) => {
        if (config.environment === 'sandbox') Paddle.Environment.set('sandbox')
        Paddle.Initialize({
          token: config.clientToken,
          eventCallback: (event) => {
            if (event?.name === 'checkout.completed') handlers?.onCompleted?.(event.data)
            else if (event?.name === 'checkout.closed') {
              const h = handlers
              handlers = null
              h?.onClosed?.()
            } else if (event?.name === 'checkout.error') handlers?.onError?.(event)
          },
        })
        return { Paddle, config }
      })
      .catch((err) => {
        ready = null // allow a retry
        throw err
      })
  }
  return ready
}

// Open the overlay. `options` are Paddle.Checkout.open options (items or transactionId).
// onCompleted(data) gets Paddle's checkout data, e.g. data.transaction_id.
export const openCheckout = async (options, { onCompleted, onClosed, onError } = {}) => {
  const { Paddle } = await getPaddle()
  handlers = { onCompleted, onClosed, onError }
  Paddle.Checkout.open({
    ...options,
    settings: { displayMode: 'overlay', theme: 'dark', allowLogout: false, ...(options.settings || {}) },
  })
}

export const closeCheckout = () => {
  try {
    window.Paddle?.Checkout?.close()
  } catch { /* already closed */ }
}
