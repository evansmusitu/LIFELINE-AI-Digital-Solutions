import {
  Bike,
  Check,
  ChefHat,
  CircleCheck,
  Flame,
  Info,
  MessageCircle,
  PackageCheck,
  Play,
  RotateCcw,
  Square,
  ThumbsDown,
  ThumbsUp,
  type LucideIcon,
} from 'lucide-react'
import { useId, useState } from 'react'
import { cn } from '../../lib/cn'
import { clockTime, firstName, money } from '../../lib/format'
import { MINUTE } from '../../lib/time'
import { AppButton, Avatar, Notice, Panel, TextArea } from '../ui'
import { BUSINESS, RIDERS } from './data'
import { etaFor, flowFor, isFinished, statusLabel } from './engine'
import { MessageThread, ModeBadge, OrderLines } from './parts'
import type { Area, Order, Status } from './types'

interface Props {
  order: Order
  /** A sample order from tonight, shown until the visitor places one. */
  sample: boolean
  mine: Order[]
  areas: Area[]
  busy: boolean
  now: number
  running: boolean
  onSelect: (id: string) => void
  onRun: () => void
  onStop: () => void
  onKitchen: () => void
  onMenu: () => void
  onRate: (up: boolean, comment: string) => void
  onOrderAgain: () => void
}

const L = BUSINESS.locale

const HEADLINES: Record<Status, { title: string; icon: LucideIcon }> = {
  received: { title: 'Order received', icon: Check },
  cooking: { title: 'Cooking now', icon: Flame },
  ready: { title: 'Ready', icon: PackageCheck },
  out: { title: 'On the way', icon: Bike },
  delivered: { title: 'Delivered', icon: CircleCheck },
  collected: { title: 'Collected', icon: CircleCheck },
  served: { title: 'Served', icon: CircleCheck },
}

function subline(order: Order, eta: number | null, riderName: string | undefined): string {
  switch (order.status) {
    case 'received':
      return 'The kitchen has your order and will start it shortly.'
    case 'cooking':
      return `Chef ${firstName(BUSINESS.chef)}’s team has it on the grill.`
    case 'ready':
      return order.mode === 'pickup' ? `Your order is packed and waiting at ${BUSINESS.pickupFrom}.` : 'Packed and waiting for a rider.'
    case 'out':
      return `${riderName ?? 'Your rider'} is ${eta ?? 1} min away.`
    default:
      return order.times[order.status] ? `At ${clockTime(order.times[order.status]!, L)}. Enjoy your meal.` : 'Enjoy your meal.'
  }
}

