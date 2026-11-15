import { firstName, money, round2 } from '../../lib/format'
import { MINUTE, seededRandom } from '../../lib/time'
import type {
  Area,
  CartLine,
  Channel,
  ExtraId,
  LineOptions,
  MenuItem,
  Mode,
  Order,
  OrderLine,
  Payment,
  Rider,
  RiderId,
  Spice,
  Status,
} from './types'

/* Pure logic for the Dhow & Thyme demo: prices, order flow, ETAs, kitchen counts and the seeded day. */

export const VAT_RATE = 0.05
export const MIN_DELIVERY = 15
export const PICKUP_MIN = 20
export const BUSY_EXTRA = 15
/** Typical minutes on the grill once cooking starts. */
export const COOK_MIN = 12
/** Typical minutes from received to ready, queue included. */
export const KITCHEN_TARGET = 18
/** Packing and handing to a rider. */
export const HANDOVER_MIN = 5

export const EXTRAS: Record<ExtraId, { label: string; price: number }> = {
  garlic: { label: 'Garlic sauce', price: 0.8 },
  bread: { label: 'Extra bread', price: 1 },
  halloumi: { label: 'Halloumi', price: 2.5 },
}

export const SPICES: Spice[] = ['Mild', 'Medium', 'Hot']

/* Prices */

export function priceLine(item: Pick<MenuItem, 'price' | 'largeDelta'>, options: Pick<LineOptions, 'size' | 'extras'>): number {
  const size = options.size === 'Large' ? (item.largeDelta ?? 0) : 0
  const extras = options.extras.reduce((sum, id) => sum + EXTRAS[id].price, 0)
  return round2(item.price + size + extras)
}

/** Same item with the same choices shares one cart line. */
export function lineKey(itemId: string, options: LineOptions): string {
  return [itemId, options.size, options.spice ?? '', [...options.extras].sort().join('+'), options.notes.trim().toLowerCase()].join('|')
}

export const MAX_QTY = 20

/** Adds to the matching line, or starts a new one. Quantities stay between 1 and MAX_QTY. */
export function addToCart(cart: CartLine[], itemId: string, options: LineOptions, qty: number): CartLine[] {
  const key = lineKey(itemId, options)
  const count = Math.max(0, Math.floor(qty))
  if (!count) return cart
  const existing = cart.find((l) => l.key === key)
  if (existing) return cart.map((l) => (l.key === key ? { ...l, qty: Math.min(MAX_QTY, l.qty + count) } : l))
  return [...cart, { key, itemId, qty: Math.min(MAX_QTY, count), options }]
}

export function setLineQty(cart: CartLine[], key: string, qty: number): CartLine[] {
  return qty <= 0 ? cart.filter((l) => l.key !== key) : cart.map((l) => (l.key === key ? { ...l, qty: Math.min(MAX_QTY, qty) } : l))
}

/** "Large · Hot · + extra bread" */
export function optionSummary(options: LineOptions): string[] {
  const parts: string[] = []
  if (options.size === 'Large') parts.push('Large')
  if (options.spice) parts.push(options.spice)
  for (const id of options.extras) parts.push(`+ ${EXTRAS[id].label.toLowerCase()}`)
  return parts
}

export interface PricedLine {
  key: string
  item: MenuItem
  qty: number
  unit: number
  options: LineOptions
}

/** Cart lines with today's prices. Lines for missing or sold-out dishes are dropped. */
export function resolveCart(cart: CartLine[], items: MenuItem[]): PricedLine[] {
  return cart.flatMap((line) => {
    const item = items.find((i) => i.id === line.itemId)
    if (!item || !item.available || line.qty <= 0) return []
    return [{ key: line.key, item, qty: line.qty, unit: priceLine(item, line.options), options: line.options }]
  })
}

export interface Totals {
  items: number
  subtotal: number
  fee: number
  total: number
  /** VAT included in the total (menu prices include 5% UAE VAT). */
  vat: number
  /** How much more food is needed for the delivery minimum. */
  short: number
}

