import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import AuthShell, { authButtonClass, authInputClass } from '../components/auth/AuthShell'
import { forgotPassword } from '../services/authService'
import { getErrorMessage } from '../utils/apiClient'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not send the reset link'))
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthShell
        title="Check your email"
        footer={<Link to="/login" className="text-[#34D399] hover:underline">Back to login</Link>}
      >
        <div className="flex flex-col items-center text-center">
          <span className="w-14 h-14 rounded-full bg-[#10B981]/15 text-[#34D399] flex items-center justify-center mb-4">
            <MailCheck size={26} />
          </span>
          <p className="text-sm text-gray-300 leading-relaxed">
            If an account exists for <span className="text-white font-medium break-all">{email}</span>, we&apos;ve sent a
            link to reset your password. It is valid for 15 minutes.
          </p>
          <p className="text-xs text-gray-500 mt-3">Didn&apos;t get it? Check your spam folder, or try again in a minute.</p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a secure reset link."
      footer={<Link to="/login" className="text-[#34D399] hover:underline">Back to login</Link>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={authInputClass}
        />
        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
      </form>
    </AuthShell>
  )
}
