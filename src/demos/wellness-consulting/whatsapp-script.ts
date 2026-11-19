import { BUSINESS } from './business'
import { bookingDays, confirmationMessage, dayLabel, firstNameOf, hhmm, practiceDay, serviceById, slotsFor, startOf } from './engine'
import type { Booking } from './types'

/*
 * The scripted WhatsApp conversation: a client enquires, the practice's assistant answers, books a
 * real free slot from the same calendar as the booking page, sends the confirmation, declines a health
 * question and hands over to the owner. Nothing is sent: it is a simulation.
 */

export type Speaker = 'client' | 'assistant' | 'system' | 'owner'

export interface ScriptLine {
  from: Speaker
  text: string
  /** Reply buttons shown under the message, as WhatsApp shows them. */
  options?: string[]
  /** What happens in the demo when this line appears. */
  action?: 'book' | 'handover'
}

export const CLIENT = { name: 'Tendai Sibanda', phone: '+263 ••• ••• 908' }

export interface ScriptPlan {
  /** The booking the conversation makes, or null when no online time is free this week. */
  booking: Booking | null
  /** The times the assistant offers, first one chosen. */
  offered: { day: number; minute: number }[]
}

/** Picks the first afternoon online times from tomorrow on, from the live calendar. */
export function planScript(bookings: Booking[], now: number, ref: string): ScriptPlan {
  const service = serviceById('consultation')
  const days = bookingDays(now, 6).slice(1)
  for (const afternoon of [true, false]) {
    for (const day of days) {
      const slots = slotsFor(service, 'online', 'any', day, bookings, now).filter((s) => !afternoon || s.minute >= 14 * 60)
      if (!slots.length) continue
      const first = slots[0]
      const booking: Booking = {
        id: 'whatsapp-script',
        ref,
        client: { ...CLIENT },
        serviceId: service.id,
        practitionerId: first.practitionerIds[0],
        mode: 'online',
        start: startOf(day, first.minute),
        minutes: service.minutes,
        status: 'Booked',
        source: 'WhatsApp',
        createdAt: now,
      }
      return { booking, offered: slots.slice(0, 3).map((s) => ({ day, minute: s.minute })) }
    }
  }
  return { booking: null, offered: [] }
}

export function scriptLines(plan: ScriptPlan): ScriptLine[] {
  const intro: ScriptLine[] = [
    { from: 'client', text: 'Hi, I saw your page on Facebook. Do you do online consultations? I’m in Bulawayo.' },
    {
      from: 'assistant',
      text: `Hi! I’m ${BUSINESS.assistant}, the ${BUSINESS.name} assistant (an AI). Yes: online consultations are private video calls, and the link comes here on WhatsApp. A first wellness consultation is 60 minutes, $45. Shall I find you a time?`,
    },
    { from: 'client', text: 'Yes please. An afternoon if possible.' },
  ]
  const { booking, offered } = plan
  if (!booking) {
    return [
      ...intro,
      { from: 'assistant', text: 'The online times are full this week, so I’ve asked the team to offer you a time. They’ll reply here during office hours.', action: 'handover' },
      { from: 'system', text: 'Handed over to the team. The owner sees this chat in the Owner view.' },
    ]
  }
  const day = practiceDay(booking.start)
  const chosen = `${dayLabel(day)} ${hhmm(offered[0].minute)}`
  const who = firstNameOf(booking.practitionerId)
  return [
    ...intro,
    {
      from: 'assistant',
      text: `These online times are free on ${dayLabel(day)}, ${BUSINESS.timeLabel}. Which suits you?`,
      options: offered.map((o) => `${dayLabel(o.day)} ${hhmm(o.minute)}`),
    },
    { from: 'client', text: chosen },
    { from: 'assistant', text: `Lovely. What name should I put the booking under? I’ll send the confirmation to this WhatsApp number.` },
    { from: 'client', text: CLIENT.name },
    { from: 'assistant', text: confirmationMessage(booking), action: 'book' },
    { from: 'client', text: 'Thank you! My mother has high blood pressure. What natural remedy should she take?' },
    {
      from: 'assistant',
      text: `I’m sorry, I can’t give medical advice or recommend remedies. Her doctor is the right person for medical questions, and ${who} can talk about everyday wellness habits with her in a consultation. Would you like the team to contact you about a booking for her?`,
    },
    { from: 'client', text: 'Yes please, can someone call me?' },
    { from: 'assistant', text: `Of course. I’ve passed our chat to the team, and ${who} will reply here during office hours.`, action: 'handover' },
    { from: 'system', text: 'Handed over to the owner. The assistant stays quiet in this chat until the team hands it back.' },
    {
      from: 'owner',
      text: `Hi Tendai, ${who} here from ${BUSINESS.name}. Happy to help your mother. Would she prefer an online session like yours, or a visit to one of our offices?`,
    },
  ]
}
