import { useCallback, useEffect, useRef, useState } from 'react'
import { usePersistentState } from '../../lib/storage'
import { uid } from '../../lib/time'
import { askReceptionist, type AskResult } from '../../receptionist/api'
import { GREETING_ID, cleanReply, toTurns, type ChatMessage } from '../../receptionist/chat'
import { LIMITS, type ReceptionistRequest } from '../../receptionist/protocol'
import { ASSISTANT_GREETING, savedAnswer } from './assistant'
import { WELLNESS_SLUG } from './business'
import { EMERGENCY_NOTE, isEmergency } from './engine'

/*
 * The practice assistant's chat: the same Worker endpoint, limits and daily cap as Tari, sent with this
 * demo's page so the Worker answers as the practice (worker/prompt.ts). Kept in this browser under the
 * demo's own key, so "Reset demo" clears it. Saved with the sample business name only: a personalised
 * name is swapped in when a message is shown, never stored or sent.
 */

const SAVED_REPLY_DELAY = 700
const KEEP_PARTIAL_FROM = 60
export const MAX_MESSAGES = 30

function newVisitorId(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('')
}

export const greetingMessage = (): ChatMessage => ({ id: GREETING_ID, role: 'assistant', text: ASSISTANT_GREETING, source: 'ai' })

export function noAiNote(reason: Exclude<AskResult, { ok: true }>['reason']): string {
  switch (reason) {
    case 'quota':
      return 'Live AI answers are paused for today, so the assistant is replying with saved answers.'
    case 'limited':
      return 'That’s a lot of messages in a minute, so here’s a saved answer.'
    case 'offline':
      return 'You seem to be offline, so here’s a saved answer.'
    default:
      return 'The live AI couldn’t be reached just now, so here’s a saved answer.'
  }
}

/**
 * What is sent to the Worker: the visitor's messages and the AI's replies, with this demo's page so it
 * answers as the practice. Notes (the safety note, lead confirmations with the visitor's name) and the
 * greeting are left out, and the personalised business name can't be in it: it is only added when shown.
 */
export function assistantRequest(messages: ChatMessage[], visitor: string): ReceptionistRequest {
  return { messages: toTurns(messages), page: WELLNESS_SLUG, visitor }
}

export interface AssistantChat {
  messages: ChatMessage[]
  handedOver: boolean
}

export function useAssistantChat() {
  const [chat, setChat] = usePersistentState<AssistantChat>(`${WELLNESS_SLUG}.chat`, () => ({ messages: [greetingMessage()], handedOver: false }))
  // The same random ID as Tari's chat, so one visitor has one set of message limits.
  const [visitor] = usePersistentState('receptionist.visitor', newVisitorId)
  const [pending, setPending] = useState<{ id: string; text: string } | null>(null)
  const controller = useRef<AbortController | null>(null)

  useEffect(() => () => controller.current?.abort(), [])

  const typed = chat.messages.filter((m) => m.role === 'user').length

  const send = useCallback(
    async (input: string) => {
      const text = input.trim().slice(0, LIMITS.visitorChars)
      if (!text || controller.current) return
      const question: ChatMessage = { id: uid('you'), role: 'user', text }
      const history = [...chat.messages, question]
      // The safety note never depends on the AI: it is shown before any reply, AI or saved.
      const safety: ChatMessage[] = isEmergency(text) ? [{ id: uid('note'), role: 'note', text: EMERGENCY_NOTE }] : []
      setChat((c) => ({ ...c, messages: [...history, ...safety] }))

      const abort = new AbortController()
      controller.current = abort
      const replyId = uid('amani')
      setPending({ id: replyId, text: '' })
      let streamed = ''
      const added: ChatMessage[] = []
      try {
        const result = await askReceptionist(
          assistantRequest(history, visitor),
          {
            signal: abort.signal,
            onText: (partial) => {
              streamed = partial
              setPending({ id: replyId, text: partial })
            },
          },
        )
        if (abort.signal.aborted) return
        const reply = cleanReply(streamed).trim()
        if (result.ok) added.push({ id: replyId, role: 'assistant', text: reply, source: 'ai' })
        else if (reply.length >= KEEP_PARTIAL_FROM) {
          added.push({ id: replyId, role: 'assistant', text: `${reply}…`, source: 'ai' })
          added.push({ id: uid('note'), role: 'note', text: 'The connection dropped before the reply finished. Ask again, or tap “Talk to a person”.' })
        } else {
          setPending({ id: replyId, text: '' })
          await new Promise((resolve) => window.setTimeout(resolve, SAVED_REPLY_DELAY))
          if (abort.signal.aborted) return
          const note = noAiNote(result.reason)
          const lastNote = [...history].reverse().find((m) => m.role === 'note')
          if (lastNote?.text !== note) added.push({ id: uid('note'), role: 'note', text: note })
          added.push({ id: uid('amani'), role: 'assistant', text: savedAnswer(text), source: 'saved' })
        }
      } catch {
        return
      } finally {
        if (controller.current === abort) {
          controller.current = null
          setPending(null)
        }
      }
      setChat((c) => ({ ...c, messages: [...c.messages, ...added] }))
    },
    [chat.messages, setChat, visitor],
  )

  /**
   * A line from the practice's system, not the AI: lead confirmations and the hand-over. Notes are
   * never sent to the AI (toTurns leaves them out), so the details from the lead form stay out of it.
   */
  const addNote = useCallback(
    (text: string, handedOver = false) =>
      setChat((c) => ({ handedOver: c.handedOver || handedOver, messages: [...c.messages, { id: uid('note'), role: 'note', text }] })),
    [setChat],
  )

  const restart = useCallback(() => {
    controller.current?.abort()
    controller.current = null
    setPending(null)
    setChat({ messages: [greetingMessage()], handedOver: false })
  }, [setChat])

  return { ...chat, pending, busy: pending !== null, limitReached: typed >= MAX_MESSAGES, send, addNote, restart }
}