export function cartTotals(lines: { unit: number; qty: number }[], area: Pick<Area, 'fee'> | undefined, mode: Mode): Totals {
  const items = lines.reduce((n, l) => n + l.qty, 0)
  const subtotal = round2(lines.reduce((sum, l) => sum + l.unit * l.qty, 0))
  const fee = mode === 'delivery' && area && items > 0 ? round2(area.fee) : 0
  const total = round2(subtotal + fee)
  const vat = round2((total * VAT_RATE) / (1 + VAT_RATE))
  const short = mode === 'delivery' ? round2(Math.max(0, MIN_DELIVERY - subtotal)) : 0
  return { items, subtotal, fee, total, vat, short }
}

export function etaRange(area: Pick<Area, 'etaMin' | 'etaMax'>, busy: boolean): [number, number] {
  const extra = busy ? BUSY_EXTRA : 0
  return [area.etaMin + extra, area.etaMax + extra]
}

export function promisedFor(mode: Mode, area: Area | undefined, busy: boolean): number | undefined {
  if (mode === 'pickup') return PICKUP_MIN
  if (mode === 'delivery' && area) return etaRange(area, busy)[1]
  return undefined
}

/** "7.5", "$7.50" and "12" are fine; "7.505", "-1" and "abc" are not. Null when invalid or out of range. */
export function parsePrice(text: string, min: number, max: number): number | null {
  const clean = text.trim().replace(/^\$\s*/, '')
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(clean)) return null
  const value = round2(Number(clean))
  return value >= min && value <= max ? value : null
}

/** Accepts UAE numbers like 050 123 4410 or +971 50 123 4410. Returns null when it isn't one. */
export function maskPhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('971')) digits = digits.slice(3)
  if (digits.startsWith('0')) digits = digits.slice(1)
  if (digits.length !== 8 && digits.length !== 9) return null
  return `+971 ${digits.slice(0, digits.length - 7)} ••• ${digits.slice(-4)}`
}

/* Order flow */

const FLOWS: Record<Mode, Status[]> = {
  delivery: ['received', 'cooking', 'ready', 'out', 'delivered'],
  pickup: ['received', 'cooking', 'ready', 'collected'],
  'dine-in': ['received', 'cooking', 'ready', 'served'],
}

export function flowFor(mode: Mode): Status[] {
  return FLOWS[mode]
}

export function nextStatus(order: Pick<Order, 'mode' | 'status'>): Status | null {
  const flow = FLOWS[order.mode]
  const index = flow.indexOf(order.status)
  return index >= 0 && index < flow.length - 1 ? flow[index + 1] : null
}

export function isFinished(order: Pick<Order, 'mode' | 'status'>): boolean {
  return nextStatus(order) === null
}

export function statusLabel(status: Status, mode: Mode): string {
  if (status === 'ready') return mode === 'pickup' ? 'Ready to collect' : 'Ready'
  return {
    received: 'Received',
    cooking: 'Cooking',
    out: 'Out for delivery',
    delivered: 'Delivered',
    collected: 'Collected',
    served: 'Served',
  }[status]
}

export function customerMessage(
  order: Pick<Order, 'number' | 'customer' | 'lines' | 'total' | 'mode'>,
  status: Status,
  rider?: Rider,
  eta?: number,
): string {
  const name = firstName(order.customer)
  const count = order.lines.reduce((n, l) => n + l.qty, 0)
  const items = `${count} ${count === 1 ? 'item' : 'items'}, ${money(order.total)}`
  switch (status) {
    case 'received':
      return `Thanks ${name}, we’ve got your order ${order.number} (${items}). We’ll message you at each step 🧾`
    case 'cooking':
      return `Your order ${order.number} is on the grill now 🔥`
    case 'ready':
      return order.mode === 'pickup'
        ? `Your order ${order.number} is ready to collect. Show this number at the counter 🛍️`
        : `Your order ${order.number} is packed and waiting for a rider.`
    case 'out':
      return `Your order ${order.number} is on the way with ${rider?.name ?? 'our rider'} 🛵 About ${eta ?? 15} min. Rider: ${rider?.phone ?? ''}`.trim()
    case 'delivered':
      return `Delivered. Enjoy your meal 🍽️ Tap 👍 or 👎 in the app to tell us how it was.`
    case 'collected':
      return `Collected. Enjoy your meal 🍽️ Tap 👍 or 👎 in the app to tell us how it was.`
    default:
      return ''
  }
}

