import { clockTime, dayAndTime, duration, firstName, money } from '../../lib/format'
import { DAY, MINUTE, isSameDay } from '../../lib/time'
import type { AgentId, Language, Mood, Order, OrderStatus, Priority, Reason, Settings, Ticket, Topic, Triage } from './types'

/*
 * The triage "AI". In the demo, weighted keyword rules imitate the model so everything works offline.
 * A real build sends each message to an AI model set up with the store's products, policies and past tickets.
 */

export const STORE = { name: 'Grysbok Outdoor', email: 'help@grysbokoutdoor.co.za' }

export const AGENTS: Record<AgentId, { name: string; email: string }> = {
  thandiwe: { name: 'Thandiwe Mokoena', email: 'thandiwe@grysbokoutdoor.co.za' },
  pieter: { name: 'Pieter van Wyk', email: 'pieter@grysbokoutdoor.co.za' },
  aisha: { name: 'Aisha Daniels', email: 'aisha@grysbokoutdoor.co.za' },
}
export const AGENT_IDS: AgentId[] = ['thandiwe', 'pieter', 'aisha']

export const TOPICS: Topic[] = [
  'Order status',
  'Delivery problem',
  'Return or exchange',
  'Refund or billing',
  'Damaged or faulty',
  'Product question',
  'Complaint',
  'General question',
]
export const PRIORITIES: Priority[] = ['Urgent', 'High', 'Normal', 'Low']

export const DEFAULT_SETTINGS: Settings = {
  autoAnswer: true,
  autoClose: false,
  angryHigh: true,
  safetyUrgent: true,
  detectLanguage: true,
  returnsToAisha: true,
  targets: { Urgent: 60, High: 240, Normal: 480, Low: 1440 },
}

/* Matching */

/**
 * Words and phrases per topic, grouped by weight. Heavier (usually longer) phrases are matched first,
 * so "charged twice" wins over "charged". A trailing * matches any word ending.
 */
const TOPIC_TERMS: [Topic, [weight: number, terms: string[]][]][] = [
  ['Damaged or faulty', [
    [3, ['stopped working', "doesn't work", 'not working', 'broke*', 'snapped', 'leak*', 'fault*', 'damage*', 'defect*', 'stukkend']],
    [2, ['crack*', 'torn', 'ripped', 'warrant*']],
    [1, ['hiss*']],
  ]],
  ['Refund or billing', [
    [5, ['charged twice', 'double charge*']],
    [4, ['overcharged']],
    [3, ['money back', 'refund*', 'terugbetaling']],
    [2, ['charged', 'invoice*', 'payment*', 'billing']],
  ]],
  ['Delivery problem', [
    [4, ['never arrived', 'nothing arrived', 'wrong address']],
    [3, ['not arrived', "hasn't arrived", "didn't arrive", 'not received', "haven't received"]],
    [2, ['still waiting', 'courier*', 'late', 'missing', 'lost', 'driver', 'left at']],
    [1, ['deliver*', 'aflewer*']],
  ]],
  ['Return or exchange', [
    [3, ['send it back', 'return*', 'swap*', 'exchang*', 'terugstuur']],
    [2, ['too tight', 'too small', 'too big', "doesn't fit", 'wrong model', 'size']],
  ]],
  ['Order status', [
    [4, ['waar is my bestelling', 'where is my order', "where's my order"]],
    [3, ['order status']],
    [2, ['when will', 'be sent', 'been sent', 'any news', 'track*', 'arriv*', 'dispatch*', 'bestelling']],
    [1, ['shipped', 'eta', 'wanneer']],
  ]],
  ['Product question', [
    [4, ['is it waterproof']],
    [3, ['difference between', 'which size', 'in stock', 'how heavy']],
    [2, ['come with', 'does it', 'waterproof', 'recommend*', 'weigh*', 'compatible', 'suitable']],
    [1, ['does the', 'separately']],
  ]],
  ['Complaint', [
    [4, ['terrible service', 'complain*']],
    [3, ['poor service', 'unacceptable', 'rude', 'manager']],
    [2, ['disappointed']],
  ]],
]

const BASE_PRIORITY: Record<Topic, Priority> = {
  'Order status': 'Normal',
  'Delivery problem': 'Normal',
  'Return or exchange': 'Normal',
  'Refund or billing': 'High',
  'Damaged or faulty': 'High',
  'Product question': 'Low',
  Complaint: 'High',
  'General question': 'Low',
}

