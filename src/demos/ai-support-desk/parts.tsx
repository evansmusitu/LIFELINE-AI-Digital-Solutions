import { Clock, Frown, LoaderCircle, Mail, MessageCircle, MessagesSquare, Siren, Smile, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { dayAndTime, money } from '../../lib/format'
import { Badge, Notice, type Tone } from '../ui'
import { dueLabel } from './engine'
import type { Channel, Mood, Order, Priority, Reason, Ticket } from './types'

const CHANNEL_ICON: Record<Channel, LucideIcon> = { 'Web chat': MessagesSquare, Email: Mail, WhatsApp: MessageCircle }

const PRIORITY_TONE: Record<Priority, Tone> = { Urgent: 'red', High: 'amber', Normal: 'blue', Low: 'neutral' }

const ORDER_TONE: Record<Order['status'], Tone> = {
  Processing: 'neutral',
  Shipped: 'blue',
  'Out for delivery': 'blue',
  Delivered: 'green',
  Delayed: 'amber',
  Returned: 'violet',
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge tone={PRIORITY_TONE[priority]} icon={priority === 'Urgent' ? Siren : undefined}>
      {priority}
    </Badge>
  )
}

export function MoodBadge({ mood }: { mood: Mood }) {
  if (mood === 'Angry') return <Badge tone="violet" icon={Frown}>Angry</Badge>
  if (mood === 'Positive') return <Badge tone="green" icon={Smile}>Positive</Badge>
  return <Badge>Neutral</Badge>
}

export function ChannelLabel({ channel, className }: { channel: Channel; className?: string }) {
  const Icon = CHANNEL_ICON[channel]
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs text-slate-600', className)}>
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {channel}
    </span>
  )
}

const DUE_TONE = { red: 'text-red-700 font-semibold', amber: 'text-amber-800 font-semibold', neutral: 'text-slate-600', green: 'text-emerald-700' }

export function DueText({ ticket, now }: { ticket: Ticket; now: number }) {
  const due = dueLabel(ticket, now)
  if (!due) return null
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs', DUE_TONE[due.tone])}>
      <Clock className="size-3.5 shrink-0" aria-hidden="true" />
      {due.text}
    </span>
  )
}

export function Spinner({ small, className }: { small?: boolean; className?: string }) {
  return <LoaderCircle className={cn(small ? 'size-3' : 'size-4', 'motion-safe:animate-spin', className)} aria-hidden="true" />
}

/** "Why" the assistant chose each label, with the words that triggered it. */
export function ReasonList({ reasons }: { reasons: Reason[] }) {
  return (
    <ul className="space-y-2.5">
      {reasons.map((reason) => (
        <li key={reason.label} className="text-sm">
          <p className="font-medium text-slate-900">{reason.label}</p>
          {reason.phrases.length > 0 && (
            <p className="mt-1 flex flex-wrap gap-1.5">
              <span className="sr-only">Triggered by:</span>
              {reason.phrases.map((phrase) => (
                <mark key={phrase} className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium break-all text-amber-950">
                  “{phrase}”
                </mark>
              ))}
            </p>
          )}
          {reason.note && <p className="mt-0.5 text-xs text-slate-600">{reason.note}</p>}
        </li>
      ))}
    </ul>
  )
}

export function OrderDetails({ order, now }: { order: Order; now: number }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-slate-900">{order.number}</span>
        <Badge tone={ORDER_TONE[order.status]}>{order.status}</Badge>
        <span className="text-xs text-slate-600">Ordered {dayAndTime(order.placedAt, now)}</span>
      </div>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {order.items.map((item) => (
          <li key={item.name} className="flex justify-between gap-3 px-3 py-2">
            <span className="min-w-0 text-slate-800">
              {item.qty} × {item.name}
            </span>
            <span className="shrink-0 tabular-nums">{money(item.qty * item.price)}</span>
          </li>
        ))}
        <li className="flex justify-between gap-3 px-3 py-2 text-slate-600">
          <span>Delivery</span>
          <span className="tabular-nums">{order.delivery ? money(order.delivery) : 'Free'}</span>
        </li>
        <li className="flex justify-between gap-3 px-3 py-2 font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{money(order.total)}</span>
        </li>
      </ul>
      {order.courier && (
        <p className="text-slate-700">
          {order.courier} · tracking <span className="font-mono text-xs break-all">{order.tracking}</span>
        </p>
      )}
      {order.note && (
        <Notice tone="amber">
          <span className="text-xs">{order.note}</span>
        </Notice>
      )}
      {order.events.length > 0 && (
        <ol className="space-y-2 border-l-2 border-slate-200 pl-3">
          {order.events.map((event) => (
            <li key={event.at}>
              <p className="text-xs text-slate-600">{dayAndTime(event.at, now)}</p>
              <p className="text-slate-800">{event.text}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
