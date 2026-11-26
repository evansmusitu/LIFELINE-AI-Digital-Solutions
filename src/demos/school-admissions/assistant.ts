import { moneyWhole } from '../../lib/format'
import {
  ADMISSION_STEPS,
  CARE,
  ENTRY_COSTS,
  EXTRAS,
  FEE_BANDS,
  LEVIES,
  PAYMENT,
  SCHOOL,
  TERMS_2027,
  TOURS,
  TRANSFERS,
  WAITING_LIST,
  ZIG_NOTE,
  leviesTotal,
} from './business'
import { isSafetyConcern, usdAndZig } from './engine'

/*
 * The sample school's own website assistant: its greeting, suggested questions and saved answers.
 * Live replies come from the same Worker endpoint as Tari, with this persona's instructions
 * (worker/prompt.ts). Saved answers are used when there is no AI reply, so the chat never stops working.
 * Text uses the sample name. A personalised link swaps it when shown (personalised() in engine.ts).
 */

export const ASSISTANT_GREETING = `Hi, I’m ${SCHOOL.assistant}, the ${SCHOOL.name} admissions assistant. I can explain fees in USD and ZiG, term dates, transfers, boarding and how to apply, and book you a tour. I’m an AI, and the admissions office is here if you’d like a person. Ndinotaura chiShona futi.`

export const ASSISTANT_SUGGESTIONS = [
  'How much are Form 1 fees per term?',
  'Can my child transfer in the middle of the year?',
  'When does Term 1 2027 start?',
  'Can family in South Africa pay the fees?',
]

const has = (text: string, pattern: RegExp) => pattern.test(text)

const feeList = () => FEE_BANDS.map((b) => `${b.label} ${usdAndZig(b.tuition)}`).join('; ')

const NEXT = 'Tap “Book a tour” to visit, or “Leave my details” and the admissions office will contact you.'

/** The saved answer after the safety note: short, as the note above has the numbers. */
export const SAFETY_ANSWER = 'Please use the numbers in the note above first. The school takes every concern about a child seriously, and the safeguarding lead will speak to you privately.'

