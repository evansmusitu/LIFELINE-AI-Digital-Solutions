import { KNOWLEDGE_PATH, type Knowledge, type KnowledgeDemo } from '../src/receptionist/protocol'

/* Request and response helpers shared by the Worker's /api routes. */

export const BASE_HEADERS = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...BASE_HEADERS, 'content-type': 'application/json; charset=utf-8', ...headers },
  })
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/**
 * The checks every /api route makes before reading the body: POST, sent from this site's own
 * pages (so other websites can't use it), as JSON. Returns the error response, or null.
 */
export function rejectRequest(request: Request): Response | null {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, { allow: 'POST' })
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'forbidden' }, 403)
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return json({ error: 'unsupported_media_type' }, 415)
  }
  return null
}

/** Reads at most `max` bytes. Returns null when the body is larger. */
export async function readBody(request: Request, max: number): Promise<string | null> {
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

/** Parses a JSON object body, or returns null. */
export function parseObject(raw: string): Record<string, unknown> | null {
  try {
    const data: unknown = JSON.parse(raw)
    return isRecord(data) ? data : null
  } catch {
    return null
  }
}

/** The random visitor ID kept in the browser, or '' when missing or malformed. */
export function visitorId(value: unknown): string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,40}$/.test(value) ? value : ''
}

/** A page name: "home" or a demo slug. Anything else becomes "home". */
export function pageName(value: unknown): string {
  return typeof value === 'string' && /^[a-z0-9-]{1,60}$/.test(value) ? value : 'home'
}

/** The key for a network: the IPv4 address, or the first four groups (the /64) of an IPv6 address. */
export function networkKey(ip: string): string {
  // IPv4, including IPv4 written as IPv6 (::ffff:203.0.113.9).
  if (ip.includes('.')) return ip.slice(ip.lastIndexOf(':') + 1)
  if (!ip.includes(':')) return ip
  const [head, tail = ''] = ip.toLowerCase().split('::')
  const left = head ? head.split(':') : []
  const right = ip.includes('::') && tail ? tail.split(':') : []
  const groups = ip.includes('::') ? [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right] : left
  return `${groups.slice(0, 4).map((g) => g.replace(/^0+(?=.)/, '')).join(':')}::/64`
}

export function requestNetwork(request: Request): string {
  return networkKey(request.headers.get('cf-connecting-ip') ?? 'unknown')
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
export async function loadKnowledge(env: Env, origin: string): Promise<Knowledge> {
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
