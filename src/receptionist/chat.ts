import { SITE } from '../config/site'
import { DEMOS } from '../demos/registry'
import { LIMITS, RECEPTIONIST_NAME, type ChatTurn, type NoReply } from './protocol'

/* Plain helpers for the receptionist chat: message shapes, fixed wording and text clean-up. */

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'note'
  text: string
  /** Replies only: "ai" came from Workers AI, "saved" from src/receptionist/fallback.ts. */
  source?: 'ai' | 'saved'
}

export const GREETING_ID = 'greeting'

export function demoTitle(slug: string): string | undefined {
  return DEMOS.find((d) => d.slug === slug)?.title
}

export function greeting(page: string): ChatMessage {
  const title = demoTitle(page)
  const text = title
    ? `Hi, I’m ${RECEPTIONIST_NAME}, LIFELINE’s AI receptionist. Ask me how the ${title} could work for your business, what it takes to build, or anything else about LIFELINE.`
    : `Hi, I’m ${RECEPTIONIST_NAME}, LIFELINE’s AI receptionist. Tell me about your business and I’ll suggest a demo to try, or ask me what we build and how we work.`
  return { id: GREETING_ID, role: 'assistant', text, source: 'ai' }
}

export function pageNote(page: string): string {
  const title = demoTitle(page)
  return title ? `You’re now on the ${title} demo.` : 'You’re back on the home page.'
}

export function suggestions(page: string): string[] {
  return demoTitle(page)
    ? ['How would this work for my business?', 'How long would it take to build?', 'What would it cost?', 'Can I talk to a person?']
    : ['What can you build for my business?', 'Which demo suits a restaurant?', 'How much does it cost?', 'Can I talk to a person?']
}

/** Shown once when replies switch from the live AI to saved answers. */
export function fallbackNote(reason: NoReply['reason'] | 'offline'): string {
  switch (reason) {
    case 'quota':
      return 'Live AI answers are paused for today, so I’m replying with saved answers. The team on WhatsApp can help with anything else.'
    case 'limited':
      return 'That’s a lot of messages in a minute, so here’s a saved answer while I catch up.'
    case 'offline':
      return 'You seem to be offline, so here’s a saved answer.'
    default:
      return 'I couldn’t reach the live AI just now, so here’s a saved answer.'
  }
}

/** The conversation as the Worker expects it: visitor and AI messages only, newest last, within the size limits. */
export function toTurns(messages: ChatMessage[]): ChatTurn[] {
  return messages
    .filter((m) => m.id !== GREETING_ID && (m.role === 'user' || m.role === 'assistant'))
    .slice(-LIMITS.historyMessages)
    .map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text.slice(0, m.role === 'user' ? LIMITS.visitorChars : LIMITS.replyChars),
    }))
}

const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text)

/** The WhatsApp message behind "Continue on WhatsApp": who they spoke to and what they asked. */
export function whatsappSummary(messages: ChatMessage[], page: string): string {
  const title = demoTitle(page)
  const asked = messages
    .filter((m) => m.role === 'user')
    .slice(-4)
    .map((m) => `- ${truncate(m.text.replace(/\s+/g, ' ').trim(), 160)}`)
  const intro = `Hi ${SITE.brand}, I’ve been chatting with ${RECEPTIONIST_NAME}, your AI receptionist${
    title ? `, on the "${title}" demo` : ''
  }. I’d like to talk to the team about my business.`
  return asked.length ? `${intro}\n\nWhat I asked:\n${asked.join('\n')}` : intro
}

/** Removes the markdown a model sometimes writes despite its instructions. */
export function cleanReply(text: string): string {
  return text
    .replace(/\*\*|__|`/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[*-]\s+/gm, '• ')
    .replace(/\[([^\]]+)\]\((\/demos\/[a-z0-9-]+)\)/g, '$1 ($2)')
}

export type ReplyPart = { kind: 'text'; text: string } | { kind: 'demo'; slug: string; title: string }

/** Splits a reply so that demo paths such as /demos/inventory-pos can be shown as links named after the demo. */
export function replyParts(text: string): ReplyPart[] {
  const parts: ReplyPart[] = []
  let last = 0
  for (const match of text.matchAll(/\/demos\/([a-z0-9-]+)/g)) {
    const title = demoTitle(match[1])
    if (!title || match.index === undefined) continue
    if (match.index > last) parts.push({ kind: 'text', text: text.slice(last, match.index) })
    parts.push({ kind: 'demo', slug: match[1], title })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) })
  return parts
}

/** The reply as it should sound: demo paths become their names, and symbols that read badly are dropped. */
export function spokenText(text: string): string {
  return replyParts(cleanReply(text))
    .map((part) => (part.kind === 'demo' ? `the ${part.title} demo` : part.text))
    .join('')
    .replace(/\(\s*the ([^)]+) demo\s*\)/g, '')
    .replace(/[•()]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .trim()
}
