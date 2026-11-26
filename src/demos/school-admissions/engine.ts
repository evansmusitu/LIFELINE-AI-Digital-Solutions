import { moneyWhole, zigWhole } from '../../lib/format'
import {
  DOCUMENTS,
  GRADES,
  SCHOOL,
  TOURS,
  leviesTotal,
  phaseOf,
  tuitionFor,
  type DocumentNeed,
  type Grade,
} from './business'
import type { Application, Enquiry, Entry, Stage, Tour } from './types'

/*
 * The school demo's logic: dates on Harare time, tour times, references, checks on what parents type,
 * what each application still needs, places per grade and the urgent notices. Pure functions, tested in
 * test/school.test.ts.
 */

const MIN = 60_000
const DAY_MS = 86_400_000
const OFFSET = SCHOOL.utcOffsetMinutes * MIN

/* Harare time */

/** Midnight in Harare, as a UTC timestamp shifted by the offset: the "day" every date here is counted in. */
export const schoolDay = (time: number) => Math.floor((time + OFFSET) / DAY_MS) * DAY_MS
export const startOf = (day: number, minute: number) => day + minute * MIN - OFFSET
export const addDays = (day: number, n: number) => day + n * DAY_MS
export const weekday = (day: number) => new Date(day).getUTCDay()
const minuteOf = (time: number) => Math.round((time + OFFSET - schoolDay(time)) / MIN)
export const hhmm = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
export const timeLabel = (time: number) => hhmm(minuteOf(time))

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "Tuesday 18 November" */
export const dayLong = (day: number) => {
  const d = new Date(day)
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}

/** "Tue 18 Nov" */
export const dayShort = (day: number) => {
  const d = new Date(day)
  return `${WEEKDAYS[d.getUTCDay()].slice(0, 3)} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)}`
}

/** "today", "tomorrow" or "on Tuesday 18 November" */
export function dayWord(day: number, now: number): string {
  const today = schoolDay(now)
  if (day === today) return 'today'
  if (day === addDays(today, 1)) return 'tomorrow'
  return `on ${dayLong(day)}`
}

/* Tours */

/** Tour times by weekday (0 is Sunday): Tuesdays and Thursdays 10:00 and 14:00, Saturdays 09:00. */
export const TOUR_TIMES: Record<number, number[]> = { 2: [600, 840], 4: [600, 840], 6: [540] }
/** Tours can be booked up to two weeks ahead, and at least two hours before they start. */
export const TOUR_DAYS = 14
export const TOUR_NOTICE_MIN = 120

export interface TourSlot {
  start: number
  /** Families already booked. */
  taken: number
  full: boolean
}

export function tourSlots(tours: Tour[], now: number, days = TOUR_DAYS): TourSlot[] {
  const slots: TourSlot[] = []
  const today = schoolDay(now)
  for (let i = 0; i <= days; i++) {
    const day = addDays(today, i)
    for (const minute of TOUR_TIMES[weekday(day)] ?? []) {
      const start = startOf(day, minute)
      if (start < now + TOUR_NOTICE_MIN * MIN) continue
      const taken = tours.filter((t) => t.start === start).length
      slots.push({ start, taken, full: taken >= TOURS.capacity })
    }
  }
  return slots
}

/** The first tour with room, for the WhatsApp conversation and the sample data. */
export const firstFreeTour = (tours: Tour[], now: number): number | null => tourSlots(tours, now).find((s) => !s.full)?.start ?? null

export type TourCheck = { ok: true } | { ok: false; message: string }

export function checkTour(tours: Tour[], start: number, now: number): TourCheck {
  const slot = tourSlots(tours, now).find((s) => s.start === start)
  if (!slot) return { ok: false, message: 'That tour time has passed or isn’t offered. Please choose another.' }
  if (slot.full) return { ok: false, message: 'That tour has just filled up. Please choose another time.' }
  return { ok: true }
}

/* References: "MRA-1042". Unique across tours and applications. */

