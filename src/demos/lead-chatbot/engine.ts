import { DAY, uid } from '../../lib/time'
import type {
  Answers,
  Contact,
  Conversation,
  Lead,
  Message,
  QuestionId,
  QuickReply,
  Settings,
  Step,
  Temperature,
} from './types'

/*
 * Scripted stand-in for the AI model. It reads free text with simple rules, so the demo
 * works offline and behaves the same every time. A real build would use a language model
 * trained on the client's own services, prices and FAQs.
 */

export const BOT_NAME = 'Noor'
export const DESIGNER = 'Omar Saleh'
export const SALES_LEAD = 'Hana Kapoor'

interface Option {
  id: string
  label: string
  points: number
}

interface Question {
  prompt: string
  short: string
  options: Option[]
}

export const QUESTIONS: Record<QuestionId, Question> = {
  projectType: {
    prompt: 'What kind of project are you planning?',
    short: 'Project',
    options: [
      { id: 'new-office', label: 'New office fit-out', points: 20 },
      { id: 'refurb', label: 'Refurbish an existing office', points: 15 },
      { id: 'retail', label: 'Retail, clinic or restaurant', points: 15 },
      { id: 'browsing', label: 'Just exploring ideas', points: 0 },
    ],
  },
  size: {
    prompt: 'Roughly how big is the space?',
    short: 'Size',
    options: [
      { id: 'xs', label: 'Under 1,000 sq ft', points: 5 },
      { id: 's', label: '1,000–5,000 sq ft', points: 15 },
      { id: 'm', label: '5,000–15,000 sq ft', points: 20 },
      { id: 'l', label: 'Over 15,000 sq ft', points: 25 },
    ],
  },
  timeline: {
    prompt: 'When would you like the work to start?',
    short: 'Start',
    options: [
      { id: 'asap', label: 'Within a month', points: 20 },
      { id: 'q', label: 'In 1–3 months', points: 20 },
      { id: 'h', label: 'In 3–6 months', points: 10 },
      { id: 'research', label: 'No date yet', points: 0 },
    ],
  },
  budget: {
    prompt: 'Do you have a budget in mind? A range is fine.',
    short: 'Budget',
    options: [
      { id: 'b1', label: 'Under $25,000', points: 5 },
      { id: 'b2', label: '$25,000–$100,000', points: 15 },
      { id: 'b3', label: '$100,000–$250,000', points: 20 },
      { id: 'b4', label: 'Over $250,000', points: 25 },
      { id: 'unsure', label: 'Not sure yet', points: 5 },
    ],
  },
  role: {
    prompt: 'Will you be making the final decision on this project?',
    short: 'Decision',
    options: [
      { id: 'decision', label: 'Yes, it’s my decision', points: 10 },
      { id: 'team', label: 'I decide with others', points: 5 },
      { id: 'other', label: 'I’m researching for someone else', points: 0 },
    ],
  },
}

export const QUESTION_ORDER: QuestionId[] = ['projectType', 'size', 'timeline', 'budget', 'role']

export const SAMPLE_PERSON: Contact = {
  name: 'Leila Mansour',
  company: 'Tessaly Capital',
  email: 'leila.mansour@tessalycapital.com',
}

export const TEMPERATURE_LABEL: Record<Temperature, string> = { hot: 'Hot', warm: 'Warm', cold: 'Cold' }

export function optionLabel(question: QuestionId, id?: string): string | undefined {
  return QUESTIONS[question].options.find((o) => o.id === id)?.label
}

/* Scoring */

export interface ScoreLine {
  question: QuestionId
  label: string
  answer?: string
  points: number
  max: number
}

export function scoreBreakdown(answers: Answers, settings: Settings): { score: number; lines: ScoreLine[] } {
  const lines: ScoreLine[] = QUESTION_ORDER.filter((q) => settings.questions[q]).map((q) => {
    const question = QUESTIONS[q]
    const option = question.options.find((o) => o.id === answers[q])
    return {
      question: q,
      label: question.short,
      answer: option?.label,
      points: option?.points ?? 0,
      max: Math.max(...question.options.map((o) => o.points)),
    }
  })
  const max = lines.reduce((sum, l) => sum + l.max, 0)
  const total = lines.reduce((sum, l) => sum + l.points, 0)
  return { score: max ? Math.round((total / max) * 100) : 0, lines }
}

