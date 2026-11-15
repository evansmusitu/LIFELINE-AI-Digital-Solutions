import { CheckCheck, Info, Moon, SendHorizontal, UserRound } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { clockTime } from '../../lib/format'
import { CUSTOMER_SUGGESTIONS } from './data'
import { BUSINESS } from './docs'
import { citeLine } from './engine'
import type { AskFn, ChatMessage } from './types'

interface Props {
  messages: ChatMessage[]
  pending: ChatMessage | null
  onAsk: AskFn
  onHandoff: (messageId: string) => void
}

export function CustomerChatScreen({ messages, pending, onAsk, onHandoff }: Props) {
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages.length, pending, messages])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const q = text.trim()
    if (!q || pending) return
    onAsk(q)
    setText('')
  }

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <p className="mx-auto max-w-sm text-sm text-slate-700">
        The same assistant on WhatsApp, as a trade customer sees it at 21:40, after the counter has closed.
      </p>
      <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[2rem] border-8 border-slate-900 bg-[#efeae2] shadow-xl">
        <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15 text-sm font-bold" aria-hidden="true">
            IB
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{BUSINESS.name}</p>
            <p className="text-xs text-white/85">Business account</p>
          </div>
        </div>
        <p className="flex items-center gap-2 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          <Moon className="size-3.5 shrink-0" aria-hidden="true" />
          Counter closed · the assistant answers now, the team replies from {BUSINESS.opens}
        </p>
        <p role="status" className="sr-only">
          {pending ? 'The assistant is typing.' : ''}
        </p>
        <div ref={listRef} role="log" aria-label="WhatsApp conversation" className="h-[26rem] space-y-2 overflow-y-auto p-3">
          <Incoming>
            Hi, you’ve reached {BUSINESS.name}. The counter is closed, but I can answer questions about prices, stock,
            delivery, returns and trade accounts from our documents.
          </Incoming>
          {messages.map((m) =>
            m.role === 'user' ? (
              <Outgoing key={m.id} message={m} />
            ) : (
              <div key={m.id} className="space-y-1.5">
                <Incoming at={m.at}>
                  {m.answer ? (
                    <>
                      <span className="block break-words">{m.answer.short}</span>
                      {citeLine(m.answer) && <span className="mt-1 block text-xs text-slate-600 italic">{citeLine(m.answer)}</span>}
                    </>
                  ) : (
                    m.text
                  )}
                </Incoming>
                {m.answer?.choices?.map((c) => (
                  <ReplyButton key={c.rowId} disabled={Boolean(pending)} onClick={() => onAsk(m.question ?? '', c)}>
                    {c.label}
                  </ReplyButton>
                ))}
                {m.handoff && (
                  <ReplyButton disabled={m.handoff === 'sent'} onClick={() => onHandoff(m.id)}>
                    <UserRound className="size-4 shrink-0" aria-hidden="true" />
                    {m.handoff === 'sent' ? 'Passed to the counter team' : 'Pass this to the counter team'}
                  </ReplyButton>
                )}
              </div>
            ),
          )}
          {pending && (
            <>
              <Outgoing message={pending} />
              <Incoming>
                <span className="text-slate-600 italic">typing…</span>
              </Incoming>
            </>
          )}
        </div>
        <div className="space-y-2 bg-[#f0f2f5] p-2.5">
          <ul className="flex flex-wrap gap-1.5" aria-label="Example questions">
            {CUSTOMER_SUGGESTIONS.map((q) => (
              <li key={q} className="max-w-full">
                <button
                  type="button"
                  disabled={Boolean(pending)}
                  onClick={() => onAsk(q)}
                  className="min-h-8 max-w-full rounded-full bg-white px-3 py-1.5 text-left text-xs font-medium break-words text-[#075e54] shadow-sm ring-1 ring-slate-200 hover:bg-emerald-50 disabled:opacity-50"
                >
                  {q}
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={submit} className="flex items-center gap-2">
            <label htmlFor="wa-input" className="sr-only">
              Message
            </label>
            <input
              id="wa-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={300}
              autoComplete="off"
              placeholder="Message"
              className="h-10 min-w-0 flex-1 rounded-full border border-slate-300 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-500"
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={!text.trim() || Boolean(pending)}
              className="grid size-10 shrink-0 place-items-center rounded-full bg-[#008069] text-white disabled:opacity-50"
            >
              <SendHorizontal className="size-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>
      <p className="mx-auto flex max-w-sm gap-2 text-xs text-slate-600">
        <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        In this demo the WhatsApp chat runs in your browser. Your version answers on WhatsApp Business from the same
        documents.
      </p>
    </div>
  )
}

function Incoming({ at, children }: { at?: number; children: ReactNode }) {
  return (
    <div className="mr-auto max-w-[88%] rounded-lg rounded-tl-none bg-white px-3 py-2 text-[0.82rem] leading-relaxed text-slate-900 shadow-sm">
      {children}
      {at !== undefined && <span className="mt-0.5 block text-right text-[0.65rem] text-slate-600">{clockTime(at)}</span>}
    </div>
  )
}

function Outgoing({ message }: { message: ChatMessage }) {
  return (
    <div className="ml-auto max-w-[88%] rounded-lg rounded-tr-none bg-[#d9fdd3] px-3 py-2 text-[0.82rem] leading-relaxed break-words text-slate-900 shadow-sm">
      {message.text}
      <span className="mt-0.5 flex items-center justify-end gap-1 text-[0.65rem] text-slate-600">
        {clockTime(message.at)}
        <CheckCheck className="size-3.5 text-sky-700" aria-hidden="true" />
      </span>
    </div>
  )
}

function ReplyButton({ disabled, onClick, children }: { disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'mr-auto flex min-h-10 w-[88%] items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-center text-[0.82rem] font-semibold text-[#075e54] shadow-sm',
        disabled ? 'cursor-default opacity-70' : 'hover:bg-emerald-50',
      )}
    >
      {children}
    </button>
  )
}
