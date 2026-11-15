import { useEffect, useId, useState } from 'react'
import { cn } from '../lib/cn'

/*
 * Placeholder logo in brand colours until public/logo.png is added (brief, section 3).
 * Below about 120px wide only the "L" mark is used, because the thin "AI CONCIERGE"
 * lettering stops being readable.
 */

const LOGO_SRC = `${import.meta.env.BASE_URL}logo.png`

let logoCheck: Promise<boolean> | null = null

/** Checks once per visit whether public/logo.png exists. */
function hasLogoFile(): Promise<boolean> {
  if (!logoCheck) {
    logoCheck = new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img.naturalWidth > 0)
      img.onerror = () => resolve(false)
      img.src = LOGO_SRC
    })
  }
  return logoCheck
}

function useSvgId(name: string) {
  return `${name}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
}

export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  const ring = useSvgId('ring')
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={cn('shrink-0 drop-shadow-[0_0_8px_rgb(0_212_255/0.45)]', className)}
    >
      <defs>
        <linearGradient id={ring} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00D4FF" />
          <stop offset="0.5" stopColor="#2F7BFF" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="31" fill="#050B1F" />
      <circle cx="32" cy="32" r="27" fill="none" stroke={`url(#${ring})`} strokeWidth="4" />
      <path
        d="M26 18v26h14"
        fill="none"
        stroke={`url(#${ring})`}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PlaceholderBadge({ size }: { size: number }) {
  const ring = useSvgId('badge-ring')
  const glow = useSvgId('badge-glow')
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={ring} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00D4FF" />
          <stop offset="0.5" stopColor="#2F7BFF" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
        <radialGradient id={glow} cx="0.5" cy="0.42" r="0.6">
          <stop offset="0" stopColor="#122045" />
          <stop offset="1" stopColor="#050B1F" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="98" fill={`url(#${glow})`} />
      <circle cx="100" cy="100" r="88" fill="none" stroke={`url(#${ring})`} strokeWidth="5" />
      <circle cx="100" cy="100" r="80" fill="none" stroke="#00D4FF" strokeOpacity="0.18" strokeWidth="1.5" />
      <path
        d="M88 46v42h26"
        fill="none"
        stroke={`url(#${ring})`}
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="100"
        y="128"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="'Montserrat Variable', Montserrat, sans-serif"
        fontWeight="800"
        fontSize="25"
        letterSpacing="2"
      >
        LIFELINE
      </text>
      <text
        x="100"
        y="148"
        textAnchor="middle"
        fill="#DCE3F2"
        fontFamily="'Montserrat Variable', Montserrat, sans-serif"
        fontWeight="400"
        fontSize="10.5"
        letterSpacing="3.4"
      >
        AI CONCIERGE
      </text>
    </svg>
  )
}

/** Full badge for sizes of 120px and up. Shows public/logo.png when it exists. */
export function LogoBadge({ size = 200, className }: { size?: number; className?: string }) {
  const [hasFile, setHasFile] = useState(false)

  useEffect(() => {
    let active = true
    void hasLogoFile().then((found) => {
      if (active) setHasFile(found)
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className={cn('relative rounded-full', className)} style={{ width: size, height: size }}>
      {/* A radial gradient instead of a blur filter: same glow, far cheaper on low-end phones. */}
      <div
        aria-hidden="true"
        className="absolute -inset-[18%] rounded-full bg-[radial-gradient(circle,rgb(0_212_255/0.32)_0%,rgb(139_92_246/0.18)_45%,transparent_70%)]"
      />
      <div className="relative">
        {hasFile ? (
          <img src={LOGO_SRC} alt="" width={size} height={size} className="rounded-full" />
        ) : (
          <PlaceholderBadge size={size} />
        )}
      </div>
    </div>
  )
}

/** Mark plus live-text wordmark, used in the header and footer. */
export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <LogoMark size={compact ? 32 : 40} />
      <span className="leading-none">
        <span className="block font-display text-[1.05rem] font-extrabold tracking-[0.14em] text-white">
          LIFELINE
        </span>
        <span className="mt-1 block text-[0.66rem] font-medium tracking-[0.3em] text-mist-300">
          AI CONCIERGE
        </span>
      </span>
    </span>
  )
}
