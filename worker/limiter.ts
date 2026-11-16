import { DurableObject } from 'cloudflare:workers'

/**
 * Counts one visitor's (or one network's) receptionist messages over the last minute. One object
 * per key, and each object handles one request at a time, so the limit is exact. (The Workers
 * Rate Limiting binding is approximate per location, and in testing it let every request through.)
 *
 * The count lives in memory only. An idle object stays in memory for over a minute before it is
 * evicted, which is longer than the window, so nothing is written to storage and nothing piles up.
 * Included in the Workers Free plan (100,000 Durable Object requests a day).
 */
export class ChatLimiter extends DurableObject<Env> {
  private hits: number[] = []

  /** True, and counted, when fewer than `limit` messages were allowed in the last `windowMs`. */
  allow(limit: number, windowMs: number): boolean {
    const now = Date.now()
    this.hits = this.hits.filter((at) => now - at < windowMs)
    if (this.hits.length >= limit) return false
    this.hits.push(now)
    return true
  }
}
