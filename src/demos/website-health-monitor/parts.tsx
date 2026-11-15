import { CircleCheck, CircleX, LoaderCircle, TriangleAlert } from 'lucide-react'
import { WhatsAppIcon } from '../../components/WhatsAppIcon'
import { cn } from '../../lib/cn'
import { Badge, type Tone } from '../ui'
import { REGIONS } from './data'
import { scoreLabel, type HourPoint } from './engine'
import type { Region, Severity, SiteStatus } from './types'

/** Score out of 100 as a ring, with the number and a word in the middle so colour isn't the only signal. */
export function ScoreRing({ score, label, size = 'md' }: { score: number; label: string; size?: 'sm' | 'md' }) {
  const verdict = scoreLabel(score)
  const r = 42
  const length = 2 * Math.PI * r
  const stroke = { green: 'stroke-emerald-600', amber: 'stroke-amber-600', red: 'stroke-red-600' }[verdict.tone]
  return (
    <div
      role="img"
      aria-label={`${label}: ${score} out of 100, ${verdict.label.toLowerCase()}`}
      className="flex shrink-0 flex-col items-center gap-1.5"
    >
      <div className={cn('relative', size === 'sm' ? 'size-24' : 'size-32')}>
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r={r} strokeWidth="10" className="fill-none stroke-slate-100" />
          <circle
            cx="50"
            cy="50"
            r={r}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={length}
            strokeDashoffset={length * (1 - Math.min(100, Math.max(0, score)) / 100)}
            className={cn('fill-none motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700', stroke)}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-center" aria-hidden="true">
          <span>
            <span className={cn('block font-bold text-slate-900 tabular-nums', size === 'sm' ? 'text-2xl' : 'text-3xl')}>
              {score}
            </span>
            <span className="block text-[0.65rem] font-medium text-slate-600">out of 100</span>
          </span>
        </span>
      </div>
      <Badge tone={verdict.tone}>{verdict.label}</Badge>
    </div>
  )
}

/** Lets a long button label wrap on a 320 px phone instead of overflowing, while staying at least 40 px tall. */
export const wrapButton = 'h-auto! min-h-10 py-2 text-center whitespace-normal!'

const STATUS: Record<SiteStatus, { tone: Tone; label: string; icon: typeof CircleCheck }> = {
  up: { tone: 'green', label: 'Up', icon: CircleCheck },
  checking: { tone: 'amber', label: 'Not responding', icon: TriangleAlert },
  down: { tone: 'red', label: 'Down', icon: CircleX },
}

export function StatusBadge({ status }: { status: SiteStatus }) {
  const s = STATUS[status]
  return (
    <Badge tone={s.tone} icon={s.icon}>
      {s.label}
    </Badge>
  )
}

/** The four places the monitor checks from, each with its own result. */
export function RegionPills({ down }: { down: Region[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Checks from 4 places">
      {REGIONS.map((region) => {
        const isDown = down.includes(region)
        return (
          <li key={region}>
            <Badge tone={isDown ? 'red' : 'green'} icon={isDown ? CircleX : CircleCheck}>
              {region} · {isDown ? 'down' : 'up'}
            </Badge>
          </li>
        )
      })}
    </ul>
  )
}

const SEVERITY_TONE: Record<Severity, Tone> = { High: 'red', Medium: 'amber', Low: 'blue' }

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Badge tone={SEVERITY_TONE[severity]}>{severity}</Badge>
}

/** 24 hourly bars. BarChart's label under every bar doesn't fit 24 bars on a phone, so this labels every 6 hours. */
export function HourlyChart({ points, label }: { points: HourPoint[]; label: string }) {
  const max = 700
  return (
    <figure>
      <figcaption className="sr-only">{label}</figcaption>
      <ul className="sr-only">
        {points.map((p) => (
          <li key={p.hour}>
            {p.current ? 'This hour' : `${p.label}:00`}: {p.value} ms
          </li>
        ))}
      </ul>
      <div className="flex h-40 items-end gap-px border-b border-slate-200 sm:gap-1" aria-hidden="true">
        {points.map((p) => (
          <span
            key={p.hour}
            title={`${p.label}:00 · ${p.value} ms`}
            className={cn('min-w-0 flex-1 rounded-t-sm', p.current ? 'bg-(--accent-strong)' : 'bg-(--accent)/75')}
            style={{ height: `${(p.value / max) * 100}%` }}
          />
        ))}
      </div>
      <div className="relative mt-1 h-4 text-[0.65rem] text-slate-600 tabular-nums" aria-hidden="true">
        {points.map((p, i) =>
          i % 6 === 0 ? (
            <span
              key={p.hour}
              className={cn('absolute', i > 0 && '-translate-x-1/2')}
              style={{ left: i > 0 ? `${((i + 0.5) / points.length) * 100}%` : 0 }}
            >
              {p.label}:00
            </span>
          ) : null,
        )}
        <span className="absolute right-0 font-semibold text-slate-800">Now</span>
      </div>
    </figure>
  )
}

/** Progress for a simulated job. The step name is announced; the bar is a progressbar so it isn't read on every tick. */
export function JobProgress({
  label,
  phase,
  progress,
  detail,
  className,
}: {
  label: string
  phase: string
  progress: number
  detail?: string
  className?: string
}) {
  const pctDone = Math.round(progress * 100)
  return (
    <div className={cn('space-y-1.5', className)}>
      <p role="status" className="flex items-center gap-2 text-sm font-medium text-slate-900">
        <LoaderCircle className="size-4 shrink-0 text-(--accent) motion-safe:animate-spin" aria-hidden="true" />
        {phase}
      </p>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pctDone}
        className="h-2 overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className="h-full rounded-full bg-(--accent) motion-safe:transition-[width] motion-safe:duration-100"
          style={{ width: `${pctDone}%` }}
        />
      </div>
      {detail && <p className="text-xs text-slate-600 tabular-nums">{detail}</p>}
    </div>
  )
}

/** A WhatsApp message as it lands on the manager's phone. */
export function WhatsAppBubble({ to, text, time }: { to: string; text: string; time: string }) {
  return (
    <div className="rounded-xl bg-[#efeae2] p-3 motion-safe:animate-fade-up">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
        <WhatsAppIcon className="size-4 text-[#128c4b]" />
        <span className="min-w-0 break-words">WhatsApp to {to}</span>
      </p>
      <div className="ml-auto max-w-[92%] rounded-lg rounded-tr-none bg-[#d9fdd3] px-3 py-2 text-sm text-slate-900 shadow-sm">
        <p className="break-words">{text}</p>
        <p className="mt-1 text-right text-[0.68rem] text-slate-600">{time}</p>
      </div>
    </div>
  )
}
