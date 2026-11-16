import { useContext, useEffect, useState } from 'react'
import { UserContext } from '../context/UserContext'
import { listClients } from '../services/financeService'

// The user's freelance clients (Premium), shared by every screen that needs them.
// Call refreshClients() after adding or changing one.
let cache = null
let cacheUser = null
let pending = null
const listeners = new Set()

export const refreshClients = async () => {
  pending = listClients()
  try {
    cache = await pending
  } finally {
    pending = null
  }
  listeners.forEach((fn) => fn(cache))
  return cache
}

export default function useClients() {
  const { isPremium, user } = useContext(UserContext)
  // a different account must not see the previous one's clients
  if (cacheUser !== user?.id) {
    cache = null
    cacheUser = user?.id
  }
  const [clients, setClients] = useState(cache || [])

  useEffect(() => {
    if (!isPremium) return undefined
    listeners.add(setClients)
    if (cache) setClients(cache)
    else if (!pending) refreshClients().catch(() => {})
    return () => listeners.delete(setClients)
  }, [isPremium, user?.id])

  return isPremium ? clients : []
}
