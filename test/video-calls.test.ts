/* Video calls: limits and the $40 budget, the VideoCalls object, call events and transcript, prompts, endpoints. */
import { expect, test } from 'vitest'
import { DEMOS } from '../src/demos/registry'
import { toKnowledge } from '../src/receptionist/protocol'
import { billedCost, measureUsage, maxCallCost, refusal, reservation, videoLimits, VideoCalls, GRACE_SECONDS } from '../worker/video-calls'
import { listSessions } from '../worker/napster'
import { handleVideo as handle } from '../worker/video'
import { videoPrompt, videoOpening, systemPrompt } from '../worker/prompt'
import { readEvent, showDemo, Transcript, callLength, clock, demosMentioned } from '../src/receptionist/video/events'

const knowledgeJson = toKnowledge(DEMOS)

/** One assertion. Failures are all reported, each with its name and the value that failed. */
function check(name: string, ok: boolean, detail?: unknown) {
  expect.soft(ok, ok || detail === undefined ? name : `${name}: ${JSON.stringify(detail)}`).toBe(true)
}

const knowledge = knowledgeJson as { demos: { slug: string; title: string }[] } as never
const ENV_BASE = {
  NAPSTER_API_KEY: 'test-key',
  NAPSTER_AGENT_ID: 'agent-1',
  VIDEO_BUDGET_USD: '40',
  VIDEO_CALLS_PER_DAY: '20',
  VIDEO_CALL_SECONDS: '175',
  VIDEO_PRICE_PER_MINUTE: '0.0583',
}

function limitsChecks() {
  const limits = videoLimits(ENV_BASE as unknown as Env)
  check('limits: from env', limits.budgetUsd === 40 && limits.callsPerDay === 20 && limits.maxSeconds === 175 && limits.maxConcurrent === 5, limits)
  check('limits: per-call max cost in billed minutes', Math.abs(maxCallCost(limits) - 0.0583 * 4) < 1e-9 && GRACE_SECONDS === 30, maxCallCost(limits))
  check('billing: started minutes', Math.abs(billedCost(61, 0.0583) - 0.1166) < 1e-9 && Math.abs(billedCost(180, 0.0583) - 0.1749) < 1e-9 && Math.abs(billedCost(48, 0.0583) - 0.0583) < 1e-9)
  check('limits: missing budget is 0 (off)', videoLimits({} as Env).budgetUsd === 0)
  check('limits: per visitor/network defaults', limits.perVisitorPerDay === 2 && limits.perNetworkPerDay === 6, limits)
  check('limits: per visitor/network from env', videoLimits({ ...ENV_BASE, VIDEO_CALLS_PER_VISITOR: '20', VIDEO_CALLS_PER_NETWORK: '30' } as unknown as Env).perNetworkPerDay === 30)
  check('limits: call length capped at 10 min', videoLimits({ ...ENV_BASE, VIDEO_CALL_SECONDS: '99999' } as unknown as Env).maxSeconds === 600)

  const now = Date.UTC(2026, 10, 16, 12, 0, 0)
  const today = Math.floor(now / 1000) - 3600
  const yesterday = today - 86400
  const sessions = [
    { id: 'a', status: 'closed', cost: 0.15, createdAt: yesterday },
    { id: 'b', status: 'closed', cost: 0.2, createdAt: today },
    { id: 'c', status: 'started', cost: null, createdAt: today },
    { id: 'd', status: 'closed', cost: null, createdAt: today },
    { id: 'e', status: 'failed', cost: null, createdAt: today },
  ]
  const per = maxCallCost(limits)
  const u = measureUsage(sessions, [], now, limits)
  check('usage: spent sums billed costs', Math.abs(u.spent - 0.35) < 1e-9, u)
  const runningFor = reservation(today, now, limits)
  check('usage: running call reserved for its time so far, closed-unbilled at max, failed not at all', Math.abs(u.reserved - (runningFor + per)) < 1e-9, { u, runningFor, per })
  check('usage: today excludes yesterday and failed', u.today === 3, u)
  check('usage: open counts started', u.open === 1, u)

  const recent = [
    { sessionId: 'z', endKey: 'k', visitor: 'v', network: 'n', mintedAt: now - 10_000, cutoffAt: 0, ended: false, endAttempts: 0 },
    { sessionId: 'b', endKey: 'k', visitor: 'v', network: 'n', mintedAt: now - 10_000, cutoffAt: 0, ended: false, endAttempts: 0 },
    { sessionId: 'old', endKey: 'k', visitor: 'v', network: 'n', mintedAt: now - 300_000, cutoffAt: 0, ended: false, endAttempts: 0 },
  ]
  const u2 = measureUsage(sessions, recent, now, limits)
  check('usage: adds recent unlisted calls only', Math.abs(u2.reserved - (runningFor + 2 * per)) < 1e-9 && u2.today === 4 && u2.open === 2, u2)

  check('reservation: new call is the max cost', Math.abs(reservation(now / 1000, now, limits) - per) < 1e-9)
  const tenMin = reservation(now / 1000 - 600, now, limits)
  check('reservation: grows for a call running too long', Math.abs(tenMin - 0.0583 * 11) < 1e-9, tenMin)
  const longRunning = measureUsage([{ id: 'r', status: 'started', cost: null, createdAt: Math.floor(now / 1000) - 3600 }], [], now, limits)
  check('usage: hour-long open call reserves an hour', longRunning.reserved > 3.5, longRunning)

  check('refusal: fine under limits', refusal({ spent: 1, reserved: 0, today: 0, open: 0 }, limits) === null)
  check('refusal: budget', refusal({ spent: 40 - per + 0.001, reserved: 0, today: 0, open: 0 }, limits) === 'budget')
  check('refusal: budget counts reservations', refusal({ spent: 40 - 3 * per + 0.001, reserved: 2 * per, today: 0, open: 0 }, limits) === 'budget')
  check('refusal: exactly at the edge is allowed', refusal({ spent: 40 - per - 0.0001, reserved: 0, today: 0, open: 0 }, limits) === null)
  check('refusal: daily', refusal({ spent: 0, reserved: 0, today: 20, open: 0 }, limits) === 'daily')
  check('refusal: busy', refusal({ spent: 0, reserved: 0, today: 0, open: 5 }, limits) === 'busy')
}

