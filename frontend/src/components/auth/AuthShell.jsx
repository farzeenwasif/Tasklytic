import { Link } from 'react-router-dom'
import BrandLogo from '../BrandLogo'
import '../../App.css'

// Shared frame for login / signup / password pages
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="p-4 sm:p-5 bg-img w-full min-h-dvh overflow-y-auto text-white flex justify-center items-center">
      <div className="relative z-10 glass-panel p-6 sm:p-8 rounded-2xl w-full max-w-[420px] page-enter">
        <Link to="/" className="flex justify-center mb-5" title="Home">
          <BrandLogo size={34} />
        </Link>
        {title && <h2 className="text-2xl font-bold mb-2 text-center">{title}</h2>}
        {subtitle && <p className="text-sm text-gray-400 mb-6 text-center">{subtitle}</p>}
        {children}
        {footer && <div className="text-sm text-gray-400 mt-6 text-center">{footer}</div>}
      </div>
    </div>
  )
}

export const authInputClass = 'glass-input w-full px-4 py-2.5 rounded-lg'

export const authButtonClass = 'btn-primary w-full py-2.5'