/** Moves an order one step on. Delivery and pickup customers get a message at each step. */
export function advanceOrder(order: Order, at: number, rider?: Rider, area?: Area): Order {
  const status = nextStatus(order)
  if (!status) return order
  const next: Order = {
    ...order,
    status,
    times: { ...order.times, [status]: at },
    rider: status === 'out' ? (rider?.id ?? order.rider) : order.rider,
  }
  if (order.mode === 'dine-in') return next
  const eta = status === 'out' ? (area?.rideMin ?? 15) : undefined
  return { ...next, messages: [...order.messages, { at, text: customerMessage(order, status, rider, eta) }] }
}

/** Typical minutes from the previous step, used when the demo runs an order on its own. */
const STEP_MINUTES: Partial<Record<Status, number>> = {
  cooking: 3,
  ready: COOK_MIN,
  out: HANDOVER_MIN,
  collected: 4,
  served: 1,
}

/**
 * When "Let the kitchen run it" plays an order in a few seconds, each step is stamped with a realistic time
 * (the previous step plus a typical gap, never earlier than now), so the timeline reads like a real evening.
 */
export function simulatedStepAt(order: Pick<Order, 'mode' | 'status' | 'times' | 'placedAt'>, now: number, area?: Pick<Area, 'rideMin'>): number {
  const status = nextStatus(order)
  if (!status) return now
  const previous = order.times[order.status] ?? order.placedAt
  const gap = status === 'delivered' ? (area?.rideMin ?? 15) : (STEP_MINUTES[status] ?? 0)
  return Math.max(now, previous + gap * MINUTE)
}

/** A step the team taps by hand happens now, but never before the order's latest recorded step. */
export function manualStepAt(order: Pick<Order, 'times' | 'placedAt'>, now: number): number {
  const stamps = Object.values(order.times).filter((t): t is number => typeof t === 'number')
  return Math.max(now, order.placedAt, ...stamps)
}

/** The rider with the fewest orders on the road. Ties go to the first in the list. */
export function pickRider(orders: Order[], riders: Rider[]): Rider {
  return riders.reduce((best, r) => (ridesOut(orders, r.id) < ridesOut(orders, best.id) ? r : best), riders[0])
}

export function ridesOut(orders: Order[], rider: RiderId): number {
  return orders.filter((o) => o.status === 'out' && o.rider === rider).length
}

/* Times */

function minutesSince(at: number | undefined, now: number): number {
  return at === undefined ? 0 : Math.max(0, (now - at) / MINUTE)
}

/**
 * Minutes until the food arrives (delivery) or is ready (pickup), on the demo clock.
 * Counts down as time passes and drops when the kitchen moves the order. Null once it's done.
 */
export function etaFor(
  order: Pick<Order, 'mode' | 'status' | 'times' | 'placedAt'>,
  now: number,
  busy: boolean,
  area?: Pick<Area, 'rideMin'>,
): number | null {
  if (order.mode === 'dine-in') return null
  const ride = order.mode === 'delivery' ? (area?.rideMin ?? 15) + HANDOVER_MIN : 0
  switch (order.status) {
    case 'received': {
      const queue = order.mode === 'delivery' && busy ? BUSY_EXTRA : 0
      return Math.ceil(Math.max(COOK_MIN, KITCHEN_TARGET - minutesSince(order.placedAt, now)) + queue + ride)
    }
    case 'cooking':
      return Math.ceil(Math.max(2, COOK_MIN - minutesSince(order.times.cooking, now)) + ride)
    case 'ready':
      return order.mode === 'delivery' ? ride : 0
    case 'out':
      return Math.max(1, Math.ceil((area?.rideMin ?? 15) - minutesSince(order.times.out, now)))
    default:
      return null
  }
}

export function ticketMinutes(order: Pick<Order, 'placedAt'>, now: number): number {
  return Math.floor(minutesSince(order.placedAt, now))
}

export type TimerTone = 'normal' | 'amber' | 'red'

export function timerTone(minutes: number): TimerTone {
  if (minutes >= 20) return 'red'
  if (minutes >= 12) return 'amber'
  return 'normal'
}

/** A delivery past its promised time, or a pickup not ready in time. Open orders count from now. */
export function isLate(order: Order, now: number): boolean {
  if (order.promisedMin === undefined) return false
  const end = order.mode === 'delivery' ? order.times.delivered : order.times.ready
  return ((end ?? now) - order.placedAt) / MINUTE > order.promisedMin
}

