import { Bot, Info, Plus, SendHorizontal, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { clockTime } from '../../lib/format'
import { AppButton, Panel, TextInput } from '../ui'
import { AnswerBody, QuestionChips, SourceCard, Thinking } from './parts'
import { ASK_SUGGESTIONS } from './data'
import type { AskFn, ChatMessage } from './types'

interface Props {
  messages: ChatMessage[]
  pending: ChatMessage | null
  docsInUse: number
  ratings: Map<string, boolean | null>
  onAsk: AskFn
  onRate: (logId: string, helpful: boolean) => void
  onAddAnswer: (question: string) => void
}

export function AskScreen({ messages, pending, docsInUse, ratings, onAsk, onRate, onAddAnswer }: Props) {
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const latest = [...messages].reverse().find((m) => m.answer)

  // Keep the newest message in view inside the chat box (not the page).
  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages.length, pending])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const q = text.trim()
    if (!q || pending) return
    onAsk(q)
    setText('')
  }

  return (
    <div className="grid grid-cols-1 gap-4 p-3 sm:p-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <p role="status" className="sr-only">
        {pending ? 'Searching the documents…' : ''}
      </p>
      <Panel
        title="Ask the documents"
        description={`Answers come from ${docsInUse} ${docsInUse === 1 ? 'document' : 'documents'} in use, with the source shown`}
        bodyClassName="p-0!"
        className="min-w-0"
      >
        <div ref={listRef} role="log" aria-label="Conversation with the assistant" className="max-h-[30rem] min-h-72 space-y-4 overflow-y-auto bg-slate-50/60 p-3 sm:p-4">
          <Bubble at={null}>
            Ask about prices, stock, delivery, returns or trade accounts. I answer from Irkdale’s documents and show where
            each answer came from.
          </Bubble>
          {messages.map((m) =>
            m.role === 'user' ? (
              <UserBubble key={m.id} message={m} />
            ) : (
              <Bubble key={m.id} at={m.at}>
                {m.answer ? (
                  <div className="space-y-3">
                    <AnswerBody answer={m.answer} />
                    {m.answer.kind !== 'none' && m.answer.kind !== 'clarify' && m.answer.sources[0] && (
                      <p className="text-xs text-slate-600">
                        Source: {m.answer.sources[0].docTitle} · {m.answer.sources[0].label}
                        {m.answer.sources.length > 1 ? ` and ${m.answer.sources.length - 1} more` : ''}
                      </p>
                    )}
                    {m.answer.choices && (
                      <div className="flex flex-wrap gap-2">
                        {m.answer.choices.map((c) => (
                          <AppButton key={c.rowId} size="sm" variant="secondary" disabled={Boolean(pending)} onClick={() => onAsk(m.question ?? '', c)} className="h-auto min-h-8 py-1.5 text-left whitespace-normal">
                            {c.label}
                          </AppButton>
                        ))}
                      </div>
                    )}
                    {m.answer.kind === 'none' && m.answer.reason === 'not-found' && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <AppButton size="sm" icon={Plus} onClick={() => onAddAnswer(m.question ?? '')}>
                          Add an answer
                        </AppButton>
                        <span className="text-xs text-slate-600">Saved to Insights as unanswered</span>
                      </div>
                    )}
                    {m.logId && m.answer.kind !== 'none' && <Rating value={ratings.get(m.logId) ?? null} onRate={(v) => onRate(m.logId!, v)} />}
                  </div>
                ) : (
                  m.text
                )}
              </Bubble>
            ),
          )}
          {pending && (
            <>
              <UserBubble message={pending} />
              <Bubble at={null}>
                <Thinking label={`Searching ${docsInUse} ${docsInUse === 1 ? 'document' : 'documents'}…`} />
              </Bubble>
            </>
          )}
        </div>
        <div className="space-y-3 border-t border-slate-100 p-3 sm:p-4">
          <QuestionChips label="Try a question" questions={ASK_SUGGESTIONS} onPick={(q) => onAsk(q)} disabled={Boolean(pending)} />
          <form onSubmit={submit} className="flex gap-2">
            <label htmlFor="ask-input" className="sr-only">
              Your question
            </label>
            <TextInput id="ask-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder="Ask about a price, a policy or stock" autoComplete="off" className="min-w-0" />
            <AppButton type="submit" icon={SendHorizontal} disabled={!text.trim() || Boolean(pending)}>
              Ask
            </AppButton>
          </form>
          <p className="flex gap-2 text-xs text-slate-600">
            <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            In this demo, answers come from matching your question to the documents in your browser. Your version uses
            an AI model that reads every page, including PDFs and spreadsheets, and still shows its sources.
          </p>
        </div>
      </Panel>

      <Panel title="Sources" description="Where the latest answer came from" className="min-w-0 self-start">
        {pending ? (
          <Thinking label="Finding the passages…" />
        ) : !latest?.answer ? (
          <p className="text-sm text-slate-600">Ask a question to see the passages behind the answer, with the matching words highlighted.</p>
        ) : latest.answer.sources.length === 0 ? (
          <p className="text-sm text-slate-600">
            {latest.answer.reason === 'not-found'
              ? 'No passage matched closely enough, so there is no answer. The question is on the Insights list for the team.'
              : 'Nothing to look up yet.'}
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-600 break-words">For: “{latest.question}”</p>
            <ul className="space-y-2">
              {latest.answer.sources.map((s) => (
                <SourceCard key={s.passageId} source={s} />
              ))}
            </ul>
          </div>
        )}
      </Panel>
    </div>
  )
}

function UserBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="flex flex-col items-end">
      <span className="mb-0.5 px-1 text-[0.7rem] text-slate-600">
        <span className="font-semibold">Shazia</span> · {clockTime(message.at)}
      </span>
      <p className="max-w-[85%] rounded-2xl rounded-tr-sm bg-(--accent) px-3.5 py-2.5 text-sm break-words text-white">{message.text}</p>
    </div>
  )
}

function Bubble({ at, children }: { at: number | null; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start">
      <span className="mb-0.5 flex items-center gap-1 px-1 text-[0.7rem] text-slate-600">
        <Bot className="size-3" aria-hidden="true" />
        <span className="font-semibold">Assistant</span>
        {at !== null && <> · {clockTime(at)}</>}
      </span>
      <div className="max-w-[92%] min-w-0 rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm">{children}</div>
    </div>
  )
}

function Rating({ value, onRate }: { value: boolean | null; onRate: (v: boolean) => void }) {
  const button = (v: boolean) => {
    const Icon = v ? ThumbsUp : ThumbsDown
    const on = value === v
    return (
      <button
        type="button"
        aria-pressed={on}
        aria-label={v ? 'Yes, this was right' : 'No, this was wrong'}
        onClick={() => onRate(v)}
        className={cn(
          'grid size-8 place-items-center rounded-lg border transition',
          on ? (v ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-red-300 bg-red-50 text-red-700') : 'border-slate-200 text-slate-600 hover:bg-slate-50',
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </button>
    )
  }
  return (
    <div className="flex items-center gap-2 border-t border-slate-100 pt-2">
      <span className="text-xs text-slate-600">Was this right?</span>
      {button(true)}
      {button(false)}
      {value !== null && <span className="text-xs text-slate-600">{value ? 'Thanks, marked helpful' : 'Thanks, the team will check it'}</span>}
    </div>
  )
}
