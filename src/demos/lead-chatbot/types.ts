export type QuestionId = 'projectType' | 'size' | 'timeline' | 'budget' | 'role'
export type Step = QuestionId | 'name' | 'company' | 'contact' | 'slot' | 'done'
export type Temperature = 'hot' | 'warm' | 'cold'
export type Sender = 'bot' | 'visitor' | 'agent' | 'system'

export interface QuickReply {
  id: string
  label: string
  /** Replies with an action are handled by the screen instead of being sent as a message. */
  action?: 'open-inbox'
}

export interface Message {
  id: string
  from: Sender
  text: string
  at: number
  author?: string
  quickReplies?: QuickReply[]
}

export type Answers = Partial<Record<QuestionId, string>>

export interface Contact {
  name?: string
  company?: string
  email?: string
  phone?: string
}

export type ConversationStatus = 'bot' | 'waiting' | 'agent' | 'closed'

export interface Conversation {
  id: string
  /** The conversation the visitor is having in this demo. */
  live: boolean
  channel: 'Website chat' | 'WhatsApp'
  status: ConversationStatus
  step: Step
  answers: Answers
  contact: Contact
  score?: number
  temperature?: Temperature
  messages: Message[]
  assignedTo?: string
  handoffReason?: string
  leadId?: string
  startedAt: number
  updatedAt: number
  unread: boolean
}

export type LeadStatus = 'New' | 'Contacted' | 'Meeting booked' | 'Proposal sent' | 'Won' | 'Lost'

export interface Lead {
  id: string
  name: string
  company: string
  contact: string
  answers: Answers
  score: number
  temperature: Temperature
  status: LeadStatus
  owner: string
  capturedAt: number
  source: 'Website chat' | 'WhatsApp'
  summary: string
  conversationId?: string
}

export interface Settings {
  greeting: string
  threshold: number
  handoffOnRequest: boolean
  afterHours: boolean
  questions: Record<QuestionId, boolean>
}

export interface ChatState {
  conversations: Conversation[]
  leads: Lead[]
  settings: Settings
}
