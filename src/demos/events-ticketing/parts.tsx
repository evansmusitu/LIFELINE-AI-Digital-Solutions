import { CircleCheck } from 'lucide-react'
import { useMemo } from 'react'
import { cn } from '../../lib/cn'
import { clockTime } from '../../lib/format'
import { Badge } from '../ui'
import { SCAN_LOOK } from './looks'
import { darkRuns, encodeQr } from './qr'
import type { ScanKind } from './types'

/** A scannable QR code: black modules on white with the standard 4-module quiet zone. */
export function QrSvg({ value, label, target = 232, className }: { value: string; label: string; target?: number; className?: string }) {
  const { size, runs } = useMemo(() => {
    const code = encodeQr(value)
    return { size: code.size + 8, runs: darkRuns(code.modules) }
  }, [value])
  // Whole pixels per module keep every module the same width, which helps phone cameras.
  const px = Math.max(4, Math.floor(target / size)) * size
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={px}
      height={px}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className={cn('block h-auto max-w-full bg-white', className)}
    >
      <rect width={size} height={size} fill="#ffffff" />
      {runs.map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x + 4} y={r.y + 4} width={r.w} height={1} fill="#000000" />
      ))}
    </svg>
  )
}

export function ScanBadge({ kind, override }: { kind: ScanKind; override?: boolean }) {
  const look = SCAN_LOOK[kind]
  return (
    <Badge tone={override ? 'green' : look.tone} icon={override ? CircleCheck : look.icon}>
      {override ? 'Let in, wrong gate' : look.label}
    </Badge>
  )
}

export function Meter({ value, max, label, muted }: { value: number; max: number; label: string; muted?: boolean }) {
  const width = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="h-2 overflow-hidden rounded-full bg-slate-100"
    >
      <div className={cn('h-full rounded-full', muted ? 'bg-slate-400' : 'bg-(--accent)')} style={{ width: `${width}%` }} />
    </div>
  )
}

/** Bars per 15 minutes, labelled on the hour only so 12 bars fit on a 320 px phone. */
export function SlotChart({ data, label }: { data: { at: number; value: number; current?: boolean }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <figure>
      <figcaption className="sr-only">{label}</figcaption>
      <ul className="flex h-40 items-end gap-1 sm:gap-1.5">
        {data.map((d) => {
          const time = clockTime(d.at)
          return (
            <li key={d.at} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
              <span className="sr-only">
                {time}
                {d.current ? ' (now)' : ''}: {d.value} arrivals
              </span>
              <span aria-hidden="true" className="text-[0.6rem] leading-none text-slate-600 tabular-nums">
                {d.current ? d.value : ''}
              </span>
              <span
                aria-hidden="true"
                title={`${time}: ${d.value}`}
                className={cn(
                  'w-full rounded-t-md',
                  d.current ? 'bg-(--accent-soft) ring-1 ring-(--accent) ring-inset' : 'bg-(--accent)',
                )}
                style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }}
              />
              <span aria-hidden="true" className="h-3 text-[0.65rem] leading-3 whitespace-nowrap text-slate-600 tabular-nums">
                {new Date(d.at).getMinutes() === 0 ? time : ''}
              </span>
            </li>
          )
        })}
      </ul>
    </figure>
  )
}

/** Msasa tree, evening sun and stage lights. Decorative. */
export function HeroArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 170" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="msf-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#450a0a" />
          <stop offset="0.55" stopColor="#991b1b" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <rect width="320" height="170" fill="url(#msf-sky)" />
      <circle cx="226" cy="112" r="38" fill="#fcd34d" opacity="0.85" />
      <circle cx="226" cy="112" r="52" fill="#fcd34d" opacity="0.18" />
      <g fill="#fff7ed" opacity="0.22">
        <polygon points="196,52 164,140 186,140" />
        <polygon points="236,48 222,140 248,140" />
        <polygon points="276,52 266,140 292,140" />
      </g>
      <g fill="#fef3c7">
        <circle cx="196" cy="52" r="3" />
        <circle cx="236" cy="48" r="3" />
        <circle cx="276" cy="52" r="3" />
      </g>
      <rect x="182" y="46" width="108" height="3" fill="#1f0707" />
      <rect x="160" y="128" width="150" height="16" rx="2" fill="#1f0707" />
      <path d="M0 146 Q70 134 150 142 T320 138 V170 H0 Z" fill="#1f0707" />
      <g fill="#1f0707">
        <path d="M78 146 C80 124 74 108 64 96 L70 94 C78 104 82 112 84 120 C88 108 96 98 108 90 L112 94 C100 104 92 118 90 146 Z" />
        <ellipse cx="60" cy="88" rx="38" ry="12" />
        <ellipse cx="96" cy="80" rx="44" ry="13" />
        <ellipse cx="128" cy="90" rx="30" ry="10" />
        <ellipse cx="80" cy="72" rx="30" ry="9" />
      </g>
      <g fill="#fef3c7" opacity="0.8">
        <circle cx="30" cy="30" r="1.2" />
        <circle cx="120" cy="22" r="1" />
        <circle cx="160" cy="38" r="1.2" />
        <circle cx="300" cy="20" r="1" />
      </g>
    </svg>
  )
}