function eventChecks() {
  const msg = (m: Record<string, unknown>) => ({ event: 'message_received', data: { message: { type: 'message', ...m } } })
  check('event: tari delta', JSON.stringify(readEvent(msg({ role: 'assistant', action: 'delta', item_id: 'i1', content: 'Hi' }))) === JSON.stringify({ kind: 'tari', itemId: 'i1', text: 'Hi', final: false }))
  check('event: tari completed', (readEvent(msg({ role: 'assistant', action: 'completed', item_id: 'i1', content: 'Hi there' })) as { final: boolean }).final === true)
  check('event: visitor completed', JSON.stringify(readEvent(msg({ role: 'user', action: 'completed', item_id: 'u1', content: ' I run a salon ' }))) === JSON.stringify({ kind: 'visitor', itemId: 'u1', text: 'I run a salon' }))
  check('event: empty visitor ignored', readEvent(msg({ role: 'user', action: 'completed', item_id: 'u1', content: '  ' })) === null)
  check('event: session frame ignored', readEvent({ event: 'message_received', data: { message: { type: 'session' } } }) === null)
  check('event: other actions ignored', readEvent(msg({ role: 'user', action: 'speech_started' })) === null)
  const tool = readEvent({ event: 'function_implicitly_called', data: { call_id: 'c1', name: 'show_demo', arguments: '{"slug":"salon-spa-booking"}' } })
  check('event: tool with JSON-string args', JSON.stringify(tool) === JSON.stringify({ kind: 'tool', callId: 'c1', name: 'show_demo', args: { slug: 'salon-spa-booking' } }), tool)
  const tool2 = readEvent({ event: 'function_implicitly_called', data: { call_id: 'c2', name: 'show_demo', arguments: { slug: 'x' } } })
  check('event: tool with object args', (tool2 as { args: { slug: string } }).args.slug === 'x')
  check('event: idle warning', JSON.stringify(readEvent({ event: 'avatar_connection_warning', data: { disconnect_after: 30 } })) === JSON.stringify({ kind: 'idle', secondsLeft: 30 }))
  check('event: no credits ends', (readEvent({ event: 'no_credits_left', data: null }) as { reason: string }).reason === 'credits')
  check('event: junk ignored', readEvent(null) === null && readEvent({}) === null && readEvent({ event: 'talk_state_changed', data: {} }) === null)

  const ok = showDemo({ slug: 'salon-spa-booking' })
  check('showDemo: known slug', ok.demo?.slug === 'salon-spa-booking' && ok.output.shown === true)
  check('showDemo: accepts /demos/ path and case', showDemo({ slug: '/demos/Clinic-Pharmacy' }).demo?.slug === 'clinic-pharmacy')
  const bad = showDemo({ slug: 'nope' })
  check('showDemo: unknown slug lists IDs', bad.demo === null && bad.output.shown === false && Array.isArray(bad.output.ids))
  check('showDemo: missing slug', showDemo({}).demo === null)

  const item = (itemId: string, who: 'tari' | 'visitor') => ({ kind: 'item' as const, itemId, who })
  check('event: item created', JSON.stringify(readEvent(msg({ role: 'user', action: 'created', item_id: 'u9' }))) === JSON.stringify({ kind: 'item', itemId: 'u9', who: 'visitor' }))
  check('event: response created without item ignored', readEvent({ event: 'message_received', data: { message: { action: 'created', role: 'assistant', response_id: 'r' } } }) === null)
  const t = new Transcript()
  t.add(item('a1', 'tari'))
  t.add({ kind: 'tari', itemId: 'a1', text: 'Hello, ', final: false })
  t.add({ kind: 'tari', itemId: 'a1', text: 'I am Tari.', final: false })
  check('transcript: deltas join', t.caption === 'Hello, I am Tari.', t.lines)
  t.add({ kind: 'tari', itemId: 'a1', text: 'Hello, I’m Tari.', final: true })
  check('transcript: completed replaces', t.caption === 'Hello, I’m Tari.' && t.lines.length === 1)
  // Real order of events: visitor item, Tari's reply item, Tari's words, then the visitor's transcript.
  t.add(item('u1', 'visitor'))
  t.add(item('a2', 'tari'))
  t.add(item('a2', 'tari'))
  t.add({ kind: 'tari', itemId: 'a2', text: 'Great, try the salon demo.', final: true })
  check('transcript: visitor item without words is left out', t.lines.map((l) => l.who).join() === 'tari,tari', t.lines)
  t.add({ kind: 'visitor', itemId: 'u1', text: 'I run a salon' })
  check('transcript: late visitor words keep their place', t.lines.map((l) => l.itemId).join() === 'a1,u1,a2', t.lines)
  // Two visitor lines before one reply.
  t.add(item('u2', 'visitor'))
  t.add(item('u3', 'visitor'))
  t.add(item('a3', 'tari'))
  t.add({ kind: 'visitor', itemId: 'u3', text: 'In Harare' })
  t.add({ kind: 'tari', itemId: 'a3', text: 'Bye ', final: false })
  t.add({ kind: 'tari', itemId: 'a3', text: 'for now.', final: false })
  t.add({ kind: 'tari', itemId: 'a3', text: '', final: true })
  t.add({ kind: 'visitor', itemId: 'u2', text: 'Thanks' })
  check('transcript: several late lines in order', t.lines.map((l) => l.itemId).join() === 'a1,u1,a2,u2,u3,a3', t.lines)
  check('transcript: empty completed keeps the pieces', t.tariLine('a3') === 'Bye for now.' && t.caption === 'Bye for now.')
  t.add({ kind: 'visitor', itemId: 'u2', text: 'Thanks' })
  check('transcript: repeated visitor line not duplicated', t.lines.length === 6)
  // A line whose item event never came is still recorded.
  t.add({ kind: 'visitor', itemId: 'u4', text: 'One more thing' })
  check('transcript: line without item event appended', t.lines.at(-1)?.text === 'One more thing')

  const names = (t: string) => demosMentioned(t).map((d) => d.slug).join()
  check('mentioned: real reply', names('Great to meet you! For a hair salon, I’d recommend the Salon and Spa Booking demo. The link is now on your screen.') === 'salon-spa-booking')
  check('mentioned: two in order', names('Try the WhatsApp ordering catalogue, and later the inventory and point-of-sale demo.') === 'whatsapp-ordering,inventory-pos', names('Try the WhatsApp ordering catalogue, and later the inventory and point-of-sale demo.'))
  check('mentioned: without leading AI and trailing word', names('Have a look at our lead-qualification chatbot and the document assistant.') === 'ai-lead-chatbot,ai-document-assistant', names('Have a look at our lead-qualification chatbot and the document assistant.'))
  check('mentioned: before the colon', names('The website redesign shows a site made faster.') === 'website-redesign')
  check('mentioned: service names are not demo links', names('We do workflow automation, customer support and API integration.') === '', names('We do workflow automation, customer support and API integration.'))
  check('mentioned: generic words alone do not match', names('We build websites, apps and automation for any business.') === '', names('We build websites, apps and automation for any business.'))
  check('mentioned: restaurant', names('For your restaurant, the restaurant and delivery app fits best.') === 'restaurant-delivery')
  check('callLength', callLength(134) === '2 min 14 s' && callLength(9.4) === '9 s')
  check('clock', clock(161.2) === '2:42' && clock(-3) === '0:00' && clock(9) === '0:09')
}

