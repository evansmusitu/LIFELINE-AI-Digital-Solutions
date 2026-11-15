import { Bike, Check, CircleCheck, Flame, Info, PackageCheck, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { clockTime } from '../../lib/format'
import { MINUTE } from '../../lib/time'
import type { AppVariant } from '../styles'
import { AppButton, Avatar, Badge, Modal, Notice, Panel } from '../ui'
import { BUSINESS, DRINKS, RIDERS } from './data'
import { allDayCounts, etaFor, pickRider, ridesOut, ticketMinutes } from './engine'
import { ChannelTag, ModeBadge, OrderLines, TimerPill } from './parts'
import type { Area, Order, RiderId } from './types'

interface Props {
  orders: Order[]
  areas: Area[]
  now: number
  onAdvance: (id: string, rider?: RiderId) => void
  onTrack: (id: string) => void
  onMenu: () => void
}

const L = BUSINESS.locale
const ALL_DAY_SHOWN = 8

// The visitor's own ticket goes first so it's easy to find; the rest stay oldest first.
const mineFirst = (key: (o: Order) => number) => (a: Order, b: Order) => Number(Boolean(b.mine)) - Number(Boolean(a.mine)) || key(a) - key(b)

export function KitchenScreen({ orders, areas, now, onAdvance, onTrack, onMenu }: Props) {
  const [handing, setHanding] = useState<string | null>(null)
  const fresh = orders.filter((o) => o.status === 'received').sort(mineFirst((o) => o.placedAt))
  const cooking = orders.filter((o) => o.status === 'cooking').sort(mineFirst((o) => o.times.cooking ?? o.placedAt))
  const ready = orders.filter((o) => o.status === 'ready').sort(mineFirst((o) => o.times.ready ?? o.placedAt))
  const road = orders.filter((o) => o.status === 'out').sort((a, b) => (a.times.out ?? 0) - (b.times.out ?? 0))
  const counts = allDayCounts(orders, DRINKS)
  const target = orders.find((o) => o.id === handing)
  const suggested = pickRider(orders, RIDERS)

  const ticket = (order: Order) => (
    <li key={order.id}>
      <Ticket
        order={order}
        areas={areas}
        now={now}
        onAction={() => (order.status === 'ready' && order.mode === 'delivery' ? setHanding(order.id) : onAdvance(order.id))}
        onTrack={() => onTrack(order.id)}
      />
    </li>
  )

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <p className="text-sm text-slate-600">
        On the pass tonight: Chef {BUSINESS.chef}. Shift manager: {BUSINESS.manager.name}. App and website orders land here on their
        own, and phone orders are typed in once at the counter. No paper tickets.
      </p>

      <Panel title="To cook now" description="Every dish on New and Cooking tickets. Drinks are made at the bar.">
        {counts.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {counts.slice(0, ALL_DAY_SHOWN).map((c) => (
              <li key={c.name} className="rounded-lg bg-(--accent-soft) px-2.5 py-1 text-sm text-(--accent-ink)">
                {c.name} <span className="font-bold tabular-nums">× {c.qty}</span>
              </li>
            ))}
            {counts.length > ALL_DAY_SHOWN && (
              <li className="px-1 py-1 text-sm text-slate-600">
                and {counts.length - ALL_DAY_SHOWN} more {counts.length - ALL_DAY_SHOWN === 1 ? 'dish' : 'dishes'}
              </li>
            )}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">Nothing waiting. The grill is clear.</p>
        )}
      </Panel>

      {!orders.some((o) => o.mine) && (
        <Notice tone="accent" icon={Info}>
          <p>Place an order on the Menu and your ticket appears here under New.</p>
          <AppButton size="sm" className="mt-2" onClick={onMenu}>
            Go to the Menu
          </AppButton>
        </Notice>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Column title="New" dot="bg-sky-600" count={fresh.length} empty="No new tickets.">
          {fresh.map(ticket)}
        </Column>
        <Column title="Cooking" dot="bg-(--accent)" count={cooking.length} empty="Nothing on the grill.">
          {cooking.map(ticket)}
        </Column>
        <Column title="Ready" dot="bg-emerald-600" count={ready.length} empty="Nothing waiting at the pass.">
          {ready.map(ticket)}
        </Column>
      </div>

      <Panel
        title="On the road"
        description={RIDERS.map((r) => `${r.name}: ${ridesOut(orders, r.id) ? `${ridesOut(orders, r.id)} on the road` : 'free'}`).join(' · ')}
      >
        {road.length ? (
          <ul className="divide-y divide-slate-100">
            {road.map((order) => {
              const rider = RIDERS.find((r) => r.id === order.rider)
              const area = areas.find((a) => a.id === order.areaId)
              return (
                <li key={order.id} className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <Avatar name={rider?.name ?? 'Rider'} className="size-9" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900">
                      <span className="font-mono">{order.number}</span> · {rider?.name}
                      {order.mine && <Badge tone="accent">Your order</Badge>}
                    </p>
                    <p className="text-xs text-slate-600">
                      {area?.name} · left {clockTime(order.times.out ?? now, L)} · about {etaFor(order, now, false, area)} min away
                    </p>
                  </div>
                  <AppButton variant="secondary" icon={CircleCheck} onClick={() => onAdvance(order.id)} aria-label={`Mark ${order.number} delivered`}>
                    Delivered
                  </AppButton>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">No riders out right now.</p>
        )}
        <p className="mt-3 text-xs text-slate-600">In your version, riders tap Delivered in their own app. Here you can do it for them.</p>
      </Panel>

      <Modal
        open={Boolean(target)}
        onClose={() => setHanding(null)}
        title={target ? `Hand ${target.number} to a rider` : 'Hand to a rider'}
        description={target ? `Delivery to ${areas.find((a) => a.id === target.areaId)?.name ?? 'Abu Dhabi'}` : undefined}
        size="sm"
      >
        <ul className="space-y-2">
          {RIDERS.map((r) => {
            const load = ridesOut(orders, r.id)
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (target) onAdvance(target.id, r.id)
                    setHanding(null)
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-left hover:border-(--accent) hover:bg-(--accent-soft)"
                >
                  <Avatar name={r.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-slate-900">Give to {r.name}</span>
                    <span className="block text-xs text-slate-600">{load ? `${load} order on the road` : 'Free now'}</span>
                  </span>
                  {r.id === suggested.id && <Badge tone="green">Suggested</Badge>}
                </button>
              </li>
            )
          })}
        </ul>
      </Modal>
    </div>
  )
}

function Column({ title, dot, count, empty, children }: { title: string; dot: string; count: number; empty: string; children: ReactNode }) {
  return (
    <section aria-label={`${title} tickets`} className="min-w-0">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <span className={cn('size-2.5 rounded-full', dot)} aria-hidden="true" />
        {title}
        <span className="rounded-full bg-slate-200 px-2 text-xs leading-5 font-semibold text-slate-800 tabular-nums">{count}</span>
      </h3>
      {count ? (
        <ul className="space-y-3">{children}</ul>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-600">{empty}</p>
      )}
    </section>
  )
}

function actionFor(order: Order): { label: string; icon: LucideIcon; variant: AppVariant } {
  if (order.status === 'received') return { label: 'Start cooking', icon: Flame, variant: 'primary' }
  if (order.status === 'cooking') return { label: 'Ready', icon: PackageCheck, variant: 'success' }
  if (order.mode === 'delivery') return { label: 'Hand to rider', icon: Bike, variant: 'primary' }
  return { label: order.mode === 'pickup' ? 'Collected' : 'Served', icon: Check, variant: 'secondary' }
}

function Ticket({ order, areas, now, onAction, onTrack }: { order: Order; areas: Area[]; now: number; onAction: () => void; onTrack: () => void }) {
  const action = actionFor(order)
  const readyAt = order.times.ready
  return (
    <article
      aria-label={`Ticket ${order.number}${order.mine ? ', your order' : ''}`}
      className={cn('rounded-xl border bg-white shadow-sm', order.mine ? 'border-(--accent) ring-2 ring-(--accent)/25' : 'border-slate-200')}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2">
        <p className="font-mono text-sm font-bold text-slate-900">{order.number}</p>
        {order.mine && <Badge tone="accent">Your order</Badge>}
        <span className="ml-auto">
          {readyAt !== undefined ? (
            <span className="text-xs text-slate-600 tabular-nums">
              Ready {clockTime(readyAt, L)} · took {Math.round((readyAt - order.placedAt) / MINUTE)} min
            </span>
          ) : (
            <TimerPill minutes={ticketMinutes(order, now)} />
          )}
        </span>
      </div>
      <div className="space-y-2.5 px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <ModeBadge order={order} areas={areas} />
          <ChannelTag channel={order.channel} />
          {order.mode !== 'dine-in' && <span className="text-xs text-slate-600">· {order.customer}</span>}
        </div>
        <OrderLines lines={order.lines} />
      </div>
      <div className="flex flex-wrap gap-2 border-t border-slate-100 px-3 py-2.5">
        <AppButton variant={action.variant} icon={action.icon} onClick={onAction} aria-label={`${action.label}: ${order.number}`} className="flex-1">
          {action.label}
        </AppButton>
        {order.mine && (
          <AppButton variant="ghost" onClick={onTrack}>
            See it on Track order
          </AppButton>
        )}
      </div>
    </article>
  )
}
