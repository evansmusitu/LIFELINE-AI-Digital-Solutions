import {
  BUSINESS,
  LUNCH,
  OFFICES,
  ONLINE,
  PRACTITIONERS,
  SERVICES,
  type Mode,
  type Practitioner,
  type PractitionerId,
  type Service,
  type ServiceId,
  type WeekHours,
} from './business'
import type { Booking, Draft } from './types'

/*
 * Booking rules for the sample wellness practice: practice time, opening hours, free slots, checks
 * and the WhatsApp messages. All pure, so they are tested in test/wellness.test.ts.
 *
 * Times are kept in "practice time", Harare and Johannesburg (UTC+2 all year), whatever the visitor's
 * own time zone: a day is the UTC midnight of the practice's calendar date, and a time inside a day is
 * minutes after midnight there.
 */

const MIN = 60_000
const DAY_MS = 86_400_000
const OFFSET = BUSINESS.utcOffsetMinutes * MIN

/** Bookable times are on a 30-minute grid. */
export const STEP_MIN = 30
/** Online clients can book from an hour ahead. */
export const LEAD_MIN = 60
/**
 * Slack when the booking is confirmed: a time offered an hour ahead is still accepted a few minutes
 * later, while the client types their details.
 */
export const CONFIRM_GRACE_MIN = 15
/** Days shown on the booking page: today and the next open days. */
export const BOOKING_DAYS = 6

