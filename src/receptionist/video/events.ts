import { DEMOS, type DemoMeta } from '../../demos/registry'

/*
 * Turns the video call's raw events into what the call screen needs: captions of what Tari says,
 * what the visitor said, Tari's request to show a demo link, and the reasons a call ends early.
 * Kept free of the SDK and React, so it can be tested on its own.
 */

export type CallEvent =
  | { kind: 'tari'; itemId: string; text: string; final: boolean }
  | { kind: 'visitor'; itemId: string; text: string }
  | { kind: 'tool'; callId: string; name: string; args: Record<string, unknown> }
  | { kind: 'idle'; secondsLeft: number }
  | { kind: 'ended'; reason: 'expired' | 'credits' | 'provider' }

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

function toArgs(value: unknown): Record<string, unknown> {
  if (isRecord(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value)
      if (isRecord(parsed)) return parsed
    } catch {
      // Not JSON.
    }
  }
  return {}
}

/** One raw event, `{ event, data }`, as the SDK's onData receives it. */
export function readEvent(raw: unknown): CallEvent | null {
  if (!isRecord(raw) || typeof raw.event !== 'string') return null
  const data = isRecord(raw.data) ? raw.data : {}
  switch (raw.event) {
    case 'message_received': {
      const message = isRecord(data.message) ? data.message : null
      if (!message || message.type === 'session') return null
      const itemId = typeof message.item_id === 'string' ? message.item_id : ''
      const content = typeof message.content === 'string' ? message.content : ''
      if (message.role === 'assistant' && (message.action === 'delta' || message.action === 'completed')) {
        return { kind: 'tari', itemId, text: content, final: message.action === 'completed' }
      }
      if (message.role === 'user' && message.action === 'completed' && content.trim()) {
        return { kind: 'visitor', itemId, text: content.trim() }
      }
      return null
    }
    case 'function_implicitly_called':
      if (typeof data.call_id !== 'string' || typeof data.name !== 'string') return null
      return { kind: 'tool', callId: data.call_id, name: data.name, args: toArgs(data.arguments) }
    case 'avatar_connection_warning':
      return { kind: 'idle', secondsLeft: typeof data.disconnect_after === 'number' ? data.disconnect_after : 0 }
    case 'session_expired':
      return { kind: 'ended', reason: 'expired' }
    case 'no_credits_left':
      return { kind: 'ended', reason: 'credits' }
    case 'provider_connection_aborted':
      return { kind: 'ended', reason: 'provider' }
    default:
      return null
  }
}

/** The answer to Tari's show_demo call, and the demo to show when the ID is one of ours. */
export function showDemo(args: Record<string, unknown>): { demo: DemoMeta | null; output: Record<string, unknown> } {
  const slug = typeof args.slug === 'string' ? args.slug.trim().toLowerCase().replace(/^\/?demos\//, '') : ''
  const demo = DEMOS.find((d) => d.slug === slug) ?? null
  if (demo) return { demo, output: { shown: true, name: demo.title } }
  return { demo: null, output: { shown: false, reason: 'No demo has that ID.', ids: DEMOS.map((d) => d.slug) } }
}

export interface Line {
  itemId: string
  who: 'tari' | 'visitor'
  text: string
}

/**
 * What was said, in order. Tari's lines arrive in pieces and are replaced by the full text when
 * finished. A visitor's words can be transcribed after Tari has started replying, so their line is
 * placed before the reply that was already under way.
 */
export class Transcript {
  readonly lines: Line[] = []
  private replyStartedAt: number | null = null

  add(event: CallEvent): void {
    if (event.kind === 'tari') {
      const existing = this.lines.find((l) => l.who === 'tari' && l.itemId === event.itemId)
      // A finished line can arrive without its text: then the pieces already received are the line.
      if (existing) existing.text = event.final ? event.text || existing.text : existing.text + event.text
      else {
        this.replyStartedAt = this.lines.length
        this.lines.push({ itemId: event.itemId, who: 'tari', text: event.text })
      }
      if (event.final) this.replyStartedAt = null
    } else if (event.kind === 'visitor') {
      if (this.lines.some((l) => l.who === 'visitor' && l.itemId === event.itemId)) return
      const line: Line = { itemId: event.itemId, who: 'visitor', text: event.text }
      const at = this.replyStartedAt
      if (at !== null && this.lines[at]?.who === 'tari') this.lines.splice(at, 0, line)
      else this.lines.push(line)
    }
  }

  /** The full text of one of Tari's lines. */
  tariLine(itemId: string): string {
    return this.lines.find((l) => l.who === 'tari' && l.itemId === itemId)?.text.trim() ?? ''
  }

  /** The latest thing Tari said, for the caption. */
  get caption(): string {
    for (let i = this.lines.length - 1; i >= 0; i--) if (this.lines[i].who === 'tari') return this.lines[i].text.trim()
    return ''
  }
}

/** "2 min 14 s", for the note in the chat after a call. */
export function callLength(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(s / 60)
  return minutes ? `${minutes} min ${s % 60} s` : `${s} s`
}

/** "2:14", for the countdown on screen. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