export function freeRef(used: { ref: string }[], next: number): { ref: string; next: number } {
  const taken = new Set(used.map((u) => u.ref))
  let n = next
  while (taken.has(`MRA-${n}`)) n++
  return { ref: `MRA-${n}`, next: n + 1 }
}

/* What parents type */

const NAME = /^[\p{L}\p{M}][\p{L}\p{M} '’.-]*$/u

export const cleanName = (raw: string) => raw.trim().replace(/\s+/g, ' ')

export const validName = (raw: string) => {
  const name = cleanName(raw)
  return name.length >= 2 && name.length <= 60 && NAME.test(name)
}

/** A phone number with 9 to 15 digits, a + only at the start, and spaces, brackets or dashes. */
export const validPhone = (raw: string) => {
  const value = raw.trim()
  const digits = value.replace(/\D/g, '')
  return /^\+?[\d\s()-]+$/.test(value) && digits.length >= 9 && digits.length <= 15
}

export const validEmail = (raw: string) => raw.trim().length <= 100 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim())

/** "+263 ••• ••• 567": enough for the office to recognise the number in a list, no more. */
export function maskPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 6) return '•••'
  const plus = raw.trim().startsWith('+')
  const code = ['263', '27', '44', '1'].find((c) => digits.startsWith(c)) ?? digits.slice(0, 2)
  return `${plus ? `+${code}` : digits.slice(0, 3)} ••• ••• ${digits.slice(-3)}`
}

/** "r•••@example.com" */
export function maskEmail(raw: string): string {
  const [user = '', domain = ''] = raw.trim().split('@')
  return domain ? `${user.slice(0, 1)}•••@${domain}` : '•••'
}

export const maskContact = (raw: string) => (validPhone(raw) ? maskPhone(raw) : maskEmail(raw))

/** The child as the office list shows them: first name and the first letter of the surname. */
export function childLabel(raw: string): string {
  const [first = '', ...rest] = cleanName(raw).split(' ')
  const last = rest.at(-1)
  return last ? `${first} ${last.slice(0, 1).toUpperCase()}.` : first
}

/* Applications */

/** The documents this application needs: a transfer letter only for transfers, the immunisation card only for the youngest. */
export function documentsFor(grade: Grade, entry: Entry): DocumentNeed[] {
  const young = phaseOf(grade) === 'ecd' || grade === 'Grade 1'
  return DOCUMENTS.filter((d) => {
    if (d.id === 'reports' && grade === 'ECD A') return false
    if (d.when === 'transfer') return entry === 'Mid-year transfer'
    if (d.when === 'young') return young
    return true
  })
}

export const missingDocs = (a: Pick<Application, 'grade' | 'entry' | 'docs'>): DocumentNeed[] =>
  documentsFor(a.grade, a.entry).filter((d) => !a.docs[d.id])

/** A new application's stage: complete when every document it needs is attached, or on the waiting list when the grade is full. */
export function stageFor(a: Pick<Application, 'grade' | 'entry' | 'docs'>, placesLeft: number): Stage {
  if (missingDocs(a).length > 0) return 'Documents missing'
  return placesLeft > 0 ? 'Complete' : 'Waiting list'
}

/* Places */

/** Places for January 2027 by grade, and learners already enrolled for it (sample figures). */
export const PLACES: Record<Grade, { capacity: number; enrolled: number }> = {
  'ECD A': { capacity: 40, enrolled: 31 },
  'ECD B': { capacity: 40, enrolled: 38 },
  'Grade 1': { capacity: 60, enrolled: 60 },
  'Grade 2': { capacity: 60, enrolled: 57 },
  'Grade 3': { capacity: 60, enrolled: 58 },
  'Grade 4': { capacity: 60, enrolled: 59 },
  'Grade 5': { capacity: 60, enrolled: 56 },
  'Grade 6': { capacity: 60, enrolled: 60 },
  'Grade 7': { capacity: 60, enrolled: 58 },
  'Form 1': { capacity: 90, enrolled: 71 },
  'Form 2': { capacity: 90, enrolled: 86 },
  'Form 3': { capacity: 90, enrolled: 88 },
  'Form 4': { capacity: 90, enrolled: 87 },
  'Lower 6': { capacity: 50, enrolled: 34 },
  'Upper 6': { capacity: 50, enrolled: 46 },
}

