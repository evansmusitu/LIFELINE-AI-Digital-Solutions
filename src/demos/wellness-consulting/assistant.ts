import { BUSINESS, OFFICES, ONLINE, POLICIES, SERVICES, priceLabel } from './business'
import { isEmergency } from './engine'

/*
 * The sample practice's own website assistant: its greeting, suggested questions and saved answers.
 * Live replies come from the same Worker endpoint as Tari, with this persona's instructions
 * (worker/prompt.ts). Saved answers are used when there is no AI reply (the site's daily cap is
 * reached, too many messages, offline or an error), so the chat never stops working.
 * Text uses the sample name. A personalised link swaps it when shown (personalised() in engine.ts).
 */

export const ASSISTANT_GREETING = `Hi, I’m ${BUSINESS.assistant}, the ${BUSINESS.name} assistant. I can explain our services and prices, how in-person and online consultations work, and help you book. I’m an AI, and the team is here if you’d like a person.`

export const ASSISTANT_SUGGESTIONS = [
  'What services do you offer?',
  'How do online consultations work?',
  'Where are your offices and when are you open?',
  'How much is a first consultation?',
]

const has = (text: string, pattern: RegExp) => pattern.test(text)

const serviceList = () =>
  SERVICES.map((s) => `${s.name} (${s.minutes} min, ${priceLabel(s)})`).join('; ')

const officeList = () => OFFICES.map((o) => `${o.area} (${o.hoursText})`).join(' and ')

const NEXT = 'Tap “Book online” to see free times, or “Leave my details” and the team will contact you.'

/**
 * The saved answer to a message that suggests an emergency. The chat has already shown the red
 * emergency note (EMERGENCY_NOTE, from the same isEmergency check), so this is a short follow-on line
 * that points back to it instead of repeating it.
 */
export const EMERGENCY_ANSWER = 'Please get help first, as the red note above says. When you’re safe, the team will gladly help with anything else.'

/** A saved answer to the visitor's message. Emergencies and health questions always get the same safe answers. */
export function savedAnswer(message: string): string {
  const text = message.toLowerCase().replace(/[’']/g, "'")

  if (isEmergency(text)) return EMERGENCY_ANSWER

  if (
    has(
      text,
      /\b(diagnos\w*|symptoms?|what (should|can|must) i (take|use|drink|eat)|supplements?|vitamins?|herbs?|herbal|remed(y|ies)|medicines?|medication|tablets?|pills?|doses?|dosage|cures?|heal(s|ing)?|medical conditions?|my condition|diseases?|diabet\w*|blood pressure|hypertension|cancer|hiv|arthritis|pregnan\w*|infections?|pain)\b/,
    )
  ) {
    return `I can’t give medical advice, say what a symptom means or recommend treatments, supplements or remedies. ${POLICIES.noMedical} A consultant can talk it through with you privately in a consultation. Would you like to book one?`
  }
  if (has(text, /^\s*(hi|hello|hey|hiya|good (morning|afternoon|evening)|mhoro|makadii|salibonani|sawubona|dumela)\b[\s!.,]*$/)) {
    return `Hello! I’m ${BUSINESS.assistant}, the ${BUSINESS.name} assistant. Ask me about our services, prices, offices or online consultations, or how to book.`
  }
  if (has(text, /\b(are you (a |an )?(bot|robot|human|real|person|ai)|who are you|what are you)\b/)) {
    return `I’m an AI assistant for ${BUSINESS.name}, not a person. I answer questions about our services and bookings, and I can pass you to the team at any time.`
  }
  if (has(text, /\b(real business|is this real|sample|demo|fake)\b/)) {
    return `${BUSINESS.name} is a sample business, made up to show how a practice’s own assistant and booking work. The services, people and prices are sample data.`
  }
  if (has(text, /\b(deposits?|pay|paying|payment|ecocash|card|eft|cash)\b/)) {
    return `${POLICIES.payment} ${NEXT}`
  }
  if (has(text, /\b(prices?|pricing|cost|costs|how much|fees?|charges?|rates?|mari)\b|\$/)) {
    return `Our indicative prices: ${serviceList()}. ${NEXT}`
  }
  if (has(text, /\b(online|video|zoom|virtual|remote|from home|phone call)\b/)) {
    return `${ONLINE.how} Online times are ${ONLINE.hoursText} (${BUSINESS.timeLabel}). ${NEXT}`
  }
  if (has(text, /\b(where|offices?|address|located|location|harare|johannesburg|joburg|jozi|hours|open|opening|closed?|saturday|sunday)\b/)) {
    return `We have two offices: ${officeList()}. Times are ${BUSINESS.timeLabel}. Online consultations are also available. ${NEXT}`
  }
  if (has(text, /\b(change|cancel|reschedule|move my)\b/)) return `${POLICIES.changes} ${POLICIES.reminders}`
  if (has(text, /\b(human|real person|person|someone|call me|callback|call back|speak (to|with)|talk (to|with)|contact|owner|consultant)\b/)) {
    return 'Of course. Tap “Talk to a person” or “Leave my details” under this chat, and the team will reply during office hours.'
  }
  if (has(text, /\b(book|booking|appointment|available|availability|slot|when can)\b/)) {
    return `You can book online in a minute: choose the Harare office, the Johannesburg office or an online consultation, then a service and a free time. ${POLICIES.reminders}`
  }
  if (has(text, /\b(services?|offer|do you do|what do you|workshops?|talks?|workplace|education|natural)\b/)) {
    return `We offer: ${serviceList()}. ${NEXT}`
  }
  if (has(text, /\b(thanks|thank you|cheers|bye|goodbye|ndatenda|ngiyabonga)\b/)) {
    return 'You’re welcome! The team is here if you need anything else.'
  }
  return `I can help with ${BUSINESS.name}’s services, prices, offices and hours, online consultations and bookings. For anything else, tap “Talk to a person”.`
}
