/* The AI receptionist: Worker request handling and limits, stream conversion, saved answers, chat helpers. */
import { expect, test } from 'vitest'
import { DEMOS } from '../src/demos/registry'
import { toKnowledge } from '../src/receptionist/protocol'
import { failureReason, handleReceptionist, parseRequest } from '../worker/receptionist'
import { networkKey } from '../worker/http'
import { replyStream, thinkFilter } from '../worker/stream'
import { systemPrompt } from '../worker/prompt'
import worker from '../worker/index'
import { ChatLimiter } from '../worker/limiter'
import { fallbackReply, suggestedDemos } from '../src/receptionist/fallback'
import {
  cleanReply,
  greeting,
  replyParts,
  spokenText,
  toTurns,
  whatsappSummary,
  type ChatMessage,
} from '../src/receptionist/chat'
import { askReceptionist } from '../src/receptionist/api'

const knowledgeJson = toKnowledge(DEMOS)

/** One assertion. Failures are all reported, each with its name and the value that failed. */
function check(name: string, ok: boolean, detail?: unknown) {
  expect.soft(ok, ok || detail === undefined ? name : `${name}: ${JSON.stringify(detail)}`).toBe(true)
}

const enc = new TextEncoder()
function sse(chunks: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(c) {
      for (const ch of chunks) c.enqueue(enc.encode(ch))
      c.close()
    },
  })
}
async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  return await new Response(stream).text()
}
const events = (text: string) => text.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
const joined = (evs: { type: string; text?: string }[]) => evs.filter((e) => e.type === 'delta').map((e) => e.text).join('')

async function streamChecks() {
  // Chat-completions chunks split mid-line and mid-JSON, with a [DONE] marker.
  const a = 'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'
  const b = 'data: {"choices":[{"delta":{"content":" there"}}]}\n\ndata: [DONE]\n\n'
  const parts = [a.slice(0, 17), a.slice(17), b.slice(0, 30), b.slice(30)]
  let evs = events(await readAll(sse(parts).pipeThrough(replyStream())))
  check('stream: joins split chunks', joined(evs) === 'Hello there', evs)
  check('stream: ends with done', evs[evs.length - 1].type === 'done', evs)

  // Older {response} format and leading whitespace.
  evs = events(await readAll(sse(['data: {"response":"\\n\\n  Hi"}\n', 'data: {"response":" you"}\n']).pipeThrough(replyStream())))
  check('stream: response format + trims leading space', joined(evs) === 'Hi you', evs)

  // reasoning_content is never shown.
  evs = events(
    await readAll(
      sse(['data: {"choices":[{"delta":{"reasoning_content":"secret plan"}}]}\n', 'data: {"choices":[{"delta":{"content":"Answer"}}]}\n']).pipeThrough(replyStream()),
    ),
  )
  check('stream: hides reasoning_content', joined(evs) === 'Answer', evs)

  // <think> blocks across chunks.
  evs = events(
    await readAll(
      sse([
        'data: {"choices":[{"delta":{"content":"<thi"}}]}\n',
        'data: {"choices":[{"delta":{"content":"nk>hmm</th"}}]}\n',
        'data: {"choices":[{"delta":{"content":"ink>Real answer"}}]}\n',
      ]).pipeThrough(replyStream()),
    ),
  )
  check('stream: strips think tags across chunks', joined(evs) === 'Real answer', evs)

  // Error event.
  evs = events(await readAll(sse(['data: {"choices":[{"delta":{"content":"Part"}}]}\n', 'data: {"error":"boom"}\n']).pipeThrough(replyStream())))
  check('stream: error event ends with error', evs[evs.length - 1].type === 'error' && !evs.some((e) => e.type === 'done'), evs)

  // Nothing said.
  evs = events(await readAll(sse(['data: [DONE]\n']).pipeThrough(replyStream())))
  check('stream: empty reply is an error', evs.length === 1 && evs[0].type === 'error', evs)

  // Text with '<' that isn't a think tag survives.
  const f = thinkFilter()
  const out = f.push('Price < budget <') + f.push('3 weeks') + f.flush()
  check('thinkFilter: keeps ordinary < characters', out === 'Price < budget <3 weeks', out)
}

