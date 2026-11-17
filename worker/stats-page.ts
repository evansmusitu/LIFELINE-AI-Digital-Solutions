import type { CountEvent } from '../src/lib/count-events'
import { BASE_HEADERS, json, readBody, requestNetwork } from './http'
import { utcDay, type ChatLimiter } from './limiter'
import type { DayTotals, SiteStats } from './stats'
import type { VideoCalls, VideoUsage } from './video-calls'

/*
 * GET /stats: the private totals page, behind a passcode. Only the SHA-256 of the passcode (after
 * normalPasscode) is in the settings (STATS_PASSCODE_SHA256 in wrangler.jsonc), and the repository is
 * public, so the passcode must be long and random. Make one with `npm run stats-passcode`. Without
 * that setting the page doesn't exist. No cookies: the passcode is asked for on every visit.
 */

interface Namespaces {
  stats: DurableObjectNamespace<SiteStats>
  calls: DurableObjectNamespace<VideoCalls>
  limiter: DurableObjectNamespace<ChatLimiter>
}

/** Passcode tries per minute and per day from one network. */
export const STATS_LIMITS = { minute: 10, day: 60 } as const
/** Days in the daily table. */
export const TABLE_DAYS = 14

export const EVENT_LABELS: Record<CountEvent, string> = {
  chat_started: 'Chats started (first message sent)',
  ai_reply: 'Chat replies written by the AI, in full',
  saved_quota: 'Saved answers: the day’s free AI allowance was used up',
  saved_busy: 'Saved answers: the AI was busy',
  saved_error: 'Saved answers: the AI failed',
  video_started: 'Video calls started',
  video_refused_budget: 'Calls turned away: spending limit reached',
  video_refused_daily: 'Calls turned away: daily call limit reached',
  video_refused_visitor: 'Calls turned away: that visitor or network had used its calls for the day',
  video_refused_busy: 'Calls turned away: all call lines busy',
  video_refused_off: 'Calls turned away: video calls switched off',
  video_refused_error: 'Calls turned away: something went wrong',
  whatsapp_chat: 'WhatsApp taps in the chat',
  whatsapp_video: 'WhatsApp taps on the video call screen',
  whatsapp_page: 'WhatsApp taps on the pages',
  share_whatsapp: 'Demos shared to WhatsApp',
  share_sheet: 'Demos shared from the phone’s share menu',
  share_copy: 'Demo links copied',
  ref_walk_in: 'Arrived from a link tagged walk-in',
  ref_status: 'Arrived from a link tagged status',
  ref_tiktok: 'Arrived from a link tagged tiktok',
  ref_facebook: 'Arrived from a link tagged facebook',
  ref_instagram: 'Arrived from a link tagged instagram',
  ref_referral: 'Arrived from a link tagged referral',
  ref_flyer: 'Arrived from a link tagged flyer',
  ref_other: 'Arrived from a link with any other tag',
  link_personalised: 'Personalised links opened',
}

const COLUMNS: { label: string; events: CountEvent[] }[] = [
  { label: 'Chats started', events: ['chat_started'] },
  { label: 'AI replies', events: ['ai_reply'] },
  { label: 'Saved answers', events: ['saved_quota', 'saved_busy', 'saved_error'] },
  { label: 'Video calls', events: ['video_started'] },
  {
    label: 'Calls turned away',
    events: ['video_refused_budget', 'video_refused_daily', 'video_refused_visitor', 'video_refused_busy', 'video_refused_off', 'video_refused_error'],
  },
  { label: 'WhatsApp from chat', events: ['whatsapp_chat'] },
  { label: 'WhatsApp from video calls', events: ['whatsapp_video'] },
  { label: 'WhatsApp from pages', events: ['whatsapp_page'] },
  { label: 'Demo shares', events: ['share_whatsapp', 'share_sheet', 'share_copy'] },
  {
    label: 'Arrived from a tagged link',
    events: ['ref_walk_in', 'ref_status', 'ref_tiktok', 'ref_facebook', 'ref_instagram', 'ref_referral', 'ref_flyer', 'ref_other'],
  },
  { label: 'Personalised links opened', events: ['link_personalised'] },
]

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Passcodes are shown in groups (abcde-fghij-…). Dashes, spaces and capitals don't matter. */
export function normalPasscode(typed: string): string {
  return typed.toLowerCase().replace(/[\s-]/g, '')
}