function promptChecks() {
  const p = videoPrompt(knowledge, 175)
  check('video prompt: name and goal', p.startsWith('Your name is Tari.') && p.includes('at most 3 minutes'))
  check('video prompt: tool and no paths', p.includes('show_demo') && !p.includes('/demos/'))
  check('video prompt: every demo ID listed', (knowledgeJson as { demos: { slug: string }[] }).demos.every((d) => p.includes(`- ${d.slug} |`)))
  check('video prompt: number spoken in groups', p.includes('plus two six three, seven eight one, five seven two, zero zero eight'), p.match(/message (.*) on WhatsApp/)?.[1])
  check('video prompt: no providers named', !/cloudflare|napster|gemma|openai|azure/i.test(p))
  check('video prompt: compact', p.length < 9000, p.length)
  check('video opening: demo page', videoOpening(knowledge, 'salon-spa-booking', 180).startsWith('The visitor is looking at the Salon and spa booking demo.'))
  check('video opening: says 3 minutes for 175 s', videoOpening(knowledge, 'home', 175).includes('up to 3 minutes'))
  check('video opening: home', videoOpening(knowledge, 'nope', 175).startsWith('The visitor is on the home page.'))
  check('chat prompt still has paths', systemPrompt(knowledge, 'home').includes('/demos/ai-lead-chatbot |'))
}

