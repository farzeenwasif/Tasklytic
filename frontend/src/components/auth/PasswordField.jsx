import { useState } from 'react'
import { Check, Eye, EyeOff, X } from 'lucide-react'
import { authInputClass } from './AuthShell'
import { PASSWORD_RULES, STRENGTH_LABELS, passwordStrength } from '../../utils/password'

const STRENGTH_COLORS = ['', 'bg-red-500', 'bg-amber-400', 'bg-lime-400', 'bg-green-500']

// Password input with show/hide toggle. With showRules it also renders
// a strength meter and the live rule checklist.
export default function PasswordField({
  value,
  onChange,
  name = 'password',
  placeholder = 'Password',
  autoComplete = 'new-password',
  showRules = false,
}) {
  const [visible, setVisible] = useState(false)
  const strength = passwordStrength(value)

  return (
    <div>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={72}
          required
          className={`${authInputClass} pr-11`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-white"
          aria-label={visible ? 'Hide password' : 'Show password'}
          title={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {showRules && (
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-colors ${i <= strength ? STRENGTH_COLORS[strength] : 'bg-white/10'}`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-400 w-12 text-right">{STRENGTH_LABELS[strength]}</span>
          </div>
          <ul className="mt-3 space-y-1">
            {PASSWORD_RULES.map((rule) => {
              const ok = rule.test(value)
              return (
                <li key={rule.id} className={`flex items-center gap-2 text-xs ${ok ? 'text-green-400' : 'text-gray-400'}`}>
                  {ok ? <Check size={14} /> : <X size={14} />} {rule.label}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