const SAFETY = [
  /\bgas\b[^.!?]{0,40}\b(smell|leak)\w*|\b(smell|leak)\w*[^.!?]{0,40}\bgas\b/,
  /\bburn(s|t|ed|ing)?\b/,
  /\bcaught fire\b|\bfire\b|\bflames?\b/,
  /\binjur\w*|\bhurt\b/,
  /\bexplod\w*|\bcarbon monoxide\b/,
]
const DEADLINE = /\b(today|tonight|tomorrow|this weekend|saturday|sunday|friday|next week)\b/
const ANGRY = [
  'not happy', 'unhappy', 'unacceptable', 'ridiculous', 'worst', 'furious', 'still waiting', 'sort this out', 'fed up',
  'useless', 'disgusted', 'terrible', 'angry', 'joke', 'never again', 'belaglik', 'onaanvaarbaar',
]
const POSITIVE = ['thank you so much', 'thanks so much', 'baie dankie', 'happy with', 'love*', 'great', 'brilliant', 'awesome', 'amazing']
/** Common Afrikaans words that rarely appear in English. Two or more means the message is in Afrikaans. */
const AFRIKAANS = [
  'bestelling', 'asseblief', 'dankie', 'nie', 'waar', 'ek', 'het', 'jy', 'jou', 'nog', 'wanneer', 'gister', 'vandag', 'môre',
  'baie', 'goeie', 'niks', 'moes', 'gehoor', 'pakkie', 'koerier', 'groete', 'kan', 'ons',
]
const PARTS = ['pole', 'zip', 'zipper', 'strap', 'buckle', 'lace', 'sole', 'clip', 'peg']
const ROTATION: AgentId[] = ['pieter', 'aisha', 'thandiwe']