/** True when the passcode's SHA-256 is `expectedHex`. Compares every byte, so the time taken gives nothing away. */
export async function passcodeMatches(passcode: string, expectedHex: string): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/.test(expectedHex)) return false
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(passcode)))
  let difference = 0
  for (let i = 0; i < 32; i++) difference |= digest[i] ^ parseInt(expectedHex.slice(i * 2, i * 2 + 2), 16)
  return difference === 0
}

/** The last `n` UTC days, newest first, as YYYY-MM-DD. */
export function lastDays(now: number, n: number): string[] {
  return Array.from({ length: n }, (_, i) => utcDay(now - i * 86_400_000))
}

const sum = (counts: DayTotals['counts'], events: CountEvent[]) => events.reduce((total, e) => total + (counts[e] ?? 0), 0)

function addUp(days: DayTotals[]): DayTotals['counts'] {
  const total: DayTotals['counts'] = {}
  for (const { counts } of days) {
    for (const [event, n] of Object.entries(counts) as [CountEvent, number][]) total[event] = (total[event] ?? 0) + n
  }
  return total
}

const usd = (n: number) => `$${n.toFixed(2)}`

function videoSummary(usage: VideoUsage | null): string {
  if (!usage) return '<p>Video call spending isn’t available right now.</p>'
  const left = Math.max(0, usage.budgetUsd - usage.spent - usage.reserved)
  return `<p><strong>${usd(usage.spent)}</strong> billed so far, plus ${usd(usage.reserved)} held for calls not billed yet.
    <strong>${usd(left)}</strong> left of the ${usd(usage.budgetUsd)} limit.</p>
    <p>Calls today (UTC), on the live site and previews together: <strong>${usage.today}</strong> of ${usage.callsPerDay}. Running now: ${usage.open}.</p>`
}

/** The totals page: video spending, a table of the last TABLE_DAYS days, and every total in full. */
export function statsReport(days: DayTotals[], usage: VideoUsage | null, now: number): string {
  const byDay = new Map(days.map((d) => [d.day, d.counts]))
  const recentDays = lastDays(now, TABLE_DAYS)
  const recent = addUp(recentDays.map((day) => ({ day, counts: byDay.get(day) ?? {} })))
  const allTime = addUp(days)
  const since = days.length ? days[days.length - 1].day : null

  const head = `<tr><th scope="col">Day (UTC)</th>${COLUMNS.map((c) => `<th scope="col">${c.label}</th>`).join('')}</tr>`
  const row = (label: string, counts: DayTotals['counts'], className = '') =>
    `<tr${className ? ` class="${className}"` : ''}><th scope="row">${escapeHtml(label)}</th>${COLUMNS.map((c) => `<td>${sum(counts, c.events)}</td>`).join('')}</tr>`
  const rows = recentDays.map((day) => row(day, byDay.get(day) ?? {}))

  const detail = (Object.keys(EVENT_LABELS) as CountEvent[])
    .map((event) => `<tr><th scope="row">${EVENT_LABELS[event]}</th><td>${recent[event] ?? 0}</td><td>${allTime[event] ?? 0}</td></tr>`)
    .join('')

  return `<h1>Site totals</h1>
    <p class="note">Totals only: no cookies, and nothing about who did what. Days are UTC. Previews keep their own totals.</p>
    <h2>Video call spending</h2>
    ${videoSummary(usage)}
    <h2>Last ${TABLE_DAYS} days</h2>
    <div class="scroll"><table>
      <thead>${head}</thead>
      <tbody>${rows.join('')}</tbody>
      <tfoot>${row(`${TABLE_DAYS} days`, recent, 'total')}${row(since ? `Since ${since}` : 'All time', allTime, 'total')}</tfoot>
    </table></div>
    <h2>Every total</h2>
    <div class="scroll"><table class="detail">
      <thead><tr><th scope="col">What</th><th scope="col">${TABLE_DAYS} days</th><th scope="col">${since ? `Since ${since}` : 'All time'}</th></tr></thead>
      <tbody>${detail}</tbody>
    </table></div>
    <p class="note">To update, open this page again and enter the passcode.</p>`
}

