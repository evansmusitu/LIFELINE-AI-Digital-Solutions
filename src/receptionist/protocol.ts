/*
 * The AI receptionist's request and reply formats. Shared by the browser (src/receptionist)
 * and the Worker (worker/receptionist.ts), so keep this file free of browser and Worker APIs.
 */

export const RECEPTIONIST_NAME = 'Tari'
export const RECEPTIONIST_PATH = '/api/receptionist'
/** Written by the studioPages plugin in vite.config.ts from src/demos/registry.ts. */
export const KNOWLEDGE_PATH = '/receptionist-knowledge.json'

export const LIMITS = {
  /** Characters in one visitor message. */
  visitorChars: 500,
  /** Characters in one earlier reply sent back as conversation history. */
  replyChars: 1500,
  /** Most recent messages the Worker passes to the model. */
  historyMessages: 10,
  /** Largest request body the Worker reads, in bytes. */
  bodyBytes: 16_000,
} as const

export type ChatRole = 'user' | 'assistant'

export interface ChatTurn {
  role: ChatRole
  content: string
}

export interface ReceptionistRequest {
  messages: ChatTurn[]
  /** "home" or the slug of the demo page the visitor is on. */
  page: string
  /** Random ID kept in this browser. Used only for the per-visitor rate limit. */
  visitor: string
  /** Another model from the Worker's list. Only Previews accept it (ALLOW_MODEL_CHOICE). */
  model?: string
}

/** One line of a streamed reply. The response type is application/x-ndjson. */
export type StreamEvent = { type: 'delta'; text: string } | { type: 'done' } | { type: 'error' }

/**
 * Sent as JSON instead of a stream when no AI reply is possible. The browser then answers
 * from its saved replies (src/receptionist/fallback.ts).
 * quota: the day's free AI allowance is used up. limited: too many messages a minute.
 * busy: the AI service is overloaded. error: anything else.
 */
export interface NoReply {
  type: 'fallback'
  reason: 'quota' | 'limited' | 'busy' | 'error'
}

export interface KnowledgeDemo {
  slug: string
  title: string
  summary: string
  industries: string[]
  timeline: string
  services: string[]
}

export interface Knowledge {
  demos: KnowledgeDemo[]
}
