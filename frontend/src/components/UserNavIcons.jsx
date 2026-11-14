import { useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Sparkles } from 'lucide-react'
import { UserContext } from '../context/UserContext'

export default function UserNavIcons() {
  const { user, logout, isPremium } = useContext(UserContext)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  if (!user) return null

  return (
    <div className="flex items-center gap-4">
      {isPremium ? (
        <Link
          to="/billing"
          title="Premium plan"
          className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-400/15 text-emerald-300 border border-emerald-400/40"
        >
          <Sparkles size={12} /> PRO
        </Link>
      ) : (
        <Link
          to="/billing"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white text-[#0b0b0c] hover:bg-zinc-200 transition-colors"
        >
          <Sparkles size={13} /> Upgrade
        </Link>
      )}
      <div
        onClick={() => navigate('/profile')}
        className="flex items-center gap-3 cursor-pointer"
        title="My profile"
      >
        <img
          src={user.avatar}
          alt={user.name}
          className="w-9 h-9 rounded-full border-2 border-gray-700 object-cover"
        />
        <p className="text-white font-bold text-lg hidden sm:block">{user.name}</p>
      </div>
      <button
        onClick={handleLogout}
        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
        title="Logout"
      >
        <LogOut size={18} />
      </button>
    </div>
  )
}