export const norm = (text: string) => text.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const isText = (s: string | null | undefined): s is string => Boolean(s)
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** Finds a term in normalised text and returns the words that matched. */
function find(text: string, term: string): string | null {
  const stem = term.endsWith('*')
  const body = escapeRe(stem ? term.slice(0, -1) : term)
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${body}${stem ? '\\p{L}*' : '(?![\\p{L}\\p{N}])'}`, 'u')
  return text.match(re)?.[0] ?? null
}

/** Order field first (the customer typed it on purpose), then the first number in the message. */
export function findOrderNumber(text: string, field?: string): string | undefined {
  const fromField = field?.trim().match(/^(?:SO-?)?(\d{5})$/i)
  if (fromField) return `SO-${fromField[1]}`
  const inText = text.match(/\bSO-?(\d{5})\b/i)
  return inText ? `SO-${inText[1]}` : undefined
}

export const validOrderField = (field: string) => !field.trim() || /^(?:SO-?)?\d{5}$/i.test(field.trim())

export function dueFor(createdAt: number, priority: Priority, settings: Settings): number {
  return createdAt + settings.targets[priority] * MINUTE
}

/* Triage */

export interface TriageOptions {
  orderNumberField?: string
  /** When the message arrived. The reply-time clock starts here. */
  now: number
  settings: Settings
  orders: Order[]
  /** Ticket number, used to share general tickets across the team in turn. */
  seq?: number
}

export type TriageResult = Triage & { order?: Order }

export function triage(text: string, { orderNumberField, now, settings, orders, seq = 0 }: TriageOptions): TriageResult {
  const t = norm(text)
  const reasons: Reason[] = []
  const safetyPhrases = SAFETY.map((re) => t.match(re)?.[0]).filter(isText)

  const scores = TOPIC_TERMS.map(([topic, groups]) => {
    const phrases: string[] = []
    let score = 0
    for (const [weight, terms] of groups) {
      for (const term of terms) {
        const hit = find(t, term)
        if (hit && !phrases.some((p) => p.includes(hit))) {
          phrases.push(hit)
          score += weight
        }
      }
    }
    if (topic === 'Damaged or faulty' && safetyPhrases.length) {
      phrases.push(...safetyPhrases)
      score += 3
    }
    return { topic, score, phrases }
  }).sort((a, b) => b.score - a.score)

  const [best, second] = scores
  const words = (t.match(/\p{L}+/gu) ?? []).length
  let topic: Topic = 'General question'
  let confidence: number
  if (best.score > 0) {
    topic = best.topic
    confidence = clamp(Math.round(58 + ((best.score - second.score) / best.score) * 30 + Math.min(best.score, 9)), 55, 97)
    reasons.push({ label: `Topic: ${topic}`, phrases: best.phrases })
  } else {
    confidence = Math.min(60, 50 + words)
    reasons.push({ label: 'Topic: General question', phrases: [], note: words ? 'No clear topic words, so a person should read it.' : 'There are no words to go on.' })
  }

  const caps = [...new Set(text.match(/\b[A-Z]{4,}\b/g) ?? [])]
  const angry = [...ANGRY.map((term) => find(t, term)).filter(isText), ...(text.includes('!!') ? ['!!'] : []), ...caps]
  const positive = angry.length ? [] : POSITIVE.map((term) => find(t, term)).filter(isText)
  const mood: Mood = angry.length ? 'Angry' : positive.length ? 'Positive' : 'Neutral'
  if (mood !== 'Neutral') reasons.push({ label: `Mood: ${mood}`, phrases: angry.length ? angry : positive })

  let priority = BASE_PRIORITY[topic]
  const why = [`${topic} tickets start at ${priority}.`]
  const priorityPhrases: string[] = []
  if (mood === 'Angry' && settings.angryHigh && priority !== 'Urgent') {
    priority = PRIORITIES[PRIORITIES.indexOf(priority) - 1]
    why.push('Raised one level because the customer is upset.')
  }
  const deadline = topic === 'Damaged or faulty' ? t.match(DEADLINE)?.[0] : undefined
  if (deadline) {
    priority = 'Urgent'
    priorityPhrases.push(deadline)
    why.push('Urgent because they need it by a set day.')
  }
  const safety = safetyPhrases.length > 0
  if (safety && settings.safetyUrgent) {
    priority = 'Urgent'
    priorityPhrases.push(...safetyPhrases)
    why.push('Urgent because it may be a safety problem.')
  }
  reasons.push({ label: `Priority: ${priority}`, phrases: priorityPhrases, note: why.join(' ') })

  const markers = settings.detectLanguage ? AFRIKAANS.map((w) => find(t, w)).filter(isText) : []
  const language: Language = markers.length >= 2 ? 'Afrikaans' : 'English'
  if (language === 'Afrikaans') reasons.push({ label: 'Language: Afrikaans', phrases: markers.slice(0, 5) })

  const orderNumber = findOrderNumber(text, orderNumberField)
  const order = orderNumber ? orders.find((o) => o.number === orderNumber) : undefined
  if (!orderNumber) reasons.push({ label: 'No order number found', phrases: [], note: 'Order numbers look like SO-48213.' })
  else if (!order) reasons.push({ label: `Order ${orderNumber} not found`, phrases: [orderNumber], note: 'There is no order with this number in the shop.' })
  else reasons.push({ label: `Order ${orderNumber} found`, phrases: [orderNumber], note: `${order.status}, ordered by ${order.customer}.` })

  let assignee: AgentId
  let note: string
  if (priority === 'Urgent' || topic === 'Complaint') {
    assignee = 'thandiwe'
    note = 'Urgent tickets and complaints go to the team lead.'
  } else if (topic === 'Order status' || topic === 'Delivery problem') {
    assignee = 'pieter'
    note = 'Pieter looks after orders and delivery.'
  } else if (settings.returnsToAisha && (topic === 'Return or exchange' || topic === 'Refund or billing' || topic === 'Damaged or faulty')) {
    assignee = 'aisha'
    note = 'Returns, refunds and warranty claims go to Aisha.'
  } else {
    assignee = ROTATION[seq % ROTATION.length]
    note = 'Shared across the team in turn.'
  }
  reasons.push({ label: `Assigned to ${AGENTS[assignee].name}`, phrases: [], note })

  return { topic, priority, mood, language, orderNumber, order, assignee, dueAt: dueFor(now, priority, settings), confidence, reasons, safety }
}

/* Automatic answers */

const MOVING: OrderStatus[] = ['Processing', 'Shipped', 'Out for delivery']

export function autoReplyDecision(t: Pick<Triage, 'topic'>, order: Order | undefined, settings: Settings) {
  if (!settings.autoAnswer) return { send: false, reason: 'Automatic answers are switched off.' }
  if (t.topic !== 'Order status') return { send: false, reason: 'Only order-status questions are answered automatically.' }
  if (!order) return { send: false, reason: 'There was no order to look up.' }
  if (!MOVING.includes(order.status)) return { send: false, reason: `The order is ${order.status.toLowerCase()}, so a person should reply.` }
  return { send: true, reason: 'Live tracking was sent straight away.' }
}

const endOfDay = (at: number) => new Date(at).setHours(23, 59, 59, 999)

export function orderOnTime(order: Order): boolean {
  if (order.status === 'Delayed') return false
  if (!order.promisedBy) return true
  return (order.deliveredAt ?? order.eta ?? order.promisedBy) <= endOfDay(order.promisedBy)
}

/** The assistant reads a ticket: labels it, and answers it if the rules allow. */
export function triageTicket(ticket: Ticket, settings: Settings, orders: Order[], now: number): Ticket {
  const { order, ...result } = triage(ticket.text, { orderNumberField: ticket.orderField, now: ticket.createdAt, settings, orders, seq: ticket.number })
  let next: Ticket = { ...ticket, triage: result }
  if (order && !ticket.firstReplyAt && autoReplyDecision(result, order, settings).send) {
    const text = autoReply(next, order, result.language, now)
    next = { ...next, autoAnswered: true, firstReplyAt: now, messages: [...next.messages, { id: `${ticket.id}-auto`, kind: 'auto', author: STORE.name, text, at: now }] }
    if (settings.autoClose && orderOnTime(order)) next = { ...next, status: 'Solved', solvedAt: now }
  }
  return next
}

/* Reply text */

const AF_MONTHS = ['Januarie', 'Februarie', 'Maart', 'April', 'Mei', 'Junie', 'Julie', 'Augustus', 'September', 'Oktober', 'November', 'Desember']

function dayWord(at: number, now: number, language: Language = 'English'): string {
  const af = language === 'Afrikaans'
  if (isSameDay(at, now)) return af ? 'vandag' : 'today'
  if (isSameDay(at, now + DAY)) return af ? 'môre' : 'tomorrow'
  if (isSameDay(at, now - DAY)) return af ? 'gister' : 'yesterday'
  const d = new Date(at)
  return af ? `op ${d.getDate()} ${AF_MONTHS[d.getMonth()]}` : `on ${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'long' })}`
}

function greetingName(name: string): string | null {
  const first = firstName(name)
  return !first || /^(you|customer)$/i.test(first) ? null : first
}

function statusLine(order: Order, language: Language, now: number): string {
  const n = order.number
  const c = order.courier ?? 'the courier'
  const delivered = dayWord(order.deliveredAt ?? now, now, language)
  if (language === 'Afrikaans') {
    return {
      Processing: `Jou bestelling ${n} word tans verpak en sal binne een werksdag versend word.`,
      Shipped: `Jou bestelling ${n} is saam met ${c} op pad na jou toe.`,
      'Out for delivery': `Goeie nuus: jou bestelling ${n} is vandag saam met ${c} op pad na jou toe.`,
      Delivered: `Volgens ${c} is jou bestelling ${n} ${delivered} afgelewer.`,
      Delayed: `Jammer dat jou bestelling ${n} vertraag is.`,
      Returned: `Jou bestelling ${n} is aan ons teruggestuur, en ons verwerk dit tans.`,
    }[order.status]
  }
  return {
    Processing: `Your order ${n} is being packed at our warehouse and will be sent within one working day.`,
    Shipped: `Your order ${n} is on its way with ${c}.`,
    'Out for delivery': `Good news: your order ${n} is out for delivery today with ${c}.`,
    Delivered: `${cap(c)} shows your order ${n} as delivered ${delivered}.`,
    Delayed: `Your order ${n} is running late.`,
    Returned: `Your order ${n} came back to us, and we're processing it now.`,
  }[order.status]
}

