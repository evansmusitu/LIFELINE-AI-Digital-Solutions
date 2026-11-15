export interface DocSection {
  id: string
  heading: string
  paragraphs: string[]
}

export interface DocTable {
  columns: string[]
  rows: string[][]
}

export type DocOrigin = 'sample' | 'team' | 'visitor'

export interface Doc {
  id: string
  title: string
  /** Shown on the library card, e.g. "Price list" or "Policy". */
  label: string
  /** How replies name it: "From our {cite}". */
  cite: string
  origin: DocOrigin
  updatedAt: number
  enabled: boolean
  sections?: DocSection[]
  table?: DocTable
  /** Visitor documents too big for localStorage live only for this visit. */
  transient?: boolean
}

export type AnswerKind = 'price' | 'policy' | 'clarify' | 'none'

export type Topic = 'Prices' | 'Delivery' | 'Returns' | 'Accounts' | 'Stock' | 'Other'

export interface Source {
  passageId: string
  docId: string
  docTitle: string
  /** How replies name the document: "From our {cite}". */
  cite: string
  /** Section heading or row name. */
  label: string
  kind: 'row' | 'section'
  text: string
  /** Matched tokens, used to highlight the passage. */
  terms: string[]
}

export interface Answer {
  kind: AnswerKind
  text: string
  /** Short version for WhatsApp. */
  short: string
  working?: string[]
  notes?: string[]
  sources: Source[]
  choices?: { label: string; rowId: string }[]
  topic: Topic
  /** Why there is no answer: nothing to search for, or nothing found. */
  reason?: 'empty' | 'vague' | 'not-found'
}

export type Channel = 'counter' | 'whatsapp'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  at: number
  text: string
  answer?: Answer
  /** The question an answer replies to (for clarify buttons and handoffs). */
  question?: string
  logId?: string
  handoff?: 'offered' | 'sent'
}

export interface LogEntry {
  id: string
  at: number
  question: string
  channel: Channel
  kind: AnswerKind
  topic: Topic
  docIds: string[]
  /** Simulated answer time. */
  ms: number
  helpful: boolean | null
}

export interface Gap {
  id: string
  question: string
  firstAt: number
  lastAt: number
  count: number
  status: 'open' | 'answered'
  answeredAt?: number
  docId?: string
}

export interface Handoff {
  id: string
  at: number
  customer: string
  phone: string
  question: string
}

export type ZoneId = 'A' | 'B' | 'C'

export interface Zone {
  id: ZoneId
  miles: string
  fee: number
  /** Free delivery on orders over this amount. */
  freeOver?: number
}

/** The delivery policy as data, so the assistant can work out a delivery price. */
export interface DeliveryRules {
  docId: string
  zones: Zone[]
  saturdayZones: ZoneId[]
  saturdayFee: number
  saturdayHours: string
  craneFee: number
  maxMiles: number
  /** Lowercase place name to its zone ('out' is beyond the delivery area) and display name. */
  places: Record<string, { zone: ZoneId | 'out'; name: string }>
}

export interface AppState {
  docs: Doc[]
  log: LogEntry[]
  gaps: Gap[]
  handoffs: Handoff[]
  counterChat: ChatMessage[]
  customerChat: ChatMessage[]
}

export type AskFn = (question: string, pick?: { rowId: string; label: string }) => void
