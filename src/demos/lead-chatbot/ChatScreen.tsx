import { Bot, Hammer, LayoutPanelTop, RotateCcw, SendHorizontal, Sofa, UserRound } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { cn } from '../../lib/cn'
import { BOT_NAME, DESIGNER } from './engine'
import type { Conversation, Message, QuickReply } from './types'

interface Props {
  conversation: Conversation
  typing: boolean
  afterHours: boolean
  onSend: (input: { text?: string; replyId?: string }) => void
  onAction: (action: NonNullable<QuickReply['action']>) => void
  onRestart: () => void
}

export function ChatScreen({ conversation, typing, afterHours, onSend, onAction, onRestart }: Props) {
  return (
    <div className="grid grid-cols-1 gap-5 p-3 sm:p-5 lg:grid-cols-[1fr_25rem] lg:gap-6 xl:grid-cols-[1fr_27rem]">
      <ChatWidget
        conversation={conversation}
        typing={typing}
        afterHours={afterHours}
        onSend={onSend}
        onAction={onAction}
        onRestart={onRestart}
      />
      <SampleWebsite />
    </div>
  )
}

function SampleWebsite() {
  const focusChat = () => document.getElementById('lead-chat-input')?.focus()
  return (
    <section
      aria-label="Dunebridge Interiors sample website"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:order-first"
    >
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-600">
        <span className="flex gap-1" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-slate-300" />
          <span className="size-2.5 rounded-full bg-slate-300" />
          <span className="size-2.5 rounded-full bg-slate-300" />
        </span>
        <span className="ml-2 truncate">Sample website with the chat assistant switched on</span>
      </div>
      <div className="flex items-center justify-between px-5 py-4">
        <p className="font-semibold tracking-wide text-slate-900">
          DUNEBRIDGE <span className="font-normal text-slate-600">Interiors</span>
        </p>
        <p className="hidden gap-5 text-sm text-slate-600 sm:flex" aria-hidden="true">
          <span>Projects</span>
          <span>Services</span>
          <span>Studio</span>
        </p>
      </div>
      <div className="bg-[linear-gradient(135deg,#f0fdfa_0%,#ffffff_55%,#f8fafc_100%)] px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-xs font-semibold tracking-[0.16em] text-(--accent-ink) uppercase">Office fit-out · Dubai</p>
        <h3 className="mt-3 max-w-md text-2xl leading-tight font-bold text-slate-900 sm:text-3xl">
          Workspaces that work as hard as your team
        </h3>
        <p className="mt-3 max-w-md text-slate-700">
          Design and build for offices, clinics and shops across Dubai, Abu Dhabi and Sharjah.
        </p>
        <button
          type="button"
          onClick={focusChat}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-(--accent) px-5 text-sm font-semibold text-white hover:bg-(--accent-strong)"
        >
          <Bot className="size-4" aria-hidden="true" />
          Get a ballpark in one minute
        </button>
      </div>
      <ul className="grid grid-cols-1 gap-px bg-slate-100 sm:grid-cols-3">
        {[
          { icon: LayoutPanelTop, title: 'Design and build', text: 'One team from first sketch to handover.' },
          { icon: Hammer, title: 'Refurbishment', text: 'Refresh your office while your team keeps working.' },
          { icon: Sofa, title: 'Joinery and furniture', text: 'Made-to-measure reception desks and storage.' },
        ].map(({ icon: Icon, title, text }) => (
          <li key={title} className="bg-white p-5">
            <Icon className="size-5 text-(--accent)" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-slate-900">{title}</p>
            <p className="mt-1 text-sm text-slate-600">{text}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ChatWidget({ conversation, typing, afterHours, onSend, onAction, onRestart }: Props) {
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const { messages, status } = conversation
  const withAgent = status === 'agent'
  const last = messages[messages.length - 1]
  const quickReplies = !typing && status !== 'agent' && status !== 'closed' ? last?.quickReplies : undefined

  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages.length, typing])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = text.trim()
    if (!value || typing) return
    onSend({ text: value })
    setText('')
  }

  const statusLine = withAgent
    ? 'Senior designer, Dunebridge Interiors'
    : status === 'waiting'
      ? `Bringing in ${DESIGNER}…`
      : status === 'closed'
        ? 'This chat has ended'
        : afterHours
          ? 'Virtual assistant · our designers are offline'
          : 'Virtual assistant · replies instantly'

  return (
    <section
      aria-label={`Chat with ${BOT_NAME}, the Dunebridge Interiors assistant`}
      className="flex h-[34rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg lg:h-[40rem]"
    >
      <div className="flex items-center gap-3 bg-(--accent) px-4 py-3 text-white">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15">
          {withAgent ? <UserRound className="size-5" aria-hidden="true" /> : <Bot className="size-5" aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{withAgent ? DESIGNER : `${BOT_NAME} from Dunebridge`}</p>
          <p className="truncate text-xs text-white/90">{statusLine}</p>
        </div>
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-white hover:bg-white/15"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          New chat
        </button>
      </div>

      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        className="flex-1 space-y-2.5 overflow-y-auto bg-slate-50 px-3 py-4"
      >
        {messages.map((message) => (
          <Bubble key={message.id} message={message} />
        ))}
        {typing && (
          <div className="flex items-center gap-1 self-start rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-3.5 py-3 w-fit">
            <span className="sr-only">{BOT_NAME} is typing</span>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                aria-hidden="true"
                className="size-1.5 animate-typing rounded-full bg-slate-500"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}
      </div>

      {quickReplies && quickReplies.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-white px-3 py-2.5">
          {quickReplies.map((reply) => (
            <button
              key={reply.id}
              type="button"
              onClick={() => (reply.action ? onAction(reply.action) : onSend({ replyId: reply.id }))}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm font-medium transition',
                reply.action
                  ? 'border-transparent bg-slate-900 text-white hover:bg-slate-800'
                  : 'border-(--accent)/40 bg-(--accent-soft) text-(--accent-ink) hover:border-(--accent)',
              )}
            >
              {reply.label}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-slate-200 bg-white p-3">
        <label htmlFor="lead-chat-input" className="sr-only">
          Your message
        </label>
        <input
          id="lead-chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={status === 'closed' ? 'Start a new chat to keep talking' : 'Type your message…'}
          disabled={status === 'closed'}
          autoComplete="off"
          maxLength={400}
          className="h-11 min-w-0 flex-1 rounded-full border border-slate-300 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-500 disabled:bg-slate-100"
        />
        <button
          type="submit"
          disabled={!text.trim() || typing || status === 'closed'}
          aria-label="Send message"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-(--accent) text-white hover:bg-(--accent-strong) disabled:opacity-40"
        >
          <SendHorizontal className="size-5" aria-hidden="true" />
        </button>
      </form>
      <p className="border-t border-slate-100 bg-white px-3 py-2 text-[0.7rem] leading-snug text-slate-600">
        Scripted demo assistant. Your version would run on an AI model trained on your business. What you type stays in
        this browser.
      </p>
    </section>
  )
}

function Bubble({ message }: { message: Message }) {
  if (message.from === 'system') {
    return (
      <p className="mx-auto w-fit max-w-[90%] rounded-full bg-slate-200/70 px-3 py-1 text-center text-xs text-slate-700">
        {message.text}
      </p>
    )
  }
  const mine = message.from === 'visitor'
  return (
    <div className={cn('flex animate-fade-up flex-col', mine ? 'items-end' : 'items-start')}>
      {message.from === 'agent' && (
        <span className="mb-0.5 ml-1 text-[0.7rem] font-semibold text-slate-600">{message.author ?? DESIGNER}</span>
      )}
      <p
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line',
          mine && 'rounded-tr-sm bg-(--accent) text-white',
          message.from === 'bot' && 'rounded-tl-sm border border-slate-200 bg-white text-slate-800',
          message.from === 'agent' && 'rounded-tl-sm border border-amber-200 bg-amber-50 text-slate-900',
        )}
      >
        <span className="sr-only">{mine ? 'You: ' : message.from === 'agent' ? `${message.author ?? DESIGNER}: ` : `${BOT_NAME}: `}</span>
        {message.text}
      </p>
    </div>
  )
}