/** Joins sentences, skipping the ones that don't apply. */
const say = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ')

/** Status, lateness, latest tracking event, delivery estimate and tracking number, in one paragraph. */
function orderUpdate(order: Order, language: Language, now: number): string {
  const af = language === 'Afrikaans'
  const event = order.events.find((e) => e.at <= now)
  const when = order.eta ? dayWord(order.eta, now, language) : ''
  const late = !orderOnTime(order) && MOVING.includes(order.status)
  return say(
    statusLine(order, language, now),
    late && (af ? 'Jammer dat dit later is as wat ons belowe het.' : 'Sorry it’s later than we promised.'),
    // Courier updates are in English, so Afrikaans replies give the status in their own words instead.
    !af && event && order.status !== 'Processing' && `Latest tracking update, ${dayWord(event.at, now).replace(/^on /, '')} at ${clockTime(event.at)}: ${event.text}`,
    when && order.status === 'Processing' && (af ? `Ons verwag dat dit ${when} by jou sal wees.` : `We expect it to reach you ${when}.`),
    when && (order.status === 'Shipped' || order.status === 'Delayed') &&
      (af ? `${order.courier} verwag om dit ${when} af te lewer.` : `${order.courier} expects to deliver it ${when}.`),
    order.tracking && order.status !== 'Returned' &&
      (af ? `Jy kan dit volg met die naspoornommer ${order.tracking}.` : `You can follow it with tracking number ${order.tracking}.`),
  )
}

