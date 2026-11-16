import {
  KNOWLEDGE_PATH,
  LIMITS,
  type ChatTurn,
  type Knowledge,
  type KnowledgeDemo,
  type NoReply,
  type ReceptionistRequest,
} from '../src/receptionist/protocol'
import { systemPrompt } from './prompt'
import { replyStream } from './stream'

/*
 * POST /api/receptionist: the AI receptionist. Answers with a streamed reply from Workers AI, or
 * with a small JSON "fallback" note that tells the browser to use its saved answers instead.
 * The Workers Free plan refuses AI calls past the daily allowance rather than billing for them.
 */

/** Models a request may choose on Previews, with the settings each needs. Thinking is off: it is slower and costs more. */
const MODELS: Record<string, Record<string, unknown>> = {
  '@cf/google/gemma-4-26b-a4b-it': { chat_template_kwargs: { enable_thinking: false } },
  '@cf/zai-org/glm-4.7-flash': { chat_template_kwargs: { enable_thinking: false } },
  '@cf/meta/llama-4-scout-17b-16e-instruct': {},
}
const DEFAULT_MODEL = '@cf/google/gemma-4-26b-a4b-it'

const MAX_REPLY_TOKENS = 400

const BASE_HEADERS = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...BASE_HEADERS, 'content-type': 'application/json; charset=utf-8', ...headers },
  })
}

function noReply(reason: NoReply['reason'], status = 200): Response {
  const body: NoReply = { type: 'fallback', reason }
  return json(body, status)
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

/** Reads at most `max` bytes. Returns null when the body is larger. */
async function readBody(request: Request, max: number): Promise<string | null> {
  const declared = Number(request.headers.get('content-length') ?? '0')
  if (declared > max) return null
  if (!request.body) return ''
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > max) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}

/** Checks the request and keeps the latest messages, starting with a visitor message and alternating roles. */
export function parseRequest(raw: string): ReceptionistRequest | null {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(data) || !Array.isArray(data.messages) || data.messages.length === 0) return null

  const turns: ChatTurn[] = []
  for (const item of data.messages) {
    if (!isRecord(item) || (item.role !== 'user' && item.role !== 'assistant') || typeof item.content !== 'string') {
      return null
    }
    const content = item.content.trim()
    const max = item.role === 'user' ? LIMITS.visitorChars : LIMITS.replyChars
    if (!content || content.length > max) return null
    const last = turns[turns.length - 1]
    // Chat models expect user and assistant turns to alternate. Join two in a row.
    if (last?.role === item.role) last.content += `\n${content}`
    else turns.push({ role: item.role, content })
  }

  let recent = turns.slice(-LIMITS.historyMessages)
  while (recent.length && recent[0].role !== 'user') recent = recent.slice(1)
  if (recent.length === 0 || recent[recent.length - 1].role !== 'user') return null

  const page = typeof data.page === 'string' && /^[a-z0-9-]{1,60}$/.test(data.page) ? data.page : 'home'
  const visitor = typeof data.visitor === 'string' && /^[A-Za-z0-9_-]{8,40}$/.test(data.visitor) ? data.visitor : ''
  const model = typeof data.model === 'string' ? data.model : undefined
  return { messages: recent, page, visitor, model }
}

function isKnowledgeDemo(value: unknown): value is KnowledgeDemo {
  return (
    isRecord(value) &&
    typeof value.slug === 'string' &&
    typeof value.title === 'string' &&
    typeof value.summary === 'string' &&
    typeof value.timeline === 'string' &&
    Array.isArray(value.industries) &&
    Array.isArray(value.services)
  )
}

let knowledgeCache: Promise<Knowledge | null> | undefined

/** The demo list, from the same build as the pages. Cached for the life of this Worker instance. */
async function loadKnowledge(env: Env, origin: string): Promise<Knowledge> {
  knowledgeCache ??= env.ASSETS.fetch(new URL(KNOWLEDGE_PATH, origin))
    .then(async (res) => {
      if (!res.ok) return null
      const data: unknown = await res.json()
      if (!isRecord(data) || !Array.isArray(data.demos)) return null
      return { demos: data.demos.filter(isKnowledgeDemo) }
    })
    .catch(() => null)
  const knowledge = await knowledgeCache
  // Try again on the next request rather than answering without demos for the rest of this instance's life.
  if (!knowledge) knowledgeCache = undefined
  return knowledge ?? { demos: [] }
}

/** Workers AI error codes: 4006 = daily free allocation used up, 3040 = out of capacity. */
export function failureReason(error: unknown): NoReply['reason'] {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error)
  if (/\b4006\b|daily free allocation|neurons/i.test(message)) return 'quota'
  if (/\b3040\b|capacity|\b429\b|too many/i.test(message)) return 'busy'
  return 'error'
}

type RunStream = (model: string, inputs: Record<string, unknown>) => Promise<ReadableStream<Uint8Array>>

export async function handleReceptionist(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, { allow: 'POST' })

  const url = new URL(request.url)
  // Only this site's pages may use the receptionist, so other websites can't spend its allowance.
  if (request.headers.get('origin') !== url.origin) return json({ error: 'forbidden' }, 403)
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return json({ error: 'unsupported_media_type' }, 415)
  }

  const raw = await readBody(request, LIMITS.bodyBytes)
  if (raw === null) return json({ error: 'too_large' }, 413)
  const chat = parseRequest(raw)
  if (!chat) return json({ error: 'bad_request' }, 400)

  const network = request.headers.get('cf-connecting-ip') ?? 'unknown'
  // Reported in a response header, so a check of the live site can see whether the limits are working.
  let limits = 'checked'
  try {
    const [byNetwork, byVisitor] = await Promise.all([
      env.CHAT_NETWORK_LIMIT.limit({ key: network }),
      env.CHAT_VISITOR_LIMIT.limit({ key: chat.visitor || `network:${network}` }),
    ])
    if (!byNetwork.success || !byVisitor.success) return noReply('limited', 429)
  } catch (error) {
    // A rate limiter outage shouldn't take the receptionist down. The daily AI allowance still caps use.
    limits = 'unavailable'
    console.warn('receptionist: rate limit check failed', error instanceof Error ? error.message : String(error))
  }

  const knowledge = await loadKnowledge(env, url.origin)
  const page = knowledge.demos.some((d) => d.slug === chat.page) ? chat.page : 'home'
  const configured = env.AI_MODEL in MODELS ? env.AI_MODEL : DEFAULT_MODEL
  const model = env.ALLOW_MODEL_CHOICE === 'true' && chat.model && chat.model in MODELS ? chat.model : configured

  let upstream: ReadableStream<Uint8Array>
  try {
    const run = env.AI.run.bind(env.AI) as unknown as RunStream
    upstream = await run(model, {
      messages: [{ role: 'system', content: systemPrompt(knowledge, page) }, ...chat.messages],
      stream: true,
      max_tokens: MAX_REPLY_TOKENS,
      temperature: 0.5,
      ...MODELS[model],
    })
  } catch (error) {
    const reason = failureReason(error)
    console.warn('receptionist: no AI reply', reason, error instanceof Error ? error.message : String(error))
    return noReply(reason)
  }

  return new Response(upstream.pipeThrough(replyStream()), {
    headers: {
      ...BASE_HEADERS,
      'content-type': 'application/x-ndjson; charset=utf-8',
      'x-receptionist-model': model,
      'x-receptionist-limits': limits,
    },
  })
}
