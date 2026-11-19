import { BUSINESS, ONLINE_LINK } from './business'
import { bookingDays, confirmationMessage, dayLabel, firstNameOf, freeRef, hhmm, practiceDay, serviceById, slotsFor, startOf, stillFree } from './engine'
import type { Booking, WellnessState } from './types'

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

/** The id of the booking the conversation makes. */
export const SCRIPT_BOOKING = 'whatsapp-script'

export interface ScriptPlan {
  /** The booking the conversation makes, or null when no online time is free this week. */
  booking: Booking | null
  /** The times the assistant offers, first one chosen. */
  offered: { day: number; minute: number }[]
}

/** Picks the first afternoon online times from tomorrow on, from the live calendar. */
export function planScript(bookings: Booking[], now: number, ref: string): ScriptPlan {
  const service = serviceById('consultation')
  const days = bookingDays(now, 6).filter((day) => day > practiceDay(now))
  for (const afternoon of [true, false]) {
    for (const day of days) {
      const slots = slotsFor(service, 'online', 'any', day, bookings, now).filter((s) => !afternoon || s.minute >= 14 * 60)
      if (!slots.length) continue
      const first = slots[0]
      const booking: Booking = {
        id: SCRIPT_BOOKING,
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

/**
 * Called just before the conversation books. The plan was made when the conversation started, and a
 * booking made on the Book screen since then may have taken its time. So: keep the planned time if
 * it is still free, otherwise plan the next free one (the conversation then shows those times), and
 * take a reference that no booking uses yet.
 */
export function replanBeforeBooking(plan: ScriptPlan, bookings: Booking[], now: number, nextRef: number): ScriptPlan {
  const others = bookings.filter((b) => b.id !== SCRIPT_BOOKING)
  const { ref } = freeRef(others, nextRef)
  if (plan.booking && stillFree(plan.booking, others, now)) return { ...plan, booking: { ...plan.booking, ref, createdAt: now } }
  return planScript(others, now, ref)
}

/**
 * Adds the conversation's booking to the practice's bookings, checked on the latest state: never
 * twice, never on a time that has been taken, and never with a reference already in use.
 */
export function addScriptBooking(state: WellnessState, booking: Booking, now: number): WellnessState {
  if (state.bookings.some((b) => b.id === booking.id)) return state
  if (!stillFree(booking, state.bookings, now)) return state
  const taken = state.bookings.some((b) => b.ref === booking.ref)
  const { ref, next } = taken ? freeRef(state.bookings, state.nextRef) : { ref: booking.ref, next: Number(booking.ref.slice(3)) + 1 }
  return { ...state, bookings: [...state.bookings, { ...booking, ref }], nextRef: Math.max(state.nextRef, next) }
}

export function scriptLines(plan: ScriptPlan): ScriptLine[] {
  const intro: ScriptLine[] = [
    { from: 'client', text: 'Hi, I saw your page on Facebook. Do you do online consultations? I’m in Bulawayo.' },
    {
      from: 'assistant',
      text: `Hi! I’m ${BUSINESS.assistant}, the ${BUSINESS.name} assistant (an AI). Yes: online consultations are private video calls. ${ONLINE_LINK} A first wellness consultation is 60 minutes, $45. Shall I find you a time?`,
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