export function autoReply(ticket: Ticket, order: Order, language: Language, now = Date.now()): string {
  const name = greetingName(ticket.customer.name)
  if (language === 'Afrikaans') {
    return [
      `Hallo${name ? ` ${name}` : ''}, hierdie is ’n outomatiese opdatering van ${STORE.name}.`,
      orderUpdate(order, language, now),
      'Antwoord gerus op hierdie boodskap as jy nog hulp nodig het, dan help iemand van ons span jou verder.',
    ].join('\n\n')
  }
  return [
    `Hi ${name ?? 'there'}, this is an automatic update from ${STORE.name}.`,
    orderUpdate(order, language, now),
    'If you need anything else, reply to this message and someone from our team will help.',
  ].join('\n\n')
}

/* The store's own product facts, which a real build would read from the product catalogue. */
const PRODUCTS = [
  {
    name: 'Kestrel 2 hiking tent',
    noun: 'tent',
    keys: ['kestrel', 'tent'],
    fact: `The Kestrel 2 comes with poles, pegs and guy lines. The footprint is sold separately for ${money(29)}, and it’s worth having on rocky ground.`,
  },
  { name: 'Ridgeback leather hiking boots', noun: 'boots', keys: ['ridgeback', 'boots'], fact: 'The Ridgeback boots come in sizes 5 to 13, with a waterproof, breathable lining.' },
  {
    name: 'Fynbos 45 L backpack',
    noun: 'backpack',
    keys: ['fynbos', 'backpack'],
    fact: 'The Fynbos 45 L is made from water-resistant fabric, and there’s a rain cover in the base pocket for heavy rain.',
  },
  {
    name: 'Emberline 2-burner gas stove',
    noun: 'stove',
    keys: ['emberline', 'stove'],
    fact: 'The Emberline takes standard 450 g screw-on canisters and boils a litre of water in about 4 minutes.',
  },
  {
    name: 'Duskfall −5 °C sleeping bag',
    noun: 'sleeping bag',
    keys: ['duskfall', 'sleeping bag'],
    fact: 'The Duskfall is comfortable down to about 0 °C and packs down to the size of a 2-litre bottle.',
  },
  { name: 'Trailhead 350 headlamp', noun: 'headlamp', keys: ['trailhead', 'headlamp'], fact: 'The Trailhead 350 charges by USB-C and runs for about 8 hours on the medium setting.' },
]

const DEADLINE_TEXT: Record<string, string> = {
  today: 'by tonight',
  tonight: 'by tonight',
  tomorrow: 'by tomorrow',
  'this weekend': 'before the weekend',
  'next week': 'before next week',
}

/** Details both the summary and the draft reply need. */
function details(ticket: Ticket, order?: Order) {
  const text = norm(ticket.text)
  const deadline = text.match(DEADLINE)?.[0]
  return {
    product: PRODUCTS.find((p) => p.keys.some((k) => text.includes(k))) ?? PRODUCTS.find((p) => order?.items.some((i) => i.name === p.name)),
    size: text.match(/\bsize\s*(\d{1,2}(?:\.5)?)\b/)?.[1],
    exchange: /swap|exchang|size|fit|tight|small|big/.test(text),
    duplicate: /twice|double|two payments/.test(text) || Boolean(order?.note?.toLowerCase().includes('twice')),
    invoice: /invoice/.test(text),
    refund: /refund|money back/.test(text),
    part: PARTS.find((p) => find(text, p)),
    deadline: deadline ? (DEADLINE_TEXT[deadline] ?? `before ${cap(deadline)}`) : undefined,
    gas: /\bgas\b/.test(text),
  }
}

