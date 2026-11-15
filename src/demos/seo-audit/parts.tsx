import { CircleCheck, CircleX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '../../lib/cn'
import { Badge } from '../ui'
import { scoreLabel } from './engine'
import type { Impact } from './types'

const RING_RADIUS = 52
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

/** Fills up to the score when it first appears. Key it by audit so each new audit fills again. */
export function ScoreRing({ score, className }: { score: number; className?: string }) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    // A short delay so the browser paints the empty ring first and the transition runs.
    const timer = window.setTimeout(() => setShown(score), 60)
    return () => window.clearTimeout(timer)
  }, [score])
  const value = Math.max(0, Math.min(100, shown))
  return (
    <div className={cn('relative size-36 shrink-0', className)}>
      <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={RING_RADIUS} fill="none" strokeWidth="10" className="stroke-slate-200" />
        <circle
          cx="60"
          cy="60"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH * (1 - value / 100)}
          className="stroke-(--accent) motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <p>
          <span className="block text-4xl font-bold tracking-tight text-slate-900 tabular-nums">{score}</span>
          <span className="block text-xs text-slate-600">out of 100</span>
        </p>
      </div>
    </div>
  )
}

export function ScoreBadge({ score }: { score: number }) {
  const label = scoreLabel(score)
  return <Badge tone={label === 'Excellent' ? 'green' : label === 'Good' ? 'blue' : 'amber'}>{label}</Badge>
}

export function ImpactBadge({ impact }: { impact: Impact }) {
  if (impact === 'high') return <Badge tone="red">High impact</Badge>
  if (impact === 'medium') return <Badge tone="amber">Medium impact</Badge>
  return <Badge tone="neutral">Low impact</Badge>
}

export function CheckRow({ pass, label }: { pass: boolean; label: string }) {
  const Icon = pass ? CircleCheck : CircleX
  return (
    <li className="flex items-center gap-2 text-sm">
      <Icon className={cn('size-4 shrink-0', pass ? 'text-emerald-700' : 'text-red-700')} aria-hidden="true" />
      <span className={pass ? 'text-slate-800' : 'text-slate-900'}>{label}</span>
      <span className="sr-only">{pass ? ': passed' : ': not yet'}</span>
    </li>
  )
}

/** Weekly positions as a small line. Higher on the chart is a better position. */
export function Sparkline({ history, className }: { history: (number | null)[]; className?: string }) {
  const width = 84
  const height = 26
  const step = width / Math.max(1, history.length - 1)
  const y = (p: number | null) => (p === null ? height - 1 : 1 + ((Math.min(50, p) - 1) / 49) * (height - 2))
  const points = history.map((p, i) => `${(i * step).toFixed(1)},${y(p).toFixed(1)}`).join(' ')
  const last = history[history.length - 1] ?? null
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn('h-[26px] w-[84px] shrink-0 overflow-visible', className)} aria-hidden="true">
      <line x1="0" x2={width} y1={height - 1} y2={height - 1} className="stroke-slate-200" strokeWidth="1" />
      <polyline points={points} fill="none" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" className="stroke-(--accent)" />
      {last !== null && <circle cx={width} cy={y(last)} r="2.5" className="fill-(--accent)" />}
    </svg>
  )
}