/* ---- VideoCalls Durable Object with a fake Napster API ---- */

interface ApiCall { method: string; path: string; body: unknown }
/** Session numbers stay unique across fake APIs, like real IDs. */
let n = 0

function fakeNapster(opts: { sessions?: unknown[]; connectStatus?: number[]; patchStatus?: number; deleteStatus?: number; listStatus?: number; status?: string }) {
  const calls: ApiCall[] = []
  const connectStatus = [...(opts.connectStatus ?? [])]
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input instanceof Request ? input.url : input))
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    calls.push({ method, path: url.pathname + url.search, body })
    const key = (init?.headers as Record<string, string>)?.['X-Api-Key']
    if (key !== 'test-key') return new Response('{}', { status: 401 })
    if (method === 'GET' && url.pathname === '/public/sessions') {
      if (opts.listStatus) return new Response('[]', { status: opts.listStatus })
      const all = opts.sessions ?? []
      const size = Number(url.searchParams.get('pageSize'))
      const index = Number(url.searchParams.get('pageIndex'))
      return Response.json({ items: all.slice(index * size, index * size + size), totalCount: all.length })
    }
    if (method === 'GET' && url.pathname.startsWith('/public/sessions/')) return Response.json({ status: opts.status ?? 'started' })
    if (method === 'PATCH') return new Response('{}', { status: opts.patchStatus ?? 200 })
    if (method === 'POST' && url.pathname.endsWith('/connections')) {
      const status = connectStatus.shift() ?? 200
      if (status === 429) return new Response('{"code":"RequestRateLimitExceeded"}', { status: 429, headers: { 'retry-after': '0' } })
      if (status !== 200) return new Response('{"code":"ConcurrentSessionLimitReached"}', { status })
      n++
      return Response.json({ token: `tok-${n}`, connection: { id: `sess-${n}` } })
    }
    if (method === 'DELETE') {
      const status = opts.deleteStatus ?? 200
      return new Response(status === 400 ? '[{"code":"ConnectionNotFound"}]' : '{}', { status })
    }
    return new Response('{}', { status: 404 })
  }) as typeof fetch
  return calls
}