/** Afrikaans drafts are written for order questions. Other topics get an English draft. */
export const draftLanguage = (t: Triage): Language => (t.language === 'Afrikaans' && t.topic === 'Order status' ? 'Afrikaans' : 'English')

const ASK_ORDER = 'Could you send me your order number? It starts with SO- and is in your order confirmation email.'

function englishBody(ticket: Ticket, t: Triage, order: Order | undefined, now: number): string {
  const d = details(ticket, order)
  const noun = d.product?.noun ?? 'item'
  const courier = order?.courier ?? 'the courier'
  const statement = 'It can take 3 to 5 working days to show on your statement.'
  switch (t.topic) {
    case 'Order status':
      if (!order) return say(ASK_ORDER, 'Then I can check exactly where your parcel is.')
      return say(
        order.status === 'Delayed' && 'I’m sorry for the delay.',
        orderUpdate(order, 'English', now),
        'I’ll keep an eye on it and let you know if anything changes.',
      )
    case 'Delivery problem':
      if (!order) return say('I’m sorry your delivery hasn’t gone to plan.', ASK_ORDER, 'Then I can check with the courier straight away.')
      if (order.status === 'Delivered') {
        const note = order.events[0] ? ` with this note: “${order.events[0].text}”` : '.'
        return say(
          'I’m sorry, that’s not how your delivery should go.',
          `${cap(courier)} marked ${order.number} as delivered ${dayWord(order.deliveredAt ?? now, now)}${note}`,
          'I’ve opened a trace with them today. If the parcel hasn’t turned up by tomorrow, we’ll send a replacement at no cost.',
        )
      }
      return say(
        'I’m sorry about the wait.',
        orderUpdate(order, 'English', now),
        `I’ve asked ${courier} to prioritise it, and I’ll message you as soon as it’s delivered.`,
      )
    case 'Return or exchange':
      if (!d.exchange) {
        return say(
          'Happy to help. You can return unused items for free within 30 days.',
          `Reply with a good time, and our courier will collect the ${noun}.`,
          'We refund you as soon as it’s back with us, usually within 3 working days.',
        )
      }
      return say(
        `Happy to help. You can exchange ${d.product ? `the ${d.product.name}` : 'unused items'} for free within 30 days.`,
        d.size ? `I’ve put a size ${d.size} aside for you.` : 'Let me know which size or colour you’d like.',
        `Reply with a good time, and our courier will collect the ${noun} and bring the new ${noun === 'boots' ? 'pair' : 'one'} at the same time.`,
      )
    case 'Refund or billing':
      if (order && d.duplicate) {
        return say(
          `I’m sorry about the double charge. I can see two card payments of ${money(order.total)} for ${order.number}.`,
          'I’ve refunded the second payment today.',
          statement,
        )
      }
      if (d.invoice) return `Of course. Reply with your company name and VAT number, and I’ll email you a tax invoice for ${order?.number ?? 'your order'} today.`
      if (order?.status === 'Returned' && d.refund) {
        return say(`Your return for ${order.number} is back with us, so I’ve refunded ${money(order.total - order.delivery)} to your card today.`, statement)
      }
      if (order) {
        return say(
          `Thanks for flagging this. I’ve checked ${order.number}: we took one card payment of ${money(order.total)} ${dayWord(order.placedAt, now)}.`,
          'I’m going through the details with our accounts team and will come back to you today.',
        )
      }
      return say('Thanks for flagging this.', ASK_ORDER, 'Then I can check the payment straight away.')
    case 'Damaged or faulty':
      if (t.safety) {
        return say(
          `Thank you for telling us straight away. Please stop using the ${noun} now.`,
          d.gas
            ? 'Disconnect the gas canister, keep both outdoors and away from any flame, and don’t try to repair it.'
            : 'Keep it away from heat, and if anyone was hurt, please get medical help first.',
          'Your safety comes first. We’ll collect it at no cost and send you a replacement or a full refund, whichever you prefer.',
          `Could you reply with a photo of the ${noun} and the batch number on the base?`,
        )
      }
      const replacement = d.part ? `a replacement ${d.part}` : `a new ${noun}`
      return say(
        `I’m sorry about the ${d.part ? `broken ${d.part} on your` : 'problem with your'} ${d.product?.name ?? noun}.`,
        `That’s covered by our warranty, so I’m sending ${replacement} by courier today${d.deadline ? `, and it should reach you ${d.deadline}` : ''}.`,
        d.part ? `There’s no need to send the ${noun} back.` : 'Our courier will collect the faulty one when they drop off the new one.',
        'Could you reply with a photo of the damage? It helps us check the batch.',
      )
    case 'Product question':
      if (d.product) return say('Thanks for asking.', d.product.fact, 'Let me know if you’d like me to check stock or sizes for you.')
      return 'Thanks for your question. Which product are you looking at? Send me the name or a link and I’ll check the details for you.'
    case 'Complaint':
      return say(
        'I’m sorry we’ve let you down, and thank you for telling us.',
        t.assignee === 'thandiwe' ? 'I lead the support team, and I’ve read your message myself.' : 'I’ve read your message carefully.',
        'I’d like to put this right. Could I call you today at a time that suits you?',
      )
    case 'General question':
      return say(
        'Thanks for getting in touch. Could you tell me a bit more about what you need?',
        'If it’s about an order, please include the order number (it starts with SO-). Then I can help straight away.',
      )
  }
}