/** The practice's calendar day for a moment in time. */
export const practiceDay = (time: number) => Math.floor((time + OFFSET) / DAY_MS) * DAY_MS
/** Minutes after midnight, practice time. */
export const practiceMinute = (time: number) => Math.round((time + OFFSET - practiceDay(time)) / MIN)
/** The moment a practice-time day and minute happen. */
export const startOf = (day: number, minute: number) => day + minute * MIN - OFFSET
export const addDays = (day: number, n: number) => day + n * DAY_MS
export const weekday = (day: number) => new Date(day).getUTCDay()

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const hhmm = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
/** "Thu 20 Nov" */
export const dayLabel = (day: number) => {
  const d = new Date(day)
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}
/** "Thursday 20 Nov" */
export const dayLong = (day: number) => {
  const d = new Date(day)
  return `${WEEKDAYS_LONG[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}
/** "14:00", practice time. */
export const timeLabel = (time: number) => hhmm(practiceMinute(time))

/** "today", "tomorrow" or "Thu 20 Nov". */
export function dayWord(day: number, now: number): string {
  const today = practiceDay(now)
  if (day === today) return 'today'
  if (day === addDays(today, 1)) return 'tomorrow'
  return dayLabel(day)
}

/** Both offices and online consultations are closed on Sundays, as the website and the assistant say. */
export const isOpenDay = (day: number) => weekday(day) !== 0

/** The next `n` days the practice is open, starting today if it is open (on a Sunday, from Monday). */
export function bookingDays(now: number, n = BOOKING_DAYS): number[] {
  const days: number[] = []
  for (let day = practiceDay(now); days.length < n; day = addDays(day, 1)) {
    if (isOpenDay(day)) days.push(day)
  }
  return days
}

export const serviceById = (id: ServiceId): Service => SERVICES.find((s) => s.id === id) ?? SERVICES[0]
export const practitionerById = (id: PractitionerId): Practitioner => PRACTITIONERS.find((p) => p.id === id) ?? PRACTITIONERS[0]
export const firstNameOf = (id: PractitionerId) => practitionerById(id).name.split(' ')[0]

/** Services the booking page offers for this way of meeting. Talks for workplaces are arranged on enquiry. */
export const bookableServices = (mode: Mode) => SERVICES.filter((s) => !s.enquireOnly && s.modes.includes(mode))

/** Who can take this service this way, on at least one day of the week. */
export const practitionersFor = (serviceId: ServiceId, mode: Mode) =>
  PRACTITIONERS.filter((p) => p.services.includes(serviceId) && p.week.includes(mode))

export function hoursFor(mode: Mode, weekdayIndex: number): [number, number] | null {
  const table: WeekHours = mode === 'online' ? ONLINE.hours : (OFFICES.find((o) => o.id === mode)?.hours ?? [])
  return table[weekdayIndex] ?? null
}

const overlaps = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1

/** Cancelled bookings free their time. */
export const holdsTime = (b: Booking) => b.status !== 'Cancelled'

/** One person's bookings that hold time on a day, as [start, end] minutes. Any mode: one person can't be in two places. */
function busyMinutes(practitionerId: PractitionerId, day: number, bookings: Booking[]): [number, number][] {
  return bookings
    .filter((b) => b.practitionerId === practitionerId && holdsTime(b) && practiceDay(b.start) === day)
    .map((b) => [practiceMinute(b.start), practiceMinute(b.start) + b.minutes])
}

/**
 * Start times (minutes after midnight, practice time) when this person can take the whole service this
 * way on this day: they work that way that day, it is inside the office's or online hours, clear of the
 * weekday lunch hour and of their other bookings, and not before `earliest`.
 */
export function freeSlots(
  practitioner: Practitioner,
  service: Service,
  mode: Mode,
  day: number,
  bookings: Booking[],
  now: number,
  earliest = now,
): number[] {
  if (service.enquireOnly || !service.modes.includes(mode) || !practitioner.services.includes(service.id)) return []
  const w = weekday(day)
  if (!isOpenDay(day) || practitioner.week[w] !== mode) return []
  const hours = hoursFor(mode, w)
  if (!hours) return []
  const busy = busyMinutes(practitioner.id, day, bookings)
  if (w >= 1 && w <= 5) busy.push(LUNCH)
  const slots: number[] = []
  for (let m = hours[0]; m + service.minutes <= hours[1]; m += STEP_MIN) {
    if (startOf(day, m) < earliest) continue
    if (busy.some(([s, e]) => overlaps(m, m + service.minutes, s, e))) continue
    slots.push(m)
  }
  return slots
}

export interface Slot {
  minute: number
  /** Everyone free at this time, in team order. */
  practitionerIds: PractitionerId[]
}

/** Free times for one person, or for "Anyone available" merged across everyone who can take it. */
export function slotsFor(
  service: Service,
  mode: Mode,
  choice: PractitionerId | 'any',
  day: number,
  bookings: Booking[],
  now: number,
  earliest = now + LEAD_MIN * MIN,
): Slot[] {
  const team = practitionersFor(service.id, mode).filter((p) => choice === 'any' || p.id === choice)
  const merged = new Map<number, PractitionerId[]>()
  for (const p of team) {
    for (const minute of freeSlots(p, service, mode, day, bookings, now, earliest)) merged.set(minute, [...(merged.get(minute) ?? []), p.id])
  }
  return [...merged.entries()].sort((a, b) => a[0] - b[0]).map(([minute, practitionerIds]) => ({ minute, practitionerIds }))
}

const bookedMinutes = (id: PractitionerId, day: number, bookings: Booking[]) =>
  busyMinutes(id, day, bookings).reduce((sum, [s, e]) => sum + e - s, 0)

export interface BookingRequest {
  serviceId: ServiceId
  mode: Mode
  practitioner: PractitionerId | 'any'
  day: number
  minute: number
}

export type BookingCheck = { ok: true; practitionerId: PractitionerId } | { ok: false; message: string }

/** Checked again at the moment of booking, so a time can never be booked twice. */
export function checkBooking(bookings: Booking[], request: BookingRequest, now: number): BookingCheck {
  const service = SERVICES.find((s) => s.id === request.serviceId)
  if (!service) return { ok: false, message: 'Please choose a service.' }
  if (service.enquireOnly) return { ok: false, message: `${service.name} is arranged with the team. Please send an enquiry instead.` }
  if (!service.modes.includes(request.mode)) return { ok: false, message: `${service.name} isn’t offered this way. Please choose another option.` }
  const when = `${hhmm(request.minute)} on ${dayLabel(request.day)}`
  const earliest = now + (LEAD_MIN - CONFIRM_GRACE_MIN) * MIN
  if (request.day < practiceDay(now) || startOf(request.day, request.minute) < earliest) {
    return { ok: false, message: `${when} is too soon or has passed. Please choose a later time.` }
  }
  const free = (p: Practitioner) => freeSlots(p, service, request.mode, request.day, bookings, now, earliest).includes(request.minute)
  if (request.practitioner === 'any') {
    const options = practitionersFor(service.id, request.mode).filter(free)
    if (!options.length) return { ok: false, message: `Sorry, nobody is free at ${when} any more. Please choose another time.` }
    // The least busy that day, ties in team order.
    const best = options.reduce((a, b) => (bookedMinutes(b.id, request.day, bookings) < bookedMinutes(a.id, request.day, bookings) ? b : a))
    return { ok: true, practitionerId: best.id }
  }
  const p = PRACTITIONERS.find((x) => x.id === request.practitioner)
  if (!p || !p.services.includes(service.id)) return { ok: false, message: 'That consultant doesn’t offer this service. Please choose another.' }
  if (!free(p)) return { ok: false, message: `Sorry, ${p.name.split(' ')[0]} isn’t free at ${when}. Please choose another time.` }
  return { ok: true, practitionerId: p.id }
}

/** A fresh booking, keeping the contact details already typed. */
export const emptyDraft = (keep?: Pick<Draft, 'name' | 'phone' | 'email'>): Draft => ({
  step: 1,
  practitioner: 'any',
  name: keep?.name ?? '',
  phone: keep?.phone ?? '',
  email: keep?.email ?? '',
})

/* The client's details: the minimum to manage a booking. There are no health questions. */

export interface Details {
  name: string
  phone: string
  email: string
}

export type DetailErrors = Partial<Record<keyof Details, string>>

const NAME = /^[\p{L}\p{M}][\p{L}\p{M} '’.-]*$/u

export const validName = (raw: string) => {
  const name = raw.trim().replace(/\s+/g, ' ')
  return name.length >= 2 && name.length <= 60 && NAME.test(name)
}

/** A phone number with 9 to 15 digits, a + only at the start, and spaces, brackets or dashes. */
export const validPhone = (raw: string) => {
  const value = raw.trim()
  const digits = value.replace(/\D/g, '')
  return /^\+?[\d\s()-]+$/.test(value) && digits.length >= 9 && digits.length <= 15
}

export const validEmail = (raw: string) => raw.trim().length <= 100 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim())

export function checkDetails(details: Details): DetailErrors {
  const errors: DetailErrors = {}
  if (!validName(details.name)) errors.name = 'Please enter your name (letters only, at least 2).'
  if (!validPhone(details.phone)) errors.phone = 'Please enter a phone number with the country code, for example +263 or +27.'
  if (details.email.trim() && !validEmail(details.email)) errors.email = 'Please check the email address, or leave it empty.'
  return errors
}

/** "+263 ••• ••• 567": enough for the team to recognise the number in a list, no more. */
export function maskPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 6) return '•••'
  const plus = raw.trim().startsWith('+')
  const head = plus ? `+${digits.startsWith('263') ? '263' : digits.startsWith('27') ? '27' : digits.slice(0, 2)}` : digits.slice(0, 3)
  return `${head} ••• ••• ${digits.slice(-3)}`
}

/** "r•••@example.com" */
export function maskEmail(raw: string): string {
  const [user = '', domain = ''] = raw.trim().split('@')
  return domain ? `${user.slice(0, 1)}•••@${domain}` : '•••'
}

/* Messages the client gets on WhatsApp (previews only: the demo sends nothing). *bold* is WhatsApp formatting. */

/** The sample business name as shown to a visitor on a personalised link: theirs instead. */
export function personalised(text: string, business: string | null): string {
  if (!business || business === BUSINESS.name) return text
  return text.replaceAll(BUSINESS.name, business).replaceAll(BUSINESS.short, business)
}

const where = (b: Pick<Booking, 'mode'>) =>
  b.mode === 'online'
    ? 'Online video call. The link comes here an hour before.'
    : `${OFFICES.find((o) => o.id === b.mode)?.area ?? ''} office.`

const firstWord = (name: string) => name.trim().split(/\s+/)[0] ?? name

export function confirmationMessage(b: Booking, business: string = BUSINESS.name): string {
  const service = serviceById(b.serviceId)
  const day = practiceDay(b.start)
  const from = practiceMinute(b.start)
  return [
    `*Booking confirmed: ${b.ref}*`,
    `Hi ${firstWord(b.client.name)}, your ${service.name.toLowerCase()} with ${practitionerById(b.practitionerId).name} is booked.`,
    '',
    `${dayLong(day)}, ${hhmm(from)} to ${hhmm(from + b.minutes)}, ${BUSINESS.timeLabel}`,
    where(b),
    '',
    'Reply CHANGE to move it or CANCEL to cancel. Please don’t send health details here: your consultant will go through everything with you in the session.',
    `${business}`,
  ].join('\n')
}

export function reminderMessage(b: Booking, business: string = BUSINESS.name): string {
  const service = serviceById(b.serviceId)
  return [
    `*Reminder from ${business}*`,
    `Hi ${firstWord(b.client.name)}, see you tomorrow at ${timeLabel(b.start)} for your ${service.name.toLowerCase()} with ${firstNameOf(b.practitionerId)}.`,
    where(b),
    'Reply YES to confirm or CHANGE to move it.',
  ].join('\n')
}

/** Reminders go at 17:00 the day before. A booking made after that gets its confirmation only. */
export const REMINDER_MINUTE = 17 * 60

export function reminderAt(b: Pick<Booking, 'start' | 'createdAt'>): number | null {
  const at = startOf(addDays(practiceDay(b.start), -1), REMINDER_MINUTE)
  return at > b.createdAt ? at : null
}

export type MessageLogItem = { bookingId: string; kind: 'Confirmation' | 'Reminder'; at: number; sent: boolean }

/** Every WhatsApp message the bookings send, sent or scheduled, newest first. */
export function messageLog(bookings: Booking[], now: number, manual: Record<string, number> = {}): MessageLogItem[] {
  const items: MessageLogItem[] = []
  for (const b of bookings) {
    if (b.status === 'Cancelled') continue
    items.push({ bookingId: b.id, kind: 'Confirmation', at: b.createdAt, sent: true })
    const auto = reminderAt(b)
    const extra = manual[b.id]
    if (extra) items.push({ bookingId: b.id, kind: 'Reminder', at: extra, sent: true })
    else if (auto) items.push({ bookingId: b.id, kind: 'Reminder', at: auto, sent: auto <= now })
  }
  return items.sort((a, b) => b.at - a.at)
}

/*
 * Safety net for the chat: words that suggest an emergency. When one appears, the chat shows a fixed
 * note pointing to emergency services before any reply, AI or saved, so it never depends on the AI.
 * It covers every example in the assistant's instructions (worker/prompt.ts) and common ways of saying
 * them. It leans towards showing the note: a stray note costs little, a missed one could cost a lot.
 * Everyday words such as "breathing exercises" or "stress" don't match. Tested in test/wellness.test.ts.
 */
const PERSON = '(?:my|his|her|their|the|our)'
const SELF = '(?:myself|himself|herself|themselves|ourselves)'
const EMERGENCY_PATTERNS: RegExp[] = [
  /\b(emergenc(y|ies)|ambulance|in danger)\b/,
  // Chest pain and the heart.
  /\bchest (pains?|tightness|is tight|hurts|is hurting)\b/,
  new RegExp(`\\b(pain|tightness|pressure) in ${PERSON} chest\\b`),
  /\bheart attack\b/,
  // Breathing. "Breathing exercises" and "breathing techniques" don't match.
  /\b(can'?t|cannot|can not|couldn'?t|could not|unable to|not|isn'?t|is not|stopped|struggling to|struggles? to|hard to|difficult to|trouble|difficulty|difficulties|problems?|struggling)( (in|with))? breath(e|es|ing)?\b/,
  /\bbreathing (is |has )?(difficult|hard|laboured|labored|stopped|shallow)\b/,
  /\b(short(ness)? of breath|breathless|gasping|choking|can'?t catch (my|his|her|their) breath)\b/,
  // Bleeding.
  /\b(heavy|heavily|severe|serious|bad|badly|lots of|a lot of|so much) bleeding\b/,
  /\bbleed(ing|s)? (heavily|a lot|badly|lots|severely|so much|non ?stop|everywhere)\b/,
  /\b(bleeding|blood) (won'?t|will not|doesn'?t|does not|isn'?t|is not) stop/,
  /\bwon'?t stop bleeding\b/,
  /\b(losing|lost) (a lot of|so much|lots of) blood\b/,
  /\bha?emorrhag/,
  // Fainting and collapse.
  /\b(faint|fainted|fainting|faints|passed out|pass(es|ing)? out|blacked out|black(ing)? out|collapsed?|collapsing|unconscious|unresponsive|not responding|won'?t wake up)\b/,
  // Signs of a stroke.
  /\bstrokes?\b/,
  /\b(face|mouth|smile) (is |has )?(drooping|droops|drooped|dropping|dropped|lopsided)\b/,
  /\bdrooping (face|mouth|smile)\b/,
  /\b(slurred|slurring)\b/,
  /\b(can'?t|cannot|can not|unable to) (move|feel) (one|my|his|her|their|the)( (left|right))? (side|arm|leg|hand)\b/,
  /\b(numb|numbness|weak|weakness|paralys\w*|paralyz\w*) (on |down )?(one|the left|the right|left|right) side\b/,
  // Poisoning and overdose.
  /\bpoison(ed|ing|s)?\b/,
  /\b(swallowed|drank|drunk|ate) (some )?(bleach|rat poison|pesticide|paraffin|chemicals?|battery acid)\b/,
  /\boverdos\w*/,
  /\b(took|taken|swallowed|had) (way )?(too many|too much|all|a whole (box|bottle|pack|packet) of)( of)?( (my|his|her|their|the|these|those))? (pills|tablets|medicines?|medications?|meds|paracetamol|painkillers|sleeping pills|insulin)\b/,
  // Suicide and self-harm.
  /\bsuicid\w*/,
  new RegExp(`\\bkill(ing)? (${SELF}|me)\\b`),
  /\b(want|wanted|wanting|going|wanna|ready|planning) to die\b/,
  /\b(want|wanted|wanting|going|wanna) to be dead\b/,
  /\b(end|ending|take|taking) (my|his|her|their) (own )?life\b/,
  /\b(don'?t|do not|no longer|doesn'?t|does not) want to (live|be alive|be here|go on)\b/,
  /\b(no reason to live|better off dead)\b/,
  /\bself[- ]?harm\w*/,
  new RegExp(`\\b(hurt|hurting|harm|harming|cut|cutting|injure|injuring) ${SELF}\\b`),
  // Seizures. "Fitting room", "a fitting time" and "get fit" don't match.
  /\b(seizures?|convuls\w*|epileptic fit)\b/,
  /\bfitting\b(?! (in|into|room|rooms|for|time|appointment|session|tribute|end))/,
  /\b(having|had) (a )?fits?\b/,
]

/** True when a message suggests an emergency or danger: the chat then shows EMERGENCY_NOTE first. */
export const isEmergency = (text: string) => {
  const t = text.toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, ' ')
  return EMERGENCY_PATTERNS.some((pattern) => pattern.test(t))
}

export const EMERGENCY_NOTE =
  'If this is an emergency or someone is in danger, contact your local emergency services or go to the nearest hospital emergency department now. This chat can’t help in an emergency.'