function fakeState() {
  const store = new Map<string, unknown>()
  let alarm: number | null = null
  const state = {
    storage: {
      kv: { get: (k: string) => structuredClone(store.get(k)), put: (k: string, v: unknown) => void store.set(k, structuredClone(v)), delete: (k: string) => store.delete(k) },
      setAlarm: async (t: number) => void (alarm = t),
      deleteAlarm: async () => void (alarm = null),
    },
  }
  return { state: state as unknown as DurableObjectState, store, alarm: () => alarm }
}

const input = (visitor = 'visitor-1', network = '203.0.113.9') => ({
  visitor,
  network,
  page: 'salon-spa-booking',
  pageTitle: 'Salon and spa booking demo',
  instructions: 'INSTRUCTIONS v1',
  opening: 'Greet them.',
})

async function doChecks() {
  const realFetch = globalThis.fetch
  try {
    // A normal call.
    let api = fakeNapster({})
    let f = fakeState()
    let obj = new VideoCalls(f.state, ENV_BASE as unknown as Env)
    const before = Date.now()
    const r = await obj.start(input())
    const firstSession = `sess-${n}`
    check('do: start ok', r.type === 'ok' && /^tok-\d+$/.test(r.token) && r.maxSeconds === 175 && /^[0-9a-f]{24}$/.test(r.callId) && /^[0-9a-f]{32}$/.test(r.endKey), r)
    check('do: listed, patched, connected in order', api.map((c) => c.method).join() === 'GET,PATCH,POST', api.map((c) => `${c.method} ${c.path}`))
    const patch = api.find((c) => c.method === 'PATCH')?.body as { providerSettings: { instructions: string } }
    check('do: instructions sent', patch.providerSettings.instructions === 'INSTRUCTIONS v1')
    const post = api.find((c) => c.method === 'POST')
    check('do: connection body', JSON.stringify(post?.body) === JSON.stringify({ channelType: 'webrtc', initialSpeech: 'Greet them.', tags: { source: 'website', page: 'salon-spa-booking' }, externalClientProfile: { currentPage: 'Salon and spa booking demo' } }), post?.body)
    check('do: agent path', post?.path === '/public/agents/agent-1/connections')
    const alarmAt = f.alarm()
    check('do: alarm at cut-off', alarmAt !== null && alarmAt >= before + 205_000 && alarmAt <= Date.now() + 205_000, alarmAt)

    // Same instructions: no second PATCH. Second call from same visitor allowed, third refused.
    api.length = 0
    const r2 = await obj.start(input())
    check('do: second call ok, no re-patch', r2.type === 'ok' && !api.some((c) => c.method === 'PATCH'), api.map((c) => c.method))
    api.length = 0
    const r3 = await obj.start(input())
    check('do: third call same visitor refused before any API call', r3.type === 'unavailable' && r3.reason === 'visitor' && api.length === 0, { r3, api })
    // Network limit: 6 a day across visitors (each call ended at once, so the 5-at-once limit doesn't apply).
    {
      fakeNapster({})
      const net = new VideoCalls(fakeState().state, ENV_BASE as unknown as Env)
      const results = []
      for (const v of ['n1', 'n1', 'n2', 'n2', 'n3', 'n3', 'n4']) {
        const res = await net.start(input(v, '192.0.2.50'))
        results.push(res.type === 'ok' ? 'ok' : res.reason)
        if (res.type === 'ok') await net.end(res.callId, res.endKey)
      }
      check('do: network limit 6 a day', results.join() === 'ok,ok,ok,ok,ok,ok,visitor', results)
      // Five calls running at once: the sixth is refused as busy.
      fakeNapster({})
      const busy = new VideoCalls(fakeState().state, ENV_BASE as unknown as Env)
      const open = []
      for (let i = 0; i < 6; i++) {
        const res = await busy.start(input(`b${i}`, `192.0.2.${60 + i}`))
        open.push(res.type === 'ok' ? 'ok' : res.reason)
      }
      check('do: 5 calls at once, then busy', open.join() === 'ok,ok,ok,ok,ok,busy', open)
      api = fakeNapster({})
    }

    // Changed instructions are pushed again.
    api.length = 0
    const rv2 = await obj.start({ ...input('visitor-9', '198.51.100.1'), instructions: 'INSTRUCTIONS v2' })
    check('do: changed instructions re-patched', rv2.type === 'ok' && api.some((c) => c.method === 'PATCH'), rv2)

    // End with the wrong key does nothing; right key deletes.
    if (r.type === 'ok') {
      api.length = 0
      check('do: end wrong key', (await obj.end(r.callId, 'f'.repeat(32))) === false && api.length === 0)
      check('do: end right key', (await obj.end(r.callId, r.endKey)) === true && api.some((c) => c.method === 'DELETE' && c.path === `/public/connections/${firstSession}`))
      api.length = 0
      check('do: end twice is quiet', (await obj.end(r.callId, r.endKey)) === true && api.length === 0)
    }

    // Alarm ends calls past their cut-off.
    const calls = f.store.get('calls') as Record<string, { cutoffAt: number; ended: boolean; sessionId: string }>
    for (const c of Object.values(calls)) c.cutoffAt = Date.now() - 1
    f.store.set('calls', calls)
    api.length = 0
    await obj.alarm()
    const deletes = api.filter((c) => c.method === 'DELETE').map((c) => c.path)
    check('do: alarm ends overdue calls (not the one already ended)', deletes.length === 2 && !deletes.includes(`/public/connections/${firstSession}`), deletes)
    const after = f.store.get('calls') as Record<string, { ended: boolean }>
    check('do: all calls marked ended', Object.values(after).every((c) => c.ended))
    check('do: cleanup alarm in an hour', (f.alarm() ?? 0) > Date.now() + 3_500_000)

    // The cut-off keeps trying while the call is still running, waiting longer each time.
    api = fakeNapster({ deleteStatus: 500, status: 'started' })
    f = fakeState()
    obj = new VideoCalls(f.state, ENV_BASE as unknown as Env)
    const rc = await obj.start(input())
    const overdue = () => {
      const c = f.store.get('calls') as Record<string, { cutoffAt: number; ended: boolean; endAttempts: number }>
      for (const x of Object.values(c)) x.cutoffAt = Date.now() - 1
      f.store.set('calls', c)
    }
    const waits: number[] = []
    for (let i = 0; i < 10; i++) {
      overdue()
      const t0 = Date.now()
      await obj.alarm()
      const c = Object.values(f.store.get('calls') as Record<string, { cutoffAt: number; ended: boolean }>)[0]
      waits.push(Math.round((c.cutoffAt - t0) / 1000))
      if (c.ended) break
    }
    const still = Object.values(f.store.get('calls') as Record<string, { ended: boolean }>)[0]
    check('do: cut-off never gives up on a running call', rc.type === 'ok' && !still.ended, still)
    check('do: cut-off backs off to 5 minutes', waits[0] === 15 && waits[1] === 30 && waits[2] === 60 && waits.at(-1) === 300, waits)
    api = fakeNapster({ deleteStatus: 500, status: 'closed' })
    overdue()
    await obj.alarm()
    check('do: cut-off stops once Napster says the call is over', Object.values(f.store.get('calls') as Record<string, { ended: boolean }>)[0].ended === true)

    // Budget refusal from the session list (no connection made).
    api = fakeNapster({ sessions: [{ id: 'x', status: 'closed', cost: 39.9, createdAt: 1 }] })
    f = fakeState()
    obj = new VideoCalls(f.state, ENV_BASE as unknown as Env)
    const rb = await obj.start(input())
    check('do: budget refusal, no PATCH/POST', rb.type === 'unavailable' && rb.reason === 'budget' && api.every((c) => c.method === 'GET'), { rb, api })
    // Daily refusal.
    const nowS = Math.floor(Date.now() / 1000)
    api = fakeNapster({ sessions: Array.from({ length: 20 }, (_, i) => ({ id: `s${i}`, status: 'closed', cost: 0.1, createdAt: nowS })) })
    const rd = await new VideoCalls(fakeState().state, ENV_BASE as unknown as Env).start(input())
    check('do: daily refusal', rd.type === 'unavailable' && rd.reason === 'daily', rd)
    // List failure fails closed.
    api = fakeNapster({ listStatus: 500 })
    const rl = await new VideoCalls(fakeState().state, ENV_BASE as unknown as Env).start(input())
    check('do: list failure refuses', rl.type === 'unavailable' && rl.reason === 'error' && !api.some((c) => c.method === 'POST'), rl)
    // 409 from Napster -> busy. 429 once -> retried.
    api = fakeNapster({ connectStatus: [409] })
    const r409 = await new VideoCalls(fakeState().state, ENV_BASE as unknown as Env).start(input())
    check('do: 409 is busy', r409.type === 'unavailable' && r409.reason === 'busy', r409)
    api = fakeNapster({ connectStatus: [429, 200] })
    const r429 = await new VideoCalls(fakeState().state, ENV_BASE as unknown as Env).start(input())
    check('do: 429 retried once', r429.type === 'ok' && api.filter((c) => c.method === 'POST').length === 2, r429)
    // PATCH failure doesn't block the call and is retried next time.
    api = fakeNapster({ patchStatus: 500 })
    f = fakeState()
    obj = new VideoCalls(f.state, ENV_BASE as unknown as Env)
    const rp = await obj.start(input())
    api.length = 0
    await obj.start(input('visitor-5'))
    check('do: patch failure still calls and retries', rp.type === 'ok' && api.some((c) => c.method === 'PATCH'), rp)
    // Off without key / agent / budget.
    for (const env of [{ ...ENV_BASE, NAPSTER_API_KEY: '' }, { ...ENV_BASE, NAPSTER_AGENT_ID: '' }, { ...ENV_BASE, VIDEO_BUDGET_USD: '0' }]) {
      api = fakeNapster({})
      const off = await new VideoCalls(fakeState().state, env as unknown as Env).start(input())
      check('do: off when not configured', off.type === 'unavailable' && off.reason === 'off' && api.length === 0, off)
    }
    // Two starts at the same moment are handled one after the other.
    api = fakeNapster({ sessions: Array.from({ length: 19 }, (_, i) => ({ id: `s${i}`, status: 'closed', cost: 0.1, createdAt: nowS })) })
    obj = new VideoCalls(fakeState().state, ENV_BASE as unknown as Env)
    const [p1, p2] = await Promise.all([obj.start(input('va', '198.51.100.7')), obj.start(input('vb', '198.51.100.8'))])
    check('do: concurrent starts cannot both take the last call', [p1.type, p2.type].sort().join() === 'ok,unavailable', [p1, p2])
    // DELETE "already ended" is fine.
    api = fakeNapster({ deleteStatus: 400 })
    obj = new VideoCalls(fakeState().state, ENV_BASE as unknown as Env)
    const rr = await obj.start(input())
    if (rr.type === 'ok') check('do: ConnectionNotFound on end is fine', (await obj.end(rr.callId, rr.endKey)) === true)
  } finally {
    globalThis.fetch = realFetch
  }
}

