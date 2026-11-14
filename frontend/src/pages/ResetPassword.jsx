import { useContext, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import AuthShell, { authButtonClass } from '../components/auth/AuthShell'
import PasswordField from '../components/auth/PasswordField'
import { UserContext } from '../context/UserContext'
import { checkResetToken, resetPassword } from '../services/authService'
import { getErrorMessage } from '../utils/apiClient'
import { isPasswordValid } from '../utils/password'

export default function ResetPassword() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { logout } = useContext(UserContext)

  // 'checking' | 'valid' | 'invalid'
  const [linkState, setLinkState] = useState('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Check the link before showing the form
  useEffect(() => {
    let cancelled = false
    checkResetToken(token)
      .then(() => !cancelled && setLinkState('valid'))
      .catch(() => !cancelled && setLinkState('invalid'))
    return () => {
      cancelled = true
    }
  }, [token])

  const mismatch = confirm.length > 0 && password !== confirm
  const canSubmit = isPasswordValid(password) && password === confirm && !loading

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError('')
    try {
      await resetPassword(token, password)
      logout() // the old session is no longer valid
      navigate('/login', {
        replace: true,
        state: { notice: 'Password updated. Please log in with your new password.' },
      })
    } catch (err) {
      setError(getErrorMessage(err, 'Could not reset the password'))
      setLoading(false)
    }
  }

  if (linkState === 'checking') {
    return (
      <AuthShell title="Reset password">
        <p className="text-sm text-gray-400 text-center">Checking your link...</p>
      </AuthShell>
    )
  }

  if (linkState === 'invalid') {
    return (
      <AuthShell
        title="Link expired"
        footer={<Link to="/login" className="text-[#34D399] hover:underline">Back to login</Link>}
      >
        <div className="flex flex-col items-center text-center">
          <span className="w-14 h-14 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center mb-4">
            <ShieldAlert size={26} />
          </span>
          <p className="text-sm text-gray-300 leading-relaxed">
            This reset link is invalid, has expired, or was already used. Reset links work once and last 15 minutes.
          </p>
          <Link to="/forgot-password" className={`${authButtonClass} mt-6 block text-center`}>
            Request a new link
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Choose a new password" subtitle="You will be logged out on all devices after the change.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-400 text-sm">{error}</p>}

        <PasswordField
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          showRules
        />

        <div>
          <PasswordField
            name="confirmPassword"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
          />
          {mismatch && <p className="text-red-400 text-xs mt-1.5">Passwords do not match</p>}
        </div>

        <button type="submit" disabled={!canSubmit} className={authButtonClass}>
          {loading ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </AuthShell>
  )
}