export function passcodeForm(problem?: string): string {
  return `<h1>Site totals</h1>
    <form method="post">
      <label for="passcode">Passcode</label>
      <input id="passcode" name="passcode" type="password" autocomplete="current-password" required autofocus>
      <button type="submit">Show totals</button>
    </form>
    ${problem ? `<p class="problem" role="alert">${escapeHtml(problem)}</p>` : ''}`
}

const CSS = `
  :root { color-scheme: dark; }
  body { margin: 0; background: #050b1f; color: #dce3f2; font: 15px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif; }
  main { max-width: 72rem; margin: 0 auto; padding: 24px 16px 48px; }
  h1 { color: #fff; font-size: 1.6rem; margin: 0 0 8px; }
  h2 { color: #fff; font-size: 1.1rem; margin: 28px 0 8px; }
  strong { color: #fff; }
  .note { color: #93a1c0; font-size: 0.85rem; }
  .problem { color: #fca5a5; }
  form { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 16px; }
  label { width: 100%; font-weight: 600; }
  input { flex: 1; min-width: 12rem; padding: 10px 14px; border-radius: 999px; border: 1px solid #33406a; background: #0b1430; color: #fff; font: inherit; }
  button { padding: 10px 20px; border: 0; border-radius: 999px; background: #00d4ff; color: #050b1f; font: inherit; font-weight: 700; cursor: pointer; }
  .scroll { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
  th, td { padding: 6px 10px; border-bottom: 1px solid #1c2748; text-align: right; white-space: nowrap; }
  th[scope=row], thead th:first-child { text-align: left; }
  thead th { color: #93a1c0; font-weight: 600; font-size: 0.8rem; white-space: normal; vertical-align: bottom; }
  .total th, .total td { color: #fff; font-weight: 700; }
  .detail th[scope=row] { white-space: normal; }
`

function page(body: string, status = 200): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>Site totals</title><style>${CSS}</style></head><body><main>${body}</main></body></html>`
  return new Response(html, {
    status,
    headers: {
      ...BASE_HEADERS,
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
      // Not "no-referrer": with that, browsers send "Origin: null" on the passcode form, and the origin check refuses it.
      'referrer-policy': 'same-origin',
      'x-robots-tag': 'noindex',
    },
  })
}

export async function handleStats(request: Request, env: Env, ns: Namespaces, now = Date.now()): Promise<Response> {
  const expected = (env.STATS_PASSCODE_SHA256 ?? '').trim().toLowerCase()
  // Switched off: the same "page not found" screen as any other unknown address.
  if (!/^[0-9a-f]{64}$/.test(expected)) return env.ASSETS.fetch(request)
  if (request.method === 'GET') return page(passcodeForm())
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, { allow: 'GET, POST' })
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'forbidden' }, 403)
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/x-www-form-urlencoded')) {
    return json({ error: 'unsupported_media_type' }, 415)
  }
  const raw = await readBody(request, 1000)
  if (raw === null) return json({ error: 'too_large' }, 413)

  try {
    if (!(await ns.limiter.getByName(`stats:${requestNetwork(request)}`).allow(STATS_LIMITS.minute, STATS_LIMITS.day))) {
      return page(passcodeForm('Too many tries. Wait a minute, then try again.'), 429)
    }
  } catch {
    return page(passcodeForm('The totals aren’t available right now. Try again in a minute.'), 503)
  }
  if (!(await passcodeMatches(normalPasscode(new URLSearchParams(raw).get('passcode') ?? ''), expected))) {
    return page(passcodeForm('That passcode isn’t right.'), 403)
  }

  const warn = (what: string) => (error: unknown) => {
    console.warn(`stats: ${what} failed`, error instanceof Error ? error.message : String(error))
    return null
  }
  const [days, usage] = await Promise.all([
    ns.stats.getByName('site').days().catch(warn('reading totals')),
    ns.calls.getByName('calls').usage().catch(warn('video usage')),
  ])
  if (!days) return page(passcodeForm('The totals aren’t available right now. Try again in a minute.'), 503)
  return page(statsReport(days, usage, now))
}
