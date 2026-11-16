import { useCallback, useEffect, useRef, useState } from 'react'
import { usePersistentState } from '../lib/storage'
import { uid } from '../lib/time'
import { askReceptionist } from './api'
import { GREETING_ID, cleanReply, fallbackNote, greeting, pageNote, toTurns, type ChatMessage } from './chat'
import { fallbackReply } from './fallback'
import { LIMITS } from './protocol'

interface StoredChat {
  messages: ChatMessage[]
  /** The page of the latest message, so a note can mark when the visitor moves to another page. */
  page: string
}

/** Id prefix of the "You're now on…" notes. */
const PAGE_NOTE = 'page'

/** Saved answers appear after a short pause, like a reply being typed. */
const SAVED_REPLY_DELAY = 700
/** A reply cut off after this many characters is kept, with a note, instead of being replaced by a saved answer. */
const KEEP_PARTIAL_FROM = 60
/** Messages per conversation. Past this, the visitor is pointed to WhatsApp. */
export const MAX_VISITOR_MESSAGES = 30

function newVisitorId(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('')
}

/** The receptionist conversation: kept in this browser, sent to the Worker, with saved answers as the backup. */
export function useReceptionistChat(page: string, onReply: (text: string) => void) {
  const [chat, setChat] = usePersistentState<StoredChat>(
    'receptionist.chat',
    () => ({ messages: [greeting(page)], page }),
    { version: 1 },
  )
  const [visitor] = usePersistentState('receptionist.visitor', newVisitorId)
  /** The reply on its way. Its id becomes the finished reply's id, so the bubble isn't redrawn when the reply ends. */
  const [pending, setPending] = useState<{ id: string; text: string } | null>(null)
  const controller = useRef<AbortController | null>(null)
  const replyCallback = useRef(onReply)

  useEffect(() => {
    replyCallback.current = onReply
  }, [onReply])

  useEffect(() => () => controller.current?.abort(), [])

  // Moving to another page: refresh the greeting if nothing was asked yet, otherwise add a note.
  // Several moves in a row (for example while the chat is closed) leave one note, for the latest page.
  useEffect(() => {
    setChat((current) => {
      if (current.page === page) return current
      const asked = current.messages.some((m) => m.role === 'user')
      if (!asked) return { messages: [greeting(page)], page }
      const messages = [...current.messages]
      if (messages[messages.length - 1]?.id.startsWith(PAGE_NOTE)) messages.pop()
      messages.push({ id: uid(PAGE_NOTE), role: 'note', text: pageNote(page) })
      return { messages, page }
    })
  }, [page, setChat])

  const visitorCount = chat.messages.filter((m) => m.role === 'user').length

  const send = useCallback(
    async (input: string) => {
      const text = input.trim().slice(0, LIMITS.visitorChars)
      if (!text || controller.current) return
      const question: ChatMessage = { id: uid('you'), role: 'user', text }
      const history = [...chat.messages, question]
      setChat({ messages: history, page })

      const abort = new AbortController()
      controller.current = abort
      const replyId = uid('tari')
      setPending({ id: replyId, text: '' })
      let streamed = ''
      const added: ChatMessage[] = []

      try {
        const result = await askReceptionist(
          { messages: toTurns(history), page, visitor },
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
        if (result.ok) {
          added.push({ id: replyId, role: 'assistant', text: reply, source: 'ai' })
        } else if (reply.length >= KEEP_PARTIAL_FROM) {
          added.push({ id: replyId, role: 'assistant', text: `${reply}…`, source: 'ai' })
          added.push({ id: uid('note'), role: 'note', text: 'The connection dropped before I finished. Ask again, or continue on WhatsApp.' })
        } else {
          setPending({ id: replyId, text: '' })
          await new Promise((resolve) => window.setTimeout(resolve, SAVED_REPLY_DELAY))
          if (abort.signal.aborted) return
          // Explain the switch to saved answers once, and again only if the reason changes.
          const note = fallbackNote(result.reason)
          const earlier = [...history].reverse()
          const previous = earlier.find((m) => m.role === 'assistant' && m.id !== GREETING_ID)
          const lastNote = earlier.find((m) => m.role === 'note')
          if (previous?.source !== 'saved' || lastNote?.text !== note) added.push({ id: uid('note'), role: 'note', text: note })
          added.push({ id: uid('tari'), role: 'assistant', text: fallbackReply(text, page), source: 'saved' })
        }
      } catch {
        // Aborted: the visitor started a new chat or left. Nothing to add.
        return
      } finally {
        if (controller.current === abort) {
          controller.current = null
          setPending(null)
        }
      }

      // Right after the question, so a page note added while the reply was arriving stays below it.
      setChat((current) => {
        const at = current.messages.findIndex((m) => m.id === question.id)
        if (at < 0) return { messages: [...current.messages, ...added], page: current.page }
        const messages = [...current.messages]
        messages.splice(at + 1, 0, ...added)
        return { messages, page: current.page }
      })
      const reply = added.filter((m) => m.role === 'assistant').pop()
      if (reply) replyCallback.current(reply.text)
    },
    [chat.messages, page, setChat, visitor],
  )

  /** Adds what was said on a video call, so the chat and the WhatsApp summary include it. */
  const addCallRecord = useCallback(
    (record: ChatMessage[]) => {
      if (record.length) setChat((current) => ({ messages: [...current.messages, ...record], page: current.page }))
    },
    [setChat],
  )

  const restart = useCallback(() => {
    controller.current?.abort()
    controller.current = null
    setPending(null)
    setChat({ messages: [greeting(page)], page })
  }, [page, setChat])

  return {
    messages: chat.messages,
    pending,
    busy: pending !== null,
    limitReached: visitorCount >= MAX_VISITOR_MESSAGES,
    asked: visitorCount > 0,
    visitor,
    send,
    addCallRecord,
    restart,
  }
}
