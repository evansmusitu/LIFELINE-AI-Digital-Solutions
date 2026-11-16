import { DurableObject } from 'cloudflare:workers'

/** One UTC day as YYYY-MM-DD, matching when Cloudflare resets the free Workers AI allowance. */
function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10)
}

function nextUtcMidnight(now: number): number {
  const date = new Date(now)
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1)
}

interface DayCount {
  day: string
  count: number
}

/**
 * Counts one visitor's (or one network's) receptionist messages: over the last minute, and over the
 * current UTC day. One object per key, and each object handles one request at a time, so the counts
 * are exact. (The Workers Rate Limiting binding is approximate per location, and in testing it let
 * every request through.)
 *
 * The minute window lives in memory: an idle object stays in memory for longer than a minute, so
 * nothing is lost that matters. The day's count is stored, so it survives the object being evicted,
 * and an alarm deletes it after midnight UTC. Included in the Workers Free plan.
 */
export class ChatLimiter extends DurableObject<Env> {
  private hits: number[] = []

  /** True, and counted, when the key is under both limits. A refused message isn't counted. */
  allow(perMinute: number, perDay: number, now = Date.now()): boolean {
    this.hits = this.hits.filter((at) => now - at < 60_000)
    if (this.hits.length >= perMinute) return false

    const day = utcDay(now)
    const stored = this.ctx.storage.kv.get<DayCount>('day')
    const today = stored?.day === day ? stored.count : 0
    if (today >= perDay) return false

    this.hits.push(now)
    this.ctx.storage.kv.put<DayCount>('day', { day, count: today + 1 })
    if (today === 0) void this.ctx.storage.setAlarm(nextUtcMidnight(now) + 60_000)
    return true
  }

  /** After midnight UTC: forget the key, so old counts don't pile up in storage. */
  async alarm() {
    await this.ctx.storage.deleteAll()
  }
}
