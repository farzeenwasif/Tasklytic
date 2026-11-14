import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { UserContext } from '../context/UserContext'

export default function UserNavIcons() {
  const { user, logout } = useContext(UserContext)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  if (!user) return null

  return (
    <div className="flex items-center gap-4">
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