const CALM_TOPICS: Topic[] = ['Order status', 'Return or exchange', 'Product question', 'General question']

/** A ready-to-send draft from the topic template, the order and the customer's first name. */
export function suggestReply(ticket: Ticket, order?: Order, now = Date.now()): string {
  const t = ticket.triage
  if (!t) return ''
  const name = greetingName(ticket.customer.name)
  const agent = firstName(AGENTS[t.assignee].name)
  if (draftLanguage(t) === 'Afrikaans') {
    const body = order
      ? `${orderUpdate(order, 'Afrikaans', now)} Ek hou dit dop en laat weet jou sodra daar nuus is.`
      : 'Kan jy asseblief vir my jou bestelnommer stuur? Dit begin met SO-. Dan kyk ek dadelik waar jou pakkie is.'
    return `Hallo${name ? ` ${name}` : ''}\n\nDankie vir jou boodskap. ${body}\n\nGroete\n${agent}\n${STORE.name}`
  }
  const opener = t.mood === 'Angry' && CALM_TOPICS.includes(t.topic) && order?.status !== 'Delayed' ? 'I understand how frustrating this is. ' : ''
  return `Hi ${name ?? 'there'},\n\n${opener}${englishBody(ticket, t, order, now)}\n\nKind regards\n${agent}\n${STORE.name}`
}

/** The one-line summary agents see at the top of a ticket. */
export function summarise(ticket: Ticket, order?: Order): string {
  const t = ticket.triage
  if (!t) return ''
  const d = details(ticket, order)
  const who = greetingName(ticket.customer.name) ?? 'The customer'
  const lead = `${who}${t.mood === 'Angry' ? ' is upset and' : ''}`
  const inAf = t.language === 'Afrikaans' ? ' (in Afrikaans)' : ''
  const item = d.product ? `the ${d.product.name}` : 'a product'
  const c = order?.courier ?? 'the courier'
  const state = order
    ? {
        Processing: ', which is still being packed',
        Shipped: `, which is on its way with ${c}`,
        'Out for delivery': `, which is out for delivery with ${c}`,
        Delivered: `, which ${c} marked as delivered`,
        Delayed: `, which is delayed with ${c}`,
        Returned: ', which has come back to us',
      }[order.status]
    : ''
  switch (t.topic) {
    case 'Order status':
      return order ? `${lead} is asking${inAf} about order ${order.number}${state}.` : `${lead} is asking${inAf} where their order is, but gave no order number.`
    case 'Delivery problem':
      return order ? `${lead} reports a delivery problem${inAf} with order ${order.number}${state}.` : `${lead} reports a delivery problem${inAf} but gave no order number.`
    case 'Return or exchange':
      return `${lead} wants to ${d.exchange ? 'exchange' : 'return'} ${d.product ? item : 'an item'}${d.size ? ` for a size ${d.size}` : ''}${inAf}.`
    case 'Refund or billing':
      if (d.duplicate) return `${lead} says they were charged twice${order ? ` for ${order.number}` : ''}${order?.note ? ', and the order note confirms a duplicate payment' : ''}.`
      if (d.invoice) return `${lead} wants a tax invoice for ${order?.number ?? 'their order'}${inAf}.`
      if (d.refund) return `${lead} is asking about a refund${inAf}${order ? ` for ${order.number}${state}` : ''}.`
      return `${lead} has a billing question${inAf}${order ? ` about ${order.number}` : ''}.`
    case 'Damaged or faulty':
      if (t.safety) return `Safety issue: ${who} reports ${d.gas ? 'a possible gas leak' : 'a possible safety problem'} with ${item} and needs safety advice first.`
      return `${lead} reports ${d.part ? `a broken ${d.part} on` : 'a fault with'} ${item}${d.deadline ? ` and needs it sorted ${d.deadline}` : ''}${inAf}.`
    case 'Product question':
      return `${lead} has a question${inAf} about ${item} before buying.`
    case 'Complaint':
      return `${who} is unhappy with our service and wants a senior person to put it right.`
    case 'General question':
      return `${lead} sent a short message${inAf} that needs more detail before we can help.`
  }
}