const holdsPlace = (a: Application) => a.stage === 'Offer made' || a.stage === 'Accepted'

export function placesLeft(grade: Grade, applications: Application[]): number {
  const { capacity, enrolled } = PLACES[grade]
  return Math.max(0, capacity - enrolled - applications.filter((a) => a.grade === grade && holdsPlace(a)).length)
}

/**
 * The waiting list for a grade, in the published order: brothers and sisters of current learners first,
 * then the date the application was complete.
 */
export const waitingList = (grade: Grade, applications: Application[]): Application[] =>
  applications
    .filter((a) => a.grade === grade && a.stage === 'Waiting list')
    .sort((a, b) => Number(b.sibling) - Number(a.sibling) || a.at - b.at)

export const gradeIndex = (grade: Grade) => GRADES.indexOf(grade)

/* Fees */

/** One term's fees for a day learner: tuition and the approved levies. */
export const termFees = (grade: Grade) => tuitionFor(grade) + leviesTotal()

/** "$905 (ZiG 24,254 at the sample rate)" */
export const usdAndZig = (usd: number) => `${moneyWhole(usd)} (${zigWhole(usd)} at the sample rate)`

/* The office's figures */

/** The middle first-reply time of the answered enquiries, in minutes, or null when none was answered. */
export function medianReply(enquiries: Enquiry[]): number | null {
  const times = enquiries.map((e) => e.firstReplyMinutes).filter((m): m is number => m !== null).sort((a, b) => a - b)
  if (times.length === 0) return null
  const mid = Math.floor(times.length / 2)
  return times.length % 2 ? times[mid] : Math.round((times[mid - 1] + times[mid]) / 2)
}

export function replyLabel(minutes: number | null): string {
  if (minutes === null) return 'Not yet'
  if (minutes < 1) return 'At once'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.round(minutes / 60)
  return hours < 24 ? `${hours} h` : `${Math.round(hours / 24)} d`
}

/* Urgent notices */

/** Parents on the school's WhatsApp notice list (sample). */
export const PARENTS_ON_LIST = 612

export interface NoticeTemplate {
  id: string
  label: string
  title: string
  body: string
}

export const NOTICE_TEMPLATES: readonly NoticeTemplate[] = [
  {
    id: 'cholera',
    label: 'Health precaution',
    title: 'Health precaution: cholera in the area',
    body: 'There are cholera cases in parts of Harare. The school is open. Please send your child with a full water bottle from home, and keep them at home if they have diarrhoea or vomiting. The sick bay will call you straight away if your child is unwell.',
  },
  {
    id: 'closure',
    label: 'Closure',
    title: 'School closed tomorrow: flooding on the main road',
    body: 'The school will be closed tomorrow because the main road is flooded and buses can’t get through safely. Boarders stay at school and are safe. Work for day learners will be sent by WhatsApp in the morning.',
  },
  {
    id: 'rumour',
    label: 'Rumour check',
    title: 'Rumour check: term dates are unchanged',
    body: 'A message going round on WhatsApp says the term will start late. It did not come from the school. The dates on our website are correct. Official changes only ever come from this number and the website.',
  },
]

/** The notice as a parent sees it on WhatsApp. *bold* is WhatsApp formatting. */
export const noticeMessage = (title: string, body: string, school: string = SCHOOL.name) =>
  `*${school}: ${title}*\n${body}\n\nOfficial notice from the school. Reply here if you have a question.`

/* Messages the family gets on WhatsApp (previews only: the demo sends nothing) */

/** The sample school name as shown to a visitor on a personalised link: theirs instead. */
export function personalised(text: string, business: string | null): string {
  if (!business || business === SCHOOL.name) return text
  return text.replaceAll(SCHOOL.name, business).replaceAll(SCHOOL.short, business)
}

