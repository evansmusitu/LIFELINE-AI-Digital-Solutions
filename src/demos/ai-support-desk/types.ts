export type Channel = 'Web chat' | 'Email' | 'WhatsApp'

export type Topic =
  | 'Order status'
  | 'Delivery problem'
  | 'Return or exchange'
  | 'Refund or billing'
  | 'Damaged or faulty'
  | 'Product question'
  | 'Complaint'
  | 'General question'

export type Priority = 'Urgent' | 'High' | 'Normal' | 'Low'
export type Mood = 'Angry' | 'Neutral' | 'Positive'
export type Language = 'English' | 'Afrikaans'
export type AgentId = 'thandiwe' | 'pieter' | 'aisha'
export type TicketStatus = 'Open' | 'Waiting on customer' | 'Solved'

export type OrderStatus = 'Processing' | 'Shipped' | 'Out for delivery' | 'Delivered' | 'Delayed' | 'Returned'

export interface Order {
  number: string
  customer: string
  placedAt: number
  items: { name: string; qty: number; price: number }[]
  delivery: number
  total: number
  status: OrderStatus
  courier?: string
  tracking?: string
  /** The delivery date the customer was promised. */
  promisedBy?: number
  /** The courier's current estimate, for orders still on their way. */
  eta?: number
  deliveredAt?: number
  /** Newest first. */
  events: { at: number; text: string }[]
  note?: string
}

export interface Reason {
  label: string
  /** The words in the message that led to this label. */
  phrases: string[]
  note?: string
}

export interface Triage {
  topic: Topic
  priority: Priority
  mood: Mood
  language: Language
  orderNumber?: string
  assignee: AgentId
  dueAt: number
  confidence: number
  reasons: Reason[]
  safety: boolean
}

export interface TicketMessage {
  id: string
  kind: 'customer' | 'auto' | 'agent' | 'note'
  author: string
  text: string
  at: number
  fromSuggestion?: boolean
}

export interface Ticket {
  id: string
  number: number
  customer: { name: string; contact: string }
  channel: Channel
  subject: string
  /** The customer's first message, which the assistant reads. */
  text: string
  orderField?: string
  createdAt: number
  status: TicketStatus
  /** Missing until the assistant has read the ticket. */
  triage?: Triage
  messages: TicketMessage[]
  firstReplyAt?: number
  autoAnswered?: boolean
  solvedAt?: number
  rating?: 'positive' | 'negative'
  /** Times an agent changed the assistant's topic. */
  corrections: number
}

export interface Settings {
  autoAnswer: boolean
  autoClose: boolean
  angryHigh: boolean
  safetyUrgent: boolean
  detectLanguage: boolean
  returnsToAisha: boolean
  /** Minutes to the first reply, by priority. */
  targets: Record<Priority, number>
}

export interface DeskState {
  tickets: Ticket[]
  orders: Order[]
  settings: Settings
  nextTicket: number
}