export function temperatureFor(score: number, threshold: number): Temperature {
  if (score >= threshold) return 'hot'
  if (score >= 40) return 'warm'
  return 'cold'
}

export function summarise(answers: Answers, contact: Contact): string {
  const name = contact.name || 'The visitor'
  const who = contact.company ? `${name} from ${contact.company}` : name
  const project = optionLabel('projectType', answers.projectType)
  let text = who
  if (!project) text += ' started a chat'
  else if (answers.projectType === 'browsing') text += ' is exploring ideas'
  else text += ` is planning a ${project.toLowerCase().replace('refurbish an existing office', 'refurbishment')}`

  const details: string[] = []
  const size = optionLabel('size', answers.size)
  if (size) details.push(size)
  const timeline = optionLabel('timeline', answers.timeline)
  if (timeline) details.push(answers.timeline === 'research' ? 'no start date yet' : `starting ${timeline.charAt(0).toLowerCase()}${timeline.slice(1)}`)
  const budget = optionLabel('budget', answers.budget)
  if (budget) details.push(answers.budget === 'unsure' ? 'budget not set' : `budget ${budget}`)
  if (details.length) text += ` (${details.join(', ')})`
  text += '.'

  if (answers.role === 'decision') text += ' They make the final decision.'
  if (answers.role === 'team') text += ' They decide together with colleagues.'
  if (answers.role === 'other') text += ' They are researching for someone else.'
  return text
}

/* Reading free text */

const has = (text: string, pattern: RegExp) => pattern.test(text)

function parseNumbers(text: string): number[] {
  const tokens = [...text.replace(/,/g, '').matchAll(/(\d+(?:\.\d+)?)\s*(k|m\b|thousand|million|mil\b)?/gi)]
  const values = tokens.map((t) => ({ value: parseFloat(t[1]), unit: (t[2] ?? '').toLowerCase() }))
  const lastUnit = values.length ? values[values.length - 1].unit : ''
  return values.map(({ value, unit }) => {
    const u = unit || lastUnit
    if (u === 'k' || u === 'thousand') return value * 1_000
    if (u === 'm' || u === 'million' || u === 'mil') return value * 1_000_000
    return value
  })
}

function parseOptionByText(question: QuestionId, text: string): string | undefined {
  const options = QUESTIONS[question].options
  if (/^[1-9]$/.test(text) && Number(text) <= options.length) return options[Number(text) - 1].id
  return options.find((o) => o.label.toLowerCase() === text)?.id
}

function parseProjectType(t: string): string | undefined {
  if (has(t, /refurb|renovat|upgrade|redo|refresh|remodel|makeover|redesign/)) return 'refurb'
  if (has(t, /retail|shop|store|restaurant|caf[eé]|clinic|salon|showroom|hotel|gym/)) return 'retail'
  if (has(t, /new|move|moving|relocat|empty|shell|core|fit.?out/)) return 'new-office'
  if (has(t, /idea|explor|brows|just looking|inspiration|curious/)) return 'browsing'
  return undefined
}

function parseSize(t: string): string | undefined {
  const plain = t.replace(/,/g, '')
  let sqft: number | undefined
  const people = plain.match(/(\d+)\s*(people|staff|employees|desks|seats|team members|persons)/)
  if (people) sqft = parseInt(people[1], 10) * 100
  if (sqft === undefined) {
    const match = plain.match(
      /(\d+(?:\.\d+)?)\s*(k)?\s*(sq\.?\s*ft|sqft|square\s*f[eo]+t|ft2|ft²|sq\.?\s*m|sqm|square\s*met(?:er|re)s?|m2|m²)?/,
    )
    if (!match) return undefined
    sqft = parseFloat(match[1]) * (match[2] ? 1000 : 1)
    const unit = match[3] ?? ''
    if (unit && !unit.includes('f')) sqft *= 10.764
  }
  if (sqft < 1000) return 'xs'
  if (sqft < 5000) return 's'
  if (sqft <= 15000) return 'm'
  return 'l'
}

