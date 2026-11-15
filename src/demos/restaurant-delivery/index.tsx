import { Bike, BookOpen, ChartColumn, ChefHat, SlidersHorizontal, UtensilsCrossed } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useToast } from '../../components/toast-context'
import { cn } from '../../lib/cn'
import { clockTime, duration, money, num, pct } from '../../lib/format'
import { usePersistentState } from '../../lib/storage'
import { todayAt, uid, useDemoClock, useTicker } from '../../lib/time'
import { useDemoMetrics } from '../metrics'
import { DemoAppShell, type DemoScreen } from '../shell'
import { BUSINESS, DRINKS, EVENING_FROM, RIDERS, createInitialState } from './data'
import {
  addToCart,
  advanceOrder,
  cartTotals,
  customerMessage,
  daySummary,
  maskPhone,
  nextStatus,
  pickRider,
  simulatedStepAt,
  promisedFor,
  resolveCart,
  setLineQty,
  statusLabel,
} from './engine'
import { KitchenScreen } from './KitchenScreen'
import { ManageScreen } from './ManageScreen'
import { MenuScreen } from './MenuScreen'
import { TodayScreen } from './TodayScreen'
import { TrackScreen } from './TrackScreen'
import type { Details, KitchenState, LineOptions, MenuItem, Order, RiderId } from './types'

const SLUG = 'restaurant-delivery'
const ACCENT = { base: '#b45309', strong: '#92400e', soft: '#fffbeb', ink: '#78350f' }
/** "Let the kitchen run it" moves the order one step this often. */
const AUTO_STEP_MS = 4000
/** Typing an order by hand and rewriting it for the kitchen. */
const MINUTES_PER_PHONE_ORDER = 3

type ScreenId = 'menu' | 'track' | 'kitchen' | 'manage' | 'today'

