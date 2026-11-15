import { ClipboardList, Container, Drill, FlaskConical, MessageCircle, Phone, Sun, Wrench, Zap, type LucideIcon } from 'lucide-react'
import { useId } from 'react'
import { Badge, type Tone } from '../ui'
import type { EnquirySource, EnquiryStatus, ServiceIcon } from './types'

/* Drawings for the two mock websites, and small badges for the team screens. */

function useSvgId(name: string) {
  return `${name}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
}

const SERVICE_ICONS: Record<ServiceIcon, LucideIcon> = {
  drill: Drill,
  sun: Sun,
  zap: Zap,
  tank: Container,
  flask: FlaskConical,
  wrench: Wrench,
}

export function ServiceGlyph({ icon, className = 'size-5' }: { icon: ServiceIcon; className?: string }) {
  const Icon = SERVICE_ICONS[icon]
  return <Icon className={className} aria-hidden="true" />
}

const STATUS_TONE: Record<EnquiryStatus, Tone> = { New: 'blue', Contacted: 'amber', 'Survey booked': 'violet', Quoted: 'green' }

export function StatusBadge({ status }: { status: EnquiryStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{status}</Badge>
}

const SOURCE_ICON: Record<EnquirySource, LucideIcon> = { Form: ClipboardList, 'WhatsApp button': MessageCircle, 'Call button': Phone }

export function SourceLabel({ source }: { source: EnquirySource }) {
  const Icon = SOURCE_ICON[source]
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="size-3.5" aria-hidden="true" />
      {source}
    </span>
  )
}

/** The new logo: a kopje (a small rocky hill) with a drop of water. */
export function SiteLogoMark({ className = 'size-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="11" className="fill-(--site-accent)" />
      <path d="M5 31c3-6 6-9 9-9 2 0 3 1 4 2 2-4 5-6 8-6 4 0 7 4 9 13Z" fill="#fff" opacity="0.3" />
      <path d="M20 7c0 0-7 8.5-7 13.2a7 7 0 0 0 14 0C27 15.5 20 7 20 7Z" fill="#fff" />
      <path d="M17 21.5a3.4 3.4 0 0 0 3 3.3" stroke="var(--site-accent)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  )
}

/** Hero drawing on the new site: a rig drilling, a tank on a stand and a solar panel. */
export function HeroScene({ className }: { className?: string }) {
  const sky = useSvgId('sky')
  const ground = useSvgId('ground')
  return (
    <svg viewBox="0 0 480 340" className={className} role="img" aria-label="A drilling rig beside a water tank on a stand and a solar panel">
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dff3fb" />
          <stop offset="1" stopColor="#fdf6e9" />
        </linearGradient>
        <linearGradient id={ground} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ead9ab" />
          <stop offset="1" stopColor="#d7bb7e" />
        </linearGradient>
      </defs>
      <rect width="480" height="340" rx="24" fill={`url(#${sky})`} />
      <circle cx="398" cy="66" r="28" fill="#fcd34d" />
      <circle cx="398" cy="66" r="40" fill="#fcd34d" opacity="0.25" />
      {/* The kopje */}
      <g fill="#cbb89a">
        <ellipse cx="88" cy="214" rx="84" ry="38" />
        <ellipse cx="58" cy="184" rx="34" ry="25" />
        <ellipse cx="114" cy="176" rx="40" ry="30" />
        <ellipse cx="90" cy="146" rx="26" ry="19" />
      </g>
      <g fill="#b6a284">
        <ellipse cx="128" cy="186" rx="16" ry="10" />
        <ellipse cx="66" cy="196" rx="14" ry="8" />
        <ellipse cx="98" cy="152" rx="10" ry="6" />
      </g>
      <path d="M316 214v-30" stroke="#7c6a4f" strokeWidth="4" strokeLinecap="round" />
      <path d="M316 194l-14-10M316 190l12-9" stroke="#7c6a4f" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="316" cy="180" rx="36" ry="9" fill="#8f9f5e" />
      <path d="M0 232Q120 212 240 224T480 220V316a24 24 0 0 1-24 24H24a24 24 0 0 1-24-24Z" fill={`url(#${ground})`} />
      {/* Drilling rig */}
      <g className="stroke-(--site-accent-ink)" strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M110 248V94M138 248V94" />
        <path d="M110 230l28-22-28-22 28-22-28-22 28-22-28-22" strokeWidth="2.5" />
      </g>
      <rect x="102" y="84" width="44" height="12" rx="3" fill="#334155" />
      <path d="M124 96v206" stroke="#475569" strokeWidth="4" />
      <rect x="62" y="246" width="160" height="24" rx="5" className="fill-(--site-accent-strong)" />
      <path d="M222 270v-36h28l16 20v16Z" className="fill-(--site-accent)" />
      <path d="M229 241h18l10 12h-28Z" fill="#e0f2fe" />
      {[92, 128, 244].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="274" r="12" fill="#1f2937" />
          <circle cx={cx} cy="274" r="4.5" fill="#9ca3af" />
        </g>
      ))}
      <ellipse cx="124" cy="304" rx="20" ry="5" fill="#a9895a" />
      {/* Solar panel */}
      <path d="M268 296v-72" stroke="#475569" strokeWidth="4" />
      <path d="M232 194l66-12 9 40-66 12Z" fill="#1e3a8a" />
      <path d="M254 190l9 40M276 186l9 40M236 214l67-12" stroke="#93c5fd" strokeWidth="1.5" opacity="0.7" />
      {/* Tank on a stand */}
      <g stroke="#475569" strokeWidth="5" strokeLinecap="round">
        <path d="M344 298l10-112M420 298l-10-112" />
        <path d="M348 260l66-30M348 230l66 30" strokeWidth="3" />
      </g>
      <rect x="342" y="178" width="80" height="9" rx="2" fill="#334155" />
      <rect x="348" y="110" width="68" height="70" rx="13" className="fill-(--site-accent-ink)" />
      <path d="M350 132h64M350 156h64" stroke="#fff" strokeWidth="2" opacity="0.25" />
      <rect x="370" y="102" width="24" height="10" rx="3" fill="#1f2937" />
      <path d="M382 187v100h56" stroke="#64748b" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M146 300h196" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
      {/* Water */}
      {[
        [446, 300, 1],
        [462, 284, 0.7],
        [432, 278, 0.55],
      ].map(([x, y, s]) => (
        <path
          key={x}
          d={`M${x} ${y - 16 * s}c0 0-${9 * s} ${10 * s}-${9 * s} ${15 * s}a${9 * s} ${9 * s} 0 0 0 ${18 * s} 0c0-${5 * s}-${9 * s}-${15 * s}-${9 * s}-${15 * s}Z`}
          className="fill-(--site-accent)"
        />
      ))}
      <path d="M20 318q4-10 8 0M190 324q4-10 8 0M300 322q4-10 8 0M40 300q3-8 6 0" stroke="#8f9f5e" strokeWidth="2" fill="none" />
    </svg>
  )
}

