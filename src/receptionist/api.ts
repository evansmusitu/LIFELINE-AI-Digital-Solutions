import { RECEPTIONIST_PATH, type NoReply, type ReceptionistRequest, type StreamEvent } from './protocol'

export type AskResult = { ok: true } | { ok: false; reason: NoReply['reason'] | 'offline' }

function isEvent(value: unknown): value is StreamEvent {
  return typeof value === 'object' && value !== null && 'type' in value
}

/**
 * Sends the conversation to the Worker and streams the reply into `onText`, which receives the
 * whole reply so far each time. Resolves { ok: false } when the browser should use a saved answer.
 * Throws only an AbortError, when `signal` is aborted.
 */
export async function askReceptionist(
  request: ReceptionistRequest,
  { signal, onText }: { signal: AbortSignal; onText: (text: string) => void },
): Promise<AskResult> {
  let response: Response
  try {
    response = await fetch(RECEPTIONIST_PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    })
  } catch (error) {
    if (signal.aborted) throw error
    return { ok: false, reason: 'offline' }
  }

  const type = response.headers.get('content-type') ?? ''
  if (!response.ok || !type.includes('application/x-ndjson') || !response.body) {
    const body: unknown = await response.json().catch(() => null)
    if (signal.aborted) throw new DOMException('The chat was reset', 'AbortError')
    const reason = (body as Partial<NoReply> | null)?.reason
    return { ok: false, reason: reason ?? 'error' }
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  let text = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += value
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.trim()) continue
        let event: unknown
        try {
          event = JSON.parse(line)
        } catch {
          continue
        }
        if (!isEvent(event)) continue
        if (event.type === 'delta') {
          text += event.text
          onText(text)
        } else if (event.type === 'done') {
          return text.trim() ? { ok: true } : { ok: false, reason: 'error' }
        } else {
          return { ok: false, reason: 'error' }
        }
      }
    }
  } catch (error) {
    if (signal.aborted) throw error
  }
  // The stream ended without "done": the connection dropped part-way through.
  return { ok: false, reason: 'error' }
}
