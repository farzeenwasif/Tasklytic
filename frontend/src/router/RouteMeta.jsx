import { useEffect } from 'react'
import { useLocation } from 'react-router'

const SITE = 'https://tasklytic-blue.vercel.app'

// Public pages that search engines may index. Everything else gets noindex.
const PUBLIC = {
  '/': 'Tasklytic: AI Task Manager, Daily Planner & Finance Tracker',
  '/signup': 'Sign up free | Tasklytic',
  '/login': 'Log in | Tasklytic',
  '/forgot-password': 'Reset your password | Tasklytic',
}

const PRIVATE = {
  '/dashboard': 'Dashboard',
  '/tasks': 'Tasks',
  '/tasks/add': 'Add task',
  '/profile': 'Profile',
  '/billing': 'Billing',
  '/today': 'Plan my day',
  '/finance': 'Finance',
  '/help': 'Help',
}

function setMeta(selector, attr, value, create) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement(create.tag)
    Object.entries(create.attrs).forEach(([k, v]) => el.setAttribute(k, v))
    document.head.appendChild(el)
  }
  el.setAttribute(attr, value)
}

// Sets the title, robots and canonical tags for the current route.
export default function RouteMeta() {
  const { pathname } = useLocation()

  useEffect(() => {
    const isPublic = pathname in PUBLIC
    document.title = isPublic
      ? PUBLIC[pathname]
      : `${PRIVATE[pathname] || 'Tasklytic'} | Tasklytic`

    setMeta('meta[name="robots"]', 'content', isPublic ? 'index, follow' : 'noindex, nofollow', {
      tag: 'meta', attrs: { name: 'robots' },
    })
    setMeta('link[rel="canonical"]', 'href', `${SITE}${pathname === '/' ? '/' : pathname}`, {
      tag: 'link', attrs: { rel: 'canonical' },
    })
  }, [pathname])

  return null
}
