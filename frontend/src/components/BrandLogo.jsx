import { useId } from 'react'

export const BRAND_NAME = 'Tasklytic'

// Logo mark: rising bars (hours analytics) crowned by a check (tasks done)
export function LogoMark({ size = 36, className = '' }) {
  const id = useId()
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#D4D4D8" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="11" fill={`url(#${id}-bg)`} />
      <rect x="9" y="23" width="5" height="9" rx="2" fill="#0B0B0C" />
      <rect x="17.5" y="18" width="5" height="14" rx="2" fill="#0B0B0C" />
      <rect x="26" y="21" width="5" height="11" rx="2" fill="#0B0B0C" opacity="0.35" />
      <path
        d="M10 14.5l4.5 4L30 8"
        stroke="#10B981"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Mark + wordmark
export default function BrandLogo({ size = 36, showName = true, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      {showName && (
        <span className="font-extrabold tracking-tight text-white text-xl">
          Task<span className="text-zinc-400">lytic</span>
        </span>
      )}
    </span>
  )
}
