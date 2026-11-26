import { useCallback, useEffect, useRef, useState } from 'react'
import { usePersistentState } from '../../lib/storage'
import { askReceptionist, type AskResult } from '../../receptionist/api'
import { cleanReply } from '../../receptionist/chat'
import type { ReceptionistRequest } from '../../receptionist/protocol'
import { TEACHER_SLUG } from './data'
import { commentRequest } from './engine'

/*
 * Report-comment drafts from the assistant: the same Worker endpoint, limits and daily cap as Tari,
 * sent with this demo's page so the Worker writes as the comment assistant (worker/prompt.ts). Only the
 * facts from commentFacts() are sent: no names. When there is no AI reply, the caller uses the saved draft.
 */

function newVisitorId(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('')
}

export const draftRequest = (facts: string, visitor: string): ReceptionistRequest => ({
  messages: [{ role: 'user', content: commentRequest(facts) }],
  page: TEACHER_SLUG,
  visitor,
})

export function noAiReason(reason: Exclude<AskResult, { ok: true }>['reason']): string {
  switch (reason) {
    case 'quota':
      return 'Live AI drafts are paused for today, so this is a saved draft written from the marks.'
    case 'limited':
      return 'That’s a lot of drafts in a minute, so this is a saved draft written from the marks.'
    case 'offline':
      return 'You seem to be offline, so this is a saved draft written from the marks.'
    default:
      return 'The live AI couldn’t be reached just now, so this is a saved draft written from the marks.'
  }
}

export type DraftResult = { ok: true; text: string } | { ok: false; note: string }

/** Shortest AI draft that is kept. Anything shorter is treated as no reply. */
const MIN_DRAFT = 40

export function useCommentDraft() {
  const [visitor] = usePersistentState('receptionist.visitor', newVisitorId)
  const [pending, setPending] = useState<{ learnerId: string; text: string } | null>(null)
  const controller = useRef<AbortController | null>(null)

  useEffect(() => () => controller.current?.abort(), [])

  const draft = useCallback(
    async (learnerId: string, facts: string): Promise<DraftResult | null> => {
      if (controller.current) return null
      const abort = new AbortController()
      controller.current = abort
      setPending({ learnerId, text: '' })
      let streamed = ''
      try {
        const result = await askReceptionist(draftRequest(facts, visitor), {
          signal: abort.signal,
          onText: (partial) => {
            streamed = partial
            setPending({ learnerId, text: partial })
          },
        })
        if (abort.signal.aborted) return null
        const text = cleanReply(streamed).replace(/\s+/g, ' ').trim()
        if (result.ok && text.length >= MIN_DRAFT) return { ok: true, text }
        return { ok: false, note: noAiReason(result.ok ? 'error' : result.reason) }
      } catch {
        return null
      } finally {
        if (controller.current === abort) {
          controller.current = null
          setPending(null)
        }
      }
    },
    [visitor],
  )

  return { draft, pending }
}