function parseTimeline(t: string): string | undefined {
  if (has(t, /not sure|no date|don'?t know|no idea|next year|undecided|tbd|tbc|no rush/)) return 'research'
  if (has(t, /asap|as soon as possible|urgent|immediately|right away|this month|next week|within a month|in a month|few weeks|two weeks/)) return 'asap'
  const months = t.match(/(\d+)\s*(months?|mos?)\b/)
  if (months) {
    const n = parseInt(months[1], 10)
    return n <= 1 ? 'asap' : n <= 3 ? 'q' : n <= 6 ? 'h' : 'research'
  }
  const weeks = t.match(/(\d+)\s*weeks?/)
  if (weeks) {
    const n = parseInt(weeks[1], 10)
    return n <= 4 ? 'asap' : n <= 13 ? 'q' : n <= 26 ? 'h' : 'research'
  }
  if (has(t, /next month|couple of months|soon/)) return 'q'
  if (has(t, /quarter|later this year|summer|autumn|fall|winter|spring/)) return 'h'
  return undefined
}

function parseBudget(t: string): string | undefined {
  if (has(t, /not sure|no idea|don'?t know|tbc|unsure|flexible|no budget|depends/)) return 'unsure'
  const values = parseNumbers(t)
  if (!values.length) return undefined
  let value = values.reduce((sum, v) => sum + v, 0) / values.length
  if (has(t, /aed|dhs?\b|dirham/)) value /= 3.6725
  if (value < 1000) return undefined
  if (value < 25_000) return 'b1'
  if (value <= 100_000) return 'b2'
  if (value <= 250_000) return 'b3'
  return 'b4'
}

function parseRole(t: string): string | undefined {
  if (has(t, /someone else|my boss|my manager|on behalf|for (a|my) (client|friend|colleague)|researching|assistant/)) return 'other'
  if (has(t, /team|board|partners?|with others|committee|we decide|together|jointly|co-?founder/)) return 'team'
  if (has(t, /^(yes|yep|yeah|sure|correct|i am|i do|me)\b|my decision|i decide|owner|ceo|founder|director|managing|\bmd\b|general manager/)) return 'decision'
  if (has(t, /^(no|nope)\b/)) return 'other'
  return undefined
}

const PARSERS: Record<QuestionId, (t: string) => string | undefined> = {
  projectType: parseProjectType,
  size: parseSize,
  timeline: parseTimeline,
  budget: parseBudget,
  role: parseRole,
}

/*
 * Stricter readers for answers to questions that haven't been asked yet, so one message like
 * "we need about 6,000 sq ft by next month" can answer several questions at once.
 * They only accept clear signals (units, currency, time words) to avoid false matches.
 */
const STRICT_PARSERS: Record<QuestionId, (t: string) => string | undefined> = {
  projectType: (t) => {
    if (has(t, /refurb|renovat|remodel|makeover/)) return 'refurb'
    if (has(t, /\b(shop|store|restaurant|caf[eé]|clinic|salon|showroom)\b/)) return 'retail'
    if (has(t, /new (office|space|premises|floor|unit)|moving|relocat|fit.?out|empty unit|shell/)) return 'new-office'
    return undefined
  },
  size: (t) => (has(t.replace(/,/g, ''), /\d\s*(k\s*)?(sq|square|ft|m2|m²|people|staff|employees|desks|seats)/) ? parseSize(t) : undefined),
  timeline: (t) =>
    has(t, /month|week|asap|as soon as possible|urgent|immediately|right away|next year|quarter/) ? parseTimeline(t) : undefined,
  budget: (t) => (has(t, /\$|usd|aed|dollars?|dirhams?|budget/) && has(t, /\d/) ? parseBudget(t) : undefined),
  role: (t) => (has(t, /owner|ceo|founder|director|my decision|i decide|my partners|my boss|on behalf/) ? parseRole(t) : undefined),
}

function describe(question: QuestionId, id: string): string {
  const label = optionLabel(question, id) ?? ''
  switch (question) {
    case 'projectType':
      return id === 'browsing' ? 'you’re exploring ideas' : label.toLowerCase()
    case 'size':
      return label
    case 'timeline':
      return id === 'research' ? 'no start date yet' : `starting ${label.charAt(0).toLowerCase()}${label.slice(1)}`
    case 'budget':
      return id === 'unsure' ? 'budget to be decided' : `a budget of ${label}`
    case 'role':
      return id === 'decision' ? 'you make the final decision' : id === 'team' ? 'you decide with others' : 'you’re researching for someone else'
  }
}

/** Reads every answer it can find in one message: the current question leniently, the rest strictly. */
function extractAnswers(text: string, conv: Conversation, settings: Settings, current: QuestionId): Answers {
  const found: Answers = {}
  const byNumber = parseOptionByText(current, text)
  if (byNumber) return { [current]: byNumber }
  const money = has(text, /\$|usd|aed|dollars?|dirhams?|budget/)
  const area = has(text.replace(/,/g, ''), /\d\s*(k\s*)?(sq|square|ft|m2|m²|people|staff|employees|desks|seats)/)
  for (const q of QUESTION_ORDER) {
    if (!settings.questions[q] || (conv.answers[q] && q !== current)) continue
    // Don't read "$90k" as a floor area, or "3,000 sq ft" as a budget.
    if (q === current && q === 'size' && money && !area) continue
    if (q === current && q === 'budget' && area && !money) continue
    const value = q === current ? PARSERS[q](text) : STRICT_PARSERS[q](text)
    if (value) found[q] = value
  }
  return found
}

function wantsPerson(t: string) {
  return has(
    t,
    /\b(human|real person|an agent|live agent|representative|customer service)\b|\b(speak|talk|chat)\s+(to|with)\s+(a|an|someone|somebody|your|the|person|human|agent|staff|team|sales|designer)\b|\b(call|phone|ring) me\b/,
  )
}

const wantsRestart = (t: string) => has(t, /\b(restart|start over|start again)\b/)

function infoFor(t: string): string | null {
  if (has(t, /how long|duration|how many weeks|timeframe/)) return 'A typical 5,000 sq ft office takes 8 to 12 weeks from approved design to handover.'
  if (has(t, /\b(price|prices|pricing|cost|costs|how much|rates?|per sq|expensive|cheap)\b/)) {
    return 'Most office fit-outs we deliver in Dubai cost between $45 and $120 per sq ft, depending on finishes, building works and furniture. A few more answers and I can narrow that down.'
  }
  if (has(t, /\b(where|location|located|areas?|abu dhabi|sharjah|outside dubai)\b/)) {
    return 'We work across Dubai, Abu Dhabi and Sharjah, from our design studio in Al Quoz, Dubai.'
  }
  if (has(t, /\b(hours|opening|working days|weekend)\b/)) {
    return 'Our designers are in the studio Monday to Friday, 9:00 to 18:00 Gulf time. I’m here any time.'
  }
  return null
}

/* Conversation flow */

export type BotMessage = Omit<Message, 'id' | 'at'>

export interface Reply {
  conversation: Conversation
  replies: BotMessage[]
  /** A lead was qualified in this turn. */
  lead?: Lead
  /** The lead from this chat has a new status. */
  leadStatus?: Lead['status']
  /** The visitor asked to start again. */
  restart?: boolean
}

const ACKS = ['Got it.', 'Thanks.', 'Great.', 'Perfect.']

function questionReplies(question: QuestionId): QuickReply[] {
  return QUESTIONS[question].options.map((o) => ({ id: o.id, label: o.label }))
}

function firstName(name?: string) {
  return (name ?? '').trim().split(/\s+/)[0] || 'there'
}

function tidyName(text: string): string {
  return text
    .replace(/^(hi|hello|hey)[,!\s]+/i, '')
    .replace(/^(my name is|my name's|i am|i'm|im|this is|it's|its)\s+/i, '')
    .replace(/[^\p{L}\s'.-]/gu, '')
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** What the assistant still needs, in order: questions, name, company, contact. */
function nextMissing(conv: Conversation, settings: Settings): Step {
  const question = QUESTION_ORDER.find((q) => settings.questions[q] && !conv.answers[q])
  if (question) return question
  if (!conv.contact.name) return 'name'
  if (conv.contact.company === undefined) return 'company'
  if (!conv.contact.email && !conv.contact.phone) return 'contact'
  return 'done'
}

function promptFor(step: Step, conv: Conversation, withAck: boolean): BotMessage {
  const ack = withAck ? `${ACKS[conv.messages.length % ACKS.length]} ` : ''
  switch (step) {
    case 'name':
      return {
        from: 'bot',
        text: `${ack}So the team knows who they’re speaking to, what’s your name?`,
        quickReplies: [{ id: 'sample', label: 'Use sample details' }],
      }
    case 'company':
      return {
        from: 'bot',
        text: `Nice to meet you, ${firstName(conv.contact.name)}. Which company is this for?`,
        quickReplies: [{ id: 'skip', label: 'It’s a personal project' }],
      }
    case 'contact':
      return { from: 'bot', text: 'What’s the best email address or phone number to reach you on?' }
    case 'slot':
    case 'done':
      return { from: 'bot', text: 'Is there anything else I can help with?' }
    default:
      return { from: 'bot', text: `${ack}${QUESTIONS[step].prompt}`, quickReplies: questionReplies(step) }
  }
}

export function bookingSlots(now: number): QuickReply[] {
  const slots: QuickReply[] = []
  let day = new Date(now + DAY)
  while (slots.length < 3) {
    const weekday = day.getDay()
    if (weekday !== 0 && weekday !== 6) {
      const label = day.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
      const times = slots.length === 0 ? ['10:00', '14:30'] : ['11:00']
      for (const time of times) if (slots.length < 3) slots.push({ id: `slot-${label}-${time}`, label: `${label}, ${time}` })
    }
    day = new Date(day.getTime() + DAY)
  }
  return slots
}

export function newLiveConversation(settings: Settings, now: number): Conversation {
  const conv: Conversation = {
    id: uid('c'),
    live: true,
    channel: 'Website chat',
    status: 'bot',
    step: 'projectType',
    answers: {},
    contact: {},
    messages: [],
    startedAt: now,
    updatedAt: now,
    unread: false,
  }
  const step = nextMissing(conv, settings)
  const prompt =
    step === 'name'
      ? { from: 'bot' as const, text: 'To get started, what’s your name?', quickReplies: [{ id: 'sample', label: 'Use sample details' }] }
      : promptFor(step, conv, false)
  return {
    ...conv,
    step,
    messages: [
      { id: uid('m'), from: 'bot', text: settings.greeting, at: now },
      { id: uid('m'), ...prompt, at: now + 1 },
    ],
  }
}

/** Moves to the next missing detail, or wraps up when nothing is missing. */
function advance(conv: Conversation, settings: Settings, now: number): Reply {
  const next = nextMissing(conv, settings)
  if (next === 'done') return finish({ ...conv, step: 'done' }, settings, now)
  const updated = { ...conv, step: next }
  return { conversation: updated, replies: [promptFor(next, updated, true)] }
}

function finish(conv: Conversation, settings: Settings, now: number): Reply {
  const { score } = scoreBreakdown(conv.answers, settings)
  const temperature = temperatureFor(score, settings.threshold)
  const name = conv.contact.name || 'Website visitor'
  const first = firstName(name)
  const contact = conv.contact.email ?? conv.contact.phone ?? ''
  const lead: Lead = {
    id: uid('lead'),
    name,
    company: conv.contact.company || 'Personal project',
    contact,
    answers: conv.answers,
    score,
    temperature,
    status: 'New',
    owner: temperature === 'cold' ? 'Nurture emails' : temperature === 'hot' ? DESIGNER : SALES_LEAD,
    capturedAt: now,
    source: conv.channel,
    summary: summarise(conv.answers, conv.contact),
    conversationId: conv.id,
  }
  const base: Conversation = { ...conv, step: 'done', score, temperature, leadId: lead.id }
  const summary: BotMessage = { from: 'bot', text: `Here’s what I’ve noted:\n${lead.summary}` }

  // The visitor already asked for a person, who will pick up from here.
  if (conv.status === 'waiting') {
    return {
      conversation: base,
      replies: [summary, { from: 'bot', text: `Thanks, ${first}. ${DESIGNER} can see all of this and will reply here shortly.` }],
      lead,
    }
  }

  if (temperature === 'hot' && !settings.afterHours) {
    return {
      conversation: { ...base, status: 'waiting', assignedTo: DESIGNER, handoffReason: `Hot lead, score ${score}`, unread: true },
      replies: [
        summary,
        {
          from: 'bot',
          text: `Your project looks like a strong fit, so I’m bringing in ${DESIGNER}, one of our senior designers. He can see everything you’ve told me.`,
        },
        {
          from: 'system',
          text: `${DESIGNER} has been alerted on WhatsApp and in the team inbox. In this demo, you can reply as Omar.`,
          quickReplies: [{ id: 'open-inbox', label: 'Reply as Omar in the Team inbox', action: 'open-inbox' }],
        },
      ],
      lead,
    }
  }

  if (temperature === 'cold') {
    return {
      conversation: base,
      replies: [
        summary,
        {
          from: 'bot',
          text: `Thanks, ${first}. I’ve sent our office fit-out guide, with typical costs and timelines, to ${contact}. Message us here whenever you’re ready and we’ll pick it up.`,
        },
      ],
      lead,
    }
  }

  const intro =
    temperature === 'hot'
      ? 'Your project looks like a strong fit. Our designers are offline right now, so let’s book a call.'
      : 'The best next step is a free 20-minute call with one of our designers.'
  return {
    conversation: { ...base, step: 'slot' },
    replies: [summary, { from: 'bot', text: `${intro} Which time suits you?`, quickReplies: bookingSlots(now) }],
    lead,
  }
}

function handoff(conv: Conversation, settings: Settings): Reply {
  if (settings.afterHours) {
    const prompt = conv.step === 'done' || conv.step === 'slot' ? null : promptFor(conv.step, conv, false)
    return {
      conversation: conv,
      replies: [
        {
          from: 'bot',
          text: 'Our designers are offline right now. They’re in Monday to Friday, 9:00 to 18:00 Gulf time. Leave your details with me and they’ll pick this up first thing.',
        },
        ...(prompt ? [prompt] : []),
      ],
    }
  }
  const missing = nextMissing(conv, settings)
  const askName = !conv.contact.name
  const replies: BotMessage[] = [
    { from: 'bot', text: `Of course. I’m bringing in ${DESIGNER} from our design team. He’ll see our conversation so far.` },
    {
      from: 'system',
      text: `${DESIGNER} has been alerted. In this demo, you can reply as Omar.`,
      quickReplies: [{ id: 'open-inbox', label: 'Reply as Omar in the Team inbox', action: 'open-inbox' }],
    },
  ]
  if (askName) {
    replies.push({ from: 'bot', text: 'While he joins, may I take your name?', quickReplies: [{ id: 'sample', label: 'Use sample details' }] })
  } else if (missing !== 'done') {
    replies.push({ ...promptFor(missing, conv, false), text: `While he joins: ${promptFor(missing, conv, false).text}` })
  }
  return {
    conversation: {
      ...conv,
      status: 'waiting',
      assignedTo: DESIGNER,
      handoffReason: 'Asked to speak to a person',
      step: askName ? 'name' : missing,
      unread: true,
    },
    replies,
  }
}

/** Works out the assistant's answer to one visitor message or quick reply. */
export function respond(conv: Conversation, input: { text?: string; replyId?: string }, settings: Settings, now: number): Reply {
  const raw = (input.text ?? '').trim()
  const text = raw.toLowerCase()

  // A person is handling the chat, so the assistant stays quiet.
  if (conv.status === 'agent' || conv.status === 'closed') return { conversation: conv, replies: [] }

  if (input.replyId === 'person') return handoff(conv, settings)

  if (!input.replyId && raw) {
    if (wantsRestart(text)) return { conversation: conv, replies: [], restart: true }
    if (conv.status === 'bot' && wantsPerson(text) && settings.handoffOnRequest) return handoff(conv, settings)
  }

  const step = conv.step

  if (step in QUESTIONS) {
    const question = step as QuestionId
    if (input.replyId && QUESTIONS[question].options.some((o) => o.id === input.replyId)) {
      return advance({ ...conv, answers: { ...conv.answers, [question]: input.replyId } }, settings, now)
    }
    const found = raw ? extractAnswers(text, conv, settings, question) : {}
    const keys = Object.keys(found) as QuestionId[]
    if (keys.length) {
      const result = advance({ ...conv, answers: { ...conv.answers, ...found } }, settings, now)
      // Several answers in one message, or an answer to a later question: confirm what was understood.
      if (keys.length > 1 || !found[question]) {
        const understood = QUESTION_ORDER.filter((q) => found[q]).map((q) => describe(q, found[q]!))
        const note = `Got it: ${understood.join(', ')}.`
        const [first, ...rest] = result.replies
        const nextPrompt = first ? { ...first, text: first.text.replace(/^(Got it|Thanks|Great|Perfect)\. /, '') } : undefined
        result.replies = [{ from: 'bot', text: note }, ...(nextPrompt ? [nextPrompt] : []), ...rest]
      }
      return result
    }
    const info = infoFor(text)
    return {
      conversation: conv,
      replies: info
        ? [{ from: 'bot', text: info }, { from: 'bot', text: QUESTIONS[question].prompt, quickReplies: questionReplies(question) }]
        : [
            {
              from: 'bot',
              text: 'Sorry, I didn’t quite catch that. Pick one of the options below, or describe it in your own words.',
              quickReplies: questionReplies(question),
            },
          ],
    }
  }

  if (step === 'name') {
    if (input.replyId === 'sample') return advance({ ...conv, contact: { ...SAMPLE_PERSON } }, settings, now)
    const name = tidyName(raw)
    if (name.length < 2) return { conversation: conv, replies: [{ from: 'bot', text: 'Could you tell me your name, please?' }] }
    return advance({ ...conv, contact: { ...conv.contact, name } }, settings, now)
  }

  if (step === 'company') {
    const company = input.replyId === 'skip' ? '' : raw.slice(0, 80)
    return advance({ ...conv, contact: { ...conv.contact, company } }, settings, now)
  }

  if (step === 'contact') {
    const email = raw.match(/[^\s@]+@[^\s@]+\.[^\s@]{2,}/)?.[0]
    const digits = raw.replace(/\D/g, '')
    if (!email && digits.length < 7) {
      return {
        conversation: conv,
        replies: [{ from: 'bot', text: 'That doesn’t look like an email address or phone number. Could you check it for me?' }],
      }
    }
    return advance({ ...conv, contact: { ...conv.contact, ...(email ? { email } : { phone: raw.slice(0, 30) }) } }, settings, now)
  }

  if (step === 'slot') {
    const slot = input.replyId ? bookingSlots(now).find((s) => s.id === input.replyId) : undefined
    if (!slot) {
      const info = infoFor(text)
      return {
        conversation: conv,
        replies: [{ from: 'bot', text: info ?? 'Please pick one of these times, or ask to speak to a person.', quickReplies: bookingSlots(now) }],
      }
    }
    const owner = conv.temperature === 'hot' ? DESIGNER : SALES_LEAD
    return {
      conversation: { ...conv, step: 'done' },
      replies: [
        {
          from: 'bot',
          text: `Booked: ${slot.label} (Gulf time) with ${owner}. A calendar invite is on its way to ${conv.contact.email ?? conv.contact.phone ?? 'you'}.`,
        },
      ],
      leadStatus: 'Meeting booked',
    }
  }

  // Step "done": answer common questions and offer a person.
  const info = infoFor(text)
  if (conv.status === 'waiting') {
    return { conversation: conv, replies: [{ from: 'bot', text: info ?? `Thanks. ${DESIGNER} will reply here shortly.` }] }
  }
  return {
    conversation: conv,
    replies: [
      info
        ? { from: 'bot', text: info }
        : {
            from: 'bot',
            text: 'Thanks for your message. Someone from the team will follow up. Would you like to speak to a person now?',
            quickReplies: [{ id: 'person', label: 'Yes, connect me' }],
          },
    ],
  }
}

/** Label of a quick reply, so the visitor's choice can be shown as their message. */
export function quickReplyLabel(conv: Conversation, id: string): string {
  for (let i = conv.messages.length - 1; i >= 0; i--) {
    const found = conv.messages[i].quickReplies?.find((q) => q.id === id)
    if (found) return found.label
  }
  return id
}
