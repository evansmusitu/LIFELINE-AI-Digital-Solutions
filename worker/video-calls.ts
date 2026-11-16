import { DurableObject } from 'cloudflare:workers'
import type { VideoStartResponse } from '../src/receptionist/protocol'
import { createConnection, endConnection, listSessions, NapsterError, updateInstructions, type SessionSummary } from './napster'

/*
 * Starts and ends Tari's video calls, and keeps spending inside the limits. One object handles every
 * call (getByName('calls')), one request at a time, so two visitors can't both take the last call.
 *
 * Spending and today's calls are counted from Napster's own session list, so they include every
 * call made with the API key: the live site, every Preview and any tests. Each call that hasn't
 * been billed yet is counted at its most expensive (the time limit plus the grace period).
 */

export interface VideoLimits {
  /** Total Napster spend allowed, in USD, across all calls ever made with this key. */
  budgetUsd: number
  callsPerDay: number
  perVisitorPerDay: number
  perNetworkPerDay: number
  /** Longest call. The browser ends the call then; this Worker ends it GRACE_SECONDS later at the latest. */
  maxSeconds: number
  pricePerMinute: number
  /** Napster allows 5 browser calls at once per organisation. */
  maxConcurrent: number
}

/** Extra time after maxSeconds before the Worker ends a call itself, for slow connections. */
export const GRACE_SECONDS = 30

const num = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

export function videoLimits(env: Env): VideoLimits {
  return {
    budgetUsd: num(env.VIDEO_BUDGET_USD, 0),
    callsPerDay: num(env.VIDEO_CALLS_PER_DAY, 0),
    perVisitorPerDay: num(env.VIDEO_CALLS_PER_VISITOR, 2),
    // Higher than per visitor: many phones on one mobile network can share an IPv4 address.
    perNetworkPerDay: num(env.VIDEO_CALLS_PER_NETWORK, 6),
    maxSeconds: Math.min(num(env.VIDEO_CALL_SECONDS, 180), 600),
    pricePerMinute: num(env.VIDEO_PRICE_PER_MINUTE, 0.0583),
    maxConcurrent: 5,
  }
}

/** The most one call can cost: its time limit plus the grace period, at the per-minute price. */
export function maxCallCost(limits: VideoLimits): number {
  return (limits.pricePerMinute * (limits.maxSeconds + GRACE_SECONDS)) / 60
}

interface Call {
  sessionId: string
  endKey: string
  visitor: string
  network: string
  mintedAt: number
  /** When the Worker ends the call if it is still running. */
  cutoffAt: number
  ended: boolean
  endAttempts: number
}

interface DayCounts {
  day: string
  counts: Record<string, number>
}

export interface Usage {
  /** Billed so far, in USD. */
  spent: number
  /** Calls not billed yet (still running, or closed without a final cost). */
  unsettled: number
  /** Calls created today (UTC), not counting ones that never connected. */
  today: number
  /** Calls running now. */
  open: number
}

const utcDay = (now: number) => new Date(now).toISOString().slice(0, 10)
const utcDayStartSeconds = (now: number) => Math.floor(Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate()) / 1000)

/** Totals from Napster's session list, plus calls made in the last two minutes that may not be listed yet. */
export function measureUsage(sessions: SessionSummary[], recent: Call[], now: number): Usage {
  const dayStart = utcDayStartSeconds(now)
  const listed = new Set(sessions.map((s) => s.id))
  let spent = 0
  let unsettled = 0
  let today = 0
  let open = 0
  for (const session of sessions) {
    if (session.cost !== null) spent += session.cost
    else if (session.status !== 'failed') unsettled++
    if (session.createdAt >= dayStart && session.status !== 'failed') today++
    if (session.status === 'pending' || session.status === 'started') open++
  }
  for (const call of recent) {
    if (listed.has(call.sessionId) || now - call.mintedAt > 120_000) continue
    unsettled++
    if (call.mintedAt >= dayStart * 1000) today++
    if (!call.ended) open++
  }
  return { spent, unsettled, today, open }
}

