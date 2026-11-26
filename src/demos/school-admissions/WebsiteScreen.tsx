import { BadgeCheck, Bell, Bot, Bus, CalendarDays, CalendarPlus, GraduationCap, HeartHandshake, RotateCcw, SendHorizontal, ShieldCheck, UserRound, Wallet, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { cn } from '../../lib/cn'
import { moneyWhole, zigWhole } from '../../lib/format'
import type { ChatMessage } from '../../receptionist/chat'
import { AppButton, Field, SelectInput, TextInput } from '../ui'
import { ASSISTANT_SUGGESTIONS } from './assistant'
import {
  ADMISSION_STEPS,
  CARE,
  ENTRY_COSTS,
  EXTRAS,
  FEE_BANDS,
  GRADES,
  LEVIES,
  PAYMENT,
  SCHOOL,
  STANDING_NOTICES,
  TERMS_2027,
  TERM_NOTE,
  TRANSFERS,
  ZIG_NOTE,
  leviesTotal,
  type Grade,
} from './business'
import { dayShort, personalised, schoolDay, timeLabel, validEmail, validName, validPhone } from './engine'
import type { Entry, SentNotice } from './types'

export interface LeadInput {
  name: string
  contact: string
  grade: Grade
  entry: Entry
  handover: boolean
}

interface Props {
  business: string | null
  messages: ChatMessage[]
  pending: { id: string; text: string } | null
  busy: boolean
  limitReached: boolean
  handedOver: boolean
  notices: SentNotice[]
  onSend: (text: string) => void
  onRestart: () => void
  onLead: (lead: LeadInput) => void
  onVisit: () => void
}

const CHAT_INPUT = 'school-chat-input'

export function WebsiteScreen(props: Props) {
  return (
    <div className="grid grid-cols-1 gap-5 p-3 sm:p-5 lg:grid-cols-[1fr_24rem] lg:gap-6 xl:grid-cols-[1fr_26rem]">
      <AssistantChat {...props} />
      <SampleWebsite business={props.business} notices={props.notices} onVisit={props.onVisit} />
    </div>
  )
}

function SampleWebsite({ business, notices, onVisit }: { business: string | null; notices: SentNotice[]; onVisit: () => void }) {
  const name = business ?? SCHOOL.name
  const focusChat = () => document.getElementById(CHAT_INPUT)?.focus()
  const urgent = notices.filter((n) => n.urgent).slice(0, 1)
  return (
    <section aria-label={`${name} sample website`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:order-first">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-600">
        <span className="flex gap-1" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-slate-300" />
          <span className="size-2.5 rounded-full bg-slate-300" />
          <span className="size-2.5 rounded-full bg-slate-300" />
        </span>
        <span className="ml-2 truncate">Sample school website with the admissions assistant switched on</span>
      </div>

      {urgent.map((n) => (
        <div key={n.id} role="status" className="flex gap-2.5 border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-900">
          <Bell className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            <span className="font-semibold">{personalised(n.title, business)}. </span>
            {personalised(n.body, business)}
          </p>
        </div>
      ))}

      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <p className="flex min-w-0 items-center gap-2 font-semibold text-slate-900">
          <GraduationCap className="size-5 shrink-0 text-(--accent)" aria-hidden="true" />
          <span className="truncate">{name}</span>
        </p>
        <p className="hidden shrink-0 gap-5 text-sm text-slate-600 sm:flex" aria-hidden="true">
          <span>Admissions</span>
          <span>Fees</span>
          <span>Notices</span>
        </p>
      </div>
      <div className="bg-[linear-gradient(135deg,#eef2ff_0%,#ffffff_55%,#fefce8_100%)] px-5 py-9 sm:px-8 sm:py-12">
        <p className="text-xs font-semibold tracking-[0.16em] text-(--accent-ink) uppercase">ECD to Upper 6 · Day and boarding · {SCHOOL.area}</p>
        <h3 className="mt-3 max-w-lg text-2xl leading-tight font-bold text-slate-900 sm:text-3xl">Admissions for January 2027 and mid-year transfers are open</h3>
        <p className="mt-3 max-w-lg text-slate-700">
          Ask {SCHOOL.assistant} anything about fees, dates, transfers or boarding, day or night, in English or Shona. Then come and see the school.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={onVisit} className="inline-flex h-11 items-center gap-2 rounded-lg bg-(--accent) px-5 text-sm font-semibold text-white hover:bg-(--accent-strong)">
            <CalendarPlus className="size-4" aria-hidden="true" />
            Book a tour or apply
          </button>
          <button
            type="button"
            onClick={focusChat}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            <Bot className="size-4" aria-hidden="true" />
            Ask {SCHOOL.assistant}
          </button>
        </div>
      </div>

      <div className="px-5 py-6 sm:px-8">
        <h4 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-900 uppercase">
          <Wallet className="size-4 text-(--accent)" aria-hidden="true" />
          Fees per term
        </h4>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[22rem] text-sm">
            <caption className="sr-only">Tuition per term in US dollars and ZiG</caption>
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-semibold">Grades</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">USD</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">ZiG (sample rate)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {FEE_BANDS.map((b) => (
                <tr key={b.phase}>
                  <th scope="row" className="px-3 py-2 text-left font-medium text-slate-900">{b.label}</th>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900 tabular-nums">{moneyWhole(b.tuition)}</td>
                  <td className="px-3 py-2 text-right text-slate-700 tabular-nums">{zigWhole(b.tuition)}</td>
                </tr>
              ))}
              {LEVIES.map((l) => (
                <tr key={l.id} className="bg-slate-50/50">
                  <th scope="row" className="px-3 py-2 text-left font-normal text-slate-700">
                    {l.name}
                    <span className="mt-0.5 flex items-center gap-1 text-[0.7rem] text-emerald-800">
                      <BadgeCheck className="size-3" aria-hidden="true" />
                      {l.approval}
                    </span>
                  </th>
                  <td className="px-3 py-2 text-right text-slate-800 tabular-nums">{moneyWhole(l.amount)}</td>
                  <td className="px-3 py-2 text-right text-slate-700 tabular-nums">{zigWhole(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-600">
          Every learner pays the levies ({moneyWhole(leviesTotal())} a term), and there are no others. {EXTRAS.boarding.text} {EXTRAS.transport.text} {EXTRAS.exams} {ZIG_NOTE}
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-3.5">
            <p className="text-sm font-semibold text-slate-900">Before the first term</p>
            <ul className="mt-1.5 space-y-1.5 text-xs text-slate-700">
              <li>{ENTRY_COSTS.application.text}</li>
              <li>{ENTRY_COSTS.deposit.text}</li>
              <li>{ENTRY_COSTS.uniform}</li>
            </ul>
          </div>
          <div className="rounded-xl border border-slate-200 p-3.5">
            <p className="text-sm font-semibold text-slate-900">How to pay</p>
            <ul className="mt-1.5 space-y-1.5 text-xs text-slate-700">
              <li>{PAYMENT.methods}</li>
              <li>{PAYMENT.abroad}</li>
              <li>{PAYMENT.plans}</li>
            </ul>
          </div>
        </div>
        <p className="mt-3 flex gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900">
          <HeartHandshake className="size-4 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold">Our promise. </span>
            {PAYMENT.neverExclude} {PAYMENT.bursaries}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-px border-t border-slate-100 bg-slate-100 md:grid-cols-2">
        <div className="bg-white p-5">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CalendarDays className="size-4 text-(--accent)" aria-hidden="true" />
            Term dates 2027
          </h4>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
            {TERMS_2027.map((t) => (
              <li key={t.name}>
                <span className="font-semibold text-slate-900">{t.name}:</span> {t.opens} to {t.closes}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[0.7rem] text-slate-600">{TERM_NOTE}</p>
        </div>
        <div className="bg-white p-5">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Bell className="size-4 text-(--accent)" aria-hidden="true" />
            Official notices
          </h4>
          <ul className="mt-2 space-y-2 text-xs text-slate-700">
            {notices.slice(0, 2).map((n) => (
              <li key={n.id}>
                <span className="font-semibold text-slate-900">{personalised(n.title, business)}</span>
                <span className="text-slate-500"> · {dayShort(schoolDay(n.at))}, {timeLabel(n.at)}</span>
                <br />
                {personalised(n.body, business)}
              </li>
            ))}
            {STANDING_NOTICES.slice(0, Math.max(0, 2 - notices.length)).map((n) => (
              <li key={n.title}>
                <span className="font-semibold text-slate-900">{n.title}</span>
                <br />
                {n.body}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-100 px-5 py-6 sm:px-8">
        <h4 className="text-sm font-semibold tracking-wide text-slate-900 uppercase">How to apply</h4>
        <ol className="mt-3 space-y-2 text-sm text-slate-700">
          {ADMISSION_STEPS.map((s, i) => (
            <li key={s} className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-(--accent-soft) text-xs font-bold text-(--accent-ink)">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-slate-600">
          <span className="font-semibold text-slate-800">Mid-year transfers. </span>
          {TRANSFERS}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-px border-t border-slate-100 bg-slate-100 sm:grid-cols-3">
        {[
          { icon: Bus, title: 'School bus', text: CARE.transport },
          { icon: HeartHandshake, title: 'Boarding and sick bay', text: CARE.boarding },
          { icon: ShieldCheck, title: 'Registered and safe', text: `${SCHOOL.registration} ${CARE.safeguarding}` },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="bg-white p-5">
            <Icon className="size-5 text-(--accent)" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold text-slate-900">{title}</p>
            <p className="mt-1 text-xs text-slate-700">{text}</p>
          </div>
        ))}
      </div>
      <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-600 sm:px-8">
        {SCHOOL.curriculum} {SCHOOL.results}
      </p>
    </section>
  )
}

function AssistantChat({ business, messages, pending, busy, limitReached, handedOver, onSend, onRestart, onLead, onVisit }: Props) {
  const [text, setText] = useState('')
  const [lead, setLead] = useState<null | { handover: boolean }>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const asked = messages.some((m) => m.role === 'user')
  const name = business ?? SCHOOL.name

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
    <section
      aria-label={`Chat with ${SCHOOL.assistant}, the ${name} admissions assistant`}
      className={cn(
        '@container flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg lg:sticky lg:top-4',
        lead ? 'h-[48rem]' : 'h-[36rem] lg:h-[42rem]',
      )}
    >
      <div className="flex items-center gap-3 bg-(--accent) px-4 py-3 text-white">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15">
          {handedOver ? <UserRound className="size-5" aria-hidden="true" /> : <Bot className="size-5" aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{SCHOOL.assistant}, AI admissions assistant</p>
          <p className="truncate text-xs text-white/90">{handedOver ? 'The admissions office has your details' : name}</p>
        </div>
        <button type="button" onClick={onRestart} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-white hover:bg-white/15">
          <RotateCcw className="size-3.5" aria-hidden="true" />
          New chat
        </button>
      </div>

      <div ref={listRef} role="log" aria-live="polite" aria-label="Conversation" className="min-h-36 flex-1 space-y-2.5 overflow-y-auto bg-slate-50 px-3 py-4">
        {messages.map((m) => (
          <Bubble key={m.id} message={m} business={business} />
        ))}
        {pending &&
          (pending.text ? (
            <Bubble message={{ id: pending.id, role: 'assistant', text: pending.text, source: 'ai' }} business={business} />
          ) : (
            <div className="flex w-fit items-center gap-1 rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-3.5 py-3">
              <span className="sr-only">{SCHOOL.assistant} is typing</span>
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
            <AppButton size="sm" icon={CalendarPlus} onClick={onVisit} className={CHAT_ACTION}>
              Book a tour
            </AppButton>
            <AppButton size="sm" variant="secondary" onClick={() => setLead({ handover: false })} className={CHAT_ACTION}>
              Leave my details
            </AppButton>
            <AppButton size="sm" variant="secondary" onClick={() => setLead({ handover: true })} className={CHAT_ACTION}>
              Talk to a person
            </AppButton>
          </div>
          <form onSubmit={submit} className="flex items-center gap-2 border-t border-slate-200 bg-white p-3">
            <label htmlFor={CHAT_INPUT} className="sr-only">
              Your message
            </label>
            <input
              id={CHAT_INPUT}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={limitReached ? 'Start a new chat to keep asking' : 'Ask about fees, dates or applying…'}
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
      {!lead && (
        <p className="border-t border-slate-100 bg-white px-3 py-2 text-[0.7rem] leading-snug text-slate-600">
          A live AI assistant for this sample school, for parents and guardians. Please don’t type your child’s details or your contact details in the
          chat: the buttons above send your details to the admissions office, not to the AI.
        </p>
      )}
    </section>
  )
}

function Bubble({ message, business }: { message: ChatMessage; business: string | null }) {
  if (message.role === 'note') {
    const safety = message.text.startsWith('If a child is in danger')
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
        <span className="sr-only">{mine ? 'You: ' : `${SCHOOL.assistant}: `}</span>
        {mine ? message.text : personalised(message.text, business)}
      </p>
      {!mine && message.source === 'saved' && <span className="mt-0.5 ml-1 text-[0.65rem] font-medium text-slate-500">Saved answer</span>}
    </div>
  )
}

const CHAT_ACTION = 'h-auto min-h-9 px-1.5 py-1 leading-tight whitespace-normal'

function LeadForm({ handover, onCancel, onSubmit }: { handover: boolean; onCancel: () => void; onSubmit: (lead: LeadInput) => void }) {
  const id = useId()
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [grade, setGrade] = useState<Grade>('Form 1')
  const [entry, setEntry] = useState<Entry>('January 2027')
  const [tried, setTried] = useState(false)
  const nameError = !validName(name) ? 'Please enter your name.' : undefined
  const contactError = !(validPhone(contact) || validEmail(contact)) ? 'Please enter a phone number with the country code, or an email address.' : undefined

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setTried(true)
    if (nameError || contactError) return
    onSubmit({ name: name.trim().replace(/\s+/g, ' '), contact: contact.trim(), grade, entry, handover })
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-2.5 border-t border-slate-200 bg-white p-3" aria-label={handover ? 'Talk to a person' : 'Leave your details'}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">{handover ? 'Talk to a person' : 'Leave your details'}</p>
        <button type="button" onClick={onCancel} aria-label="Close the form" className="-mt-1 -mr-1 grid size-8 place-items-center rounded-lg text-slate-600 hover:bg-slate-100">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 @md:grid-cols-2">
        <Field label="Parent or guardian’s name" htmlFor={`${id}-name`} error={tried ? nameError : undefined}>
          <TextInput id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={60} aria-invalid={tried && !!nameError} />
        </Field>
        <Field label="Phone (WhatsApp) or email" htmlFor={`${id}-contact`} error={tried ? contactError : undefined}>
          <TextInput
            id={`${id}-contact`}
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="+263 77 123 4567"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={100}
            aria-invalid={tried && !!contactError}
          />
        </Field>
        <Field label="Grade" htmlFor={`${id}-grade`}>
          <SelectInput id={`${id}-grade`} value={grade} onChange={(e) => setGrade(e.target.value as Grade)}>
            {GRADES.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Starting" htmlFor={`${id}-entry`}>
          <SelectInput id={`${id}-entry`} value={entry} onChange={(e) => setEntry(e.target.value as Entry)}>
            <option>January 2027</option>
            <option>Mid-year transfer</option>
          </SelectInput>
        </Field>
      </div>
      <p className="text-[0.7rem] text-slate-600">Goes to the admissions office only, not to the AI. No details about your child are needed yet.</p>
      <AppButton type="submit" className="w-full">
        {handover ? 'Ask the office to contact me' : 'Send my details'}
      </AppButton>
    </form>
  )
}
