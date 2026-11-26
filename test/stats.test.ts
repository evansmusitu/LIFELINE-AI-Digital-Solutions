/* Daily totals: the SiteStats object, the count endpoint, the tap counter's link rules and the private /stats page. */
import { createHash } from 'node:crypto'
import { expect, test } from 'vitest'
import { SITE } from '../src/config/site'
import { linkEvent } from '../src/lib/counts'
import worker from '../worker/index'
import type { ChatLimiter } from '../worker/limiter'
import { counter, EVENT_LIMITS, handleEvent, KEEP_DAYS, SiteStats, type DayTotals } from '../worker/stats'
import { handleStats, lastDays, normalPasscode, passcodeMatches, statsReport, TABLE_DAYS } from '../worker/stats-page'
import type { VideoUsage } from '../worker/video-calls'

/** One assertion. Failures are all reported, each with its name and the value that failed. */
function check(name: string, ok: boolean, detail?: unknown) {
  expect.soft(ok, ok || detail === undefined ? name : `${name}: ${JSON.stringify(detail)}`).toBe(true)
}

const ORIGIN = 'https://studio.example'
const DAY = 86_400_000

/** Durable Object storage with the synchronous kv calls SiteStats uses, kept in key order like the real one. */
function fakeState() {
  const store = new Map<string, unknown>()
  const list = ({ prefix = '', end, reverse = false }: { prefix?: string; end?: string; reverse?: boolean } = {}) => {
    const keys = [...store.keys()].filter((k) => k.startsWith(prefix) && (end === undefined || k < end)).sort()
    if (reverse) keys.reverse()
    return keys.map((k) => [k, store.get(k)] as [string, unknown])
  }
  const state = {
    storage: {
      kv: { get: (k: string) => store.get(k), put: (k: string, v: unknown) => void store.set(k, v), delete: (k: string) => store.delete(k), list },
    },
  }
  return { state: state as unknown as DurableObjectState, store }
}

test('SiteStats object', () => {
  const f = fakeState()
  let stats = new SiteStats(f.state, {} as Env)
  const day1 = Date.UTC(2026, 10, 16, 9)
  stats.add('chat_started', day1)
  stats.add('chat_started', day1 + 1000)
  stats.add('whatsapp_page', day1)
  stats.add('chat_started', day1 + DAY)
  check('stats: one entry per day', f.store.size === 2, [...f.store.keys()])
  // A new instance (after eviction) reads the same storage.
  stats = new SiteStats(f.state, {} as Env)
  const days = stats.days()
  check('stats: newest day first', days.map((d) => d.day).join() === '2026-11-17,2026-11-16', days)
  check('stats: counts per day', days[1].counts.chat_started === 2 && days[1].counts.whatsapp_page === 1 && days[0].counts.chat_started === 1, days)

  // Old days go once they are more than KEEP_DAYS old.
  stats.add('ai_reply', day1 + (KEEP_DAYS - 1) * DAY)
  check('stats: keeps KEEP_DAYS days', f.store.has('day:2026-11-16'), [...f.store.keys()])
  stats = new SiteStats(f.state, {} as Env)
  stats.add('ai_reply', day1 + KEEP_DAYS * DAY)
  check('stats: deletes older days', !f.store.has('day:2026-11-16') && f.store.has('day:2026-11-17'), [...f.store.keys()])
})

test('counter', async () => {
  const waits: Promise<unknown>[] = []
  const ctx = { waitUntil: (p: Promise<unknown>) => void waits.push(p) } as unknown as ExecutionContext
  const added: string[] = []
  const ok = { getByName: (name: string) => ({ add: async (event: string) => void added.push(`${name}:${event}`) }) } as never
  counter(ok, ctx)('video_started')
  await Promise.all(waits)
  check('counter: adds to the one site object, after the response', added.join() === 'site:video_started' && waits.length === 1, added)
  const down = { getByName: () => ({ add: async () => { throw new Error('over quota') } }) } as never
  counter(down, ctx)('ai_reply')
  let failed = false
  await Promise.all(waits).catch(() => (failed = true))
  check('counter: a failed count is swallowed', !failed)
})