/** A saved answer to the visitor's message. Safety concerns always get the same answer. */
export function savedAnswer(message: string): string {
  const text = message.toLowerCase().replace(/[’']/g, "'")

  if (isSafetyConcern(text)) return SAFETY_ANSWER

  if (has(text, /^\s*(mhoro(i)?|makadii|maswera sei|mangwanani|masikati|manheru)\b/)) {
    return `Mhoroi! Ndini ${SCHOOL.assistant}, mubatsiri weAI we${SCHOOL.name}. Ndingakubatsirai nemari yechikoro, mazuva ekuvhura chikoro, uye kunyoresa mwana. Bvunzai henyu.`
  }
  if (has(text, /^\s*(hi|hello|hey|good (morning|afternoon|evening)|salibonani|sawubona)\b[\s!.,]*$/)) {
    return `Hello! I’m ${SCHOOL.assistant}, the ${SCHOOL.name} admissions assistant. Ask me about fees, term dates, transfers, boarding, the bus or how to apply.`
  }
  if (has(text, /\b(are you (a |an )?(bot|robot|human|real|person|ai)|who are you|what are you)\b/)) {
    return `I’m an AI assistant for ${SCHOOL.name}, not a person. I answer questions about admissions, and I can pass you to the admissions office at any time.`
  }
  if (has(text, /\b(real school|is this real|sample|demo|fake)\b/)) {
    return `${SCHOOL.name} is a sample school, made up to show how a school’s own admissions assistant works. The fees, dates, people and results are sample data.`
  }
  if (has(text, /\b(struggl\w*|can'?t afford|cannot afford|behind (on|with)|owe|arrears|sent home|send(ing)? (him|her|them|my child) home|plan|instal?lments?|bursar(y|ies)|scholarships?|discount)\b/)) {
    return `${PAYMENT.neverExclude} ${PAYMENT.plans} ${PAYMENT.bursaries}`
  }
  if (has(text, /\b(abroad|diaspora|south africa|joburg|johannesburg|uk|england|london|overseas|relative|grandparent|send money)\b/)) {
    return `${PAYMENT.abroad} ${PAYMENT.methods}`
  }
  if (has(text, /\b(ecocash|innbucks|card|bank|transfer the (money|fees)|how (do|can) i pay|pay(ing|ment)?)\b/) && !has(text, /\b(how much|fees for|cost)\b/)) {
    return `${PAYMENT.methods} ${PAYMENT.abroad} ${PAYMENT.plans}`
  }
  if (has(text, /\b(zig|zwg|gold|exchange rate|rate)\b/)) {
    return `Fees are set in US dollars and can be paid in ZiG. ${ZIG_NOTE} Tuition per term: ${feeList()}.`
  }
  if (has(text, /\b(levy|levies|approved|approval)\b/)) {
    return `${LEVIES.map((l) => `${l.name}: ${moneyWhole(l.amount)} a term (${l.approval.toLowerCase()})`).join('. ')}. There are no other levies.`
  }
  if (has(text, /\b(uniform|blazer|tie|shoes|second[- ]hand)\b/)) return ENTRY_COSTS.uniform
  if (has(text, /\b(deposit|application fee|acceptance|refund\w*|non[- ]refundable)\b/)) return `${ENTRY_COSTS.application.text} ${ENTRY_COSTS.deposit.text}`
  if (has(text, /\b(fees?|prices?|cost|costs|how much|tuition|mari)\b|\$/)) {
    return `Tuition per term: ${feeList()}. Approved levies add ${moneyWhole(leviesTotal())} a term. ${EXTRAS.boarding.text} ${ZIG_NOTE}`
  }
  if (has(text, /\b(transfer\w*|mid[- ]?year|middle of the (year|term)|moving back|returning|change schools?)\b/)) return `${TRANSFERS} ${NEXT}`
  if (has(text, /\b(term|dates?|open(s|ing)?|start(s|ing)?|clos(e|es|ing)|holiday|calendar|rumou?r)\b/)) {
    return `2027 dates: ${TERMS_2027.map((t) => `${t.name} ${t.opens} to ${t.closes}`).join('; ')}. Sample dates. Any change is posted on the notice board on this website first.`
  }
  if (has(text, /\b(waiting list|full|places?|space|vacanc(y|ies))\b/)) return `Places depend on the grade. ${WAITING_LIST} ${NEXT}`
  if (has(text, /\b(documents?|papers?|birth certificate|reports?|need to bring|requirements?)\b/)) {
    return 'You’ll need the birth certificate, the last two school reports, a passport photo, an immunisation card for ECD and Grade 1, and a transfer letter for a mid-year transfer. You can attach them when you apply.'
  }
  if (has(text, /\b(apply|application|enrol\w*|admission|register|test|assessment|interview)\b/)) {
    return `How to apply: ${ADMISSION_STEPS.map((s, i) => `${i + 1}. ${s}`).join(' ')}`
  }
  if (has(text, /\b(tour|visit|see the school|open (day|morning))\b/)) return `${TOURS.text} ${NEXT}`
  if (has(text, /\b(bus|buses|transport|pick ?up|drop ?off|route)\b/)) return `${CARE.transport} ${EXTRAS.transport.text}`
  if (has(text, /\b(board\w*|hostel|sick bay|nurse|weekly)\b/)) return `${CARE.boarding} ${EXTRAS.boarding.text}`
  if (has(text, /\b(curriculum|zimsec|cambridge|subjects?|o level|a level|heritage)\b/)) return SCHOOL.curriculum
  if (has(text, /\b(results?|pass rate|registered|ministry)\b/)) return `${SCHOOL.registration} ${SCHOOL.results}`
  if (has(text, /\b(where|address|located|location|hours|office)\b/)) return `The school is in ${SCHOOL.area}. The admissions office is open ${SCHOOL.officeHours}`
  if (has(text, /\b(human|real person|person|someone|call me|callback|call back|speak (to|with)|talk (to|with)|contact|head|bursar)\b/)) {
    return 'Of course. Tap “Talk to a person” or “Leave my details” under this chat, and the admissions office will reply during office hours.'
  }
  if (has(text, /\b(thanks|thank you|cheers|bye|goodbye|ndatenda|maita basa|ngiyabonga)\b/)) return 'You’re welcome! The admissions office is here if you need anything else.'
  return `I can help with ${SCHOOL.name}’s fees, term dates, transfers, boarding, transport and how to apply. For anything else, tap “Talk to a person”.`
}
