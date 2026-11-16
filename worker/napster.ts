/*
 * The few Napster Omniagent API calls the video call needs. The API key is the Worker secret
 * NAPSTER_API_KEY and never leaves the Worker: the browser only receives a short-lived
 * connection token for one call.
 */

const BASE = 'https://companion-api.napster.com'

export class NapsterError extends Error {
  readonly status: number
  readonly code: string | undefined
  readonly retryAfter: number | undefined

  constructor(status: number, code: string | undefined, retryAfter?: number) {
    super(`Napster API ${status}${code ? ` ${code}` : ''}`)
    this.name = 'NapsterError'
    this.status = status
    this.code = code
    this.retryAfter = retryAfter
  }
}

function errorCode(body: unknown): string | undefined {
  const first = Array.isArray(body) ? body[0] : body
  if (typeof first === 'object' && first !== null) {
    const record = first as Record<string, unknown>
    if (typeof record.code === 'string') return record.code
    if (typeof record.title === 'string') return record.title
  }
  return undefined
}

async function call<T>(key: string, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'X-Api-Key': key, accept: 'application/json', ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  })
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  if (!res.ok) {
    const retry = Number(res.headers.get('retry-after'))
    throw new NapsterError(res.status, errorCode(data), Number.isFinite(retry) ? retry : undefined)
  }
  return data as T
}

export interface SessionSummary {
  id: string
  status: 'pending' | 'started' | 'closed' | 'failed' | string
  /** Billed cost in USD. null until the session has closed and billing is final. */
  cost: number | null
  /** Unix seconds. */
  createdAt: number
}

/** Every session in the Napster project, newest pages included. Used to measure total spend and today's calls. */
export async function listSessions(key: string): Promise<SessionSummary[]> {
  const pageSize = 100
  const all: SessionSummary[] = []
  for (let pageIndex = 0; pageIndex < 50; pageIndex++) {
    const page = await call<{ items?: unknown[]; totalCount?: number }>(
      key,
      'GET',
      `/public/sessions?pageSize=${pageSize}&pageIndex=${pageIndex}`,
    )
    const items = Array.isArray(page?.items) ? page.items : []
    for (const item of items) {
      const record = item as Record<string, unknown>
      all.push({
        id: String(record.id ?? ''),
        status: String(record.status ?? ''),
        cost: typeof record.cost === 'number' ? record.cost : null,
        createdAt: typeof record.createdAt === 'number' ? record.createdAt : 0,
      })
    }
    if (items.length < pageSize || (typeof page?.totalCount === 'number' && all.length >= page.totalCount)) break
  }
  return all
}

export interface NewConnection {
  token: string
  sessionId: string
}

export async function createConnection(
  key: string,
  agentId: string,
  options: { initialSpeech: string; tags: Record<string, string>; profile: Record<string, string> },
): Promise<NewConnection> {
  const data = await call<{ token?: string; connection?: { id?: string } }>(key, 'POST', `/public/agents/${agentId}/connections`, {
    channelType: 'webrtc',
    initialSpeech: options.initialSpeech,
    tags: options.tags,
    externalClientProfile: options.profile,
  })
  if (!data?.token || !data.connection?.id) throw new NapsterError(502, 'MalformedConnection')
  return { token: data.token, sessionId: data.connection.id }
}

/** Ends a live call. A call that has already ended is not an error. */
export async function endConnection(key: string, sessionId: string): Promise<void> {
  try {
    await call(key, 'DELETE', `/public/connections/${encodeURIComponent(sessionId)}`)
  } catch (error) {
    if (error instanceof NapsterError && error.status === 400 && error.code === 'ConnectionNotFound') return
    throw error
  }
}

/** Replaces the agent's instructions. Turn detection is sent too, so it keeps its settings. */
export async function updateInstructions(key: string, agentId: string, instructions: string): Promise<void> {
  await call(key, 'PATCH', `/public/agents/${agentId}`, {
    providerSettings: {
      instructions,
      temperature: 0.7,
      turnDetection: { threshold: 0.9, prefix_padding_ms: 400, silence_duration_ms: 500 },
    },
  })
}
