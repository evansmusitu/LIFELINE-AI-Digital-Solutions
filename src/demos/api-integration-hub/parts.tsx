import {
  ArrowRight,
  Calculator,
  CalendarDays,
  CircleAlert,
  CircleCheck,
  CircleMinus,
  CircleX,
  ClipboardList,
  Clock,
  Contact,
  CreditCard,
  FileSignature,
  FileSpreadsheet,
  KeyRound,
  LoaderCircle,
  Mail,
  MessageCircle,
  MessageSquareText,
  RotateCw,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { Badge } from '../ui'
import { APPS, FLOWS } from './catalog'
import type { EventStatus } from './engine'
import type { AppId, FlowId, Hop, Json } from './types'

const ICONS: Record<AppId, LucideIcon> = {
  forms: ClipboardList,
  crm: Contact,
  payments: CreditCard,
  accounting: Calculator,
  email: Mail,
  whatsapp: MessageCircle,
  maintenance: Wrench,
  calendar: CalendarDays,
  esign: FileSignature,
  reports: FileSpreadsheet,
  locks: KeyRound,
  sms: MessageSquareText,
}

export function AppTile({ app, size = 'md' }: { app: AppId; size?: 'sm' | 'md' }) {
  const Icon = ICONS[app]
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-lg', APPS[app].tile, size === 'sm' ? 'size-7' : 'size-10')}>
      <Icon className={size === 'sm' ? 'size-3.5' : 'size-5'} aria-hidden="true" />
    </span>
  )
}

export function AppChip({ app }: { app: AppId }) {
  const Icon = ICONS[app]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-800">
      <span className={cn('grid size-5 place-items-center rounded-full', APPS[app].tile)}>
        <Icon className="size-3" aria-hidden="true" />
      </span>
      {APPS[app].name}
    </span>
  )
}

/** Source app → each target app, wrapping on small screens. */
export function FlowChain({ flow }: { flow: FlowId }) {
  const def = FLOWS[flow]
  const apps: AppId[] = [def.source, ...def.hops.map((h) => h.app)]
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-1.5" aria-label={`${def.name} flow`}>
      {apps.map((app, i) => (
        <li key={`${app}-${i}`} className="flex items-center gap-1">
          {i > 0 && (
            <>
              <ArrowRight className="size-3.5 text-slate-500" aria-hidden="true" />
              <span className="sr-only">then</span>
            </>
          )}
          <AppChip app={app} />
        </li>
      ))}
    </ol>
  )
}

export function HopBadge({ hop }: { hop: Hop }) {
  if (hop.resolved)
    return (
      <Badge tone="green" icon={CircleCheck}>
        {hop.resolved.from === 'queued' ? 'Waited, then sent' : 'Fixed and sent'}
      </Badge>
    )
  switch (hop.status) {
    case 'sent':
      return (
        <Badge tone="green" icon={CircleCheck}>
          Sent
        </Badge>
      )
    case 'retried':
      return (
        <Badge tone="green" icon={RotateCw}>
          Retried then sent
        </Badge>
      )
    case 'queued':
      return (
        <Badge tone="amber" icon={Clock}>
          Waiting
        </Badge>
      )
    case 'failed':
      return (
        <Badge tone="red" icon={CircleX}>
          Failed
        </Badge>
      )
    default:
      return <Badge icon={CircleMinus}>Not needed</Badge>
  }
}

export function EventStatusBadge({ status }: { status: EventStatus | 'running' }) {
  if (status === 'running')
    return (
      <Badge tone="accent" icon={LoaderCircle} className="[&>svg]:motion-safe:animate-spin">
        Running
      </Badge>
    )
  if (status === 'delivered')
    return (
      <Badge tone="green" icon={CircleCheck}>
        Delivered
      </Badge>
    )
  if (status === 'partial')
    return (
      <Badge tone="amber" icon={CircleAlert}>
        Partly delivered
      </Badge>
    )
  return (
    <Badge tone="red" icon={CircleX}>
      Failed
    </Badge>
  )
}

export function JsonBlock({ label, value, className }: { label: string; value: Json; className?: string }) {
  return (
    <figure className={cn('min-w-0', className)}>
      <figcaption className="mb-1 text-xs font-semibold text-slate-700">{label}</figcaption>
      <pre className="max-h-80 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-[0.72rem] leading-relaxed text-slate-100">
        {value === null ? 'Nothing sent' : JSON.stringify(value, null, 2)}
      </pre>
    </figure>
  )
}
