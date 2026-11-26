import { CARE, PAYMENT, SCHOOL, TRANSFERS } from './business'
import { dayLong, schoolDay, termFees, timeLabel, usdAndZig } from './engine'

/*
 * The WhatsApp conversation: a parent in Johannesburg, moving back to Harare, asks about a Form 2 place
 * for Term 2. She starts in Shona, the assistant answers in Shona and switches to English when she does.
 * It books a tour and hands the payment plan question to the bursar. Played line by line.
 */

export const PARENT = { name: 'Chipo Mlambo', phone: '+27 ••• ••• 318' } as const
export const SCRIPT_TOUR = 'tour-whatsapp-script'
export const SCRIPT_ENQUIRY = 'enquiry-whatsapp-script'

export interface ScriptPlan {
  /** The tour the conversation offers, fixed when it starts. Null when every tour is full. */
  tourStart: number | null
  ref: string
}

export interface ScriptLine {
  from: 'parent' | 'school'
  text: string
  /** English, under a Shona line. */
  translation?: string
  action?: 'tour' | 'handover'
}

export function scriptLines(plan: ScriptPlan): ScriptLine[] {
  const tour = plan.tourStart
  const when = tour ? `${dayLong(schoolDay(tour))} at ${timeLabel(tour)}` : null
  return [
    {
      from: 'parent',
      text: 'Mhoroi. Ndiri kubvunza kana muine nzvimbo muForm 2 kubva kuTerm 2.',
      translation: 'Hello. I’m asking if you have a place in Form 2 from Term 2.',
    },
    {
      from: 'school',
      text: `Mhoroi! Ndini ${SCHOOL.assistant}, mubatsiri weAI we${SCHOOL.name}. Ehe, tinogamuchira vana vanochinja chikoro pakati pegore kana paine nzvimbo. Mungada kuti tiite hurukuro nechiShona here kana nechiRungu?`,
      translation: `Hello! I’m ${SCHOOL.assistant}, ${SCHOOL.name}’s AI assistant. Yes, we take mid-year transfers when there is a place. Would you like to continue in Shona or English?`,
    },
    { from: 'parent', text: 'English is fine. We’re moving back from Joburg in April. What do I need for my son?' },
    {
      from: 'school',
      text: `Thank you. ${TRANSFERS.split('. ').slice(0, 2).join('. ')}. You’ll also need his birth certificate and a passport photo. You can send photos of them here.`,
    },
    { from: 'parent', text: 'How much is it per term? His dad is in the UK and will pay part of it.' },
    {
      from: 'school',
      text: `Form 2 is *${usdAndZig(termFees('Form 2'))}* a term for a day learner, with the approved levies. ${PAYMENT.abroad}`,
    },
    { from: 'parent', text: 'Can I see the school? I’m in Harare for a few days before we move.' },
    when
      ? {
          from: 'school',
          text: `Yes. I’ve booked you on the tour on *${when}*. Ref ${plan.ref}. You’ll meet the Head. If you can’t make it, reply here and we’ll move it.`,
          action: 'tour',
        }
      : { from: 'school', text: 'All the tours are full for the next two weeks, so I’ll ask the office to arrange a time with you.', action: 'handover' },
    { from: 'parent', text: 'Thank you. Can someone call me about paying monthly?' },
    {
      from: 'school',
      text: `Of course. ${PAYMENT.plans} I’ve passed your number to the bursar, who will call you during office hours. ${CARE.data}`,
      action: 'handover',
    },
  ]
}
