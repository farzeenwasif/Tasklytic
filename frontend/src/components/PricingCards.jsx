import { Check, Sparkles } from 'lucide-react'
import { PLANS } from '../constants/plans'

// Free vs Premium side by side. `renderAction(plan)` returns the button/link for each card.
export default function PricingCards({ renderAction, currentPlan }) {
  return (
    <div className='grid gap-5 md:grid-cols-2 max-w-4xl mx-auto'>
      {PLANS.map((plan) => {
        const premium = plan.id === 'premium'
        const current = currentPlan === plan.id
        return (
          <div
            key={plan.id}
            className={`relative rounded-3xl p-6 sm:p-8 flex flex-col border ${
              premium
                ? 'bg-gradient-to-b from-emerald-500/[0.12] to-white/[0.03] border-emerald-400/40 shadow-[0_20px_60px_-20px_rgba(16,185,129,0.45)]'
                : 'bg-white/[0.04] border-white/10'
            }`}
          >
            {premium && (
              <span className='absolute -top-3 left-6 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-400 text-[#0b0b0c]'>
                <Sparkles size={12} /> AI powered
              </span>
            )}
            <div className='flex items-center justify-between gap-3'>
              <h3 className='text-xl font-bold text-white'>{plan.name}</h3>
              {current && (
                <span className='text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-gray-200 border border-white/10'>
                  Current plan
                </span>
              )}
            </div>
            <p className='mt-1 text-sm text-gray-400'>{plan.tagline}</p>
            <p className='mt-6 flex items-end gap-2'>
              <span className='text-5xl font-extrabold text-white'>{plan.price}</span>
              <span className='text-sm text-gray-400 mb-1.5'>{plan.period}</span>
            </p>
            <ul className='mt-6 space-y-3 flex-1'>
              {plan.features.map((f) => (
                <li key={f} className='flex items-start gap-3 text-sm text-gray-200'>
                  <span className={`mt-0.5 w-5 h-5 shrink-0 rounded-full flex items-center justify-center ${premium ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/10 text-gray-300'}`}>
                    <Check size={12} strokeWidth={3} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <div className='mt-8'>{renderAction(plan)}</div>
          </div>
        )
      })}
    </div>
  )
}
