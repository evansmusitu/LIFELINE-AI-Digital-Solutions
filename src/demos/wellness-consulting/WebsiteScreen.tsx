import { Bot, CalendarPlus, Clock, Laptop, Leaf, MapPin, RotateCcw, SendHorizontal, UserRound, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { cn } from '../../lib/cn'
import type { ChatMessage } from '../../receptionist/chat'
import { AppButton, Field, SelectInput, TextInput } from '../ui'
import { ASSISTANT_SUGGESTIONS } from './assistant'
import { BUSINESS, IN_PERSON_HOW, OFFICES, ONLINE, SERVICES, priceLabel } from './business'
import { personalised, validEmail, validName, validPhone } from './engine'

export interface LeadInput {
  name: string
  contact: string
  interest: string
  handover: boolean
}

interface Props {
  business: string | null
  messages: ChatMessage[]
  pending: { id: string; text: string } | null
  busy: boolean
  limitReached: boolean
  handedOver: boolean
  onSend: (text: string) => void
  onRestart: () => void
  onLead: (lead: LeadInput) => void
  onBook: () => void
}

export function WebsiteScreen(props: Props) {
  return (
    <div className="grid grid-cols-1 gap-5 p-3 sm:p-5 lg:grid-cols-[1fr_24rem] lg:gap-6 xl:grid-cols-[1fr_26rem]">
      <AssistantChat {...props} />
      <SampleWebsite business={props.business} onBook={props.onBook} />
    </div>
  )
}

function SampleWebsite({ business, onBook }: { business: string | null; onBook: () => void }) {
  const name = business ?? BUSINESS.name
  const focusChat = () => document.getElementById('wellness-chat-input')?.focus()
  return (
    <section aria-label={`${name} sample website`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:order-first">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-600">
        <span className="flex gap-1" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-slate-300" />
          <span className="size-2.5 rounded-full bg-slate-300" />
          <span className="size-2.5 rounded-full bg-slate-300" />
        </span>
        <span className="ml-2 truncate">Sample website with the assistant and online booking switched on</span>
      </div>
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <p className="flex min-w-0 items-center gap-2 font-semibold text-slate-900">
          <Leaf className="size-5 shrink-0 text-(--accent)" aria-hidden="true" />
          <span className="truncate">{name}</span>
        </p>
        <p className="hidden shrink-0 gap-5 text-sm text-slate-600 sm:flex" aria-hidden="true">
          <span>Services</span>
          <span>Offices</span>
          <span>Book</span>
        </p>
      </div>
      <div className="bg-[linear-gradient(135deg,#f0fdfa_0%,#ffffff_55%,#f7fee7_100%)] px-5 py-9 sm:px-8 sm:py-12">
        <p className="text-xs font-semibold tracking-[0.16em] text-(--accent-ink) uppercase">Harare · Johannesburg · Online</p>
        <h3 className="mt-3 max-w-lg text-2xl leading-tight font-bold text-slate-900 sm:text-3xl">Wellness education and consultations, in person or online</h3>
        <p className="mt-3 max-w-lg text-slate-700">
          One-to-one consultations and practical wellness education at our offices in Harare and Johannesburg, or by video call
          from wherever you are.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={onBook} className="inline-flex h-11 items-center gap-2 rounded-lg bg-(--accent) px-5 text-sm font-semibold text-white hover:bg-(--accent-strong)">
            <CalendarPlus className="size-4" aria-hidden="true" />
            Book a consultation
          </button>
          <button
            type="button"
            onClick={focusChat}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            <Bot className="size-4" aria-hidden="true" />
            Ask {BUSINESS.assistant}
          </button>
        </div>
      </div>

      <div className="px-5 py-6 sm:px-8">
        <h4 className="text-sm font-semibold tracking-wide text-slate-900 uppercase">Services and indicative prices</h4>
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SERVICES.map((s) => (
            <li key={s.id} className="rounded-xl border border-slate-200 p-3">
              <p className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-slate-900">{s.name}</span>
                <span className="shrink-0 text-sm font-semibold text-(--accent-ink)">{priceLabel(s)}</span>
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                {s.minutes} min · {s.modes.length === 1 ? 'Online' : s.modes.includes('johannesburg') ? 'In person or online' : 'Harare or online'}
                {s.enquireOnly ? ' · on enquiry' : ''}
              </p>
              <p className="mt-1 text-xs text-slate-700">{s.summary}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-600">
          Prices in US dollars. Our consultants offer wellness education and lifestyle guidance. They are not doctors and don’t
          diagnose or treat medical conditions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-px border-t border-slate-100 bg-slate-100 sm:grid-cols-3">
        {OFFICES.map((o) => (
          <div key={o.id} className="bg-white p-5">
            <MapPin className="size-5 text-(--accent)" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold text-slate-900">{o.city} office</p>
            <p className="text-xs text-slate-600">{o.area}, {o.country}</p>
            <p className="mt-2 flex gap-1.5 text-xs text-slate-700">
              <Clock className="mt-px size-3.5 shrink-0" aria-hidden="true" />
              {o.hoursText}
            </p>
          </div>
        ))}
        <div className="bg-white p-5">
          <Laptop className="size-5 text-(--accent)" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-slate-900">Online consultations</p>
          <p className="text-xs text-slate-600">Video call, from anywhere</p>
          <p className="mt-2 flex gap-1.5 text-xs text-slate-700">
            <Clock className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            {ONLINE.hoursText}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 border-t border-slate-100 px-5 py-5 text-sm text-slate-700 sm:grid-cols-2 sm:px-8">
        <p>
          <span className="font-semibold text-slate-900">In person. </span>
          {IN_PERSON_HOW}
        </p>
        <p>
          <span className="font-semibold text-slate-900">Online. </span>
          {ONLINE.how}
        </p>
        <p className="text-xs text-slate-600 sm:col-span-2">All times are {BUSINESS.timeLabel}.</p>
      </div>
    </section>
  )
}

function AssistantChat({ business, messages, pending, busy, limitReached, handedOver, onSend, onRestart, onLead, onBook }: Props) {
  const [text, setText] = useState('')
  const [lead, setLead] = useState<null | { handover: boolean }>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const asked = messages.some((m) => m.role === 'user')
  const name = business ?? BUSINESS.name

  // Follow the conversation once it has started; before that, keep the greeting in view.
  useEffect(() => {
    const list = listRef.current
    if (list && asked) list.scrollTop = list.scrollHeight
  }, [messages.length, pending?.text, lead, asked])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = text.trim()
    if (!value || busy || limitReached) return
    onSend(value)
    setText('')
  }

  return (
    <section aria-label={`Chat with ${BUSINESS.assistant}, the ${name} assistant`} className="flex h-[36rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg lg:sticky lg:top-4 lg:h-[42rem]">
      <div className="flex items-center gap-3 bg-(--accent) px-4 py-3 text-white">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15">
          {handedOver ? <UserRound className="size-5" aria-hidden="true" /> : <Bot className="size-5" aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{BUSINESS.assistant}, AI assistant</p>
          <p className="truncate text-xs text-white/90">{handedOver ? `The ${name} team has your details` : name}</p>
        </div>
        <button type="button" onClick={onRestart} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-white hover:bg-white/15">
          <RotateCcw className="size-3.5" aria-hidden="true" />
          New chat
        </button>
      </div>

      <div ref={listRef} role="log" aria-live="polite" aria-label="Conversation" className="flex-1 space-y-2.5 overflow-y-auto bg-slate-50 px-3 py-4">
        {messages.map((m) => (
          <Bubble key={m.id} message={m} business={business} />
        ))}
        {pending &&
          (pending.text ? (
            <Bubble message={{ id: pending.id, role: 'assistant', text: pending.text, source: 'ai' }} business={business} />
          ) : (
            <div className="flex w-fit items-center gap-1 rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-3.5 py-3">
              <span className="sr-only">{BUSINESS.assistant} is typing</span>
              {[0, 1, 2].map((i) => (
                <span key={i} aria-hidden="true" className="size-1.5 animate-typing rounded-full bg-slate-500" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          ))}
        {!asked && !pending && (
          <div className="flex flex-wrap gap-2 pt-1">
            {ASSISTANT_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSend(s)}
                className="rounded-full border border-(--accent)/40 bg-(--accent-soft) px-3 py-1.5 text-left text-sm font-medium text-(--accent-ink) hover:border-(--accent)"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {lead ? (
        <LeadForm
          handover={lead.handover}
          onCancel={() => setLead(null)}
          onSubmit={(input) => {
            onLead(input)
            setLead(null)
          }}
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-1.5 border-t border-slate-100 bg-white px-3 py-2">
            <AppButton size="sm" icon={CalendarPlus} onClick={onBook} className={CHAT_ACTION}>
              Book online
            </AppButton>
            <AppButton size="sm" variant="secondary" onClick={() => setLead({ handover: false })} className={CHAT_ACTION}>
              Leave my details
            </AppButton>
            <AppButton size="sm" variant="secondary" onClick={() => setLead({ handover: true })} className={CHAT_ACTION}>
              Talk to a person
            </AppButton>
          </div>
          <form onSubmit={submit} className="flex items-center gap-2 border-t border-slate-200 bg-white p-3">
            <label htmlFor="wellness-chat-input" className="sr-only">
              Your message
            </label>
            <input
              id="wellness-chat-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={limitReached ? 'Start a new chat to keep asking' : 'Ask about services, prices or booking…'}
              disabled={limitReached}
              autoComplete="off"
              maxLength={500}
              className="h-11 min-w-0 flex-1 rounded-full border border-slate-300 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-500 disabled:bg-slate-100"
            />
            <button
              type="submit"
              disabled={!text.trim() || busy || limitReached}
              aria-label="Send message"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-(--accent) text-white hover:bg-(--accent-strong) disabled:opacity-40"
            >
              <SendHorizontal className="size-5" aria-hidden="true" />
            </button>
          </form>
        </>
      )}
      <p className="border-t border-slate-100 bg-white px-3 py-2 text-[0.7rem] leading-snug text-slate-600">
        A live AI assistant for this sample practice. It doesn’t give medical advice. Please don’t share health details or contact
        details in the chat: the buttons above send your details to the team, not to the AI.
      </p>
    </section>
  )
}

function Bubble({ message, business }: { message: ChatMessage; business: string | null }) {
  if (message.role === 'note') {
    const safety = message.text.startsWith('If this is an emergency')
    return (
      <p
        role={safety ? 'alert' : undefined}
        className={cn(
          'mx-auto w-fit max-w-[92%] rounded-xl px-3 py-1.5 text-center text-xs',
          safety ? 'border border-red-200 bg-red-50 font-semibold text-red-800' : 'bg-slate-200/70 text-slate-700',
        )}
      >
        {personalised(message.text, business)}
      </p>
    )
  }
  const mine = message.role === 'user'
  return (
    <div className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
      <p
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line',
          mine ? 'rounded-tr-sm bg-(--accent) text-white' : 'rounded-tl-sm border border-slate-200 bg-white text-slate-800',
        )}
      >
        <span className="sr-only">{mine ? 'You: ' : `${BUSINESS.assistant}: `}</span>
        {mine ? message.text : personalised(message.text, business)}
      </p>
      {!mine && message.source === 'saved' && <span className="mt-0.5 ml-1 text-[0.65rem] font-medium text-slate-500">Saved answer</span>}
    </div>
  )
}

/** Three equal buttons that wrap their label on a phone instead of overflowing. */
const CHAT_ACTION = 'h-auto min-h-9 px-1.5 py-1 leading-tight whitespace-normal'

const INTERESTS = [...SERVICES.map((s) => s.name), 'Something else']

function LeadForm({ handover, onCancel, onSubmit }: { handover: boolean; onCancel: () => void; onSubmit: (lead: LeadInput) => void }) {
  const id = useId()
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [interest, setInterest] = useState(INTERESTS[1])
  const [tried, setTried] = useState(false)
  const nameError = !validName(name) ? 'Please enter your name.' : undefined
  const contactError = !(validPhone(contact) || validEmail(contact)) ? 'Please enter a phone number (with +263 or +27) or an email address.' : undefined

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setTried(true)
    if (nameError || contactError) return
    onSubmit({ name: name.trim().replace(/\s+/g, ' '), contact: contact.trim(), interest, handover })
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-2.5 border-t border-slate-200 bg-white p-3" aria-label={handover ? 'Talk to a person' : 'Leave your details'}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">{handover ? 'Talk to a person' : 'Leave your details'}</p>
        <button type="button" onClick={onCancel} aria-label="Close the form" className="-mt-1 -mr-1 grid size-8 place-items-center rounded-lg text-slate-600 hover:bg-slate-100">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Your name" htmlFor={`${id}-name`} error={tried ? nameError : undefined}>
          <TextInput id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={60} aria-invalid={tried && !!nameError} />
        </Field>
        <Field label="WhatsApp number or email" htmlFor={`${id}-contact`} error={tried ? contactError : undefined}>
          <TextInput id={`${id}-contact`} value={contact} onChange={(e) => setContact(e.target.value)} inputMode="email" maxLength={100} aria-invalid={tried && !!contactError} />
        </Field>
      </div>
      <Field label="What are you interested in?" htmlFor={`${id}-interest`}>
        <SelectInput id={`${id}-interest`} value={interest} onChange={(e) => setInterest(e.target.value)}>
          {INTERESTS.map((i) => (
            <option key={i}>{i}</option>
          ))}
        </SelectInput>
      </Field>
      <p className="text-[0.7rem] text-slate-600">Goes to the team only, to reply to you. No health information needed.</p>
      <AppButton type="submit" className="w-full">
        {handover ? 'Ask the team to contact me' : 'Send my details'}
      </AppButton>
    </form>
  )
}