export function TrackScreen(props: Props) {
  const { order, sample, mine, areas, busy, now, running, onSelect, onRun, onStop, onKitchen, onMenu } = props
  const area = areas.find((a) => a.id === order.areaId)
  const eta = etaFor(order, now, busy, area)
  const rider = RIDERS.find((r) => r.id === order.rider)
  const done = isFinished(order)
  const flow = flowFor(order.mode)
  const current = flow.indexOf(order.status)
  const head = HEADLINES[order.status]
  const HeadIcon = head.icon
  const promisedAt = order.promisedMin !== undefined ? order.placedAt + order.promisedMin * MINUTE : undefined

  return (
    <div className="space-y-4 p-3 sm:p-5">
      {sample && (
        <Notice tone="accent" icon={Info} title="This is a sample order from tonight">
          <p>Place your own order on the Menu and you can follow it here.</p>
          <AppButton size="sm" className="mt-2" onClick={onMenu}>
            Go to the Menu
          </AppButton>
        </Notice>
      )}
      {mine.length > 1 && (
        <div role="group" aria-label="Your orders" className="flex flex-wrap gap-2">
          {mine.map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={o.id === order.id}
              onClick={() => onSelect(o.id)}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium transition',
                o.id === order.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-slate-400',
              )}
            >
              {o.number} · {statusLabel(o.status, o.mode)}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-4">
          <section aria-labelledby="rd-track-title" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-sm font-semibold text-slate-700">{order.number}</p>
              <ModeBadge order={order} areas={areas} />
            </div>
            <div className="mt-3 flex items-start gap-3" role="status">
              <span
                className={cn(
                  'grid size-12 shrink-0 place-items-center rounded-2xl',
                  done ? 'bg-emerald-50 text-emerald-700' : 'bg-(--accent-soft) text-(--accent-ink)',
                )}
              >
                <HeadIcon className="size-6" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 id="rd-track-title" className="text-xl font-bold text-slate-900 sm:text-2xl">
                  {order.status === 'ready' && order.mode === 'pickup' ? 'Ready to collect' : head.title}
                </h3>
                <p className="mt-0.5 text-sm text-slate-700">{subline(order, eta, rider?.name)}</p>
              </div>
            </div>

            {eta !== null && eta > 0 && !done && (
              <div className="mt-4 flex flex-wrap items-end justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-xs font-medium text-slate-600">{order.mode === 'delivery' ? 'Arriving in about' : 'Ready in about'}</p>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums">{eta} min</p>
                </div>
                <p className="text-right text-xs text-slate-600">
                  <span className="block">Around {clockTime(now + eta * MINUTE, L)}</span>
                  {promisedAt && <span className="block">Promised by {clockTime(promisedAt, L)}</span>}
                </p>
              </div>
            )}

            <ol className="mt-5 space-y-0">
              {flow.map((status, i) => {
                const at = order.times[status]
                const state = i < current || (i === current && done) ? 'done' : i === current ? 'now' : 'next'
                return (
                  <li key={status} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < flow.length - 1 && (
                      <span
                        aria-hidden="true"
                        className={cn(
                          'absolute top-6 left-3 h-[calc(100%-1.5rem)] w-0.5 -translate-x-1/2',
                          i < current ? 'bg-(--accent)' : 'bg-slate-200',
                        )}
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className={cn(
                        'relative grid size-6 shrink-0 place-items-center rounded-full text-white',
                        state === 'done' && 'bg-(--accent)',
                        state === 'now' && 'bg-(--accent) ring-4 ring-(--accent)/20 motion-safe:animate-pulse',
                        state === 'next' && 'border-2 border-slate-300 bg-white',
                      )}
                    >
                      {state === 'done' && <Check className="size-3.5" />}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className={cn('text-sm font-semibold', state === 'next' ? 'text-slate-600' : 'text-slate-900')}>
                        {statusLabel(status, order.mode)}
                        <span className="sr-only">{state === 'done' ? ', done' : state === 'now' ? ', current step' : ', to come'}</span>
                      </p>
                      {at !== undefined && <p className="text-xs text-slate-600 tabular-nums">{clockTime(at, L)}</p>}
                      {status === 'out' && rider && i <= current && (
                        <p className="text-xs text-slate-600">
                          with {rider.name} · {rider.phone}
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>

          {order.status === 'out' && rider && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <Avatar name={rider.name} className="size-11" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{rider.name} is bringing your order</p>
                <p className="text-sm text-slate-600 tabular-nums">Rider’s number: {rider.phone}</p>
              </div>
            </div>
          )}

          {!done && (
            <Panel title="Move it along" description="The order moves when the kitchen taps its ticket.">
              {running ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p role="status" className="flex items-center gap-2 text-sm text-slate-700">
                    <ChefHat className="size-4 shrink-0 text-(--accent) motion-safe:animate-pulse" aria-hidden="true" />
                    The kitchen is running your order, one step every few seconds.
                  </p>
                  <AppButton variant="secondary" icon={Square} onClick={onStop}>
                    Stop
                  </AppButton>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <AppButton icon={Play} onClick={onRun}>
                    Let the kitchen run it
                  </AppButton>
                  <AppButton variant="secondary" icon={ChefHat} onClick={onKitchen}>
                    Open the Kitchen
                  </AppButton>
                </div>
              )}
              <p className="mt-3 text-xs text-slate-600">
                In this demo the steps are sped up. In your version the customer sees each step as your team taps it.
              </p>
            </Panel>
          )}

          {done && order.mode !== 'dine-in' && <RatePanel key={order.id} {...props} />}
        </div>

        <div className="space-y-4">
          <Panel
            title="Messages to the customer"
            description="Sent by WhatsApp or SMS at each step. In this demo they appear here."
            action={<MessageCircle className="size-4 text-slate-600" aria-hidden="true" />}
          >
            <MessageThread messages={order.messages} />
          </Panel>
          <Panel title="Order details" description={`${order.customer}${order.phone ? ` · ${order.phone}` : ''}`}>
            <OrderLines lines={order.lines} prices />
            <dl className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-600">Subtotal</dt>
                <dd className="tabular-nums">{money(order.subtotal)}</dd>
              </div>
              {order.mode === 'delivery' && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-600">Delivery</dt>
                  <dd className="tabular-nums">{money(order.fee)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3 font-bold text-slate-900">
                <dt>Total</dt>
                <dd className="tabular-nums">{money(order.total)}</dd>
              </div>
              <div className="flex justify-between gap-3 text-xs text-slate-600">
                <dt>Includes 5% VAT</dt>
                <dd className="tabular-nums">{money(order.vat)}</dd>
              </div>
            </dl>
            {order.address && <p className="mt-3 text-sm break-words text-slate-700">Deliver to: {order.address}</p>}
          </Panel>
        </div>
      </div>
    </div>
  )
}

function RatePanel({ order, onRate, onOrderAgain }: Props) {
  const id = useId()
  const [up, setUp] = useState<boolean | null>(null)
  const [comment, setComment] = useState('')

  return (
    <Panel title={order.rating ? 'Thanks for your rating' : 'Rate your order'}>
      {order.rating ? (
        <p className="flex items-center gap-2 text-sm text-slate-700">
          {order.rating.up ? (
            <ThumbsUp className="size-4 shrink-0 text-emerald-700" aria-hidden="true" />
          ) : (
            <ThumbsDown className="size-4 shrink-0 text-red-700" aria-hidden="true" />
          )}
          You gave it a thumbs {order.rating.up ? 'up' : 'down'}. The team sees it on Today.
        </p>
      ) : (
        <div className="space-y-3">
          <div role="group" aria-label="How was it?" className="flex gap-2">
            {[true, false].map((value) => {
              const Icon = value ? ThumbsUp : ThumbsDown
              return (
                <button
                  key={String(value)}
                  type="button"
                  aria-pressed={up === value}
                  onClick={() => setUp(value)}
                  className={cn(
                    'inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition',
                    up === value
                      ? value
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-red-600 bg-red-50 text-red-700'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400',
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  {value ? 'Thumbs up' : 'Thumbs down'}
                </button>
              )
            })}
          </div>
          <div>
            <label htmlFor={`${id}-comment`} className="mb-1 block text-xs font-semibold text-slate-700">
              Comment (optional)
            </label>
            <TextArea id={`${id}-comment`} rows={2} maxLength={200} value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
          <AppButton disabled={up === null} onClick={() => up !== null && onRate(up, comment.trim())}>
            Send rating
          </AppButton>
        </div>
      )}
      <div className="mt-4 border-t border-slate-100 pt-3">
        <AppButton variant="secondary" icon={RotateCcw} onClick={onOrderAgain}>
          Order again
        </AppButton>
      </div>
    </Panel>
  )
}
