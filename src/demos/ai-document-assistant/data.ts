import { daysAgoAt, seededRandom, todayAt, uid } from '../../lib/time'
import { BUSINESS, DELIVERY, STAFF, sampleDocs } from './docs'
import { answer, indexDocuments } from './engine'
import { plainKey } from './text'
import type { Answer, AppState, Channel, ChatMessage, Gap, Handoff, LogEntry } from './types'

/* Sample day at Irkdale Building Supplies, an invented builders’ merchant in Manchester, UK. */

export const OWNER = 'Irkdale’s'

export const ASK_SUGGESTIONS = [
  'How much for 40 bags of Portland cement?',
  'Do you deliver to Stockport on Saturday?',
  'Can a customer return an opened bag of plaster?',
  'What discount do trade accounts get?',
  'Is 12.5 mm plasterboard in stock?',
  'Do you sell solar panels?',
]

export const CUSTOMER_SUGGESTIONS = [
  'Price for 3 pallets of 100mm blocks delivered to Salford?',
  'What time do you open Saturday?',
  'Can I return 2 unopened bags of cement?',
  'Can you send me a quote for 2 bulk bags of sharp sand?',
]

export const HANDOFF_REPLY = `Done. ${STAFF.counter.split(' ')[0]} will reply when the counter opens at ${BUSINESS.opens}.`

export function insightStats(log: LogEntry[], handoffs: Handoff[]) {
  const answered = log.filter((e) => e.kind !== 'none').length
  const rated = log.filter((e) => e.helpful !== null)
  const up = rated.filter((e) => e.helpful).length
  return {
    total: log.length,
    answered,
    answeredPct: log.length ? Math.round((answered / log.length) * 100) : 0,
    rated: rated.length,
    up,
    helpfulPct: rated.length ? Math.round((up / rated.length) * 100) : null,
    handoffs: handoffs.length,
    avgMs: log.length ? log.reduce((s, e) => s + e.ms, 0) / log.length : 0,
  }
}

/** Ready-made documents for visitors without a file to hand (Documents, Paste text). */
export const EXAMPLES = {
  csv: {
    name: 'Hire shop price list',
    text: `Item,Description,Price per day,Price per week,Stock
"Breaker, 110V","Heavy breaker with 2 chisels",$45.00,$135.00,3
Cement mixer,"Electric, 140 litre drum",$28.00,$84.00,2
"Plate compactor, petrol","For MOT and paving sub-base",$39.00,$117.00,0
Tile cutter,Wet cutter 180 mm,$22.00,$66.00,4
`,
  },
  policy: {
    name: 'Hire shop terms',
    text: `# Hire shop terms

## Deposits
We take a $50 deposit for each tool. It is refunded when the tool comes back clean and working.

## Late returns
Tools returned late are charged at the daily rate for each extra day.

## Fuel
Petrol tools go out with a full tank. Bring them back full or we charge $8 for fuel.

## Breakages
Tell us straight away if a tool breaks. Damage caused by misuse is charged at the repair cost.
`,
  },
}

/** The trade customer in the WhatsApp screen. */
export const CUSTOMER = { name: 'Tomasz Nowak', company: 'TN Groundworks', phone: '+44 7700 ••• 5183' }

/** Minutes a counter colleague spends looking an answer up by hand. */
export const LOOKUP_MINUTES = 4

/** A fixed, believable answer time per question (1.0 to 1.9 s), so the same question always takes as long. */
export function answerMs(question: string): number {
  let h = 0
  for (const ch of question) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return 1000 + (h % 900)
}

type Seed = [at: number, channel: Channel, question: string]

function seeds(): Seed[] {
  const counter = (h: number, m: number, q: string): Seed => [todayAt(h, m), 'counter', q]
  const night = (h: number, m: number, q: string): Seed => [daysAgoAt(1, h, m), 'whatsapp', q]
  const early = (h: number, m: number, q: string): Seed => [todayAt(h, m), 'whatsapp', q]
  return [
    night(18, 4, 'What time do you open tomorrow?'),
    night(19, 12, 'Do you sell solar panels?'),
    night(20, 31, 'Price for 4 bulk bags of sharp sand delivered to Stockport'),
    night(20, 58, 'Can I return 3 unopened bags of cement?'),
    night(21, 20, 'Do you deliver to Wigan on Saturday?'),
    early(5, 52, 'Do you sell solar panels?'),
    early(6, 5, 'How much for a pallet of Portland cement?'),
    counter(6, 33, 'Price for 10 bags of multi-finish plaster'),
    counter(6, 35, 'How much is a pallet of 140 mm concrete blocks?'),
    counter(6, 38, 'Is MOT type 1 in stock?'),
    counter(6, 41, 'Do you deliver to Bolton?'),
    counter(6, 44, 'What time is the cut-off for next day delivery?'),
    counter(6, 46, 'Bulk bag deposit refund?'),
    counter(6, 49, 'How much for 20 sheets of OSB3?'),
    counter(6, 52, 'Can I return unopened plaster?'),
    counter(6, 54, 'What credit limit do I get?'),
    counter(6, 57, 'How much is PIR board 100mm?'),
    counter(7, 0, 'Price for 6 lengths of 4.8 m C24 timber'),
    counter(7, 2, 'Do you deliver to Oldham on Saturday?'),
    counter(7, 5, 'Is 50mm PIR in stock?'),
    counter(7, 7, 'Can I pay with a card over the phone?'),
    counter(7, 9, 'How do I open a trade account?'),
    counter(7, 12, 'How much is crane offload?'),
    counter(7, 14, 'How much is a roll of breathable membrane?'),
    counter(7, 17, 'Who can order on our account?'),
    counter(7, 19, 'What if a delivery arrives damaged?'),
    counter(7, 22, 'Price for 500 engineering bricks'),
    counter(7, 24, 'Do you cut timber to size?'),
    counter(7, 27, 'How much are 110 mm drainage pipes?'),
    counter(7, 29, 'Is moisture resistant plasterboard in stock?'),
    counter(7, 32, 'How long do refunds take?'),
    counter(7, 34, 'Do you take back special orders?'),
    counter(7, 37, 'How much for 2 bulk bags of sharp sand delivered to Didsbury?'),
    counter(7, 39, 'Is there a discount on a trade account?'),
    counter(7, 41, 'When are statements sent?'),
    counter(7, 43, 'Do you deliver to Wigan?'),
  ]
}

