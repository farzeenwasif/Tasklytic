import { useContext } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { UserContext } from '../context/UserContext'

function FullScreenMessage({ children }) {
  return (
    <div className='bg-img w-full h-screen text-white flex justify-center items-center'>
      <p className='z-10 text-lg'>{children}</p>
    </div>
  )
}

// Only logged-in users can see these routes
export function ProtectedRoute() {
  const { user, authLoading } = useContext(UserContext)
  const location = useLocation()

  if (authLoading) return <FullScreenMessage>Loading...</FullScreenMessage>
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

// Login/Signup: redirect away if already logged in
export function PublicOnlyRoute() {
  const { user, authLoading } = useContext(UserContext)

  if (authLoading) return <FullScreenMessage>Loading...</FullScreenMessage>
  if (user) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