async function listChecks() {
  const realFetch = globalThis.fetch
  try {
    const many = Array.from({ length: 250 }, (_, i) => ({ id: `s${i}`, status: 'closed', cost: 0.01, createdAt: 1 }))
    const api = fakeNapster({ sessions: many })
    const listed = await listSessions('test-key')
    check('list: pages by total count', listed.length === 250 && api.filter((c) => c.path.startsWith('/public/sessions?')).length === 3, listed.length)
    globalThis.fetch = (async () => Response.json({ items: [{ id: 'a', status: 'closed', cost: 0.1, createdAt: 1 }], totalCount: 5 })) as typeof fetch
    let threw = ''
    try {
      await listSessions('test-key')
    } catch (e) {
      threw = (e as Error).message
    }
    check('list: throws when pages run out before the total', threw.includes('IncompleteSessionList') || threw.includes('TooManySessionPages'), threw)
    globalThis.fetch = (async () => Response.json({ items: [] })) as typeof fetch
    threw = ''
    try {
      await listSessions('test-key')
    } catch (e) {
      threw = (e as Error).message
    }
    check('list: throws without a total count', threw.includes('MalformedSessionList'), threw)
    globalThis.fetch = (async () => Response.json({ items: [{ id: 'a', status: 'closed', cost: null }], totalCount: 1 })) as typeof fetch
    const now = Date.UTC(2026, 10, 16, 12)
    const [one] = await listSessions('test-key', now)
    check('list: unknown creation time counts as now', one.createdAt === now / 1000, one)
  } finally {
    globalThis.fetch = realFetch
  }
}