function countDishes(orders: Order[], skip: Set<string>): { name: string; qty: number }[] {
  const counts = new Map<string, number>()
  for (const order of orders)
    for (const line of order.lines) if (!skip.has(line.itemId)) counts.set(line.name, (counts.get(line.name) ?? 0) + line.qty)
  return [...counts].map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name))
}

/** Dishes waiting or on the grill, most first: what the kitchen still has to cook. `skip` leaves out drinks. */
export function allDayCounts(orders: Order[], skip: Set<string> = new Set()): { name: string; qty: number }[] {
  return countDishes(
    orders.filter((o) => o.status === 'received' || o.status === 'cooking'),
    skip,
  )
}

/* Reports */

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0)

export const CHANNELS: Channel[] = ['App', 'Website', 'Phone', 'Dine-in']
export const CHART_HOURS = Array.from({ length: 12 }, (_, i) => 11 + i)

export type DaySummary = ReturnType<typeof daySummary>

/** Figures for the Today screen and the metrics strip. `skip` leaves drinks out of the top dishes. */
export function daySummary(orders: Order[], now: number, eveningFrom: number, skip: Set<string> = new Set()) {
  const tonight = orders.filter((o) => o.placedAt >= eveningFrom)
  const ticketTimes = orders.filter((o) => o.times.ready !== undefined).map((o) => (o.times.ready! - o.placedAt) / MINUTE)
  const delivered = orders.filter((o) => o.mode === 'delivery' && o.times.delivered !== undefined)
  const onTime = delivered.filter((o) => !isLate(o, now)).length
  const rated = orders.filter((o) => o.rating)
  const sales = round2(orders.reduce((sum, o) => sum + o.total, 0))
  return {
    count: orders.length,
    sales,
    averageOrder: orders.length ? round2(sales / orders.length) : 0,
    tonight: {
      count: tonight.length,
      delivery: tonight.filter((o) => o.mode === 'delivery').length,
      pickup: tonight.filter((o) => o.mode === 'pickup').length,
      dineIn: tonight.filter((o) => o.mode === 'dine-in').length,
      online: tonight.filter((o) => o.channel === 'App' || o.channel === 'Website').length,
    },
    avgTicket: mean(ticketTimes),
    avgDelivery: mean(delivered.map((o) => (o.times.delivered! - o.placedAt) / MINUTE)),
    deliveredCount: delivered.length,
    onTimePct: delivered.length ? (onTime / delivered.length) * 100 : 100,
    late: orders.filter((o) => isLate(o, now)).length,
    byHour: CHART_HOURS.map((h) => ({ hour: h, count: orders.filter((o) => new Date(o.placedAt).getHours() === h).length })),
    channels: CHANNELS.map((c) => ({ channel: c, count: orders.filter((o) => o.channel === c).length })),
    top: countDishes(orders, skip).slice(0, 5),
    ratings: { up: rated.filter((o) => o.rating!.up).length, total: rated.length },
  }
}

/* Seeded day */

export interface DayInput {
  seed: number
  items: MenuItem[]
  areas: Area[]
  names: string[]
  /** Relative popularity by item or area id. Anything not listed counts as 1. */
  weights: Record<string, number>
  /** [hour, orders placed in that hour] */
  hourly: [number, number][]
  at: (hours: number, minutes: number) => number
  /** Every generated order is finished by this time. */
  cutoff: number
}

const PAYMENTS: Payment[] = ['card', 'card', 'cash', 'online', 'online']

