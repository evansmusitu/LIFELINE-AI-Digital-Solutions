import { Award, CheckCheck, Crown, LoaderCircle, Medal, ShieldCheck, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { moneyWhole } from '../../lib/format'
import { Badge, type Tone } from '../ui'
import type { Tier } from './engine'
import { GROUP_STYLE } from './theme'
import type { Appointment, ApptStatus, ServiceGroup } from './types'

export function GroupTile({ group, className }: { group: ServiceGroup; className?: string }) {
  const Icon = GROUP_STYLE[group].icon
  return (
    <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', GROUP_STYLE[group].tile, className)}>
      <Icon className="size-4" aria-hidden="true" />
    </span>
  )
}

const STATUS_TONE: Record<ApptStatus, Tone> = {
  Booked: 'blue',
  'Checked in': 'accent',
  Completed: 'green',
  'No-show': 'red',
  Cancelled: 'neutral',
}

export function StatusBadge({ status }: { status: ApptStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{status}</Badge>
}

export function DepositBadge({ appt, short }: { appt: Appointment; short?: boolean }) {
  const amount = moneyWhole(appt.deposit)
  if (appt.depositStatus === 'paid')
    return (
      <Badge tone="green" icon={ShieldCheck}>
        {short ? amount : `Deposit ${amount} paid`}
      </Badge>
    )
  if (appt.depositStatus === 'kept') return <Badge tone="amber">Deposit {amount} kept</Badge>
  if (appt.depositStatus === 'refunded') return <Badge>Deposit {amount} refunded</Badge>
  if (appt.depositStatus === 'applied') return <Badge icon={CheckCheck}>Deposit used</Badge>
  return null
}

const TIER_STYLE: Record<Tier, { tone: Tone; icon: LucideIcon }> = {
  Gold: { tone: 'amber', icon: Crown },
  Silver: { tone: 'blue', icon: Medal },
  Bronze: { tone: 'neutral', icon: Award },
}

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <Badge tone={TIER_STYLE[tier].tone} icon={TIER_STYLE[tier].icon}>
      {tier}
    </Badge>
  )
}

/** A WhatsApp message as the client sees it. */
export function WhatsAppBubble({ text, meta, className }: { text: string; meta: string; className?: string }) {
  return (
    <div className={cn('rounded-xl bg-[#efeae2] p-3', className)}>
      <p className="ml-auto max-w-[92%] rounded-lg rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-sm break-words whitespace-pre-line text-slate-900 shadow-sm">
        {text}
      </p>
      <p className="mt-1 text-right text-[0.7rem] text-slate-700">{meta}</p>
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn('size-4 motion-safe:animate-spin', className)} aria-hidden="true" />
}

/** Label and value rows for summaries and dialogs. */
export function Rows({ rows, className }: { rows: [string, ReactNode][]; className?: string }) {
  return (
    <dl className={cn('divide-y divide-slate-100 text-sm', className)}>
      {rows.map(([label, value]) => (
        <div key={label} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-2">
          <dt className="text-slate-600">{label}</dt>
          <dd className="min-w-0 text-right font-medium break-words text-slate-900">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Chips with aria-pressed, for filters and day pickers. */
export function Chip({ pressed, onClick, children, className }: { pressed: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition',
        pressed ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
        className,
      )}
    >
      {children}
    </button>
  )
}