/** The first real sentence of a chat message, skipping greetings like "Morning!". */
export function subjectFrom(text: string): string {
  const sentences = text.trim().split(/(?<=[.?!])\s+/)
  const first = sentences.find((s) => s.split(/\s+/).length >= 4) ?? sentences[0] ?? ''
  return first.length > 70 ? `${first.slice(0, 67).trimEnd()}…` : first
}

/** "14:20" today, "tomorrow at 10:20", or a date further out. */
export function byTime(at: number, now: number): string {
  if (isSameDay(at, now)) return clockTime(at)
  if (isSameDay(at, now + DAY)) return `tomorrow at ${clockTime(at)}`
  return dayAndTime(at, now)
}

/* Figures */

export const needsReply = (ticket: Ticket) => Boolean(ticket.triage) && !ticket.firstReplyAt && ticket.status !== 'Solved'
export const isOverdue = (ticket: Ticket, now: number) => needsReply(ticket) && (ticket.triage?.dueAt ?? Infinity) < now

/** "Reply due in 38 min", "Overdue by 12 min" and friends, for ticket cards. */
export function dueLabel(ticket: Ticket, now: number): { text: string; tone: 'red' | 'amber' | 'neutral' | 'green' } | null {
  if (!ticket.triage) return null
  if (ticket.status === 'Solved') return { text: 'Solved', tone: 'green' }
  if (ticket.status === 'Waiting on customer') return { text: 'Waiting on customer', tone: 'neutral' }
  if (ticket.firstReplyAt) return { text: ticket.autoAnswered ? 'Answered automatically' : `Replied ${clockTime(ticket.firstReplyAt)}`, tone: 'neutral' }
  const minutes = (ticket.triage.dueAt - now) / MINUTE
  if (minutes < 0) return { text: `Overdue by ${duration(-minutes)}`, tone: 'red' }
  return { text: `Reply due in ${duration(Math.max(1, minutes))}`, tone: minutes < 30 ? 'amber' : 'neutral' }
}

export function deskStats(tickets: Ticket[], now: number) {
  const today = tickets.filter((t) => isSameDay(t.createdAt, now))
  const open = tickets.filter((t) => t.status === 'Open')
  const repliedToday = today.filter((t) => t.firstReplyAt)
  const replied = tickets.filter((t) => t.firstReplyAt && t.triage)
  const auto = today.filter((t) => t.autoAnswered).length
  const triaged = today.filter((t) => t.triage).length
  const suggestions = today.reduce((n, t) => n + t.messages.filter((m) => m.fromSuggestion).length, 0)
  const rated = tickets.filter((t) => t.rating)
  return {
    open: open.length,
    urgent: open.filter((t) => t.triage?.priority === 'Urgent').length,
    overdue: tickets.filter((t) => isOverdue(t, now)).length,
    untriaged: open.filter((t) => !t.triage).length,
    today: today.length,
    avgFirstReply: repliedToday.length ? repliedToday.reduce((n, t) => n + (t.firstReplyAt! - t.createdAt), 0) / repliedToday.length / MINUTE : null,
    auto,
    autoPct: today.length ? Math.round((auto / today.length) * 100) : 0,
    onTimePct: replied.length ? Math.round((replied.filter((t) => t.firstReplyAt! <= t.triage!.dueAt).length / replied.length) * 100) : null,
    triaged,
    suggestions,
    corrections: tickets.reduce((n, t) => n + t.corrections, 0),
    rated: rated.length,
    positivePct: rated.length ? Math.round((rated.filter((t) => t.rating === 'positive').length / rated.length) * 100) : null,
    minutesSaved: triaged * 2 + auto * 6 + suggestions * 4,
  }
}

export type DeskStats = ReturnType<typeof deskStats>