async function handlerChecks() {
  const ORIGIN = 'https://studio.example'
  const seen: unknown[] = []
  const ns = {
    calls: { getByName: () => ({ start: async (i: unknown) => (seen.push(i), { type: 'ok', token: 't', callId: 'c', endKey: 'k', maxSeconds: 180 }), end: async () => true }) },
    limiter: { getByName: () => ({ allow: async () => true }) },
  } as never
  const env = { ...ENV_BASE, ASSETS: { fetch: async () => Response.json(knowledgeJson) } } as unknown as Env
  const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    new Request(ORIGIN + path, { method: 'POST', headers: { origin: ORIGIN, 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.9', ...headers }, body: JSON.stringify(body) })
  const counted: string[] = []
  const handleVideo = (req: Request, e: Env, path: string, n: Parameters<typeof handle>[3]) => handle(req, e, path, n, (event) => void counted.push(event))
  let res = await handleVideo(post('/api/video/start', { page: 'salon-spa-booking', visitor: 'visitor1234' }, { origin: 'https://evil.example' }), env, '/api/video/start', ns)
  check('handler: other origin 403', res.status === 403)
  check('counts: a rejected request counts nothing', counted.length === 0, counted)
  res = await handleVideo(post('/api/video/start', { page: 'salon-spa-booking', visitor: 'visitor1234' }), env, '/api/video/start', ns)
  check('counts: a started call', counted.join() === 'video_started', counted)
  const body = await res.json()
  const sent = seen[0] as { visitor: string; network: string; page: string; pageTitle: string; instructions: string; opening: string }
  check('handler: start ok', res.status === 200 && body.type === 'ok', body)
  check('handler: passes page, title, visitor, network', sent.page === 'salon-spa-booking' && sent.pageTitle === 'Salon and spa booking demo' && sent.visitor === 'visitor1234' && sent.network === '203.0.113.9', sent)
  check('handler: instructions are the video prompt', sent.instructions.startsWith('Your name is Tari.') && sent.opening.includes('Salon and spa booking'))
  seen.length = 0
  await handleVideo(post('/api/video/start', { page: '../x', visitor: 'bad id' }), env, '/api/video/start', ns)
  const sent2 = seen[0] as { visitor: string; page: string }
  check('handler: bad page/visitor sanitised', sent2.page === 'home' && sent2.visitor === '203.0.113.9', sent2)
  res = await handleVideo(post('/api/video/end', { callId: 'x', endKey: 'y' }), env, '/api/video/end', ns)
  check('handler: end validates ids', res.status === 400)
  res = await handleVideo(post('/api/video/end', { callId: 'a'.repeat(24), endKey: 'b'.repeat(32) }), env, '/api/video/end', ns)
  check('handler: end ok', res.status === 200 && (await res.json()).ok === true)
  counted.length = 0
  res = await handleVideo(post('/api/video/end', { callId: 'a'.repeat(24), endKey: 'b'.repeat(32) }), env, '/api/video/end', ns)
  check('counts: ending a call counts nothing', counted.length === 0, counted)
  const limited = { ...ns as object, limiter: { getByName: () => ({ allow: async () => false }) } } as never
  res = await handleVideo(post('/api/video/start', { page: 'home', visitor: 'visitor1234' }), env, '/api/video/start', limited)
  check('handler: network flood limited', (await res.json()).reason === 'visitor')
  check('counts: a refused call, by reason', counted.join() === 'video_refused_visitor', counted)
  counted.length = 0
  const full = { ...ns as object, calls: { getByName: () => ({ start: async () => ({ type: 'unavailable', reason: 'budget' }) }) } } as never
  res = await handleVideo(post('/api/video/start', { page: 'home', visitor: 'visitor1234' }), env, '/api/video/start', full)
  check('handler: budget refusal passed on', (await res.json()).reason === 'budget')
  check('counts: budget refusal', counted.join() === 'video_refused_budget', counted)
  counted.length = 0
  const broken = { ...ns as object, calls: { getByName: () => ({ start: async () => { throw new Error('down') } }) } } as never
  res = await handleVideo(post('/api/video/start', { page: 'home', visitor: 'visitor1234' }), env, '/api/video/start', broken)
  check('counts: a failed start', (await res.json()).reason === 'error' && counted.join() === 'video_refused_error', counted)
}

test('limits and budget', limitsChecks)
test('call events and transcript', eventChecks)
test('call instructions', promptChecks)
test('VideoCalls object', doChecks)
test('session list', listChecks)
test('video endpoints', handlerChecks)
