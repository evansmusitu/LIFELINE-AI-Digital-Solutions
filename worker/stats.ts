import { DurableObject } from 'cloudflare:workers'
import { isPageEvent, type CountEvent } from '../src/lib/count-events'
import { BASE_HEADERS, json, parseObject, readBody, rejectRequest, requestNetwork } from './http'
import { utcDay, type ChatLimiter } from './limiter'

/*
 * The site's totals (src/lib/count-events.ts): how many chats, video calls, WhatsApp taps and shares
 * there were each UTC day. Only the totals are stored, never who, from where or what was said.
 */

/** Daily totals are kept this long, then deleted. */
export const KEEP_DAYS = 400
const DAY_PREFIX = 'day:'
const DAY_MS = 86_400_000

export interface DayTotals {
  /** YYYY-MM-DD, UTC. */
  day: string
  counts: Partial<Record<CountEvent, number>>
}

/**
 * One object (getByName('site')) holds every total, one storage entry per day. Each count is one
 * request to it, which the Workers Free plan includes (with its daily request and storage-write limits).
 */
export class SiteStats extends DurableObject<Env> {
  /** The day old totals were last deleted on, by this instance. */
  private prunedOn = ''

  add(event: CountEvent, now = Date.now()): void {
    const day = utcDay(now)
    const key = DAY_PREFIX + day
    const counts = this.ctx.storage.kv.get<DayTotals['counts']>(key) ?? {}
    counts[event] = (counts[event] ?? 0) + 1
    this.ctx.storage.kv.put(key, counts)
    if (this.prunedOn !== day) {
      this.prunedOn = day
      const oldest = DAY_PREFIX + utcDay(now - (KEEP_DAYS - 1) * DAY_MS)
      // Listed in full before deleting, rather than deleting while the list is being read.
      const old = Array.from(this.ctx.storage.kv.list({ prefix: DAY_PREFIX, end: oldest }), ([key]) => key)
      for (const key of old) this.ctx.storage.kv.delete(key)
    }
  }

  /** Every day with any totals, newest first. */
  days(): DayTotals[] {
    return Array.from(this.ctx.storage.kv.list<DayTotals['counts']>({ prefix: DAY_PREFIX, reverse: true }), ([key, counts]) => ({
      day: key.slice(DAY_PREFIX.length),
      counts,
    }))
  }
}

/** Adds one to an event's total for today, after the response has gone. Counting never delays or breaks a reply. */
export type Count = (event: CountEvent) => void

export function counter(stats: DurableObjectNamespace<SiteStats>, ctx: ExecutionContext): Count {
  return (event) => {
    ctx.waitUntil(
      (async () => {
        try {
          await stats.getByName('site').add(event)
        } catch (error) {
          console.warn('stats: counting failed', event, error instanceof Error ? error.message : String(error))
        }
      })(),
    )
  }
}

/** Events per minute and per day one network can send, so a script can't inflate the totals much. */
export const EVENT_LIMITS = { minute: 20, day: 300 } as const

/** POST /api/event {"event": "whatsapp_page"}: one tap or share from a page. Answers 204, with nothing to read. */
export async function handleEvent(request: Request, limiter: DurableObjectNamespace<ChatLimiter>, count: Count): Promise<Response> {
  const rejected = rejectRequest(request)
  if (rejected) return rejected
  const raw = await readBody(request, 200)
  if (raw === null) return json({ error: 'too_large' }, 413)
  const event = parseObject(raw)?.event
  if (!isPageEvent(event)) return json({ error: 'bad_request' }, 400)
  try {
    if (!(await limiter.getByName(`event:${requestNetwork(request)}`).allow(EVENT_LIMITS.minute, EVENT_LIMITS.day))) {
      return json({ error: 'limited' }, 429)
    }
  } catch {
    return json({ error: 'unavailable' }, 503)
  }
  count(event)
  return new Response(null, { status: 204, headers: BASE_HEADERS })
}
