import { DEMOS, type DemoMeta } from '../../demos/registry'

/*
 * Turns the video call's raw events into what the call screen needs: captions of what Tari says,
 * what the visitor said, Tari's request to show a demo link, and the reasons a call ends early.
 * Kept free of the SDK and React, so it can be tested on its own.
 */

export type CallEvent =
  /** A new spoken item. These arrive in conversation order, before the item's words. */
  | { kind: 'item'; itemId: string; who: 'tari' | 'visitor' }
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
      if (message.action === 'created' && message.type === 'message' && itemId && (message.role === 'assistant' || message.role === 'user')) {
        return { kind: 'item', itemId, who: message.role === 'assistant' ? 'tari' : 'visitor' }
      }
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

const normalise = (text: string) => ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `

/**
 * Ways Tari may say a demo's name: the full title, without a leading "AI", the part before a colon,
 * or without a trailing "app", "system" or "catalogue". Shorter forms such as "workflow automation"
 * or "customer support" are left out: they are also the names of services, said in passing.
 */
function namesFor(title: string): string[] {
  const names = new Set<string>()
  const add = (name: string) => {
    const n = normalise(name)
    if (n.trim().split(' ').length >= 2) names.add(n)
  }
  const trim = (name: string) => name.replace(/\s+(app|system|catalogue)$/i, '')
  const base = title.split(':')[0]
  for (const name of [title, base]) {
    add(name)
    add(name.replace(/^AI\s+/i, ''))
    add(trim(name))
    add(trim(name.replace(/^AI\s+/i, '')))
  }
  return [...names]
}

/**
 * Demos Tari named in what she said, in the order she said them. A backup for the show_demo tool,
 * which the model doesn't always call, so the link appears whenever she names a demo.
 */
export function demosMentioned(text: string): DemoMeta[] {
  const spoken = normalise(text)
  const found: { demo: DemoMeta; at: number }[] = []
  for (const demo of DEMOS) {
    const positions = namesFor(demo.title)
      .map((name) => spoken.indexOf(name))
      .filter((at) => at >= 0)
    if (positions.length) found.push({ demo, at: Math.min(...positions) })
  }
  return found.sort((a, b) => a.at - b.at).map((f) => f.demo)
}

export interface Line {
  itemId: string
  who: 'tari' | 'visitor'
  text: string
}

/**
 * What was said, in order. Each spoken item is announced (an "item" event) in conversation order
 * before its words arrive, so its place is kept even when the visitor's words are transcribed after
 * Tari has already answered. Tari's lines arrive in pieces and are replaced by the full text when
 * finished. Lines still without words are left out of the record.
 */
export class Transcript {
  private readonly all: Line[] = []

  get lines(): Line[] {
    return this.all.filter((l) => l.text.trim())
  }

  private find(who: Line['who'], itemId: string): Line | undefined {
    return this.all.find((l) => l.who === who && l.itemId === itemId)
  }

  add(event: CallEvent): void {
    if (event.kind === 'item') {
      if (!this.find(event.who, event.itemId)) this.all.push({ itemId: event.itemId, who: event.who, text: '' })
    } else if (event.kind === 'tari') {
      const existing = this.find('tari', event.itemId)
      // A finished line can arrive without its text: then the pieces already received are the line.
      if (existing) existing.text = event.final ? event.text || existing.text : existing.text + event.text
      else this.all.push({ itemId: event.itemId, who: 'tari', text: event.text })
    } else if (event.kind === 'visitor') {
      const existing = this.find('visitor', event.itemId)
      if (existing) existing.text = event.text
      else this.all.push({ itemId: event.itemId, who: 'visitor', text: event.text })
    }
  }

  /** The full text of one of Tari's lines. */
  tariLine(itemId: string): string {
    return this.find('tari', itemId)?.text.trim() ?? ''
  }

  /** The latest thing Tari said, for the caption. */
  get caption(): string {
    const lines = this.lines
    for (let i = lines.length - 1; i >= 0; i--) if (lines[i].who === 'tari') return lines[i].text.trim()
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
