/*
 * The AI receptionist's request and reply formats. Shared by the browser (src/receptionist)
 * and the Worker (worker/receptionist.ts), so keep this file free of browser and Worker APIs.
 */

export const RECEPTIONIST_NAME = 'Tari'
export const RECEPTIONIST_PATH = '/api/receptionist'
/** Written by the studioPages plugin in vite.config.ts from src/demos/registry.ts. */
export const KNOWLEDGE_PATH = '/receptionist-knowledge.json'

/**
 * The wellness consulting demo. Its own website chat sends this as `page` and is answered as that
 * sample practice's assistant, not as Tari (personaFor in worker/prompt.ts).
 */
export const WELLNESS_PAGE = 'wellness-consulting'

/**
 * The page Tari's chat and video calls are told about: the demo on screen, or "home". On a demo with
 * its own assistant it is "home", so Tari's requests can never be answered by that assistant.
 */
export function receptionistPage(slug: string | undefined): string {
  return slug && slug !== WELLNESS_PAGE ? slug : 'home'
}

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
  /**
   * "home" or the slug of the demo page the visitor is on. "wellness-consulting" is sent only by that
   * demo's own website chat, and the Worker answers it as the sample practice's assistant instead of
   * Tari (personaFor in worker/prompt.ts).
   */
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

/* Video calls with Tari (worker/video.ts). */

export const VIDEO_START_PATH = '/api/video/start'
export const VIDEO_END_PATH = '/api/video/end'

export interface VideoStartRequest {
  page: string
  visitor: string
}

/**
 * Why a call can't start. daily: the day's calls are used up. budget: the total spending limit is
 * reached. busy: too many calls at once. visitor: this visitor (or network) has had today's calls.
 * off: video calls are switched off. error: anything else.
 */
export type VideoUnavailableReason = 'daily' | 'budget' | 'busy' | 'visitor' | 'off' | 'error'

export type VideoStartResponse =
  | { type: 'ok'; token: string; callId: string; endKey: string; maxSeconds: number }
  | { type: 'unavailable'; reason: VideoUnavailableReason }

export interface VideoEndRequest {
  callId: string
  endKey: string
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

/** The demo fields the receptionist needs, from the registry (src/demos/registry.ts). */
export function toKnowledge(
  demos: readonly { slug: string; title: string; summary: string; industries: readonly string[]; build: { timeline: string; services: readonly string[] } }[],
): Knowledge {
  return {
    demos: demos.map((demo) => ({
      slug: demo.slug,
      title: demo.title,
      summary: demo.summary,
      industries: [...demo.industries],
      timeline: demo.build.timeline,
      services: [...demo.build.services],
    })),
  }
}