export function tourConfirmation(t: Pick<Tour, 'ref' | 'parent' | 'start' | 'grade'>, school: string = SCHOOL.name): string {
  return [
    `Hello ${t.parent.split(' ')[0]}, your school tour at *${school}* is booked.`,
    `*${dayLong(schoolDay(t.start))} at ${timeLabel(t.start)}* (about an hour). Ref ${t.ref}.`,
    `Please come to reception at ${SCHOOL.area}. You’ll meet the Head and can ask about ${t.grade}.`,
    'To change the time, reply to this message.',
  ].join('\n')
}

export function applicationReceipt(a: Pick<Application, 'ref' | 'parent' | 'child' | 'grade' | 'entry' | 'docs'>, school: string = SCHOOL.name): string {
  const missing = missingDocs(a)
  return [
    `Hello ${a.parent.split(' ')[0]}, *${school}* has received the application for ${a.child} (${a.grade}, ${a.entry.toLowerCase()}). Ref ${a.ref}.`,
    missing.length
      ? `Still needed: ${missing.map((d) => d.name.replace(/ \(.*\)$/, '').toLowerCase()).join(', ')}. Reply with a photo of each, or bring them to the office.`
      : 'All the documents are in. The office will book the assessment with you.',
    `Fees for one term: ${usdAndZig(termFees(a.grade))}, including the approved levies.`,
  ].join('\n')
}

export function documentReminder(a: Pick<Application, 'parent' | 'child' | 'grade' | 'entry' | 'docs'>, school: string = SCHOOL.name): string {
  const missing = missingDocs(a)
  return [
    `Hello ${a.parent.split(' ')[0]}, a reminder from *${school}* admissions.`,
    `To complete ${a.child}’s application we still need: ${missing.map((d) => d.name.replace(/ \(.*\)$/, '').toLowerCase()).join(', ')}.`,
    'A clear photo of each on WhatsApp is fine.',
  ].join('\n')
}

/* Safety net for the chat */

/*
 * Words that suggest a child is in danger or being harmed, or a medical emergency. When one appears,
 * the chat shows a fixed note with the emergency and Childline numbers before any reply, AI or saved,
 * so it never depends on the AI. It leans towards showing the note: a stray note costs little.
 */
const SAFETY_PATTERNS: RegExp[] = [
  /\b(emergenc(y|ies)|ambulance|in danger|unsafe at home|not safe)\b/,
  /\b(abus(e|ed|es|ing|ive)|molest\w*|rap(e|ed|ing)|sexual(ly)? (assault\w*|harass\w*)|grooming|groomed|indecent\w*)\b/,
  /\b(touched|touching|touches) (me|him|her|them|my (child|son|daughter|kid))\b/,
  /\b(beat|beaten|beating|hit|hitting|slapped|whipped|assaulted|attacked) (me|him|her|them|my (child|son|daughter|kid))\b/,
  /\b(bullied|bullying|bully)\b.*\b(badly|every day|scared|hurt|afraid|won'?t go)\b/,
  // "Missing documents" doesn't match.
  /\b(gone missing|went missing|(child|son|daughter|kid|he|she) (is|has been) missing|kidnap\w*|abduct\w*|ran away|run away from (home|school))\b/,
  /\bsuicid\w*/,
  /\bself[- ]?harm\w*/,
  /\b(want|wants|wanted|going|wanna) to die\b/,
  /\bkill(ing)? (myself|himself|herself|themselves)\b/,
  /\b(hurt|hurting|harm|harming|cut|cutting) (myself|himself|herself|themselves)\b/,
  // "Uniform fitting" doesn't match.
  /\b(overdos\w*|poison(ed|ing)?|unconscious|collapsed|not breathing|can'?t breathe|seizures?)\b/,
]

export const isSafetyConcern = (text: string) => {
  const t = text.toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, ' ')
  return SAFETY_PATTERNS.some((pattern) => pattern.test(t))
}

/** Emergency 999 and police 995 are Zimbabwe's published numbers; Childline Zimbabwe's free line is 116. */
export const SAFETY_NOTE =
  'If a child is in danger right now, call 999 or the police on 995. Childline Zimbabwe is free on 116, day and night. To raise a concern about a child at the school, tap “Talk to a person” and ask for the safeguarding lead.'