/** A finished day of orders up to `cutoff`, identical on every visit. Ids and numbers are added by the caller. */
export function generateDay(input: DayInput): Order[] {
  const rand = seededRandom(input.seed)
  const pick = <T>(list: T[]): T => list[Math.floor(rand() * list.length)]
  const pool = input.items.flatMap((item) => Array<MenuItem>(input.weights[item.id] ?? 1).fill(item))
  const areaPool = input.areas.flatMap((a) => Array<Area>(input.weights[a.id] ?? 1).fill(a))
  const round = (t: number) => Math.round(t / MINUTE) * MINUTE
  const orders: Order[] = []

  const makeLine = (item: MenuItem): OrderLine => {
    const options: LineOptions = {
      size: item.largeDelta && rand() < 0.25 ? 'Large' : 'Regular',
      spice: item.spice ? pick(SPICES) : undefined,
      extras: item.extras.filter(() => rand() < 0.15),
      notes: '',
    }
    return { itemId: item.id, name: item.name, qty: rand() > 0.78 ? 2 : 1, unit: priceLine(item, options), options }
  }

  for (const [hour, count] of input.hourly) {
    for (let n = 0; n < count; n++) {
      const placed = input.at(hour, Math.floor(rand() * 60))
      const roll = rand()
      let mode: Mode = roll < 0.22 ? 'dine-in' : roll < 0.5 ? 'pickup' : 'delivery'
      const channelRoll = rand()
      const channel: Channel = mode === 'dine-in' ? 'Dine-in' : channelRoll < 0.5 ? 'App' : channelRoll < 0.8 ? 'Website' : 'Phone'
      let area = mode === 'delivery' ? pick(areaPool) : undefined

      const lines: OrderLine[] = []
      const lineCount = 1 + Math.floor(rand() * rand() * 4)
      for (let i = 0; i < lineCount; i++) {
        const item = pick(pool)
        if (!lines.some((l) => l.itemId === item.id)) lines.push(makeLine(item))
      }
      // Delivery orders respect the minimum, like the real app.
      for (let guard = 0; mode === 'delivery' && cartTotals(lines, area, mode).short > 0 && guard < 6; guard++) {
        const item = pick(pool)
        const same = lines.find((l) => l.itemId === item.id)
        if (same) same.qty += 1
        else lines.push(makeLine(item))
      }

      const peak = (hour >= 12 && hour <= 13) || hour >= 18
      const ticket = 10 + rand() * 7 + (peak ? 3 : 0) + (rand() < 0.07 ? 8 : 0)
      const cooking = 1 + rand() * 3
      const outGap = 2 + rand() * 5
      const rideExtra = -2 + rand() * 7 + (rand() < 0.1 ? 17 : 0)
      const collectGap = 2 + rand() * 12
      const stepsFor = (m: Mode, a?: Area): [Status, number][] => {
        const base: [Status, number][] = [
          ['received', 0],
          ['cooking', cooking],
          ['ready', ticket],
        ]
        if (m === 'delivery' && a) return [...base, ['out', ticket + outGap], ['delivered', ticket + outGap + a.rideMin + rideExtra]]
        if (m === 'pickup') return [...base, ['collected', ticket + collectGap]]
        return [...base, ['served', ticket + 1]]
      }
      let steps = stepsFor(mode, area)
      const lastOffset = () => steps[steps.length - 1][1] * MINUTE
      // Late in the day a long delivery would still be on the road, so it becomes a pickup.
      if (mode === 'delivery' && placed + lastOffset() > input.cutoff) {
        mode = 'pickup'
        area = undefined
        steps = stepsFor(mode)
      }
      const start = placed + lastOffset() > input.cutoff ? input.cutoff - lastOffset() - Math.floor(rand() * 8) * MINUTE : placed
      const times: Order['times'] = {}
      for (const [status, offset] of steps) times[status] = round(start + offset * MINUTE)

      const table = mode === 'dine-in' ? 1 + Math.floor(rand() * 14) : undefined
      const totals = cartTotals(lines, area, mode)
      const order: Order = {
        id: '',
        number: '',
        mode,
        channel,
        customer: table ? `Table ${table}` : pick(input.names),
        areaId: area?.id,
        table,
        payment: mode === 'dine-in' ? pick<Payment>(['card', 'cash']) : pick(PAYMENTS),
        lines,
        subtotal: totals.subtotal,
        fee: totals.fee,
        vat: totals.vat,
        total: totals.total,
        status: steps[steps.length - 1][0],
        placedAt: times.received!,
        times,
        promisedMin: promisedFor(mode, area, false),
        messages: [],
      }
      if (mode !== 'dine-in' && rand() < 0.4) order.rating = { up: rand() < (isLate(order, input.cutoff) ? 0.5 : 0.93) }
      orders.push(order)
    }
  }
  return orders.sort((a, b) => a.placedAt - b.placedAt)
}