function sampleHandoffs(): Handoff[] {
  return [
    {
      id: 'h-1',
      at: daysAgoAt(1, 20, 47),
      customer: 'Aisha Rahman',
      phone: '+44 7700 ••• 2291',
      question: 'Can you quote 12 sheets of OSB3 and 40 CLS studs delivered to Didsbury for Thursday?',
    },
    {
      id: 'h-2',
      at: daysAgoAt(1, 21, 16),
      customer: 'Liam Doherty',
      phone: '+44 7911 ••• 0476',
      question: 'Please book 2 bulk bags of sharp sand for Saturday morning to Prestwich.',
    },
  ]
}

/** Today's questions so far, answered by the same engine the visitor uses. */
function sampleLog(index: ReturnType<typeof indexDocuments>): LogEntry[] {
  const rand = seededRandom(2026)
  return seeds().map(([at, channel, question], i) => {
    let a = answer(question, index, { rules: DELIVERY, owner: OWNER })
    if (a.kind === 'clarify' && a.choices?.length) a = answer(question, index, { rules: DELIVERY, rowId: a.choices[0].rowId })
    const rated = a.kind !== 'none' && rand() < 0.65
    return {
      id: `log-${i + 1}`,
      at,
      question,
      channel,
      kind: a.kind,
      topic: a.topic,
      docIds: [...new Set(a.sources.map((s) => s.docId))],
      ms: Math.round(1100 + rand() * 1700),
      helpful: rated ? rand() < 0.9 : null,
    }
  })
}

/** Unanswered questions, grouped so the same question asked twice shows once with a count. */
export function gapsFrom(log: LogEntry[]): Gap[] {
  const gaps = new Map<string, Gap>()
  for (const entry of log) {
    if (entry.kind !== 'none') continue
    const key = plainKey(entry.question)
    const gap = gaps.get(key)
    if (gap) {
      gap.count += 1
      gap.lastAt = Math.max(gap.lastAt, entry.at)
      gap.firstAt = Math.min(gap.firstAt, entry.at)
    } else gaps.set(key, { id: `gap-${gaps.size + 1}`, question: entry.question, firstAt: entry.at, lastAt: entry.at, count: 1, status: 'open' })
  }
  return [...gaps.values()]
}

export function createInitialState(): AppState {
  const docs = sampleDocs()
  const log = sampleLog(indexDocuments(docs))
  return { docs, log, gaps: gapsFrom(log), handoffs: sampleHandoffs(), counterChat: [], customerChat: [] }
}

/** Chats keep the latest messages only, so stored state stays small. */
const CHAT_CAP = 40

/**
 * Writes a finished answer: the chat messages, the log entry, and an unanswered-question entry when the
 * documents had nothing. Clarifying questions and empty or vague messages aren't logged.
 */
export function recordAnswer(
  s: AppState,
  r: { channel: Channel; user: ChatMessage; question: string; answer: Answer; ms: number; offerHandoff: boolean },
): AppState {
  const { channel, user, question, answer: a, ms } = r
  const logged = a.kind !== 'clarify' && a.reason !== 'empty' && a.reason !== 'vague'
  const logId = logged ? uid('log') : undefined
  const log: LogEntry[] = logId
    ? [...s.log, { id: logId, at: user.at, question, channel, kind: a.kind, topic: a.topic, docIds: [...new Set(a.sources.map((x) => x.docId))], ms, helpful: null }]
    : s.log
  let gaps = s.gaps
  if (a.kind === 'none' && a.reason === 'not-found') {
    const key = plainKey(question)
    const found = gaps.find((g) => plainKey(g.question) === key)
    gaps = found
      ? gaps.map((g) => (g === found ? { ...g, count: g.count + 1, lastAt: user.at, status: 'open' as const, answeredAt: undefined, docId: undefined } : g))
      : [...gaps, { id: uid('gap'), question, firstAt: user.at, lastAt: user.at, count: 1, status: 'open' }]
  }
  const reply: ChatMessage = {
    id: uid('m'),
    role: 'assistant',
    at: user.at + ms,
    text: a.text,
    answer: a,
    question,
    logId,
    handoff: r.offerHandoff && a.kind !== 'clarify' ? 'offered' : undefined,
  }
  const key = channel === 'counter' ? 'counterChat' : 'customerChat'
  return { ...s, log, gaps, [key]: [...s[key], user, reply].slice(-CHAT_CAP) }
}
