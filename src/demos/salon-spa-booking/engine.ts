import { clockTime, firstName, money, moneyWhole, round2, shortDate } from '../../lib/format'
import { DAY, HOUR, MINUTE, seededRandom } from '../../lib/time'
import type {
  Appointment,
  Client,
  Reward,
  Service,
  ServiceGroup,
  Draft,
  ServiceId,
  Staff,
  StaffChoice,
  StaffId,
} from './types'

/* Booking rules for the salon: opening hours, the team, services, deposits, slots and loyalty. All pure. */

const at = (h: number, m = 0) => h * 60 + m

export const SALON = {
  name: 'Sunbird & Sage Salon & Spa',
  short: 'Sunbird & Sage',
  area: 'Parkhurst, Johannesburg',
  open: at(8, 30),
  close: at(18),
}

export const STEP_MIN = 15
/** Online clients can book from 15 minutes ahead. */
export const LEAD_MIN = 15
export const DEPOSIT_PERCENT = 30
export const DEPOSIT_FROM = 50
export const FREE_CANCEL_HOURS = 24
export const REFERRAL_POINTS = 100
/** The visitor's card starts with sample points so a reward can be tried straight away. */
export const STARTER_POINTS = 420

export const STAFF: Staff[] = [
  {
    id: 'naledi',
    name: 'Naledi Khumalo',
    role: 'Senior stylist, colour',
    email: 'naledi@sunbirdandsage.co.za',
    start: at(8, 30),
    end: at(17, 30),
    lunch: [at(12, 30), at(13, 30)],
    services: ['cut', 'blowdry', 'colour', 'roots', 'silkpress'],
  },
  {
    id: 'zara',
    name: 'Zara Patel',
    role: 'Stylist, braids and natural hair',
    email: 'zara@sunbirdandsage.co.za',
    start: at(9),
    end: at(18),
    lunch: [at(13), at(14)],
    services: ['cut', 'blowdry', 'braids', 'silkpress'],
  },
  {
    id: 'lerato',
    name: 'Lerato Dube',
    role: 'Nail technician',
    email: 'lerato@sunbirdandsage.co.za',
    start: at(8, 30),
    end: at(17),
    lunch: [at(12), at(12, 45)],
    services: ['manicure', 'pedicure', 'removal'],
  },
  {
    id: 'kgomotso',
    name: 'Kgomotso Mahlaba',
    role: 'Spa therapist, massage and facials',
    email: 'kgomotso@sunbirdandsage.co.za',
    start: at(9),
    end: at(18),
    lunch: [at(13, 30), at(14, 15)],
    services: ['swedish60', 'swedish90', 'deeptissue', 'facial'],
  },
]

export const GROUPS: ServiceGroup[] = ['Hair', 'Nails', 'Spa']

type ServiceRow = [ServiceId, string, ServiceGroup, number, number, number]

const SERVICE_ROWS: ServiceRow[] = [
  ['cut', 'Cut and blow-dry', 'Hair', 60, 38, 6],
  ['blowdry', 'Blow-dry', 'Hair', 45, 22, 2],
  ['colour', 'Full colour', 'Hair', 120, 95, 8],
  ['roots', 'Root touch-up', 'Hair', 90, 65, 6],
  ['braids', 'Knotless braids', 'Hair', 240, 120, 8],
  ['silkpress', 'Silk press', 'Hair', 90, 55, 4],
  ['manicure', 'Gel manicure', 'Nails', 60, 28, 3],
  ['pedicure', 'Gel pedicure', 'Nails', 75, 34, 4],
  ['removal', 'Gel removal', 'Nails', 20, 8, 3],
  ['swedish60', 'Swedish massage', 'Spa', 60, 48, 4],
  ['swedish90', 'Swedish massage', 'Spa', 90, 66, 4],
  ['deeptissue', 'Deep-tissue massage', 'Spa', 60, 55, 4],
  ['facial', 'Signature facial', 'Spa', 75, 60, 5],
]

export const SERVICES: Service[] = SERVICE_ROWS.map(([id, name, group, minutes, price, rebookWeeks]) => ({
  id,
  name,
  label: id.startsWith('swedish') ? `${name} (${minutes} min)` : name,
  group,
  minutes,
  price,
  rebookWeeks,
}))

export const REWARDS: Reward[] = [
  { id: 'blowdry', name: 'Free blow-dry', points: 300, prefix: 'BLOW' },
  { id: 'spa15', name: '$15 off any spa treatment', points: 500, prefix: 'SPA' },
  { id: 'manicure', name: 'Free gel manicure', points: 800, prefix: 'MANI' },
]

