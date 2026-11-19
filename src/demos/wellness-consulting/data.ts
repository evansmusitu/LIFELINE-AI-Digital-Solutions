import { PRACTITIONERS, SERVICES, type PractitionerId, type ServiceId } from './business'
import { addDays, bookingDays, hoursFor, practiceDay, startOf, weekday } from './engine'
import type { Booking, BookingStatus, Lead, Source, WellnessState } from './types'

/*
 * Sample bookings and enquiries, laid out on the practice's next open days from the demo's "now"
 * (today, or Monday when today is a Sunday). Invented clients with masked numbers. Each booking's office or online follows
 * the consultant's real schedule for that day, so the seed obeys the same rules as new bookings.
 */

const MIN = 60_000

type Seed = [dayIndex: number, minute: number, practitioner: PractitionerId, service: ServiceId, client: string, phone: string, source: Source]

const h = (hours: number, minutes = 0) => hours * 60 + minutes

const SEEDS: Seed[] = [
  [0, h(8, 30), 'rutendo', 'consultation', 'Chipo Mutasa', '+263 ••• ••• 214', 'WhatsApp'],
  [0, h(10), 'rutendo', 'follow-up', 'Tatenda Gumbo', '+263 ••• ••• 587', 'Booking page'],
  [0, h(15), 'rutendo', 'natural', 'Fadzai Marufu', '+263 ••• ••• 330', 'Facebook'],
  [0, h(9, 30), 'thandeka', 'natural', 'Lindiwe Mokoena', '+27 ••• ••• 461', 'Website chat'],
  [0, h(14), 'thandeka', 'consultation', 'Sipho Ndlovu', '+27 ••• ••• 902', 'LinkedIn'],
  [0, h(11), 'farai', 'education', 'Nomsa Dlamini', '+27 ••• ••• 118', 'Facebook'],
  [0, h(16), 'farai', 'discovery', 'Kudzai Banda', '+263 ••• ••• 745', 'Website chat'],
  [1, h(9), 'rutendo', 'consultation', 'Grace Phiri', '+263 ••• ••• 076', 'WhatsApp'],
  [1, h(11, 30), 'thandeka', 'follow-up', 'Ayanda Khumalo', '+27 ••• ••• 653', 'Website chat'],
  [1, h(14, 30), 'farai', 'education', 'Busisiwe Mahlangu', '+27 ••• ••• 289', 'LinkedIn'],
  [2, h(10), 'thandeka', 'consultation', 'Kagiso Molefe', '+27 ••• ••• 540', 'Booking page'],
  [2, h(15), 'rutendo', 'follow-up', 'Chipo Mutasa', '+263 ••• ••• 214', 'WhatsApp'],
  [3, h(9, 30), 'farai', 'discovery', 'Rumbidzai Zvobgo', '+263 ••• ••• 821', 'Facebook'],
  [3, h(12), 'rutendo', 'consultation', 'Tafadzwa Ncube', '+263 ••• ••• 392', 'Website chat'],
]

type LeadSeed = [minutesAgo: number, name: string, contact: string, source: Source, interest: string, note: string, status: Lead['status']]

const LEADS: LeadSeed[] = [
  [25, 'Ruvimbo Chari', '+263 ••• ••• 508', 'WhatsApp', 'Wellness consultation (first visit)', 'Asked about Saturday morning times in Harare', 'New'],
  [130, 'Bongani Zulu', 'b•••@example.com', 'LinkedIn', 'Workplace wellness talk', 'Team of about 40 at a Johannesburg office, wants a quote', 'New'],
  [60 * 20, 'Precious Nyathi', '+263 ••• ••• 640', 'Facebook', 'Online consultation', 'Lives outside Harare, asked how the video calls work', 'Contacted'],
  [60 * 23, 'Ayanda Khumalo', '+27 ••• ••• 653', 'Website chat', 'Follow-up consultation', 'Asked about prices and the Rosebank office', 'Booked'],
  [60 * 46, 'Tinashe Mhlanga', '+263 ••• ••• 117', 'Website chat', 'Wellness education session', 'Wanted to talk to a person about an evening time', 'Handed over'],
  [60 * 70, 'Grace Phiri', '+263 ••• ••• 076', 'WhatsApp', 'Wellness consultation (first visit)', 'Booked through the assistant on WhatsApp', 'Booked'],
]

/** Bookings that have ended by `now` show as completed. */
const statusAt = (start: number, minutes: number, now: number): BookingStatus => (start + minutes * MIN <= now ? 'Completed' : 'Booked')

export function createInitialState(now: number): WellnessState {
  const days = bookingDays(now, 4)
  const bookings: Booking[] = []
  let ref = 1031
  for (const [dayIndex, minute, practitionerId, serviceId, name, phone, source] of SEEDS) {
    const day = days[dayIndex]
    const practitioner = PRACTITIONERS.find((p) => p.id === practitionerId)
    const service = SERVICES.find((s) => s.id === serviceId)
    const weekdayIndex = weekday(day)
    const mode = practitioner?.week[weekdayIndex]
    if (!practitioner || !service || !mode || !service.modes.includes(mode)) continue
    // Saturdays close at 13:00: sample bookings outside the day's hours are left out.
    const hours = hoursFor(mode, weekdayIndex)
    if (!hours || minute < hours[0] || minute + service.minutes > hours[1]) continue
    const start = startOf(day, minute)
    bookings.push({
      id: `seed-${ref}`,
      ref: `SL-${ref}`,
      client: { name, phone },
      serviceId,
      practitionerId,
      mode,
      start,
      minutes: service.minutes,
      status: statusAt(start, service.minutes, now),
      source,
      // Booked a few days before, so the day-before reminders have gone out.
      createdAt: startOf(addDays(practiceDay(now), -2 - (ref % 3)), h(9) + (ref % 7) * 47),
    })
    ref += 1
  }
  const leads: Lead[] = LEADS.map(([minutesAgo, name, contact, source, interest, note, status], i) => ({
    id: `lead-${i + 1}`,
    name,
    contact,
    source,
    interest,
    note,
    at: now - minutesAgo * MIN,
    status,
  }))
  return { bookings, leads, nextRef: ref + 10, remindedAt: {} }
}

/** The demo's clock starts at 09:30 practice time today and then runs in real time. */
export const DEMO_START_MINUTE = h(9, 30)