/** The old site's slideshow "photo": a dusky, grainy shot of a rig, the kind of image that made the page heavy. */
export function OldSlide({ className }: { className?: string }) {
  const sky = useSvgId('oldsky')
  const grain = useSvgId('grain')
  return (
    <svg viewBox="0 0 960 320" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2b366" />
          <stop offset="0.55" stopColor="#c9653f" />
          <stop offset="1" stopColor="#5a3423" />
        </linearGradient>
        <filter id={grain}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.18" />
          </feComponentTransfer>
        </filter>
      </defs>
      <rect width="960" height="320" fill={`url(#${sky})`} />
      <circle cx="690" cy="214" r="58" fill="#ffd486" opacity="0.85" />
      <path d="M0 252Q160 226 330 244T660 236 960 246V320H0Z" fill="#2c1c13" />
      <g fill="none" stroke="#1b110b" strokeWidth="7">
        <path d="M262 250V58M296 250V58" />
        <path d="M262 226l34-26-34-26 34-26-34-26 34-26-34-26" strokeWidth="4" />
      </g>
      <rect x="200" y="238" width="190" height="30" fill="#1b110b" />
      <path d="M390 268v-40h32l20 22v18Z" fill="#1b110b" />
      <path d="M820 252v-58" stroke="#1b110b" strokeWidth="9" />
      <path d="M820 214l-30-26M820 206l26-24" stroke="#1b110b" strokeWidth="6" />
      <ellipse cx="814" cy="182" rx="84" ry="16" fill="#1b110b" />
      <ellipse cx="770" cy="176" rx="34" ry="10" fill="#1b110b" />
      <rect width="960" height="320" filter={`url(#${grain})`} />
    </svg>
  )
}