export default function RestaurantDeliveryDemo() {
  const clock = useDemoClock(19, 5)
  const now = useTicker(clock, 15_000)
  const toast = useToast()
  const [state, setState] = usePersistentState<KitchenState>(`${SLUG}.state`, createInitialState, { version: 1, freshDaily: true })
  const [screen, setScreen] = useState<ScreenId>('menu')
  const [trackId, setTrackId] = useState<string | null>(null)
  // The order being run automatically. Not persisted, so a reload never leaves it running.
  const [autoId, setAutoId] = useState<string | null>(null)

  const { items, areas, busy, orders, cart, details } = state
  const mine = orders.filter((o) => o.mine)
  const tracked =
    mine.find((o) => o.id === trackId) ?? mine[mine.length - 1] ?? orders.find((o) => o.id === state.sampleId) ?? null

  const autoOrder = orders.find((o) => o.id === autoId)
  const autoNext = autoOrder ? nextStatus(autoOrder) : null

  // Driven from here, so the run carries on when the visitor switches tabs. Each step clears its own timer.
  useEffect(() => {
    if (!autoId || !autoNext) return
    const timer = window.setTimeout(() => {
      const now = clock()
      setState((s) => {
        const target = s.orders.find((o) => o.id === autoId)
        if (!target || nextStatus(target) !== autoNext) return s
        const rider = autoNext === 'out' ? pickRider(s.orders, RIDERS) : undefined
        const area = s.areas.find((a) => a.id === target.areaId)
        const at = simulatedStepAt(target, now, area)
        return { ...s, orders: s.orders.map((o) => (o.id === autoId ? advanceOrder(o, at, rider, area) : o)) }
      })
    }, AUTO_STEP_MS)
    return () => window.clearTimeout(timer)
  }, [autoId, autoNext, clock, setState])

  const add = (item: MenuItem, options: LineOptions, qty: number) => {
    setState((s) => ({ ...s, cart: addToCart(s.cart, item.id, options, qty) }))
    toast(`${qty} × ${item.name} added to your order.`, 'success')
  }

  const setDetails = (patch: Partial<Details>) => setState((s) => ({ ...s, details: { ...s.details, ...patch } }))

  const place = () => {
    const lines = resolveCart(cart, items)
    const mode = details.mode
    const area = mode === 'delivery' ? areas.find((a) => a.id === details.areaId) : undefined
    const totals = cartTotals(lines, area, mode)
    const phone = maskPhone(details.phone)
    if (!lines.length || totals.short > 0 || !phone || (mode === 'delivery' && !area?.on)) {
      toast('Please check your order and details, then try again.', 'warning')
      return
    }
    const at = clock()
    const order: Order = {
      id: uid('o'),
      number: `DT-${state.nextNumber}`,
      mode,
      channel: 'App',
      customer: details.name.trim(),
      phone,
      areaId: area?.id,
      address: area ? [details.building.trim(), details.directions.trim(), area.name].filter(Boolean).join(', ') : undefined,
      payment: details.payment,
      lines: lines.map((l) => ({ itemId: l.item.id, name: l.item.name, qty: l.qty, unit: l.unit, options: l.options })),
      subtotal: totals.subtotal,
      fee: totals.fee,
      vat: totals.vat,
      total: totals.total,
      status: 'received',
      placedAt: at,
      times: { received: at },
      promisedMin: promisedFor(mode, area, busy),
      messages: [],
      mine: true,
    }
    order.messages = [{ at, text: customerMessage(order, 'received') }]
    setState((s) => ({ ...s, orders: [...s.orders, order], cart: [], nextNumber: s.nextNumber + 1 }))
    setTrackId(order.id)
    setAutoId(null)
    setScreen('track')
    toast(`Order ${order.number} placed. It’s on the kitchen screen now.`, 'success')
  }

  const advance = (id: string, riderId?: RiderId) => {
    const order = orders.find((o) => o.id === id)
    const next = order ? nextStatus(order) : null
    if (!order || !next) return
    const at = clock()
    const rider = next === 'out' ? (RIDERS.find((r) => r.id === riderId) ?? pickRider(orders, RIDERS)) : undefined
    const area = areas.find((a) => a.id === order.areaId)
    setState((s) => ({
      ...s,
      orders: s.orders.map((o) => (o.id === id && o.status === order.status ? advanceOrder(o, at, rider, area) : o)),
    }))
    const label = statusLabel(next, order.mode).toLowerCase()
    if (order.mine) toast(`Your order ${order.number} is ${label}. Track order has updated.`, 'success')
    else if (rider) toast(`${order.number} handed to ${rider.name}.`, 'info')
  }

  const rate = (up: boolean, comment: string) => {
    if (!tracked) return
    setState((s) => ({
      ...s,
      orders: s.orders.map((o) => (o.id === tracked.id ? { ...o, rating: { up, comment: comment || undefined } } : o)),
    }))
    toast('Thanks. Your rating is on the team’s Today screen.', 'success')
  }

  const orderAgain = () => {
    if (!tracked) return
    const available = tracked.lines.filter((l) => items.find((i) => i.id === l.itemId)?.available)
    const missing = tracked.lines.filter((l) => !available.includes(l)).map((l) => l.name)
    setState((s) => ({
      ...s,
      cart: available.reduce((c, l) => addToCart(c, l.itemId, l.options, l.qty), s.cart),
      details:
        tracked.mode === 'dine-in' ? s.details : { ...s.details, mode: tracked.mode, areaId: tracked.areaId ?? s.details.areaId },
    }))
    setScreen('menu')
    if (!available.length) toast('Those dishes are sold out tonight, so nothing was added.', 'warning')
    else if (missing.length) toast(`Added to your order. ${missing.join(', ')} is sold out tonight, so it was left out.`, 'warning')
    else toast(`The same order is in your cart. Check it and press Place order.`, 'success')
  }

  const toggleItem = (id: string, available: boolean) => {
    const item = items.find((i) => i.id === id)
    if (!item) return
    const inCart = cart.some((l) => l.itemId === id)
    setState((s) => ({
      ...s,
      items: s.items.map((i) => (i.id === id ? { ...i, available } : i)),
      cart: available ? s.cart : s.cart.filter((l) => l.itemId !== id),
    }))
    if (available) toast(`${item.name} is back on the Menu.`, 'success')
    else toast(`${item.name} is switched off. It shows as sold out on the Menu${inCart ? ' and left the customer’s cart' : ''}.`, 'info')
  }

  const setPrice = (id: string, price: number) => {
    const item = items.find((i) => i.id === id)
    setState((s) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, price } : i)) }))
    toast(`${item?.name ?? 'The dish'} now costs ${money(price)} on the Menu.`, 'success')
  }

  const setBusy = (on: boolean) => {
    setState((s) => ({ ...s, busy: on }))
    toast(on ? 'Busy mode on. Delivery times on the Menu are 15 minutes longer.' : 'Busy mode off. Normal delivery times are back.', 'info')
  }

  const setAreaFee = (id: string, fee: number) => {
    const area = areas.find((a) => a.id === id)
    setState((s) => ({ ...s, areas: s.areas.map((a) => (a.id === id ? { ...a, fee } : a)) }))
    toast(`Delivery to ${area?.name ?? 'this area'} now costs ${money(fee)}.`, 'success')
  }

  const toggleArea = (id: string, on: boolean) => {
    const area = areas.find((a) => a.id === id)
    setState((s) => ({ ...s, areas: s.areas.map((a) => (a.id === id ? { ...a, on } : a)) }))
    toast(on ? `Delivering to ${area?.name} again.` : `Deliveries to ${area?.name} are paused. Customers there see it on the Menu.`, 'info')
  }

  const summary = daySummary(orders, now, todayAt(EVENING_FROM.hours, EVENING_FROM.minutes), DRINKS)
  const t = summary.tonight
  useDemoMetrics([
    { label: 'Orders tonight', value: num(t.count), detail: `${t.delivery} delivery · ${t.pickup} pickup · ${t.dineIn} dine-in` },
    { label: 'Average ticket time', value: duration(summary.avgTicket), detail: 'Received to ready' },
    { label: 'On-time deliveries', value: pct(summary.onTimePct), detail: 'Delivered within the promised time' },
    {
      label: 'Order-taking time saved tonight (est.)',
      value: duration(t.online * MINUTES_PER_PHONE_ORDER),
      detail: 'No orders taken by phone and rewritten for the kitchen',
    },
  ])

  const newTickets = orders.filter((o) => o.status === 'received').length
  const screens: DemoScreen<ScreenId>[] = [
    { id: 'menu', label: 'Menu', icon: BookOpen, audience: 'customer' },
    { id: 'track', label: 'Track order', icon: Bike, audience: 'customer' },
    { id: 'kitchen', label: 'Kitchen', icon: ChefHat, audience: 'team', badge: newTickets || undefined },
    { id: 'manage', label: 'Menu manager', icon: SlidersHorizontal, audience: 'team' },
    { id: 'today', label: 'Today', icon: ChartColumn, audience: 'team' },
  ]

  return (
    <DemoAppShell
      slug={SLUG}
      business={{ name: BUSINESS.name, descriptor: 'Grill kitchen and delivery · Abu Dhabi', icon: UtensilsCrossed }}
      accent={ACCENT}
      screens={screens}
      active={screen}
      onChange={setScreen}
      headerRight={
        <span className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 sm:inline-flex">
          <span className={cn('size-2 rounded-full', busy ? 'bg-amber-500' : 'bg-emerald-500')} aria-hidden="true" />
          {busy ? 'Busy mode on' : 'Kitchen open'} · {clockTime(now, BUSINESS.locale)}
        </span>
      }
    >
      {screen === 'menu' && (
        <MenuScreen
          items={items}
          areas={areas}
          busy={busy}
          cart={cart}
          details={details}
          onAdd={add}
          onSetQty={(key, qty) => setState((s) => ({ ...s, cart: setLineQty(s.cart, key, qty) }))}
          onDetails={setDetails}
          onPlace={place}
        />
      )}
      {screen === 'track' && tracked && (
        <TrackScreen
          order={tracked}
          sample={!tracked.mine}
          mine={mine}
          areas={areas}
          busy={busy}
          now={now}
          running={autoId === tracked.id && autoNext !== null}
          onSelect={setTrackId}
          onRun={() => setAutoId(tracked.id)}
          onStop={() => setAutoId(null)}
          onKitchen={() => setScreen('kitchen')}
          onMenu={() => setScreen('menu')}
          onRate={rate}
          onOrderAgain={orderAgain}
        />
      )}
      {screen === 'kitchen' && (
        <KitchenScreen
          orders={orders}
          areas={areas}
          now={now}
          onAdvance={advance}
          onTrack={(id) => {
            setTrackId(id)
            setScreen('track')
          }}
          onMenu={() => setScreen('menu')}
        />
      )}
      {screen === 'manage' && (
        <ManageScreen
          items={items}
          areas={areas}
          busy={busy}
          onToggleItem={toggleItem}
          onPrice={setPrice}
          onBusy={setBusy}
          onAreaFee={setAreaFee}
          onAreaToggle={toggleArea}
        />
      )}
      {screen === 'today' && (
        <TodayScreen
          summary={summary}
          orders={orders}
          now={now}
          onEmail={() => toast(`Tonight’s summary sent to ${BUSINESS.manager.email} (simulated).`, 'success')}
        />
      )}
    </DemoAppShell>
  )
}