export type Tier = 'Bronze' | 'Silver' | 'Gold'
export const TIERS: { tier: Tier; from: number }[] = [
  { tier: 'Bronze', from: 0 },
  { tier: 'Silver', from: 500 },
  { tier: 'Gold', from: 1500 },
]

export const serviceById = (id: ServiceId) => SERVICES.find((s) => s.id === id) ?? SERVICES[0]
export const staffById = (id: StaffId) => STAFF.find((s) => s.id === id) ?? STAFF[0]
export const staffFor = (serviceId: ServiceId) => STAFF.filter((s) => s.services.includes(serviceId))
export const staffFirst = (id: StaffId) => firstName(staffById(id).name)
/** A service name inside a sentence: "a gel manicure", but "a Swedish massage". */
export const inSentence = (s: Service) => (s.name.startsWith('Swedish') ? s.label : s.label.charAt(0).toLowerCase() + s.label.slice(1))
const capitalFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
/** "a gel manicure", but "knotless braids". */
export const withArticle = (s: Service) => (s.id === 'braids' ? inSentence(s) : `a ${inSentence(s)}`)

/* Days and times. Days are local midnights; times inside a day are minutes after midnight. */

export function dayStart(time: number): number {
  const d = new Date(time)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Calendar-based, so clock changes never shift a day. */
export function addDays(day: number, n: number): number {
  const d = new Date(day)
  d.setDate(d.getDate() + n)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export const atMinute = (day: number, minute: number) => {
  const d = new Date(day)
  d.setHours(0, minute, 0, 0)
  return d.getTime()
}

export const minuteOfDay = (time: number) => {
  const d = new Date(time)
  return d.getHours() * 60 + d.getMinutes()
}

export const sameDay = (a: number, b: number) => dayStart(a) === dayStart(b)

/** Open Tuesday to Saturday. */
export const isOpenWeekday = (day: number) => {
  const w = new Date(day).getDay()
  return w >= 2 && w <= 6
}

/** `from`'s own day (the demo always treats today as open), then the next open days. */
export function openDays(from: number, n: number): number[] {
  if (n <= 0) return []
  const days = [dayStart(from)]
  let day = days[0]
  while (days.length < n) {
    day = addDays(day, 1)
    if (isOpenWeekday(day)) days.push(day)
  }
  return days
}

export const hhmm = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`

/** "Tue 11 Nov" */
export const dayLabel = (time: number) => new Date(time).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

/** "Tuesday 11 November" */
export const dayLong = (time: number) => new Date(time).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

/** "today at 10:00", "tomorrow at 10:00", "Thu 13 Nov at 10:00" */
export function whenLabel(time: number, now: number): string {
  const day = dayStart(time)
  const today = dayStart(now)
  const prefix = day === today ? 'today' : day === addDays(today, 1) ? 'tomorrow' : dayLabel(time)
  return `${prefix} at ${clockTime(time)}`
}

/* Booking flow */

export const emptyDraft = (keep?: Pick<Draft, 'name' | 'phone' | 'email'>): Draft => ({
  step: 1,
  staffChoice: 'any',
  name: keep?.name ?? '',
  phone: keep?.phone ?? '',
  email: keep?.email ?? '',
  notes: '',
  reminder: true,
})

/* Slot finding */

/** Cancelled bookings free their time. Everything else, including no-shows, keeps it. */
export const blocksTime = (a: Appointment) => a.status !== 'Cancelled'

const workWindow = (staff: Staff): [number, number] => [Math.max(staff.start, SALON.open), Math.min(staff.end, SALON.close)]

export function availableMinutes(staff: Staff): number {
  const [from, to] = workWindow(staff)
  return to - from - (staff.lunch[1] - staff.lunch[0])
}

function staffDay(staffId: StaffId, day: number, appointments: Appointment[]) {
  return appointments.filter((a) => a.staffId === staffId && blocksTime(a) && sameDay(a.start, day))
}

const overlaps = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1

export type Clash = 'hours' | 'lunch' | 'booked'

/** Why a time doesn't work for this team member, or null when the whole service fits. */
export function clash(staff: Staff, day: number, minute: number, duration: number, appointments: Appointment[]): Clash | null {
  const [from, to] = workWindow(staff)
  if (duration <= 0 || minute < from || minute + duration > to) return 'hours'
  if (overlaps(minute, minute + duration, staff.lunch[0], staff.lunch[1])) return 'lunch'
  const busy = staffDay(staff.id, day, appointments).some((a) => {
    const start = minuteOfDay(a.start)
    return overlaps(minute, minute + duration, start, start + a.duration)
  })
  return busy ? 'booked' : null
}

/**
 * Start times (minutes after midnight) where the whole service fits into this person's free time:
 * inside working hours and opening hours, clear of lunch and of every booking that holds time.
 */
export function freeSlots(
  staff: Staff,
  day: number,
  durationMin: number,
  appointments: Appointment[],
  step = STEP_MIN,
  earliest = 0,
): number[] {
  if (durationMin <= 0 || step <= 0) return []
  const [from, to] = workWindow(staff)
  const busy = staffDay(staff.id, day, appointments).map((a) => [minuteOfDay(a.start), minuteOfDay(a.start) + a.duration])
  busy.push(staff.lunch)
  const slots: number[] = []
  for (let m = from; m + durationMin <= to; m += step) {
    if (earliest && atMinute(day, m) < earliest) continue
    if (busy.some(([s, e]) => overlaps(m, m + durationMin, s, e))) continue
    slots.push(m)
  }
  return slots
}

export interface Slot {
  minute: number
  /** Everyone who could take this slot, in team order. */
  staffIds: StaffId[]
}

/** Slots for one person, or for "Anyone available" merged across everyone who does the service. */
export function slotsForService(service: Service, choice: StaffChoice, day: number, appointments: Appointment[], earliest = 0): Slot[] {
  const team = staffFor(service.id).filter((s) => choice === 'any' || s.id === choice)
  const merged = new Map<number, StaffId[]>()
  for (const staff of team)
    for (const minute of freeSlots(staff, day, service.minutes, appointments, STEP_MIN, earliest))
      merged.set(minute, [...(merged.get(minute) ?? []), staff.id])
  return [...merged.entries()].sort((a, b) => a[0] - b[0]).map(([minute, staffIds]) => ({ minute, staffIds }))
}

export function bookedMinutes(staffId: StaffId, day: number, appointments: Appointment[]): number {
  return staffDay(staffId, day, appointments).reduce((sum, a) => sum + a.duration, 0)
}

/** "Anyone available": whoever is free at that time with the fewest booked minutes that day. Ties go in team order. */
export function assignAnyone(service: Service, day: number, minute: number, appointments: Appointment[]): StaffId | null {
  const free = staffFor(service.id).filter((s) => !clash(s, day, minute, service.minutes, appointments))
  if (!free.length) return null
  return free
    .map((s) => ({ id: s.id, load: bookedMinutes(s.id, day, appointments) }))
    .reduce((best, s) => (s.load < best.load ? s : best)).id
}

export interface BookingRequest {
  serviceId: ServiceId
  staffChoice: StaffChoice
  day: number
  minute: number
}

export type BookingCheck = { ok: true; staffId: StaffId } | { ok: false; message: string }

/** Checked again at the moment of booking, so the same time can never be booked twice. */
export function checkBooking(appointments: Appointment[], request: BookingRequest, now: number): BookingCheck {
  const service = SERVICES.find((s) => s.id === request.serviceId)
  if (!service) return { ok: false, message: 'Please choose a service.' }
  const start = atMinute(request.day, request.minute)
  const when = `${hhmm(request.minute)} on ${dayLabel(request.day)}`
  if (!sameDay(request.day, now) && !isOpenWeekday(request.day)) return { ok: false, message: 'The salon is closed on Sundays and Mondays.' }
  if (start < now) return { ok: false, message: `${when} has already passed. Please choose another time.` }
  if (request.staffChoice === 'any') {
    const staffId = assignAnyone(service, request.day, request.minute, appointments)
    return staffId
      ? { ok: true, staffId }
      : { ok: false, message: `Sorry, nobody is free for ${withArticle(service)} at ${when} any more. Please choose another time.` }
  }
  const staff = STAFF.find((s) => s.id === request.staffChoice)
  if (!staff || !staff.services.includes(service.id)) return { ok: false, message: `${staff ? firstName(staff.name) : 'That team member'} doesn’t do ${inSentence(service)}.` }
  const why = clash(staff, request.day, request.minute, service.minutes, appointments)
  if (why === 'booked') return { ok: false, message: `Sorry, ${firstName(staff.name)} is no longer free at ${when}. Please choose another time.` }
  if (why === 'lunch') return { ok: false, message: `${capitalFirst(withArticle(service))} at ${when} would run into ${firstName(staff.name)}’s lunch break.` }
  if (why) return { ok: false, message: `${firstName(staff.name)} isn’t working for the whole of ${hhmm(request.minute)} to ${hhmm(request.minute + service.minutes)}.` }
  return { ok: true, staffId: staff.id }
}

/** One person's day in order: bookings, lunch and the free gaps between them. */
export type AgendaItem = { kind: 'appt'; from: number; to: number; appt: Appointment } | { kind: 'free' | 'lunch'; from: number; to: number }

export function dayAgenda(staff: Staff, day: number, appointments: Appointment[]): AgendaItem[] {
  const [from, to] = workWindow(staff)
  const blocks: AgendaItem[] = [
    { kind: 'lunch' as const, from: staff.lunch[0], to: staff.lunch[1] },
    ...staffDay(staff.id, day, appointments).map((appt) => {
      const start = minuteOfDay(appt.start)
      return { kind: 'appt' as const, from: start, to: start + appt.duration, appt }
    }),
  ].sort((a, b) => a.from - b.from)
  const items: AgendaItem[] = []
  let cursor = from
  for (const block of blocks) {
    if (block.from - cursor >= STEP_MIN) items.push({ kind: 'free', from: cursor, to: block.from })
    items.push(block)
    cursor = Math.max(cursor, block.to)
  }
  if (to - cursor >= STEP_MIN) items.push({ kind: 'free', from: cursor, to })
  return items
}

export function utilisation(staff: Staff, day: number, appointments: Appointment[]) {
  const booked = bookedMinutes(staff.id, day, appointments)
  const available = availableMinutes(staff)
  return { booked, available, pct: available ? Math.round((booked / available) * 100) : 0 }
}

/* Money, deposits and cancellations */

/** 30% for services of $50 or more, rounded to the dollar. Whole-number maths avoids 19.499… */
export const depositFor = (price: number) => (price >= DEPOSIT_FROM ? Math.round((price * DEPOSIT_PERCENT) / 100) : 0)

export const depositHeld = (a: Pick<Appointment, 'deposit' | 'depositStatus'>) => (a.depositStatus === 'paid' ? a.deposit : 0)

export function billFor(a: Pick<Appointment, 'price' | 'deposit' | 'depositStatus'>) {
  const deposit = depositHeld(a)
  return { price: a.price, deposit, due: round2(Math.max(0, a.price - deposit)) }
}

export interface CancelOutcome {
  free: boolean
  refund: number
  kept: number
  message: string
}

/** Free up to 24 hours before the start (exactly 24 h still counts as free). Later, the deposit is kept. */
export function cancellationOutcome(a: Pick<Appointment, 'start' | 'deposit' | 'depositStatus'>, now: number): CancelOutcome {
  const free = a.start - now >= FREE_CANCEL_HOURS * HOUR
  const paid = depositHeld(a)
  if (!paid)
    return {
      free,
      refund: 0,
      kept: 0,
      message: free ? 'More than 24 h before the visit. No deposit was taken.' : 'Less than 24 h before the visit, but no deposit was taken.',
    }
  return free
    ? { free, refund: paid, kept: 0, message: `24 h or more before the visit, so the ${moneyWhole(paid)} deposit is refunded.` }
    : { free, refund: 0, kept: paid, message: `Less than 24 h before the visit, so the ${moneyWhole(paid)} deposit is kept, as the policy says.` }
}

/* Loyalty */

/** 1 point per whole dollar, double on Tuesdays. */
export const pointsFor = (amount: number, day: number) => Math.floor(Math.max(0, amount)) * (new Date(day).getDay() === 2 ? 2 : 1)

export function tierFor(points: number): Tier {
  return [...TIERS].reverse().find((t) => points >= t.from)?.tier ?? 'Bronze'
}

export const pointsBalance = (c: Client) => c.points.reduce((sum, p) => sum + p.points, 0)
/** Tiers go by points earned, so redeeming a reward never drops a client's tier. */
export const pointsEarned = (c: Client) => c.points.reduce((sum, p) => sum + Math.max(0, p.points), 0)

/** The cheapest reward the balance can't cover yet, and how far away it is. */
export function nextReward(balance: number): { reward: Reward; toGo: number } | null {
  const reward = REWARDS.find((r) => r.points > balance)
  return reward ? { reward, toGo: reward.points - balance } : null
}

export function clientSummary(c: Client) {
  const earned = pointsEarned(c)
  return {
    visits: c.visits.length,
    last: c.visits[0]?.at,
    spent: round2(c.visits.reduce((sum, v) => sum + v.amount, 0)),
    balance: pointsBalance(c),
    earned,
    tier: tierFor(earned),
  }
}

export type DueBack =
  | { kind: 'booked'; at: number }
  | { kind: 'overdue' | 'soon' | 'later'; at: number; serviceId: ServiceId }
  | { kind: 'none' }

/** When a client is due back for their last service, unless they already have a booking. */
export function dueBack(c: Client, appointments: Appointment[], now: number): DueBack {
  const next = appointments
    .filter((a) => a.clientId === c.id && (a.status === 'Booked' || a.status === 'Checked in') && a.start >= dayStart(now))
    .sort((a, b) => a.start - b.start)[0]
  if (next) return { kind: 'booked', at: next.start }
  const last = c.visits[0]
  if (!last) return { kind: 'none' }
  const due = addDays(dayStart(last.at), serviceById(last.serviceId).rebookWeeks * 7)
  const kind = due <= now ? 'overdue' : due - now <= 7 * DAY ? 'soon' : 'later'
  return { kind, at: due, serviceId: last.serviceId }
}

export function dueBackLabel(due: DueBack, now: number): string {
  if (due.kind === 'booked') return `Booked ${sameDay(due.at, now) ? `today ${clockTime(due.at)}` : dayLabel(due.at)}`
  if (due.kind === 'overdue') return `Due back since ${shortDate(due.at)}`
  if (due.kind === 'soon') return `Due back ${shortDate(due.at)}`
  if (due.kind === 'later') return `Next due ${shortDate(due.at)}`
  return 'No visits yet'
}

/* Codes, phone numbers and messages */

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function codeFrom(seed: number, length: number): string {
  const rand = seededRandom(seed)
  return Array.from({ length }, () => CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)]).join('')
}

/** "NALEDI-7Q4": the first name plus three characters, the same every time for the same name. */
export function referralCode(name: string): string {
  const first = firstName(name).normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 8)
  return `${first || 'FRIEND'}-${codeFrom(hash(name.trim().toLowerCase()), 3)}`
}

export const rewardCode = (reward: Reward, seq: number) => `${reward.prefix}-${codeFrom(seq * 7919 + 101, 4)}`

/** South African mobiles become "+27 82 ••• 4410"; other numbers keep their first two and last four digits. */
export function maskPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('0') && digits.length === 10) digits = `27${digits.slice(1)}`
  if (digits.length === 9 && /^[6-8]/.test(digits)) digits = `27${digits}`
  if (digits.startsWith('27') && digits.length === 11) return `+27 ${digits.slice(2, 4)} ••• ${digits.slice(-4)}`
  if (digits.length >= 9) return `+${digits.slice(0, 2)} ••• ${digits.slice(-4)}`
  return raw.trim()
}

export const validMobile = (raw: string) => {
  const digits = raw.replace(/\D/g, '')
  return /^[+\d\s()-]+$/.test(raw.trim()) && digits.length >= 9 && digits.length <= 15
}

export const validEmail = (raw: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim())

/** The WhatsApp the client gets: a confirmation for a same-day visit, otherwise a reminder at 17:00 the day before. */
export function reminderPlan(a: Pick<Appointment, 'start' | 'reminder'>, now: number): { kind: 'confirmation' | 'day-before'; at: number } | null {
  if (sameDay(a.start, now)) return { kind: 'confirmation', at: now }
  if (!a.reminder) return null
  return { kind: 'day-before', at: Math.max(now, atMinute(addDays(dayStart(a.start), -1), at(17))) }
}

export function clientMessage(a: Appointment, clientName: string, now: number): string {
  const service = serviceById(a.serviceId)
  const who = staffFirst(a.staffId)
  const name = firstName(clientName)
  if (sameDay(a.start, now))
    return `Hi ${name}, you’re booked for ${withArticle(service)} with ${who} today at ${clockTime(a.start)}. Ref ${a.ref}. See you soon at ${SALON.short}, Parkhurst ✨`
  const deposit = depositHeld(a) ? ` Your ${moneyWhole(a.deposit)} deposit comes off the bill.` : ''
  return (
    `Hi ${name} 👋 Just a reminder of your ${inSentence(service)} with ${who} tomorrow at ${clockTime(a.start)}.${deposit} ` +
    `Need to change it? Reply R and we’ll call you. See you at ${SALON.short}, Parkhurst.`
  )
}

export function rebookMessage(c: Client, now: number): string {
  const last = c.visits[0]
  const name = firstName(c.name)
  if (!last) return `Hi ${name}, it would be lovely to see you at ${SALON.short}. Reply 1 and we’ll send you a few times that suit you.`
  const weeks = Math.max(1, Math.round((now - last.at) / (7 * DAY)))
  const since = `${weeks} ${weeks === 1 ? 'week' : 'weeks'} since your ${inSentence(serviceById(last.serviceId))} with ${staffFirst(last.staffId)}`
  return `Hi ${name}, it’s been ${since}. Shall we book your next visit? Reply 1 for three times that suit you, or book online any time. ${SALON.short}`
}

export function inviteMessage(code: string): string {
  return `I book at ${SALON.short} in Parkhurst. Use my code ${code} for 10% off your first visit.\n\n(${SALON.short} is a sample salon in a booking-system demo.)`
}

export const whatsappShareLink = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`

/* Calendar file */

const icsDate = (time: number) => new Date(time).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const icsText = (text: string) => text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1')

/** Long lines are folded, as the calendar file format asks. */
function fold(line: string): string {
  const parts: string[] = []
  for (let i = 0; i < line.length; i += 60) parts.push(line.slice(i, i + 60))
  return parts.join('\r\n ')
}

export function icsFile(a: Appointment, now: number): string {
  const service = serviceById(a.serviceId)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sunbird and Sage//Booking demo//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${a.ref}@sunbirdandsage.co.za`,
    `DTSTAMP:${icsDate(now)}`,
    `DTSTART:${icsDate(a.start)}`,
    `DTEND:${icsDate(a.start + a.duration * MINUTE)}`,
    `SUMMARY:${icsText(`${service.label} with ${staffFirst(a.staffId)} at ${SALON.short}`)}`,
    `LOCATION:${icsText(`${SALON.name}, ${SALON.area} (sample business)`)}`,
    `DESCRIPTION:${icsText(
      `Reference ${a.ref}. ${depositHeld(a) ? `Deposit paid: ${money(a.deposit)}, taken off the final bill. ` : ''}Free cancellation up to 24 hours before.`,
    )}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsText(`${service.label} at ${SALON.short}`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return `${lines.map(fold).join('\r\n')}\r\n`
}

/* Reports */

export function weekStats(appointments: Appointment[], now: number) {
  const days = openDays(now, 7)
  const end = addDays(days[days.length - 1], 1)
  const week = appointments.filter((a) => a.status !== 'Cancelled' && a.start >= days[0] && a.start < end)
  const online = week.filter((a) => a.source === 'Online')
  const evening = online.filter((a) => new Date(a.createdAt).getHours() >= 18).length
  const revenue = GROUPS.map((group) => ({
    group,
    value: week.filter((a) => serviceById(a.serviceId).group === group).reduce((sum, a) => sum + a.price, 0),
  }))
  const staff = STAFF.map((s) => {
    const booked = days.reduce((sum, day) => sum + bookedMinutes(s.id, day, appointments), 0)
    const available = availableMinutes(s) * days.length
    return { staff: s, booked, available, pct: available ? Math.round((booked / available) * 100) : 0 }
  })
  // Two-hour buckets keep the chart readable on a phone.
  const byHour = Array.from({ length: 12 }, (_, i) => online.filter((a) => Math.floor(new Date(a.createdAt).getHours() / 2) === i).length)
  return {
    days,
    week,
    online,
    onlinePct: week.length ? Math.round((online.length / week.length) * 100) : 0,
    evening,
    eveningPct: online.length ? Math.round((evening / online.length) * 100) : 0,
    revenue,
    staff,
    byHour,
  }
}

export function depositsHeld(appointments: Appointment[]) {
  const held = appointments.filter((a) => depositHeld(a) > 0)
  return { amount: held.reduce((sum, a) => sum + a.deposit, 0), count: held.length }
}

export function noShowsThisMonth(appointments: Appointment[], now: number): number {
  const month = (time: number) => `${new Date(time).getFullYear()}-${new Date(time).getMonth()}`
  return appointments.filter((a) => a.status === 'No-show' && month(a.start) === month(now)).length
}
