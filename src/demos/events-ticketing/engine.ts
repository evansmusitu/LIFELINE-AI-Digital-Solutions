import { clockTime, initials, round2, shortDate } from '../../lib/format'
import { DAY, MINUTE, todayAt } from '../../lib/time'
import {
  FESTIVAL,
  MAX_PER_ORDER,
  PAY_METHODS,
  PROMO,
  SALES_DAYS,
  SEED_CHECKINS,
  SEED_ORDERS,
  SEED_PROMO,
  SEED_SOLD,
  TYPE,
  TYPES,
  ZIG_RATE,
  dailySales,
} from './data'
import type {
  Buyer,
  Cart,
  CheckIn,
  Draft,
  FestivalState,
  GateId,
  Order,
  OrderLine,
  PayMethod,
  ScanOutcome,
  Ticket,
  TypeCode,
  TypeId,
  VoidedTicket,
} from './types'

/* Pure logic for the festival demo: pricing, tickets, QR payloads, gate scans, calendar files and reports. */

const TYPE_IDS = TYPES.map((t) => t.id)
const sumOf = (values: number[]) => values.reduce((a, b) => a + b, 0)
const byType = (fn: (id: TypeId) => number) => Object.fromEntries(TYPE_IDS.map((id) => [id, fn(id)])) as Record<TypeId, number>

export const emptyCart = (): Cart => byType(() => 0)

/* Dates */

/** Midnight on the third Saturday after today (15 to 21 days away). */
export function festivalDate(today: number): number {
  const d = new Date(today)
  d.setHours(0, 0, 0, 0)
  const toSaturday = (6 - d.getDay() + 7) % 7 || 7
  d.setDate(d.getDate() + toSaturday + 14)
  return d.getTime()
}

export function daysToGo(today: number, festival: number): number {
  const d = new Date(today)
  d.setHours(0, 0, 0, 0)
  return Math.round((festival - d.getTime()) / DAY)
}