/** Why a new call isn't allowed, or null when it is. */
export function refusal(usage: Usage, limits: VideoLimits): Exclude<VideoStartResponse, { type: 'ok' }>['reason'] | null {
  const perCall = maxCallCost(limits)
  if (usage.spent + usage.unsettled * perCall + perCall > limits.budgetUsd) return 'budget'
  if (usage.today >= limits.callsPerDay) return 'daily'
  if (usage.open >= limits.maxConcurrent) return 'busy'
  return null
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

function randomId(bytes: number): string {
  const data = new Uint8Array(bytes)
  crypto.getRandomValues(data)
  return Array.from(data, (b) => b.toString(16).padStart(2, '0')).join('')
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export interface StartInput {
  visitor: string
  network: string
  /** "home" or a demo slug, kept as a tag on the Napster session. */
  page: string
  pageTitle: string
  instructions: string
  opening: string
}

export class VideoCalls extends DurableObject<Env> {
  /** Runs one start or end at a time, including the network calls inside it. */
  private queue: Promise<unknown> = Promise.resolve()

  private serial<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task)
    this.queue = run.catch(() => undefined)
    return run
  }

  private get calls(): Record<string, Call> {
    return this.ctx.storage.kv.get<Record<string, Call>>('calls') ?? {}
  }

  private set calls(value: Record<string, Call>) {
    this.ctx.storage.kv.put('calls', value)
  }

  private dayCounts(now: number): DayCounts {
    const stored = this.ctx.storage.kv.get<DayCounts>('day')
    const day = utcDay(now)
    return stored?.day === day ? stored : { day, counts: {} }
  }

  start(input: StartInput): Promise<VideoStartResponse> {
    return this.serial(() => this.startCall(input))
  }

  end(callId: string, endKey: string): Promise<boolean> {
    return this.serial(async () => {
      const calls = this.calls
      const call = calls[callId]
      if (!call || call.endKey !== endKey) return false
      if (!call.ended) {
        call.ended = true
        this.calls = calls
        try {
          await endConnection(this.key(), call.sessionId)
        } catch (error) {
          // The alarm tries again at the cut-off.
          call.ended = false
          this.calls = calls
          console.warn('video: ending a call failed', error instanceof Error ? error.message : String(error))
        }
      }
      return true
    })
  }

  private key(): string {
    return this.env.NAPSTER_API_KEY ?? ''
  }

  private async startCall(input: StartInput): Promise<VideoStartResponse> {
    const limits = videoLimits(this.env)
    const agentId = this.env.NAPSTER_AGENT_ID
    if (!this.key() || !agentId || limits.budgetUsd <= 0 || limits.callsPerDay <= 0) return { type: 'unavailable', reason: 'off' }

    const now = Date.now()
    const day = this.dayCounts(now)
    const visitorKey = `v:${input.visitor}`
    const networkKey = `n:${input.network}`
    if ((day.counts[visitorKey] ?? 0) >= limits.perVisitorPerDay || (day.counts[networkKey] ?? 0) >= limits.perNetworkPerDay) {
      return { type: 'unavailable', reason: 'visitor' }
    }

    let sessions: SessionSummary[]
    try {
      sessions = await listSessions(this.key())
    } catch (error) {
      // Without the session list the spending limit can't be checked, so no call.
      console.warn('video: listing sessions failed', error instanceof Error ? error.message : String(error))
      return { type: 'unavailable', reason: 'error' }
    }
    const usage = measureUsage(sessions, Object.values(this.calls), now)
    const refused = refusal(usage, limits)
    if (refused) return { type: 'unavailable', reason: refused }

    await this.syncInstructions(agentId, input.instructions)

    let connection
    for (let attempt = 0; ; attempt++) {
      try {
        connection = await createConnection(this.key(), agentId, {
          initialSpeech: input.opening,
          tags: { source: 'website', page: input.page },
          profile: { currentPage: input.pageTitle },
        })
        break
      } catch (error) {
        if (error instanceof NapsterError && error.status === 429 && attempt === 0) {
          await sleep(Math.min((error.retryAfter ?? 1) * 1000, 3000))
          continue
        }
        if (error instanceof NapsterError && error.status === 409) return { type: 'unavailable', reason: 'busy' }
        console.warn('video: starting a call failed', error instanceof Error ? error.message : String(error))
        return { type: 'unavailable', reason: 'error' }
      }
    }

    const callId = randomId(12)
    const call: Call = {
      sessionId: connection.sessionId,
      endKey: randomId(16),
      visitor: input.visitor,
      network: input.network,
      mintedAt: now,
      cutoffAt: now + (limits.maxSeconds + GRACE_SECONDS) * 1000,
      ended: false,
      endAttempts: 0,
    }
    this.calls = { ...this.calls, [callId]: call }
    day.counts[visitorKey] = (day.counts[visitorKey] ?? 0) + 1
    day.counts[networkKey] = (day.counts[networkKey] ?? 0) + 1
    this.ctx.storage.kv.put('day', day)
    await this.scheduleAlarm()
    return { type: 'ok', token: connection.token, callId, endKey: call.endKey, maxSeconds: limits.maxSeconds }
  }

  /** Updates the agent's instructions when the site's facts or demos have changed since the last call. */
  private async syncInstructions(agentId: string, instructions: string) {
    const hash = await sha256(`${agentId}\n${instructions}`)
    if (this.ctx.storage.kv.get<string>('instructions') === hash) return
    try {
      await updateInstructions(this.key(), agentId, instructions)
      this.ctx.storage.kv.put('instructions', hash)
    } catch (error) {
      // The call still works with the previous instructions. Try again next call.
      console.warn('video: updating instructions failed', error instanceof Error ? error.message : String(error))
    }
  }

  private async scheduleAlarm() {
    const pending = Object.values(this.calls).filter((c) => !c.ended)
    const next = pending.length ? Math.min(...pending.map((c) => c.cutoffAt)) : Object.keys(this.calls).length ? Date.now() + 3_600_000 : null
    if (next === null) await this.ctx.storage.deleteAlarm()
    else await this.ctx.storage.setAlarm(next)
  }

  /** Ends calls that ran past their cut-off, and forgets calls older than a day. */
  async alarm() {
    await this.serial(async () => {
      const now = Date.now()
      const calls = this.calls
      for (const [id, call] of Object.entries(calls)) {
        if (!call.ended && call.cutoffAt <= now) {
          try {
            await endConnection(this.key(), call.sessionId)
            call.ended = true
          } catch (error) {
            call.endAttempts += 1
            call.cutoffAt = now + 15_000
            // Napster also closes a call after 3 minutes of silence, so give up after a few tries.
            if (call.endAttempts >= 8) call.ended = true
            console.warn('video: cut-off failed', error instanceof Error ? error.message : String(error))
          }
        }
        if (call.ended && now - call.mintedAt > 86_400_000) delete calls[id]
      }
      this.calls = calls
      await this.scheduleAlarm()
    })
  }
}