function parseChecks() {
  const first = parseRequest(JSON.stringify({ messages: [{ role: 'user', content: 'Hi' }, { role: 'user', content: 'there' }] }))
  check('parse: one visitor turn is the first message', first?.first === true, first)
  const later = parseRequest(JSON.stringify({ messages: [{ role: 'assistant', content: 'From a call' }, { role: 'user', content: 'Hi' }] }))
  check('parse: anything before it means not the first', later?.first === false, later)
  const ok = parseRequest(JSON.stringify({ messages: [{ role: 'user', content: ' Hi ' }], page: 'home', visitor: 'abcdefgh12' }))
  check('parse: valid', ok?.messages.length === 1 && ok.messages[0].content === 'Hi' && ok.visitor === 'abcdefgh12', ok)
  const merged = parseRequest(
    JSON.stringify({
      messages: [
        { role: 'assistant', content: 'Greeting' },
        { role: 'user', content: 'a' },
        { role: 'user', content: 'b' },
        { role: 'assistant', content: 'c' },
        { role: 'user', content: 'd' },
      ],
    }),
  )
  check(
    'parse: drops leading assistant, merges repeats',
    JSON.stringify(merged?.messages) === JSON.stringify([{ role: 'user', content: 'a\nb' }, { role: 'assistant', content: 'c' }, { role: 'user', content: 'd' }]),
    merged,
  )
  check('parse: last must be user', parseRequest(JSON.stringify({ messages: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }] })) === null)
  check('parse: rejects system role', parseRequest(JSON.stringify({ messages: [{ role: 'system', content: 'x' }, { role: 'user', content: 'a' }] })) === null)
  check('parse: rejects long message', parseRequest(JSON.stringify({ messages: [{ role: 'user', content: 'x'.repeat(501) }] })) === null)
  check(
    'parse: rejects a long message split into several',
    parseRequest(JSON.stringify({ messages: Array.from({ length: 30 }, () => ({ role: 'user', content: 'x'.repeat(500) })) })) === null,
  )
  const big = parseRequest(
    JSON.stringify({
      messages: Array.from({ length: 11 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: (i % 2 ? 'a' : 'u').repeat(i % 2 ? 1490 : 400) + i })),
    }),
  )
  const bigSize = big ? big.messages.reduce((n, t) => n + t.content.length, 0) : -1
  check('parse: history trimmed to 5,000 characters, starting with user', !!big && bigSize <= 5000 && big.messages[0].role === 'user' && big.messages.at(-1)?.role === 'user', { bigSize, n: big?.messages.length })
  check('parse: rejects empty message', parseRequest(JSON.stringify({ messages: [{ role: 'user', content: '   ' }] })) === null)
  check('parse: rejects no messages', parseRequest(JSON.stringify({ messages: [] })) === null)
  check('parse: rejects bad json', parseRequest('{nope') === null)
  const odd = parseRequest(JSON.stringify({ messages: [{ role: 'user', content: 'a' }], page: '../etc', visitor: 'x y' }))
  check('parse: sanitises page and visitor', odd?.page === 'home' && odd.visitor === '', odd)
  const long = parseRequest(
    JSON.stringify({ messages: Array.from({ length: 25 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}` })) }),
  )
  check('parse: keeps at most 10, starting with user', !!long && long.messages.length <= 10 && long.messages[0].role === 'user' && long.messages.at(-1)?.content === 'm24', long)
}

type RunCall = { model: string; inputs: Record<string, unknown> }

function makeEnv(opts: {
  run?: (model: string, inputs: Record<string, unknown>) => Promise<ReadableStream<Uint8Array>>
  visitorOk?: boolean
  networkOk?: boolean
  limiterThrows?: boolean
  allowChoice?: boolean
  calls?: RunCall[]
  limitKeys?: string[]
}) {
  const calls = opts.calls ?? []
  return {
    AI: {
      run: async (model: string, inputs: Record<string, unknown>) => {
        calls.push({ model, inputs })
        if (opts.run) return opts.run(model, inputs)
        return sse(['data: {"choices":[{"delta":{"content":"Sure."}}]}\n', 'data: [DONE]\n'])
      },
    },
    ASSETS: {
      fetch: async (input: RequestInfo | URL) => {
        const url = String(input instanceof Request ? input.url : input)
        if (url.endsWith('/receptionist-knowledge.json')) return Response.json(knowledgeJson)
        return new Response('asset', { status: 200 })
      },
    },
    AI_MODEL: '@cf/google/gemma-4-26b-a4b-it',
    ALLOW_MODEL_CHOICE: opts.allowChoice ? 'true' : 'false',
  } as unknown as Env
}

/** Stand-in for ctx.exports.ChatLimiter. */
function makeLimiter(opts: { visitorOk?: boolean; networkOk?: boolean; limiterThrows?: boolean; limitKeys?: string[] }) {
  return {
    getByName: (name: string) => ({
      allow: async (limit: number, perDay: number) => {
        opts.limitKeys?.push(`${name}@${limit}/${perDay}`)
        if (opts.limiterThrows) throw new Error('limiter down')
        return name.startsWith('visitor:') ? (opts.visitorOk ?? true) : (opts.networkOk ?? true)
      },
    }),
  } as unknown as DurableObjectNamespace<ChatLimiter>
}

type Opts = Parameters<typeof makeEnv>[0] & Parameters<typeof makeLimiter>[0] & { counted?: string[] }
const handle = (req: Request, opts: Opts) =>
  handleReceptionist(req, makeEnv(opts), makeLimiter(opts), (event) => void opts.counted?.push(event))

const ORIGIN = 'https://studio.example'
function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request(`${ORIGIN}/api/receptionist`, {
    method: 'POST',
    headers: { origin: ORIGIN, 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.9', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}
const goodBody = { messages: [{ role: 'user', content: 'What do you build?' }], page: 'salon-spa-booking', visitor: 'visitor1234' }

async function handlerChecks() {
  let res = await handle(new Request(`${ORIGIN}/api/receptionist`, { method: 'GET', headers: { origin: ORIGIN } }), ({}))
  check('handler: GET is 405', res.status === 405 && res.headers.get('allow') === 'POST', res.status)
  res = await handle(post(goodBody, { origin: 'https://evil.example' }), ({}))
  check('handler: other origin is 403', res.status === 403, res.status)
  res = await handle(
    new Request(`${ORIGIN}/api/receptionist`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(goodBody) }),
    ({}),
  )
  check('handler: missing origin is 403', res.status === 403, res.status)
  res = await handle(post(goodBody, { 'content-type': 'text/plain' }), ({}))
  check('handler: text/plain is 415', res.status === 415, res.status)
  res = await handle(post({ messages: [{ role: 'user', content: 'x'.repeat(400) }], pad: 'y'.repeat(17000) }), ({}))
  check('handler: big body is 413', res.status === 413, res.status)
  res = await handle(post({ messages: [] }), ({}))
  check('handler: bad body is 400', res.status === 400, res.status)

  res = await handle(post(goodBody), ({ visitorOk: false }))
  let body = await res.json()
  check('handler: visitor limit is 429 fallback', res.status === 429 && body.type === 'fallback' && body.reason === 'limited', body)
  res = await handle(post(goodBody), ({ networkOk: false }))
  body = await res.json()
  check('handler: network limit is 429 fallback', res.status === 429 && body.reason === 'limited', body)

  const keys: string[] = []
  await handle(post({ ...goodBody, visitor: undefined }), ({ limitKeys: keys }))
  check('handler: no visitor id falls back to network key', keys.includes('visitor:203.0.113.9@8/40') && keys.includes('network:203.0.113.9@30/150'), keys)
  keys.length = 0
  await handle(post(goodBody), { limitKeys: keys })
  check('handler: visitor key used', keys.includes('visitor:visitor1234@8/40'), keys)
  keys.length = 0
  await handle(post(goodBody), { limitKeys: keys, visitorOk: false })
  check('handler: refused visitor does not use the network count', keys.length === 1 && keys[0].startsWith('visitor:'), keys)
  keys.length = 0
  await handle(post(goodBody, { 'cf-connecting-ip': '2001:db8:abcd:12:1:2:3:4' }), { limitKeys: keys })
  check('handler: IPv6 grouped by /64', keys.includes('network:2001:db8:abcd:12::/64@30/150'), keys)

  const outageCalls: RunCall[] = []
  let counted: string[] = []
  res = await handle(post(goodBody), ({ limiterThrows: true, calls: outageCalls, counted }))
  body = await res.json()
  check('handler: limiter outage gives saved answers, no AI call', res.status === 200 && body.reason === 'busy' && outageCalls.length === 0, body)
  check('counts: limiter outage', counted.join() === 'chat_started,saved_busy', counted)

  counted = []
  res = await handle(
    post(goodBody),
    ({
      run: async () => {
        throw new Error('4006: you have used up your daily free allocation of 10,000 neurons')
      },
      counted,
    }),
  )
  body = await res.json()
  check('handler: quota error is fallback quota', res.status === 200 && body.reason === 'quota', body)
  check('counts: quota', counted.join() === 'chat_started,saved_quota', counted)

  counted = []
  await handle(post(goodBody), { visitorOk: false, counted })
  check('counts: a limited message is not a saved answer', counted.join() === 'chat_started', counted)
  counted = []
  await handle(post({ ...goodBody, messages: [{ role: 'user', content: 'Hi' }, { role: 'assistant', content: 'Hello' }, { role: 'user', content: 'Prices?' }] }), { counted })
  check('counts: a later message is a reply, not a new chat', counted.join() === 'ai_reply', counted)
  counted = []
  await handle(post(goodBody), { counted })
  check('counts: first message starts a chat', counted.join() === 'chat_started,ai_reply', counted)
  counted = []
  await handle(post({ messages: [] }), { counted })
  check('counts: bad request counts nothing', counted.length === 0, counted)
  res = await handle(
    post(goodBody),
    ({
      run: async () => {
        throw new Error('3040: Capacity temporarily exceeded')
      },
    }),
  )
  body = await res.json()
  check('handler: capacity error is fallback busy', body.reason === 'busy', body)
  res = await handle(
    post(goodBody),
    ({
      run: async () => {
        throw new Error('something odd')
      },
    }),
  )
  body = await res.json()
  check('handler: other error is fallback error', body.reason === 'error', body)

  const calls: RunCall[] = []
  res = await handle(post(goodBody), ({ calls }))
  const text = await res.text()
  check('handler: streams ndjson', res.status === 200 && joined(events(text)) === 'Sure.' && events(text).at(-1).type === 'done', text)
  check('handler: no-store', res.headers.get('cache-control') === 'no-store')
  check('handler: production hides the model', res.headers.get('x-receptionist-model') === null)
  const call = calls[0]
  const msgs = call.inputs.messages as { role: string; content: string }[]
  check('handler: default model', call.model === '@cf/google/gemma-4-26b-a4b-it', call.model)
  check('handler: thinking off', JSON.stringify(call.inputs.chat_template_kwargs) === '{"enable_thinking":false}', call.inputs)
  check('handler: system prompt first', msgs[0].role === 'system' && msgs[1].content === 'What do you build?', msgs)
  check('handler: page context in prompt', msgs[0].content.includes('The visitor is on the Salon and spa booking demo page') && msgs[0].content.includes('/demos/salon-spa-booking). Estimated'), msgs[0].content.slice(-300))
  check('handler: all demos in prompt', (knowledgeJson as { demos: { slug: string }[] }).demos.every((d) => msgs[0].content.includes(`/demos/${d.slug} |`)))

  // Unknown page falls back to home.
  calls.length = 0
  await handle(post({ ...goodBody, page: 'not-a-demo' }), ({ calls }))
  const sys = (calls[0].inputs.messages as { content: string }[])[0].content
  check('handler: unknown page treated as home', sys.endsWith('The visitor is on the home page.'), sys.slice(-80))

  // Model choice only on previews.
  calls.length = 0
  await handle(post({ ...goodBody, model: '@cf/zai-org/glm-4.7-flash' }), ({ calls }))
  check('handler: model choice ignored in production', calls[0].model === '@cf/google/gemma-4-26b-a4b-it', calls[0].model)
  calls.length = 0
  res = await handle(post({ ...goodBody, model: '@cf/zai-org/glm-4.7-flash' }), ({ calls, allowChoice: true }))
  check('handler: model choice on previews', calls[0].model === '@cf/zai-org/glm-4.7-flash', calls[0].model)
  check('handler: previews show the model', res.headers.get('x-receptionist-model') === '@cf/zai-org/glm-4.7-flash')
  calls.length = 0
  await handle(post({ ...goodBody, model: '@cf/moonshotai/kimi-k2.6' }), ({ calls, allowChoice: true }))
  check('handler: model outside list refused', calls[0].model === '@cf/google/gemma-4-26b-a4b-it', calls[0].model)
  calls.length = 0
  await handle(post({ ...goodBody, model: 'toString' }), ({ calls, allowChoice: true }))
  check('handler: inherited key refused as model', calls[0].model === '@cf/google/gemma-4-26b-a4b-it', calls[0].model)

  // Worker routing.
  res = await worker.fetch(new Request(`${ORIGIN}/api/other`), makeEnv({}), { exports: { ChatLimiter: makeLimiter({}) } } as unknown as ExecutionContext)
  check('worker: unknown api is 404 json', res.status === 404 && (await res.json()).error === 'not_found')
  res = await worker.fetch(new Request(`${ORIGIN}/`), makeEnv({}), { exports: { ChatLimiter: makeLimiter({}) } } as unknown as ExecutionContext)
  check('worker: other paths go to assets', (await res.text()) === 'asset')

  check('failureReason: quota', failureReason(new Error('InferenceUpstreamError: 4006')) === 'quota')
  check('failureReason: busy', failureReason(new Error('429 Too Many Requests')) === 'busy')
}

function fakeState() {
  const store = new Map<string, unknown>()
  const alarms: number[] = []
  const state = {
    storage: {
      kv: { get: (k: string) => store.get(k), put: (k: string, v: unknown) => void store.set(k, v), delete: (k: string) => store.delete(k) },
      setAlarm: async (t: number) => void alarms.push(t),
      deleteAll: async () => store.clear(),
    },
  }
  return { state: state as unknown as DurableObjectState, store, alarms }
}

async function limiterChecks() {
  const start = Date.UTC(2026, 10, 16, 23, 58, 0)
  let f = fakeState()
  let obj = new ChatLimiter(f.state, {} as Env)
  let now = start
  const results: boolean[] = []
  for (let i = 0; i < 10; i++) results.push(obj.allow(8, 100, now))
  check('limiter: allows 8 a minute then refuses', results.filter(Boolean).length === 8 && !results[8] && !results[9], results)
  check('limiter: alarm set for after midnight UTC', f.alarms.length === 1 && new Date(f.alarms[0]).toISOString() === '2026-11-17T00:01:00.000Z', f.alarms.map((t) => new Date(t).toISOString()))
  now += 59_999
  check('limiter: still refuses inside the minute', obj.allow(8, 100, now) === false)
  now += 2
  check('limiter: allows again after the minute', obj.allow(8, 100, now) === true)
  check('limiter: day count stored', (f.store.get('day') as { count: number }).count === 9, f.store.get('day'))

  // Daily cap, across evictions (a new object instance with the same storage).
  f = fakeState()
  now = Date.UTC(2026, 10, 16, 10, 0, 0)
  let allowed = 0
  for (let i = 0; i < 50; i++) {
    if (i % 5 === 0) obj = new ChatLimiter(f.state, {} as Env)
    if (obj.allow(100, 20, now)) allowed++
    now += 61_000
  }
  check('limiter: daily cap holds across evictions', allowed === 20, allowed)
  now = Date.UTC(2026, 10, 17, 0, 0, 30)
  check('limiter: new UTC day starts fresh', obj.allow(100, 20, now) === true)
  check('limiter: one alarm per day', f.alarms.length === 2, f.alarms.length)
  await obj.alarm()
  check('limiter: alarm clears storage', f.store.size === 0)

  const other = new ChatLimiter(fakeState().state, {} as Env)
  check('limiter: refused calls are not counted', [1, 2, 3].map(() => other.allow(1, 100, start)).join() === 'true,false,false')
  check('limiter: frees up after the minute', other.allow(1, 100, start + 60_001) === true)
}

function networkKeyChecks() {
  check('networkKey: IPv4 unchanged', networkKey('203.0.113.9') === '203.0.113.9')
  check('networkKey: IPv6 full', networkKey('2001:0db8:abcd:0012:0001:0002:0003:0004') === '2001:db8:abcd:12::/64', networkKey('2001:0db8:abcd:0012:0001:0002:0003:0004'))
  check('networkKey: IPv6 compressed tail', networkKey('2001:db8:abcd:12::1') === '2001:db8:abcd:12::/64', networkKey('2001:db8:abcd:12::1'))
  check('networkKey: IPv6 compressed head', networkKey('2001:db8::5') === '2001:db8:0:0::/64', networkKey('2001:db8::5'))
  check('networkKey: same /64 same key', networkKey('2c0f:f8f0:1:2:aaaa::1') === networkKey('2c0f:f8f0:1:2:bbbb:cccc:dddd:eeee'))
  check('networkKey: IPv4-mapped', networkKey('::ffff:203.0.113.9') === '203.0.113.9', networkKey('::ffff:203.0.113.9'))
  check('networkKey: unknown', networkKey('unknown') === 'unknown')
}

function promptChecks() {
  const p = systemPrompt(knowledgeJson as never, 'home')
  check('prompt: names Tari and AI', p.startsWith('You are Tari') && p.includes('You are an AI, not a person'))
  check('prompt: no prices rule', p.includes('doesn’t publish prices'))
  check('prompt: has WhatsApp number', p.includes('+263 781 572 008'))
  check('prompt: has founder', p.includes('Evans Musitu'))
  check('prompt: names no providers', !/cloudflare|gemma|google|workers/i.test(p) && p.includes('Don’t name any outside companies'))
  const words = p.split(/\s+/).length
  check('prompt: compact (under 1,500 words)', words < 1500, words)
}

function fallbackChecks() {
  const r = (t: string, page = 'home') => fallbackReply(t, page)
  check('fallback: greeting', r('Hi!').includes('I’m Tari'))
  check('fallback: shona greeting', r('Mhoro').includes('I’m Tari'))
  check('fallback: price', r('How much does a chatbot cost?').includes('don’t publish fixed prices'))
  check('fallback: price with $', r('is it under $500').includes('don’t publish fixed prices'))
  check('fallback: price on demo page adds timeline', r('what is the price', 'salon-spa-booking').includes('Salon and spa booking usually takes'), r('what is the price', 'salon-spa-booking'))
  check('fallback: are you a bot', r('are you a real person?').startsWith('I’m an AI receptionist'))
  check('fallback: talk to human', r('can I talk to a human').includes('+263 781 572 008'))
  check('fallback: AI agent is not a handoff', !r('do you build AI agents for support').startsWith('Of course'), r('do you build AI agents for support'))
  check('fallback: timeline on demo page', r('how long would it take?', 'clinic-pharmacy').includes('We estimate'), r('how long would it take?', 'clinic-pharmacy'))
  check('fallback: restaurant demo', r('I run a restaurant in Harare').includes('/demos/restaurant-delivery') || r('I own a restaurant').includes('/demos/restaurant-delivery'), r('I own a restaurant'))
  check('fallback: salon demo', r('I have a hair salon').includes('/demos/salon-spa-booking'), r('I have a hair salon'))
  check('fallback: two demos max', suggestedDemos('salon restaurant clinic shop').length === 2)
  check('fallback: founder', r('who is the founder?').includes('Evans Musitu'))
  check('fallback: services', r('what services do you offer?').startsWith('We build websites'), r('what services do you offer?'))
  check('fallback: thanks', r('thanks!').startsWith('You’re welcome'))
  check('fallback: unknown', r('qwerty').startsWith('I can answer questions'))
  check('fallback: whatsapp ordering is a demo, not handoff', r('I want whatsapp ordering for my shop').includes('/demos/'), r('I want whatsapp ordering for my shop'))
}

function chatChecks() {
  const parts = replyParts('Try /demos/salon-spa-booking or /demos/nope today.')
  check('replyParts: links known demos only', parts.length === 3 && parts[1].kind === 'demo' && parts[2].kind === 'text' && (parts[2] as { text: string }).text.includes('/demos/nope'), parts)
  check('cleanReply: strips markdown', cleanReply('**Hi** there\n- one\n# Head\n`x`') === 'Hi there\n• one\nHead\nx', cleanReply('**Hi** there\n- one\n# Head\n`x`'))
  check('cleanReply: markdown link to path', cleanReply('See [the salon demo](/demos/salon-spa-booking).') === 'See the salon demo (/demos/salon-spa-booking).')
  const spoken = spokenText('Try the Salon and spa booking (/demos/salon-spa-booking). Or /demos/clinic-pharmacy.')
  check('spokenText: paths become names', !spoken.includes('/demos') && spoken.includes('Clinic and pharmacy') && !spoken.includes(' .') , spoken)
  const msgs: ChatMessage[] = [
    greeting('home'),
    { id: 'u1', role: 'user', text: 'Hi' },
    { id: 'a1', role: 'assistant', text: 'Hello', source: 'ai' },
    { id: 'n1', role: 'note', text: 'note' },
    { id: 'u2', role: 'user', text: 'Price?' },
  ]
  const turns = toTurns(msgs)
  check('toTurns: drops greeting and notes', JSON.stringify(turns) === JSON.stringify([{ role: 'user', content: 'Hi' }, { role: 'assistant', content: 'Hello' }, { role: 'user', content: 'Price?' }]), turns)
  const summary = whatsappSummary(msgs, 'salon-spa-booking')
  check('whatsappSummary: has demo and questions', summary.includes('"Salon and spa booking" demo') && summary.includes('- Hi\n- Price?'), summary)
  check('whatsappSummary: no questions', !whatsappSummary([greeting('home')], 'home').includes('What I asked'))
  check('greeting: demo page', greeting('inventory-pos').text.includes('Inventory'), greeting('inventory-pos').text)
  // Lines from a video call: several in a row from one side are joined, and kept within the limit.
  const call: ChatMessage[] = [
    { id: 'n', role: 'note', text: 'Video call with Tari · 2 min' },
    { id: 'c1', role: 'assistant', text: 'Hello, I am Tari.', source: 'ai', fromCall: true },
    { id: 'c2', role: 'user', text: 'x'.repeat(299), fromCall: true },
    { id: 'c3', role: 'user', text: 'y'.repeat(249), fromCall: true },
    { id: 'c4', role: 'assistant', text: 'Try the salon demo.', source: 'ai', fromCall: true },
    { id: 'c5', role: 'assistant', text: 'It takes 3 to 5 weeks.', source: 'ai', fromCall: true },
    { id: 'u9', role: 'user', text: 'And the price?' },
  ]
  const callTurns = toTurns(call)
  check('toTurns: joins same-side lines', callTurns.map((t) => t.role).join() === 'assistant,user,assistant,user', callTurns.map((t) => t.role))
  check('toTurns: joined visitor turn within 500', callTurns[1].content.length <= 500 && callTurns[1].content.endsWith('y'.repeat(200)), callTurns[1].content.length)
  check('toTurns: joined reply keeps both', callTurns[2].content === 'Try the salon demo.\nIt takes 3 to 5 weeks.')
  const parsed = parseRequest(JSON.stringify({ messages: callTurns, page: 'home', visitor: 'visitor1234' }))
  check('toTurns: the Worker accepts the joined history', parsed !== null && parsed.messages.at(-1)?.content === 'And the price?')
  const wa = whatsappSummary(
    [
      { id: 'q', role: 'user', text: 'Do you build booking systems?' },
      { id: 'c1', role: 'user', text: 'Okay thanks', fromCall: true },
      { id: 'c2', role: 'user', text: 'I run a hair salon in Harare with three chairs', fromCall: true },
    ],
    'home',
  )
  check('whatsappSummary: typed and spoken parts, no filler', wa.includes('talking with Tari') && wa.includes('What I asked:\n- Do you build booking systems?') && wa.includes('On the video call I said:\n- I run a hair salon in Harare with three chairs') && !wa.includes('Okay thanks'), wa)
}

async function apiChecks() {
  const realFetch = globalThis.fetch
  const ndjson = (lines: string[], splitAt = 7) => {
    const all = lines.join('\n') + '\n'
    return new Response(sse([all.slice(0, splitAt), all.slice(splitAt)]), { headers: { 'content-type': 'application/x-ndjson; charset=utf-8' } })
  }
  try {
    let seen: string[] = []
    globalThis.fetch = (async () => ndjson(['{"type":"delta","text":"Hel"}', '{"type":"delta","text":"lo"}', '{"type":"done"}'])) as typeof fetch
    let result = await askReceptionist({ messages: [], page: 'home', visitor: 'v' }, { signal: new AbortController().signal, onText: (t) => seen.push(t) })
    check('api: streams text', result.ok && seen.at(-1) === 'Hello', { result, seen })

    globalThis.fetch = (async () => Response.json({ type: 'fallback', reason: 'quota' })) as typeof fetch
    result = await askReceptionist({ messages: [], page: 'home', visitor: 'v' }, { signal: new AbortController().signal, onText: () => {} })
    check('api: fallback reason', !result.ok && result.reason === 'quota', result)

    globalThis.fetch = (async () => Response.json({ type: 'fallback', reason: 'limited' }, { status: 429 })) as typeof fetch
    result = await askReceptionist({ messages: [], page: 'home', visitor: 'v' }, { signal: new AbortController().signal, onText: () => {} })
    check('api: 429 limited', !result.ok && result.reason === 'limited', result)

    globalThis.fetch = (async () => {
      throw new TypeError('Failed to fetch')
    }) as typeof fetch
    result = await askReceptionist({ messages: [], page: 'home', visitor: 'v' }, { signal: new AbortController().signal, onText: () => {} })
    check('api: offline', !result.ok && result.reason === 'offline', result)

    globalThis.fetch = (async () => new Response('<html>oops</html>', { status: 502, headers: { 'content-type': 'text/html' } })) as typeof fetch
    result = await askReceptionist({ messages: [], page: 'home', visitor: 'v' }, { signal: new AbortController().signal, onText: () => {} })
    check('api: html error page is error', !result.ok && result.reason === 'error', result)

    seen = []
    globalThis.fetch = (async () => ndjson(['{"type":"delta","text":"Half an ans"}'])) as typeof fetch
    result = await askReceptionist({ messages: [], page: 'home', visitor: 'v' }, { signal: new AbortController().signal, onText: (t) => seen.push(t) })
    check('api: stream without done is error, keeps text', !result.ok && seen.at(-1) === 'Half an ans', { result, seen })

    globalThis.fetch = (async () => ndjson(['{"type":"delta","text":"Part"}', '{"type":"error"}'])) as typeof fetch
    result = await askReceptionist({ messages: [], page: 'home', visitor: 'v' }, { signal: new AbortController().signal, onText: () => {} })
    check('api: error event', !result.ok && result.reason === 'error', result)

    const abort = new AbortController()
    globalThis.fetch = (async (_: unknown, init?: RequestInit) => {
      return await new Promise<Response>((_, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))
    }) as typeof fetch
    const pending = askReceptionist({ messages: [], page: 'home', visitor: 'v' }, { signal: abort.signal, onText: () => {} })
    abort.abort()
    let threw = false
    try {
      await pending
    } catch (e) {
      threw = (e as Error).name === 'AbortError'
    }
    check('api: abort throws AbortError', threw)
  } finally {
    globalThis.fetch = realFetch
  }
}

test('stream conversion', streamChecks)
test('request validation', parseChecks)
test('receptionist endpoint', handlerChecks)
test('message limiter', limiterChecks)
test('network keys', networkKeyChecks)
test('chat instructions', promptChecks)
test('saved answers', fallbackChecks)
test('chat helpers', chatChecks)
test('browser stream reader', apiChecks)