export function longDate(at: number): string {
  return new Date(at).toLocaleDateString(FESTIVAL.locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

/* Money */

export const toZig = (usd: number) => round2(usd * ZIG_RATE)

export function zig(usd: number, whole = false): string {
  const digits = whole ? 0 : 2
  return `ZiG ${toZig(usd).toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
}

export const promoMatches = (code: string) => code.trim().toUpperCase() === PROMO.code

export function orderTotals(cart: Cart, promo: string | null) {
  const lines: (OrderLine & { amount: number })[] = TYPES.filter((t) => cart[t.id] > 0).map((t) => ({
    type: t.id,
    qty: cart[t.id],
    unit: t.price,
    amount: round2(t.price * cart[t.id]),
  }))
  const count = sumOf(lines.map((l) => l.qty))
  const subtotal = round2(sumOf(lines.map((l) => l.amount)))
  const discount = promo && promoMatches(promo) ? round2(cart[PROMO.type] * TYPE[PROMO.type].price * PROMO.rate) : 0
  const total = round2(subtotal - discount)
  return { lines, count, subtotal, discount, total }
}

/* Capacity and order rules */

export function soldByType(orders: Order[]): Record<TypeId, number> {
  return byType((id) => SEED_SOLD[id] + sumOf(orders.flatMap((o) => o.lines.filter((l) => l.type === id).map((l) => l.qty))))
}

/** Places left at the festival as a whole, across every ticket type. */
export function capacityLeft(orders: Order[]): number {
  return Math.max(0, FESTIVAL.totalCapacity - sumOf(Object.values(soldByType(orders))))
}

export function remainingByType(orders: Order[]): Record<TypeId, number> {
  const sold = soldByType(orders)
  const totalLeft = capacityLeft(orders)
  return byType((id) => Math.max(0, Math.min(TYPE[id].capacity - sold[id], totalLeft)))
}

/**
 * Problems that stop the order. Empty means it can go ahead. `left` is the festival-wide capacity: each type
 * can have a place left while the cart as a whole is still too big for the festival.
 */
export function cartIssues(cart: Cart, remaining: Record<TypeId, number>, left: number): string[] {
  const issues: string[] = []
  const count = sumOf(Object.values(cart))
  if (count > MAX_PER_ORDER) issues.push(`You can buy up to ${MAX_PER_ORDER} tickets in one order.`)
  if (count > left) issues.push(left === 0 ? 'The festival is sold out.' : `Only ${left} ${left === 1 ? 'place is' : 'places are'} left at the festival.`)
  if (cart.child > 0 && !TYPES.some((t) => t.adult && cart[t.id] > 0))
    issues.push('Under 12 tickets need an adult ticket in the same order.')
  for (const t of TYPES)
    if (cart[t.id] > remaining[t.id])
      issues.push(remaining[t.id] === 0 ? `${t.name} is sold out.` : `Only ${remaining[t.id]} ${t.name} tickets left.`)
  return issues
}

/** Highest quantity the stepper allows for one type, given the rest of the cart. */
export function maxFor(id: TypeId, cart: Cart, remaining: Record<TypeId, number>, left: number): number {
  const others = sumOf(TYPE_IDS.filter((t) => t !== id).map((t) => cart[t]))
  return Math.max(0, Math.min(remaining[id], MAX_PER_ORDER - others, left - others))
}

export function phoneDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('0')) return `263${digits.slice(1)}`
  return digits
}

/** "+263 77 ••• 4410". Assumes a Zimbabwe number when it starts with 0. */
export function maskPhone(raw: string): string {
  const digits = phoneDigits(raw)
  if (digits.length < 7) return raw.trim()
  const cc = digits.startsWith('263') ? '263' : digits.startsWith('27') ? '27' : digits.slice(0, Math.max(1, digits.length - 9))
  const national = digits.slice(cc.length)
  return `+${cc} ${national.slice(0, 2)} ••• ${national.slice(-4)}`
}

export function buyerIssues(buyer: Buyer): Partial<Record<keyof Buyer, string>> {
  const issues: Partial<Record<keyof Buyer, string>> = {}
  if (buyer.name.trim().length < 2) issues.name = 'Enter the buyer’s name.'
  const digits = phoneDigits(buyer.mobile)
  if (digits.length < 10 || digits.length > 13) issues.mobile = 'Enter a mobile number, for example 077 214 4410.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.email.trim())) issues.email = 'Enter a valid email address.'
  return issues
}

/** "Tendai Moyo" becomes "T. Moyo", the way gate staff read a name aloud. */
export function holderShort(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 2) return parts[0] ?? ''
  return `${parts[0][0].toUpperCase()}. ${parts[parts.length - 1]}`
}

/** The visitor's tickets, newest order first, in ticket order within an order. */
export const walletOrder = (tickets: Ticket[]) =>
  tickets.filter((t) => t.mine).sort((a, b) => b.issuedAt - a.issuedAt || a.id.localeCompare(b.id))

export const ticketCode = (type: TypeId, serial: number) => `MSF-${TYPE[type].code}-${String(serial % 10000).padStart(4, '0')}`

/** One ticket per unit, numbered from `nextSerial`. A blank holder name means the buyer. */
export function issueTickets(order: Order, nextSerial: number, holders: Record<string, string>): Ticket[] {
  const tickets: Ticket[] = []
  let serial = nextSerial
  for (const line of order.lines)
    for (let i = 0; i < line.qty; i++) {
      tickets.push({
        id: ticketCode(line.type, serial++),
        type: line.type,
        holder: holders[`${line.type}-${i}`]?.trim() || order.buyer.name.trim(),
        orderId: order.id,
        issuedAt: order.at,
        mine: true,
      })
    }
  return tickets
}

/** Turns the checkout form into an order with its tickets. Returns null if a rule blocks it. */
export function placeOrder(state: FestivalState, draft: Draft, at: number, id: string) {
  const remaining = remainingByType(state.orders)
  const totals = orderTotals(draft.cart, draft.promo)
  const left = capacityLeft(state.orders)
  if (!totals.count || cartIssues(draft.cart, remaining, left).length || Object.keys(buyerIssues(draft.buyer)).length) return null
  const order: Order = {
    id,
    number: state.nextOrder,
    at,
    buyer: { name: draft.buyer.name.trim(), mobile: maskPhone(draft.buyer.mobile), email: draft.buyer.email.trim() },
    lines: totals.lines.map(({ type, qty, unit }) => ({ type, qty, unit })),
    subtotal: totals.subtotal,
    discount: totals.discount,
    total: totals.total,
    promo: totals.discount > 0 || (draft.promo && promoMatches(draft.promo)) ? PROMO.code : undefined,
    payment: draft.payment,
    ticketIds: [],
  }
  const tickets = issueTickets(order, state.nextSerial, draft.holders)
  order.ticketIds = tickets.map((t) => t.id)
  const next: FestivalState = {
    ...state,
    orders: [...state.orders, order],
    tickets: [...state.tickets, ...tickets],
    nextSerial: state.nextSerial + tickets.length,
    nextOrder: state.nextOrder + 1,
  }
  return { state: next, order, tickets }
}

/** Gives the ticket a new holder and a new code. The old code goes on the voided list. */
export function transferTicket(state: FestivalState, id: string, newHolder: string, at: number) {
  const ticket = state.tickets.find((t) => t.id === id)
  const name = newHolder.trim()
  if (!ticket || name.length < 2 || state.checkins.some((c) => c.ticketId === id)) return null
  const newId = ticketCode(ticket.type, state.nextSerial)
  const voided: VoidedTicket = { id, type: ticket.type, holder: ticket.holder, replacedBy: newId, at, mine: ticket.mine }
  const next: FestivalState = {
    ...state,
    nextSerial: state.nextSerial + 1,
    tickets: state.tickets.map((t) =>
      t.id === id ? { ...t, id: newId, holder: name, transferredFrom: id, issuedAt: at, sharedAt: undefined } : t,
    ),
    voided: [voided, ...state.voided],
    orders: state.orders.map((o) => (o.ticketIds.includes(id) ? { ...o, ticketIds: o.ticketIds.map((x) => (x === id ? newId : x)) } : o)),
  }
  return { state: next, newId }
}

/* QR payloads: MSF26|<ticket code>|<type code>|<holder initials>|<check> */

const PREFIX = 'MSF26'
// A real build signs tickets on the server with a secret key. This fixed key is only for the demo.
const DEMO_KEY = 'msasa-sky-demo-2026'

function fnv1a(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

export function checksum(id: string, code: string, holderInitials: string): string {
  return (fnv1a(`${PREFIX}|${id}|${code}|${holderInitials}|${DEMO_KEY}`) % 36 ** 4).toString(36).toUpperCase().padStart(4, '0')
}

export const initialsFor = (holder: string) => initials(holder).replace(/\|/g, '') || 'X'

export function payloadFor(ticket: Pick<Ticket, 'id' | 'type' | 'holder'>): string {
  const code = TYPE[ticket.type].code
  const ini = initialsFor(ticket.holder)
  return `${PREFIX}|${ticket.id}|${code}|${ini}|${checksum(ticket.id, code, ini)}`
}

export type ParsedPayload =
  | { ok: true; id: string; code: TypeCode; type: TypeId; initials: string }
  | { ok: false; reason: 'format' | 'event' | 'checksum' }

export function parsePayload(text: string): ParsedPayload {
  const parts = text.trim().split('|')
  if (parts.length !== 5) return { ok: false, reason: parts[0]?.startsWith(PREFIX) ? 'format' : 'event' }
  const [prefix, id, code, ini, check] = parts
  if (prefix !== PREFIX) return { ok: false, reason: 'event' }
  const type = TYPES.find((t) => t.code === code)
  if (!type || id !== `MSF-${code}-${id.slice(-4)}` || !/^\d{4}$/.test(id.slice(-4)) || !ini || ini.length > 3)
    return { ok: false, reason: 'format' }
  if (checksum(id, code, ini) !== check.toUpperCase()) return { ok: false, reason: 'checksum' }
  return { ok: true, id, code: type.code, type: type.id, initials: ini }
}

/** Accepts "msf gen 4821", "MSF-GEN-4821" or a full QR payload. Returns a ticket code or the payload. */
export function normaliseEntry(input: string): string {
  const text = input.trim()
  if (text.includes('|')) return text
  const m = text.toUpperCase().replace(/\s+/g, '').match(/^MSF-?([A-Z0-9]{3})-?(\d{4})$/)
  return m ? `MSF-${m[1]}-${m[2]}` : text.toUpperCase()
}

interface ScanContext {
  tickets: Ticket[]
  voided: VoidedTicket[]
  checkins: CheckIn[]
}

const INVALID_DETAIL = {
  format: 'This code isn’t a festival ticket. Ask for the ticket in the Msasa Sky app.',
  event: 'This code is for something else, not this festival.',
  checksum: 'The code has been changed or made up. The check digits don’t match.',
}

/** What the gate sees for a scanned payload. Validation works offline: the check digits prove the ticket is ours. */
export function scanResult(text: string, gate: GateId, ctx: ScanContext): ScanOutcome {
  const parsed = parsePayload(text)
  const shown = text.trim().split('|')[1] ?? (text.trim().slice(0, 24) || 'Empty code')
  if (!parsed.ok) return { kind: 'invalid', title: 'Not a Msasa Sky ticket', detail: INVALID_DETAIL[parsed.reason], code: shown }
  const type = TYPE[parsed.type]
  const voided = ctx.voided.find((v) => v.id === parsed.id)
  if (voided)
    return {
      kind: 'transferred',
      title: 'Transferred, not valid',
      detail: `This ticket was moved to a new holder on ${shortDate(voided.at)} and replaced by ${voided.replacedBy}. Ask for the new ticket.`,
      code: parsed.id,
      type: type.id,
      holder: holderShort(voided.holder),
    }
  const ticket = ctx.tickets.find((t) => t.id === parsed.id)
  const holder = ticket ? holderShort(ticket.holder) : `${parsed.initials.split('').join('. ')}.`
  const base = { code: parsed.id, ticketId: parsed.id, type: type.id, holder }
  const prior = ctx.checkins.find((c) => c.ticketId === parsed.id)
  if (prior)
    return {
      ...base,
      kind: 'used',
      title: `Already checked in at ${clockTime(prior.at)} Gate ${prior.gate}`,
      detail: `${type.name} · ${holder}. Don’t let this code in twice. Send the holder to the help desk.`,
    }
  if (!type.gates.includes(gate))
    return {
      ...base,
      kind: 'wrong-gate',
      title: `${type.id === 'vip' ? 'VIP ticket' : type.name}: please use Gate ${type.gates[0]}`,
      detail: `${holder} · ${type.id === 'vip' ? 'VIP entry, seating and drink voucher are at Gate B.' : 'Gate B is for VIP and family tickets.'}`,
    }
  return { ...base, kind: 'valid', title: 'Valid', detail: `${type.name} · ${holder} · Welcome` }
}

export const TICKET_CODE = /^MSF-[A-Z0-9]{3}-\d{4}$/

/** A scanned payload or a typed code. Typed codes are looked up on this device, since they carry no check digits. */
export function scanEntry(input: string, gate: GateId, ctx: ScanContext): ScanOutcome {
  const code = normaliseEntry(input)
  if (!TICKET_CODE.test(code)) return scanResult(input, gate, ctx)
  const known = ctx.tickets.find((t) => t.id === code) ?? ctx.voided.find((v) => v.id === code)
  if (known) return scanResult(payloadFor(known), gate, ctx)
  return {
    kind: 'invalid',
    title: 'Not a Msasa Sky ticket',
    detail: `This scanner has no ticket with the code ${code}. Scan the QR code instead: its check digits work offline.`,
    code,
  }
}

/** Records the scan, and checks the ticket in when it's valid. */
export function applyScan(state: FestivalState, outcome: ScanOutcome, gate: GateId, at: number, id: string): FestivalState {
  const { ticketId, type } = outcome
  const scan = { id, at, gate, kind: outcome.kind, code: outcome.code, holder: outcome.holder, type }
  const admit = outcome.kind === 'valid' && ticketId && type && !state.checkins.some((c) => c.ticketId === ticketId)
  return { ...state, scans: [scan, ...state.scans], checkins: admit ? [...state.checkins, { ticketId, type, at, gate }] : state.checkins }
}

/** "Let in anyway" after a wrong-gate warning: checks the ticket in and marks the scan as an override. */
export function letInAnyway(state: FestivalState, scanId: string, outcome: ScanOutcome, gate: GateId, at: number): FestivalState {
  const { ticketId, type } = outcome
  if (outcome.kind !== 'wrong-gate' || !ticketId || !type || state.checkins.some((c) => c.ticketId === ticketId)) return state
  return {
    ...state,
    scans: state.scans.map((s) => (s.id === scanId ? { ...s, override: true } : s)),
    checkins: [...state.checkins, { ticketId, type, at, gate, override: true }],
  }
}

/* Sharing */

/** The message carries the ticket code only. The QR code stays in the app, so a forwarded text can't be scanned in. */
export function whatsAppMessage(ticket: Pick<Ticket, 'id' | 'type' | 'holder'>, festival: number): string {
  const type = TYPE[ticket.type]
  return [
    `🎟️ ${FESTIVAL.name} ticket`,
    `${type.name} for ${ticket.holder}`,
    `${longDate(festival)}, gates open ${FESTIVAL.gatesOpen}`,
    `${FESTIVAL.place}, ${FESTIVAL.city}`,
    '',
    `Ticket code: ${ticket.id}`,
    `Show this code at the gate (${type.entry}). The QR code stays in the ${FESTIVAL.name} app under My tickets.`,
  ].join('\n')
}

/** wa.me without a number lets the sender pick the chat. */
export const whatsAppLink = (ticket: Pick<Ticket, 'id' | 'type' | 'holder'>, festival: number) =>
  `https://wa.me/?text=${encodeURIComponent(whatsAppMessage(ticket, festival))}`

/* Calendar file */

const pad2 = (n: number) => String(n).padStart(2, '0')
const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Folds lines longer than 75 octets (RFC 5545 3.1), never splitting a character. */
export function foldLine(line: string): string {
  const out: string[] = []
  let current = ''
  let octets = 0
  for (const ch of line) {
    const size = new TextEncoder().encode(ch).length
    if (octets + size > 75) {
      out.push(current)
      current = ' '
      octets = 1
    }
    current += ch
    octets += size
  }
  out.push(current)
  return out.join('\r\n')
}

export function icsFor(festival: number, ticket: Pick<Ticket, 'id' | 'type' | 'holder'> | null, stamp: number): string {
  const d = new Date(festival)
  const ymd = `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`
  const utc = new Date(stamp).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const type = ticket ? TYPE[ticket.type] : null
  const description = ticket
    ? `Ticket ${ticket.id}: ${type?.name} for ${ticket.holder}. Gates open ${FESTIVAL.gatesOpen}, music until ${FESTIVAL.musicEnds}. Show the QR code in My tickets at ${type?.entry}.`
    : `Gates open ${FESTIVAL.gatesOpen}, music until ${FESTIVAL.musicEnds}.`
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Msasa Sky Festival//Tickets demo//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE',
    'TZID:Africa/Harare',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0200',
    'TZNAME:CAT',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:${ticket?.id ?? 'festival'}-${ymd}@${FESTIVAL.domain}`,
    `DTSTAMP:${utc}`,
    `DTSTART;TZID=Africa/Harare:${ymd}T110000`,
    `DTEND;TZID=Africa/Harare:${ymd}T220000`,
    `SUMMARY:${icsText(FESTIVAL.name)}`,
    `LOCATION:${icsText(`${FESTIVAL.place}, ${FESTIVAL.city}`)}`,
    `DESCRIPTION:${icsText(description)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsText(`${FESTIVAL.name} is tomorrow`)}`,
    'TRIGGER:-P1D',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return `${lines.map(foldLine).join('\r\n')}\r\n`
}

/* Reports */

export function salesSummary(state: FestivalState, now: number) {
  const sold = soldByType(state.orders)
  const totalSold = sumOf(Object.values(sold))
  const seedRevenue = sumOf(TYPES.map((t) => SEED_SOLD[t.id] * t.price)) - SEED_PROMO.tickets * TYPE[PROMO.type].price * PROMO.rate
  const revenue = round2(seedRevenue + sumOf(state.orders.map((o) => o.total)))
  const promoUses = SEED_PROMO.orders + state.orders.filter((o) => o.promo).length
  const payments = PAY_METHODS.map((m) => ({
    ...m,
    orders: SEED_ORDERS[m.id] + state.orders.filter((o) => o.payment === m.id).length,
  }))

  const days = dailySales()
  const visitorToday = sumOf(state.orders.flatMap((o) => o.lines.map((l) => l.qty)))
  const dayTotals = days.map((d, i) => sumOf(Object.values(d)) + (i === days.length - 1 ? visitorToday : 0))
  const weeks = Array.from({ length: SALES_DAYS / 7 }, (_, w) => {
    const start = todayAt(12) - (SALES_DAYS - 1 - w * 7) * DAY
    return { label: shortDate(start, FESTIVAL.locale), value: sumOf(dayTotals.slice(w * 7, w * 7 + 7)) }
  })
  let running = 0
  const earlyDays = days.findIndex((d) => (running += d.early) >= TYPE.early.capacity) + 1
  const lastWeek = weeks[weeks.length - 1].value
  const busiest = weeks.reduce((best, w) => (w.value > best.value ? w : best), weeks[0])
  return {
    sold,
    totalSold,
    revenue,
    capacityLeft: Math.max(0, FESTIVAL.totalCapacity - totalSold),
    promoUses,
    promoSaved: round2(SEED_PROMO.tickets * TYPE[PROMO.type].price * PROMO.rate + sumOf(state.orders.map((o) => o.discount))),
    payments,
    weeks,
    earlyDays,
    lastWeek,
    busiest,
    visitorTickets: visitorToday,
    salesOpened: todayAt(9) - (SALES_DAYS - 1) * DAY,
    now,
  }
}

export const SLOT_MINUTES = 15

export function checkinSummary(state: FestivalState, gateNow: number) {
  const live = state.checkins.filter((c) => !c.seed)
  const scans = state.scans.filter((s) => !s.seed)
  const count = (kind: string) => scans.filter((s) => s.kind === kind).length
  const opened = todayAt(11)
  const current = Math.max(0, Math.floor((gateNow - opened) / (SLOT_MINUTES * MINUTE)))
  const slotCount = Math.max(current + 1, SEED_CHECKINS.slots.length)
  const slots = Array.from({ length: slotCount }, (_, i) => SEED_CHECKINS.slots[i] ?? 0)
  for (const c of live) {
    const i = Math.floor((c.at - opened) / (SLOT_MINUTES * MINUTE))
    if (i >= 0 && i < slots.length) slots[i]++
  }
  const first = Math.max(0, slotCount - 12)
  const series = slots.slice(first).map((value, k) => {
    const at = opened + (first + k) * SLOT_MINUTES * MINUTE
    return { at, value, current: first + k === current }
  })
  return {
    total: sumOf(Object.values(SEED_CHECKINS.byType)) + live.length,
    byType: byType((id) => SEED_CHECKINS.byType[id] + live.filter((c) => c.type === id).length),
    byGate: {
      A: SEED_CHECKINS.byGate.A + live.filter((c) => c.gate === 'A').length,
      B: SEED_CHECKINS.byGate.B + live.filter((c) => c.gate === 'B').length,
    } as Record<GateId, number>,
    duplicates: SEED_CHECKINS.duplicates + count('used'),
    invalid: SEED_CHECKINS.invalid + count('invalid') + count('transferred'),
    wrongGate: SEED_CHECKINS.wrongGate + count('wrong-gate'),
    overrides: live.filter((c) => c.override).length,
    series,
  }
}

export const payLabel = (id: PayMethod) => PAY_METHODS.find((m) => m.id === id)?.label ?? id
