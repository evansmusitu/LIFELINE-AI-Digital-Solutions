import type { StreamEvent } from '../src/receptionist/protocol'

/** Text from one Workers AI stream event. Chat-completions models and older models use different shapes. */
function eventText(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null
  const record = data as Record<string, unknown>
  if (typeof record.response === 'string') return record.response
  const choices = record.choices
  if (Array.isArray(choices) && choices.length > 0) {
    const delta = (choices[0] as Record<string, unknown>).delta as Record<string, unknown> | undefined
    // Only the answer. reasoning_content (the model's thinking) is never shown.
    if (delta && typeof delta.content === 'string') return delta.content
  }
  return null
}

/** Removes <think>…</think> blocks, which some models write into the answer text. Works across chunks. */
export function thinkFilter() {
  let inside = false
  let carry = ''
  const OPEN = '<think>'
  const CLOSE = '</think>'
  return {
    push(text: string): string {
      let input = carry + text
      carry = ''
      let output = ''
      while (input) {
        const tag = inside ? CLOSE : OPEN
        const at = input.indexOf(tag)
        if (at >= 0) {
          if (!inside) output += input.slice(0, at)
          input = input.slice(at + tag.length)
          inside = !inside
          continue
        }
        // Keep a possible partial tag at the end for the next chunk.
        let keep = 0
        for (let n = Math.min(tag.length - 1, input.length); n > 0; n--) {
          if (tag.startsWith(input.slice(-n))) {
            keep = n
            break
          }
        }
        if (!inside) output += input.slice(0, input.length - keep)
        carry = input.slice(input.length - keep)
        input = ''
      }
      return output
    },
    flush(): string {
      const rest = inside ? '' : carry
      carry = ''
      return rest
    },
  }
}

/**
 * Turns the Workers AI server-sent events stream into one JSON object per line for the browser:
 * {"type":"delta","text":"…"} for each piece of the reply, then {"type":"done"}, or {"type":"error"}.
 * `onDone` runs once a whole reply has gone through, and not for one that failed or was cut off.
 */
export function replyStream(onDone?: () => void): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  const filter = thinkFilter()
  let buffer = ''
  let failed = false
  let leading = true

  const send = (controller: TransformStreamDefaultController<Uint8Array>, event: StreamEvent) =>
    controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))

  const sendText = (controller: TransformStreamDefaultController<Uint8Array>, text: string) => {
    // Models sometimes open with blank lines. Drop them so the reply bubble starts with words.
    const shown = leading ? text.replace(/^\s+/, '') : text
    if (!shown) return
    leading = false
    send(controller, { type: 'delta', text: shown })
  }

  const handleLine = (controller: TransformStreamDefaultController<Uint8Array>, line: string) => {
    if (failed || !line.startsWith('data:')) return
    const payload = line.slice(5).trim()
    if (!payload || payload === '[DONE]') return
    let data: unknown
    try {
      data = JSON.parse(payload)
    } catch {
      return
    }
    if (typeof data === 'object' && data !== null && 'error' in data) {
      failed = true
      send(controller, { type: 'error' })
      return
    }
    const text = eventText(data)
    if (text) sendText(controller, filter.push(text))
  }

  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true })
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() ?? ''
      for (const line of lines) handleLine(controller, line)
    },
    flush(controller) {
      buffer += decoder.decode()
      if (buffer) handleLine(controller, buffer)
      if (failed) return
      sendText(controller, filter.flush())
      send(controller, leading ? { type: 'error' } : { type: 'done' })
      if (!leading) onDone?.()
    },
  })
}
