import { LIMITS, type ChatTurn, type NoReply, type ReceptionistRequest } from '../src/receptionist/protocol'
import { BASE_HEADERS, isRecord, json, loadKnowledge, pageName, readBody, rejectRequest, requestNetwork, visitorId } from './http'
import type { ChatLimiter } from './limiter'
import { personaFor, systemPrompt, wellnessPrompt } from './prompt'
import type { Count } from './stats'
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

/*
 * Message limits per visitor (the random ID kept in their browser) and per network (IPv4 address, or
 * IPv6 /64, which many phones on one mobile network can share). The daily caps stop one script from
 * using up the day's free AI allowance (roughly 400 replies) for everyone. Scripts spread over many
 * networks would still need a bot check such as Turnstile.
 */
export const LIMITS_PER = {
  visitor: { minute: 8, day: 40 },
  network: { minute: 30, day: 150 },
} as const

/**
 * AI replies a day for the whole site (AI_REPLIES_PER_DAY), so it stays inside the account's free
 * Workers AI allowance even if other Workers share it or the account is on the Workers Paid plan,
 * where use past the allowance is billed. Past it, visitors get saved answers until midnight UTC.
 */
export function aiRepliesPerDay(env: Env): number {
  const n = Number(env.AI_REPLIES_PER_DAY)
  return Number.isInteger(n) && n >= 0 ? n : 0
}
/** Far above real traffic. Only the daily number matters; the limiter needs a per-minute one too. */
const SITE_REPLIES_PER_MINUTE = 600

/** Characters of conversation history sent to the model. Older messages are dropped first. */
const MAX_HISTORY_CHARS = 5000

function noReply(reason: NoReply['reason'], status = 200): Response {
  const body: NoReply = { type: 'fallback', reason }
  return json(body, status)
}

export interface ParsedChat extends ReceptionistRequest {
  /** The chat's first message: nothing before it but the greeting, which the browser doesn't send. */
  first: boolean
}

/** Checks the request and keeps the latest messages, starting with a visitor message and alternating roles. */
export function parseRequest(raw: string): ParsedChat | null {
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
    if (!content) return null
    const last = turns[turns.length - 1]
    // Chat models expect user and assistant turns to alternate. Join two in a row.
    if (last?.role === item.role) last.content += `\n${content}`
    else turns.push({ role: item.role, content })
  }
  // Checked after joining, so splitting a long message into several doesn't get round the limit.
  for (const turn of turns) {
    if (turn.content.length > (turn.role === 'user' ? LIMITS.visitorChars : LIMITS.replyChars)) return null
  }

  let recent = turns.slice(-LIMITS.historyMessages)
  const size = () => recent.reduce((total, turn) => total + turn.content.length, 0)
  while (recent.length > 1 && size() > MAX_HISTORY_CHARS) recent = recent.slice(1)
  while (recent.length && recent[0].role !== 'user') recent = recent.slice(1)
  if (recent.length === 0 || recent[recent.length - 1].role !== 'user') return null

  const page = pageName(data.page)
  const visitor = visitorId(data.visitor)
  const model = typeof data.model === 'string' ? data.model : undefined
  return { messages: recent, page, visitor, model, first: turns.length === 1 }
}

/** Workers AI error codes: 4006 = daily free allocation used up, 3040 = out of capacity. */
export function failureReason(error: unknown): Exclude<NoReply['reason'], 'limited'> {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error)
  if (/\b4006\b|daily free allocation|neurons/i.test(message)) return 'quota'
  if (/\b3040\b|capacity|\b429\b|too many/i.test(message)) return 'busy'
  return 'error'
}

type RunStream = (model: string, inputs: Record<string, unknown>) => Promise<ReadableStream<Uint8Array>>

export async function handleReceptionist(
  request: Request,
  env: Env,
  limiter: DurableObjectNamespace<ChatLimiter>,
  count: Count,
): Promise<Response> {
  // POST from this site's own pages only, so other websites can't spend its allowance.
  const rejected = rejectRequest(request)
  if (rejected) return rejected
  const url = new URL(request.url)

  const raw = await readBody(request, LIMITS.bodyBytes)
  if (raw === null) return json({ error: 'too_large' }, 413)
  const chat = parseRequest(raw)
  if (!chat) return json({ error: 'bad_request' }, 400)

  // Counted only once a message is within the limits, so a script can't push the totals up for free.
  const network = requestNetwork(request)
  try {
    // Visitor first, so a visitor over their own limit doesn't use up their network's.
    const visitorKey = `visitor:${chat.visitor || network}`
    if (!(await limiter.getByName(visitorKey).allow(LIMITS_PER.visitor.minute, LIMITS_PER.visitor.day))) {
      return noReply('limited', 429)
    }
    if (!(await limiter.getByName(`network:${network}`).allow(LIMITS_PER.network.minute, LIMITS_PER.network.day))) {
      return noReply('limited', 429)
    }
    // Last, so messages refused above don't use up the site's replies for the day.
    if (!(await limiter.getByName('site:ai-replies').allow(SITE_REPLIES_PER_MINUTE, aiRepliesPerDay(env)))) {
      if (chat.first) count('chat_started')
      count('saved_quota')
      return noReply('quota')
    }
  } catch (error) {
    // Without the limiter nothing protects the day's allowance, so answer from saved replies instead.
    console.warn('receptionist: rate limit check failed', error instanceof Error ? error.message : String(error))
    if (chat.first) count('chat_started')
    count('saved_busy')
    return noReply('busy')
  }
  if (chat.first) count('chat_started')

  // Tari everywhere, except the wellness demo's own chat (worker/prompt.ts). Same limits and daily cap for both.
  const persona = personaFor(chat.page)
  let system: string
  if (persona === 'wellness') {
    system = wellnessPrompt()
  } else {
    const knowledge = await loadKnowledge(env, url.origin)
    const page = knowledge.demos.some((d) => d.slug === chat.page) ? chat.page : 'home'
    system = systemPrompt(knowledge, page)
  }
  const configured = Object.hasOwn(MODELS, env.AI_MODEL) ? env.AI_MODEL : DEFAULT_MODEL
  const model =
    env.ALLOW_MODEL_CHOICE === 'true' && chat.model && Object.hasOwn(MODELS, chat.model) ? chat.model : configured

  let upstream: ReadableStream<Uint8Array>
  try {
    const run = env.AI.run.bind(env.AI) as unknown as RunStream
    upstream = await run(model, {
      messages: [{ role: 'system', content: system }, ...chat.messages],
      stream: true,
      max_tokens: MAX_REPLY_TOKENS,
      // The wellness assistant runs cooler, so it keeps closer to its health and safety rules.
      temperature: persona === 'wellness' ? 0.3 : 0.5,
      ...MODELS[model],
    })
  } catch (error) {
    const reason = failureReason(error)
    console.warn('receptionist: no AI reply', reason, error instanceof Error ? error.message : String(error))
    count(`saved_${reason}`)
    return noReply(reason)
  }

  // Counted once the whole reply has been sent. One that fails part-way isn't an AI reply.
  return new Response(upstream.pipeThrough(replyStream(() => count('ai_reply'))), {
    headers: {
      ...BASE_HEADERS,
      'content-type': 'application/x-ndjson; charset=utf-8',
      // Which model answered, for comparing models on Previews. Production doesn't reveal it.
      ...(env.ALLOW_MODEL_CHOICE === 'true' ? { 'x-receptionist-model': model } : {}),
    },
  })
}