function limiter(opts: { ok?: boolean; throws?: boolean; keys?: string[] } = {}) {
  return {
    getByName: (name: string) => ({
      allow: async (minute: number, day: number) => {
        opts.keys?.push(`${name}@${minute}/${day}`)
        if (opts.throws) throw new Error('down')
        return opts.ok ?? true
      },
    }),
  } as unknown as DurableObjectNamespace<ChatLimiter>
}

const postEvent = (body: unknown, headers: Record<string, string> = {}) =>
  new Request(`${ORIGIN}/api/event`, {
    method: 'POST',
    headers: { origin: ORIGIN, 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.9', ...headers },
    body: JSON.stringify(body),
  })

test('count endpoint', async () => {
  const counted: string[] = []
  const count = (event: string) => void counted.push(event)
  const keys: string[] = []
  let res = await handleEvent(postEvent({ event: 'whatsapp_chat' }), limiter({ keys }), count)
  check('event: 204', res.status === 204 && res.headers.get('cache-control') === 'no-store', res.status)
  check('event: counted', counted.join() === 'whatsapp_chat', counted)
  check('event: limited per network', keys.join() === 'event:203.0.113.9@10/100', keys)

  counted.length = 0
  res = await handleEvent(postEvent({ event: 'chat_started' }), limiter(), count)
  check('event: the Worker’s own events are refused', res.status === 400 && counted.length === 0, res.status)
  res = await handleEvent(postEvent({ event: 'toString' }), limiter(), count)
  check('event: unknown event refused', res.status === 400 && counted.length === 0, res.status)
  res = await handleEvent(postEvent({ event: 'whatsapp_page' }, { origin: 'https://evil.example' }), limiter(), count)
  check('event: other origin 403', res.status === 403 && counted.length === 0, res.status)
  res = await handleEvent(postEvent({ event: 'whatsapp_page', pad: 'x'.repeat(300) }), limiter(), count)
  check('event: big body 413', res.status === 413, res.status)
  res = await handleEvent(postEvent({ event: 'whatsapp_page' }), limiter({ ok: false }), count)
  check('event: over the limit 429, not counted', res.status === 429 && counted.length === 0, res.status)
  res = await handleEvent(postEvent({ event: 'whatsapp_page' }), limiter({ throws: true }), count)
  check('event: limiter down 503, not counted', res.status === 503 && counted.length === 0, res.status)
})

test('count endpoint: person tags', async () => {
  const counted: string[] = []
  const count = (event: string) => void counted.push(event)
  for (const event of ['by_team_a', 'by_team_b', 'by_team_c', 'by_other']) {
    const res = await handleEvent(postEvent({ event }), limiter(), count)
    check(`event: ${event} accepted`, res.status === 204, res.status)
  }
  check('event: person tags counted', counted.join() === 'by_team_a,by_team_b,by_team_c,by_other', counted)
  counted.length = 0
  for (const event of ['by_team_d', 'by_Evans', 'by_', 'by_team-a']) {
    const res = await handleEvent(postEvent({ event }), limiter(), count)
    check(`event: ${event} refused, never stored raw`, res.status === 400, res.status)
  }
  check('event: nothing counted for unknown people', counted.length === 0, counted)
})

test('count endpoint: limits suit a visit of three events', async () => {
  // Three events per visit: 3 visits fit in a minute and about 33 in a day.
  const calls: string[] = []
  const lim = { getByName: () => ({ allow: async (m: number, d: number) => (calls.push(`${m}/${d}`), true) }) } as unknown as DurableObjectNamespace<ChatLimiter>
  for (const event of ['ref_walk_in', 'by_team_a', 'link_personalised']) await handleEvent(postEvent({ event }), lim, () => undefined)
  check('limits: each event passes the same per-network limit', calls.join() === '10/100,10/100,10/100', calls)
  check('limits: three visits a minute fit', Math.floor(EVENT_LIMITS.minute / 3) >= 3 && Math.floor(EVENT_LIMITS.day / 3) >= 30)
})

test('tap counter link rules', () => {
  const number = `https://wa.me/${SITE.whatsappNumber}?text=Hi`
  check('link: WhatsApp on a page', linkEvent(number, null) === 'whatsapp_page')
  check('link: WhatsApp in the chat', linkEvent(number, 'chat') === 'whatsapp_chat')
  check('link: WhatsApp on a video call', linkEvent(number, 'video') === 'whatsapp_video')
  check('link: no message', linkEvent(`https://wa.me/${SITE.whatsappNumber}`, null) === 'whatsapp_page')
  const share = `https://wa.me/?text=${encodeURIComponent(`Look\n${SITE.url}/demos/salon-spa-booking`)}`
  check('link: demo share', linkEvent(share, null) === 'share_whatsapp')
  check('link: a demo’s own sample share is not counted', linkEvent(`https://wa.me/?text=${encodeURIComponent('Your ticket: FEST-1')}`, null) === null)
  check('link: another number is not counted', linkEvent('https://wa.me/447700900123', null) === null)
  check('link: other sites are not counted', linkEvent(`https://example.com/${SITE.whatsappNumber}`, null) === null)
  check('link: lookalike host is not counted', linkEvent(`https://wa.me.example.com/${SITE.whatsappNumber}`, null) === null)
  check('link: malformed', linkEvent('not a url', null) === null)
})

test('tap counter in a page', async () => {
  // A minimal page: just enough of the DOM for the click listener in src/lib/counts.ts.
  class FakeElement {
    attrs: Record<string, string>
    parent: FakeElement | null
    href: string
    constructor(attrs: Record<string, string>, parent: FakeElement | null = null, href = '') {
      this.attrs = attrs
      this.parent = parent
      this.href = href
    }
    hasAttribute(name: string) {
      return name in this.attrs
    }
    getAttribute(name: string) {
      return this.attrs[name] ?? null
    }
    closest(selector: string): FakeElement | null {
      const matches = selector === 'a[href]' ? this instanceof FakeAnchor : this.hasAttribute(selector.slice(1, -1))
      return matches ? this : (this.parent?.closest(selector) ?? null)
    }
  }
  class FakeAnchor extends FakeElement {}
  const listeners: ((event: { target: unknown; defaultPrevented: boolean }) => void)[] = []
  const sent: { event: string; options: RequestInit }[] = []
  const saved = { document: globalThis.document, Element: globalThis.Element, HTMLAnchorElement: globalThis.HTMLAnchorElement, fetch: globalThis.fetch }
  Object.assign(globalThis, {
    document: { addEventListener: (_: string, fn: (typeof listeners)[number]) => void listeners.push(fn) },
    Element: FakeElement,
    HTMLAnchorElement: FakeAnchor,
    fetch: async (_url: string, options: RequestInit) => {
      sent.push({ event: JSON.parse(String(options.body)).event, options })
      return new Response(null, { status: 204 })
    },
  })
  try {
    const { startCounting } = await import('../src/lib/counts')
    startCounting()
    const tap = (target: unknown, defaultPrevented = false) => listeners.forEach((fn) => fn({ target, defaultPrevented }))
    const wa = `https://wa.me/${SITE.whatsappNumber}?text=Hi`
    const panel = new FakeElement({ 'data-count-source': 'video' })
    tap(new FakeElement({}, new FakeAnchor({}, panel, wa)))
    tap(new FakeAnchor({}, null, wa))
    tap(new FakeAnchor({}, null, wa), true)
    tap(new FakeAnchor({ 'data-count-skip': '' }, null, wa))
    tap(new FakeAnchor({}, null, 'https://example.com/'))
    tap('text node')
    check('page: counts by where the link sits', sent.map((s) => s.event).join() === 'whatsapp_video,whatsapp_page', sent.map((s) => s.event))
    const options = sent[0].options
    check('page: sends only the event, kept alive, without the page address', options.keepalive === true && options.referrerPolicy === 'origin' && options.body === '{"event":"whatsapp_video"}', options)
  } finally {
    Object.assign(globalThis, saved)
  }
})

const PASSCODE = 'abcde-fghij-kmnpq-rstuv'
const HASH = createHash('sha256').update('abcdefghijkmnpqrstuv').digest('hex')

test('passcode', async () => {
  check('passcode: dashes, spaces and capitals ignored', normalPasscode(' ABCDE-fghij kmnpq-rstuv ') === 'abcdefghijkmnpqrstuv')
  check('passcode: matches', await passcodeMatches(normalPasscode(PASSCODE), HASH))
  check('passcode: wrong', !(await passcodeMatches('abcdefghijkmnpqrstuw', HASH)))
  check('passcode: empty', !(await passcodeMatches('', HASH)))
  check('passcode: bad setting never matches', !(await passcodeMatches('', '')) && !(await passcodeMatches('x', 'zz'.repeat(32))))
})

const NOW = Date.UTC(2026, 10, 30, 12)
const DAYS: DayTotals[] = [
  { day: '2026-11-30', counts: { chat_started: 3, ai_reply: 9, saved_quota: 2, whatsapp_chat: 1, share_copy: 1, by_team_a: 2, by_team_b: 1 } },
  { day: '2026-11-25', counts: { video_started: 2, video_refused_daily: 4, whatsapp_page: 5, by_team_a: 1, by_other: 3, link_personalised: 2 } },
  // Outside the table, but in the all-time totals.
  { day: '2026-10-01', counts: { chat_started: 10 } },
]
const USAGE: VideoUsage = { spent: 1.52, reserved: 0.23, today: 3, open: 1, budgetUsd: 40, callsPerDay: 20 }

test('stats report', () => {
  check('days: newest first, UTC', lastDays(NOW, 3).join() === '2026-11-30,2026-11-29,2026-11-28')
  const html = statsReport(DAYS, USAGE, NOW)
  const rows = html.match(/<tr>.*?<\/tr>/gs) ?? []
  const dayRows = rows.filter((r) => /<th scope="row">2026-/.test(r))
  check('report: one row per day, gaps filled', dayRows.length === TABLE_DAYS, dayRows.length)
  check('report: newest day first', dayRows[0].includes('2026-11-30') && dayRows[TABLE_DAYS - 1].includes('2026-11-17'))
  const cells = (row: string) => [...row.matchAll(/<td>(\d+)<\/td>/g)].map((m) => Number(m[1]))
  // The first four columns are visits and where they came from (none in this sample).
  check('report: a day’s columns', cells(dayRows[0]).join() === '0,0,0,0,3,9,2,0,0,1,0,0,1,0,2,1,0,0,0', cells(dayRows[0]))
  check('report: an empty day is zeros', cells(dayRows[1]).every((n) => n === 0))
  const totals = html.match(/<tr class="total">.*?<\/tr>/gs) ?? []
  check('report: 14-day total', cells(totals[0]).join() === '0,0,0,0,3,9,2,2,4,1,0,5,1,0,3,1,0,3,2', cells(totals[0]))
  check('report: all-time total includes older days', totals[1].includes('Since 2026-10-01') && cells(totals[1])[4] === 13, totals[1])
  check('report: per-person columns', ['Arrived from team-a', 'Arrived from team-b', 'Arrived from team-c', 'Arrived from another person tag'].every((l) => html.includes(l)))
  check('report: per-person totals listed', html.includes('handed out by team-a</th><td>3</td><td>3</td>'))
  check('report: spending', html.includes('$1.52') && html.includes('$0.23') && html.includes('$38.25') && html.includes('$40.00'))
  check('report: calls today', html.includes('<strong>3</strong> of 20'))
  check('report: every total listed', html.includes('Calls turned away: daily call limit reached</th><td>4</td><td>4</td>'))
  check('report: no provider names', !/cloudflare|napster|workers ai/i.test(html))
  const empty = statsReport([], null, NOW)
  check('report: before any counts', empty.includes('All time') && empty.includes('isn’t available'))
})

function statsEnv(hash = HASH) {
  return {
    STATS_PASSCODE_SHA256: hash,
    ASSETS: { fetch: async () => new Response('asset') },
  } as unknown as Env
}

function statsNamespaces(opts: { days?: () => Promise<DayTotals[]>; usage?: () => Promise<VideoUsage | null>; ok?: boolean; throws?: boolean; keys?: string[] } = {}) {
  return {
    stats: { getByName: () => ({ days: opts.days ?? (async () => DAYS) }) },
    calls: { getByName: () => ({ usage: opts.usage ?? (async () => USAGE) }) },
    limiter: limiter(opts),
  } as never
}

const postStats = (passcode: string, headers: Record<string, string> = {}) =>
  new Request(`${ORIGIN}/stats`, {
    method: 'POST',
    headers: { origin: ORIGIN, 'content-type': 'application/x-www-form-urlencoded', 'cf-connecting-ip': '203.0.113.9', ...headers },
    body: new URLSearchParams({ passcode }).toString(),
  })

test('stats page', async () => {
  let res = await handleStats(new Request(`${ORIGIN}/stats`), statsEnv(''), statsNamespaces(), NOW)
  check('page: without a passcode setting it doesn’t exist', (await res.text()) === 'asset')

  res = await handleStats(new Request(`${ORIGIN}/stats`), statsEnv(), statsNamespaces(), NOW)
  let html = await res.text()
  check('page: GET shows the form', res.status === 200 && html.includes('type="password"') && !html.includes('<table'), res.status)
  check('page: not stored or indexed', res.headers.get('cache-control') === 'no-store' && res.headers.get('x-robots-tag') === 'noindex')
  check('page: locked down', (res.headers.get('content-security-policy') ?? '').includes("default-src 'none'") && (res.headers.get('content-security-policy') ?? '').includes("frame-ancestors 'none'"))
  // "no-referrer" makes browsers send "Origin: null" on the form, which the origin check refuses.
  check('page: the form keeps its origin', res.headers.get('referrer-policy') === 'same-origin', res.headers.get('referrer-policy'))
  check('page: no cookie', res.headers.get('set-cookie') === null)

  const keys: string[] = []
  res = await handleStats(postStats(PASSCODE), statsEnv(), statsNamespaces({ keys }), NOW)
  html = await res.text()
  check('page: right passcode shows the totals', res.status === 200 && html.includes('<table') && html.includes('$1.52'), res.status)
  check('page: tries limited per network', keys.join() === 'stats:203.0.113.9@10/60', keys)

  res = await handleStats(postStats('abcde-fghij-kmnpq-rstuw'), statsEnv(), statsNamespaces(), NOW)
  html = await res.text()
  check('page: wrong passcode', res.status === 403 && html.includes('isn’t right') && !html.includes('<table'), res.status)
  res = await handleStats(postStats(PASSCODE), statsEnv(), statsNamespaces({ ok: false }), NOW)
  html = await res.text()
  check('page: too many tries', res.status === 429 && !html.includes('<table'), res.status)
  res = await handleStats(postStats(PASSCODE), statsEnv(), statsNamespaces({ throws: true }), NOW)
  check('page: limiter down', res.status === 503 && !(await res.text()).includes('<table'), res.status)
  res = await handleStats(postStats(PASSCODE, { origin: 'https://evil.example' }), statsEnv(), statsNamespaces(), NOW)
  check('page: other origin 403', res.status === 403, res.status)
  res = await handleStats(postStats(PASSCODE, { origin: 'null' }), statsEnv(), statsNamespaces(), NOW)
  check('page: hidden origin 403', res.status === 403, res.status)
  res = await handleStats(postStats(PASSCODE, { 'content-type': 'application/json' }), statsEnv(), statsNamespaces(), NOW)
  check('page: form posts only', res.status === 415, res.status)
  res = await handleStats(new Request(`${ORIGIN}/stats`, { method: 'PUT' }), statsEnv(), statsNamespaces(), NOW)
  check('page: other methods 405', res.status === 405, res.status)

  res = await handleStats(postStats(PASSCODE), statsEnv(), statsNamespaces({ usage: async () => { throw new Error('down') } }), NOW)
  html = await res.text()
  check('page: totals still shown without spending', res.status === 200 && html.includes('<table') && html.includes('isn’t available'), res.status)
  res = await handleStats(postStats(PASSCODE), statsEnv(), statsNamespaces({ days: async () => { throw new Error('down') } }), NOW)
  check('page: totals down', res.status === 503, res.status)
})

test('worker routes', async () => {
  const added: string[] = []
  const waits: Promise<unknown>[] = []
  const ctx = {
    waitUntil: (p: Promise<unknown>) => void waits.push(p),
    exports: {
      ChatLimiter: limiter(),
      SiteStats: { getByName: () => ({ add: async (e: string) => void added.push(e), days: async () => DAYS }) },
      VideoCalls: { getByName: () => ({ usage: async () => USAGE }) },
    },
  } as unknown as ExecutionContext
  let res = await worker.fetch(postEvent({ event: 'share_sheet' }), statsEnv(), ctx)
  await Promise.all(waits)
  check('worker: /api/event counts', res.status === 204 && added.join() === 'share_sheet', added)
  res = await worker.fetch(postStats(PASSCODE), statsEnv(), ctx)
  check('worker: /stats', res.status === 200 && (await res.text()).includes('<table'), res.status)
})
