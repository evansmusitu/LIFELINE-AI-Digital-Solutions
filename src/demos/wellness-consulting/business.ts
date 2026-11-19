/*
 * The sample wellness consulting practice: everything its assistant may say and its booking page
 * offers. Invented business, people, prices and hours. Shared by the demo (browser) and the Worker
 * (worker/prompt.ts builds the assistant's instructions from it), so keep it free of browser and
 * Worker APIs, and free of icons.
 */

import { WELLNESS_PAGE } from '../../receptionist/protocol'

/** The demo page, and the `page` value its assistant sends. The Worker only uses this persona for it. */
export const WELLNESS_SLUG = WELLNESS_PAGE

export const BUSINESS = {
  name: 'Sable Leaf Wellness',
  /** Also replaced by the visitor's own name on a personalised link (see personalised() in engine.ts). */
  short: 'Sable Leaf',
  descriptor: 'Wellness education and consultations · Harare and Johannesburg',
  assistant: 'Amani',
  /** Both cities are on the same clock all year: no daylight saving in either country. */
  timeLabel: 'Harare and Johannesburg time (UTC+2)',
  utcOffsetMinutes: 120,
} as const

export type OfficeId = 'harare' | 'johannesburg'
export type Mode = OfficeId | 'online'

/**
 * Hours as [open, close] in minutes after midnight, or null when closed. Index 0 is Sunday. Each
 * `hoursText` must say the same (test/wellness.test.ts checks it).
 */
export type WeekHours = readonly ([number, number] | null)[]

const at = (h: number, m = 0) => h * 60 + m

export interface Office {
  id: OfficeId
  city: string
  country: string
  /** Area only: the sample offices have no street address. */
  area: string
  hours: WeekHours
  hoursText: string
}

export const OFFICES: readonly Office[] = [
  {
    id: 'harare',
    city: 'Harare',
    country: 'Zimbabwe',
    area: 'Belgravia, Harare',
    hours: [null, [at(8, 30), at(17)], [at(8, 30), at(17)], [at(8, 30), at(17)], [at(8, 30), at(17)], [at(8, 30), at(17)], [at(9), at(13)]],
    hoursText: 'Monday to Friday 08:30 to 17:00, Saturday 09:00 to 13:00, closed on Sundays',
  },
  {
    id: 'johannesburg',
    city: 'Johannesburg',
    country: 'South Africa',
    area: 'Rosebank, Johannesburg',
    hours: [null, [at(9), at(17, 30)], [at(9), at(17, 30)], [at(9), at(17, 30)], [at(9), at(17, 30)], [at(9), at(17, 30)], [at(9), at(13)]],
    hoursText: 'Monday to Friday 09:00 to 17:30, Saturday 09:00 to 13:00, closed on Sundays',
  },
]

/**
 * When the online video link comes. The one wording for the website, the assistant's facts and the
 * WhatsApp messages; the confirmation itself is sent at booking (POLICIES.reminders).
 */
export const ONLINE_LINK = 'The link comes by WhatsApp an hour before the session.'

export const ONLINE = {
  hours: [null, [at(8), at(18)], [at(8), at(18)], [at(8), at(18)], [at(8), at(18)], [at(8), at(18)], [at(9), at(13)]] as WeekHours,
  hoursText: 'Monday to Friday 08:00 to 18:00, Saturday 09:00 to 13:00, closed on Sundays',
  how: `Online consultations are private video calls, on a phone or laptop. The WhatsApp confirmation is sent when you book. ${ONLINE_LINK} A phone call is fine if the connection is weak.`,
}

export const IN_PERSON_HOW =
  'In-person consultations are at the Harare or Johannesburg office. Please arrive five minutes early. The consultant talks through your goals and daily routine and agrees a plan for your wellness education with you.'

/** Lunch, when nobody takes bookings, on weekdays. */
export const LUNCH: [number, number] = [at(13), at(14)]

export type ServiceId = 'discovery' | 'consultation' | 'follow-up' | 'education' | 'natural' | 'workplace'

export interface Service {
  id: ServiceId
  name: string
  minutes: number
  /** Indicative price in USD. 0 is free. */
  price: number
  /** Shown instead of the price, for services quoted on enquiry. */
  priceText?: string
  modes: readonly Mode[]
  summary: string
  /** Quoted and arranged by the team, not booked online. */
  enquireOnly?: boolean
}

const BOTH: readonly Mode[] = ['harare', 'johannesburg', 'online']

export const SERVICES: readonly Service[] = [
  {
    id: 'discovery',
    name: 'Free discovery call',
    minutes: 15,
    price: 0,
    modes: ['online'],
    summary: 'A short call to hear what you are looking for and explain how the consultations work.',
  },
  {
    id: 'consultation',
    name: 'Wellness consultation (first visit)',
    minutes: 60,
    price: 45,
    modes: BOTH,
    summary: 'A first one-to-one session about your goals, habits and routine, with a written wellness plan to take away.',
  },
  {
    id: 'follow-up',
    name: 'Follow-up consultation',
    minutes: 30,
    price: 25,
    modes: BOTH,
    summary: 'Check in on your plan, talk through what has worked and adjust the next steps.',
  },
  {
    id: 'education',
    name: 'Wellness education session',
    minutes: 45,
    price: 30,
    modes: ['harare', 'online'],
    summary: 'A practical session on everyday habits such as sleep routines, movement, stress and planning meals.',
  },
  {
    id: 'natural',
    name: 'Natural wellness consultation',
    minutes: 60,
    price: 50,
    modes: BOTH,
    summary: 'A one-to-one session about natural, lifestyle-based approaches to wellness, discussed with the consultant.',
  },
  {
    id: 'workplace',
    name: 'Workplace wellness talk',
    minutes: 90,
    price: 150,
    priceText: 'from $150',
    modes: BOTH,
    summary: 'A talk for a team at your workplace or online. Quoted on enquiry.',
    enquireOnly: true,
  },
]

export type PractitionerId = 'rutendo' | 'thandeka' | 'farai'

export interface Practitioner {
  id: PractitionerId
  name: string
  role: string
  services: readonly ServiceId[]
  /** Where they work on each day of the week (0 is Sunday). */
  week: readonly (Mode | null)[]
}

export const PRACTITIONERS: readonly Practitioner[] = [
  {
    id: 'rutendo',
    name: 'Rutendo Moyo',
    role: 'Wellness consultant, Harare',
    services: ['discovery', 'consultation', 'follow-up', 'education', 'natural'],
    // Harare office, online on Wednesdays.
    week: [null, 'harare', 'harare', 'online', 'harare', 'harare', 'harare'],
  },
  {
    id: 'thandeka',
    name: 'Thandeka Nkosi',
    role: 'Wellness consultant, Johannesburg',
    services: ['discovery', 'consultation', 'follow-up', 'natural'],
    // Johannesburg office, online on Fridays.
    week: [null, 'johannesburg', 'johannesburg', 'johannesburg', 'johannesburg', 'online', 'johannesburg'],
  },
  {
    id: 'farai',
    name: 'Farai Chikomo',
    role: 'Wellness consultant and educator, online',
    services: ['discovery', 'consultation', 'follow-up', 'education'],
    week: [null, 'online', 'online', 'online', 'online', 'online', 'online'],
  },
]

/** How sessions are paid: the same words in the assistant's facts and on the booking confirmation. */
export const PAYMENT = {
  free: 'Free. No payment needed.',
  inPerson: 'paid at the office',
  online: 'paid after the WhatsApp confirmation message',
  noDeposit: 'No deposit is needed to book.',
} as const

export const POLICIES = {
  payment: `${PAYMENT.noDeposit} The free discovery call needs no payment. In-person consultations are ${PAYMENT.inPerson}; online sessions are ${PAYMENT.online}.`,
  changes: 'To change or cancel, reply to the confirmation message on WhatsApp, ideally at least 24 hours before.',
  reminders: 'A WhatsApp confirmation is sent when you book and a reminder the day before.',
  noMedical:
    'The consultants offer wellness education and lifestyle guidance. They are not doctors and do not diagnose or treat medical conditions; anyone with a medical concern should also see their doctor.',
} as const

export const modeLabel = (mode: Mode): string =>
  mode === 'online' ? 'Online (video call)' : `In person, ${OFFICES.find((o) => o.id === mode)?.city ?? mode} office`

/** "$45", "Free", "from $150". */
export const priceLabel = (service: Pick<Service, 'price' | 'priceText'>): string =>
  service.priceText ?? (service.price === 0 ? 'Free' : `$${service.price}`)

/** The price line on a booking confirmation: free services need no payment, paid ones say how they are paid. */
export const paymentLine = (service: Pick<Service, 'price' | 'priceText'>, mode: Mode): string =>
  service.price === 0 && !service.priceText
    ? PAYMENT.free
    : `${priceLabel(service)}, ${mode === 'online' ? PAYMENT.online : PAYMENT.inPerson}. ${PAYMENT.noDeposit}`
