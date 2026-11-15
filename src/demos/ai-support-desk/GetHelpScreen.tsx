import { ArrowRight, Bot, CircleCheck, Info, SendHorizontal } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { clockTime } from '../../lib/format'
import { AppButton, Badge, Field, Notice, Panel, Segmented, TextArea, TextInput } from '../ui'
import { AGENTS, STORE, autoReplyDecision, byTime, validOrderField } from './engine'
import { MoodBadge, PriorityBadge, ReasonList, Spinner } from './parts'
import type { Channel, Order, Settings, Ticket } from './types'

export interface HelpInput {
  channel: Channel
  name: string
  orderField: string
  text: string
}

const EXAMPLES = [
  'Where is my order SO-48213? It was meant to arrive yesterday.',
  'The pole on my Kestrel 2 tent snapped on the first night. I’m going away again on Saturday!!',
  'Can I swap my Ridgeback boots for a size 10? They’re too tight.',
  'I’ve been charged twice for order SO-48190. Please sort this out, I’m not happy.',
]

const CHANNELS: { value: Channel; label: string }[] = [
  { value: 'Web chat', label: 'Web chat' },
  { value: 'Email', label: 'Email' },
  { value: 'WhatsApp', label: 'WhatsApp' },
]

const REPLY_BY: Record<Channel, string> = { 'Web chat': 'here and by email', Email: `by email from ${STORE.email}`, WhatsApp: 'on WhatsApp' }

interface Props {
  settings: Settings
  orders: Order[]
  now: number
  result?: Ticket
  onSubmit: (input: HelpInput) => void
  onReset: () => void
  onOpen: (id: string) => void
}

export function GetHelpScreen({ settings, orders, now, result, onSubmit, onReset, onOpen }: Props) {
  const [channel, setChannel] = useState<Channel>('Web chat')
  const [name, setName] = useState('You')
  const [orderField, setOrderField] = useState('')
  const [text, setText] = useState('')
  const [errors, setErrors] = useState<{ text?: string; order?: string }>({})
  const [reading, setReading] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const resultRef = useRef<HTMLDivElement>(null)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  // The send button disappears with the form, so move focus to the result once it shows.
  useEffect(() => {
    if (!reading && timer.current) {
      timer.current = undefined
      resultRef.current?.focus()
    }
  }, [reading])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const message = text.trim()
    const next = {
      text: message ? undefined : 'Please write your message.',
      order: validOrderField(orderField) ? undefined : 'Order numbers look like SO-48213.',
    }
    setErrors(next)
    if (next.text || next.order) return
    onSubmit({ channel, name, orderField, text: message })
    setReading(true)
    timer.current = window.setTimeout(() => setReading(false), 1200)
  }

  const another = () => {
    setText('')
    setOrderField('')
    onReset()
    window.requestAnimationFrame(() => document.getElementById('help-text')?.focus())
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-3 sm:p-5">
      <p role="status" className="sr-only">
        {reading ? 'Reading your message…' : result ? `Message sent. Your ticket number is ${result.number}.` : ''}
      </p>
      {reading ? (
        <div aria-hidden="true" className="grid min-h-64 place-items-center rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-700 shadow-sm">
          <span className="flex items-center gap-2">
            <Spinner className="text-(--accent)" />
            Reading your message…
          </span>
        </div>
      ) : result ? (
        <div ref={resultRef} tabIndex={-1} className="outline-none">
          <Result ticket={result} order={orders.find((o) => o.number === result.triage?.orderNumber)} settings={settings} now={now} onOpen={onOpen} onAnother={another} />
        </div>
      ) : (
        <Panel
          className="mx-auto max-w-2xl"
          bodyClassName="max-sm:p-3"
          title="How can we help?"
          description="Most order questions are answered straight away. Everything else goes to our team in Cape Town."
        >
          <form noValidate onSubmit={submit} className="space-y-4">
            <div>
              <p className="mb-1 text-xs font-semibold text-slate-700">Contact us by</p>
              <Segmented label="Contact us by" value={channel} onChange={setChannel} options={CHANNELS} className="w-full" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Your name" htmlFor="help-name">
                <TextInput id="help-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={60} />
              </Field>
              <Field label="Order number (optional)" htmlFor="help-order" error={errors.order} hint="It starts with SO-">
                <TextInput
                  id="help-order"
                  value={orderField}
                  onChange={(e) => setOrderField(e.target.value)}
                  placeholder="SO-48213"
                  maxLength={12}
                  aria-invalid={Boolean(errors.order)}
                  aria-describedby={errors.order ? 'help-order-error' : 'help-order-hint'}
                />
              </Field>
            </div>
            <Field label="Your message" htmlFor="help-text" error={errors.text}>
              <TextArea
                id="help-text"
                value={text}
                onChange={(e) => {
                  setText(e.target.value)
                  if (errors.text) setErrors((x) => ({ ...x, text: undefined }))
                }}
                rows={4}
                maxLength={600}
                placeholder="Tell us what you need"
                aria-invalid={Boolean(errors.text)}
                aria-describedby={errors.text ? 'help-text-error' : undefined}
              />
            </Field>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-slate-700">Try an example</p>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {EXAMPLES.map((example) => (
                  <li key={example}>
                    <button
                      type="button"
                      onClick={() => {
                        setText(example)
                        setErrors((x) => ({ ...x, text: undefined }))
                      }}
                      className="h-full min-h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-left text-xs text-slate-800 transition hover:border-(--accent) hover:bg-(--accent-soft)"
                    >
                      {example}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <AppButton type="submit" icon={SendHorizontal} className="w-full sm:w-auto">
              Send message
            </AppButton>
          </form>
        </Panel>
      )}
      <p className="mx-auto flex max-w-2xl gap-2 text-xs text-slate-600">
        <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        In this demo, built-in rules imitate the AI so it works offline. Your version uses an AI model set up with your
        products, policies and past tickets.
      </p>
    </div>
  )
}

function Result({
  ticket,
  order,
  settings,
  now,
  onOpen,
  onAnother,
}: {
  ticket: Ticket
  order?: Order
  settings: Settings
  now: number
  onOpen: (id: string) => void
  onAnother: () => void
}) {
  const t = ticket.triage
  const auto = ticket.messages.find((m) => m.kind === 'auto')
  if (!t) return null
  const agent = AGENTS[t.assignee].name.split(' ')[0]
  const decision = autoReplyDecision(t, order, settings)
  const autoClosed = ticket.autoAnswered && ticket.status === 'Solved' && ticket.solvedAt === ticket.firstReplyAt

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel title="What you see" description={`${ticket.channel} · ${STORE.name}`}>
        <div className="space-y-3">
          <Notice tone="green" icon={CircleCheck} title={`Message received. Your ticket number is #${ticket.number}.`}>
            {auto
              ? 'We’ve sent you an update below.'
              : `${agent} from our team will reply ${REPLY_BY[ticket.channel]} by ${byTime(t.dueAt, now)}.`}
          </Notice>
          <div className="flex flex-col items-end">
            <span className="mb-0.5 px-1 text-[0.7rem] text-slate-600">
              <span className="font-semibold">{ticket.customer.name}</span> · {clockTime(ticket.createdAt)}
            </span>
            <p className="max-w-[85%] rounded-2xl rounded-tr-sm bg-(--accent) px-3.5 py-2.5 text-sm break-words whitespace-pre-line text-white">{ticket.text}</p>
          </div>
          {/* Replies sent from the Inbox show up here too, so both sides of the conversation line up. */}
          {ticket.messages
            .filter((m) => m.kind === 'auto' || m.kind === 'agent')
            .map((m) => (
              <div key={m.id} className="flex flex-col items-start">
                <span className="mb-0.5 flex flex-wrap items-center gap-x-1 px-1 text-[0.7rem] text-slate-600">
                  {m.kind === 'auto' && <Bot className="size-3" aria-hidden="true" />}
                  <span className="font-semibold">{m.kind === 'auto' ? STORE.name : `${m.author.split(' ')[0]} at ${STORE.name}`}</span>·{' '}
                  {m.kind === 'auto' ? 'Sent automatically · ' : ''}
                  {clockTime(m.at)}
                </span>
                <p className="max-w-[85%] rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-3.5 py-2.5 text-sm break-words whitespace-pre-line text-slate-800">
                  {m.text}
                </p>
              </div>
            ))}
          {autoClosed && (
            <p className="text-xs text-slate-600">Your order is on time, so this ticket was closed automatically. Reply any time if you need more help.</p>
          )}
          <AppButton variant="secondary" onClick={onAnother} className="w-full sm:w-auto">
            Send another message
          </AppButton>
        </div>
      </Panel>

      <section aria-labelledby="behind-title" className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-100/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="behind-title" className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Bot className="size-4 text-(--accent-ink)" aria-hidden="true" />
            Behind the scenes
          </h3>
          <Badge>Team view</Badge>
        </div>
        <p className="mt-1 text-xs text-slate-600">What the assistant did the moment the message arrived.</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 rounded-lg bg-white p-3 text-sm">
          <Item label="Topic" className="col-span-2">
            <Badge tone="accent">{t.topic}</Badge>
          </Item>
          <Item label="Priority">
            <PriorityBadge priority={t.priority} />
          </Item>
          <Item label="Mood">
            <MoodBadge mood={t.mood} />
          </Item>
          <Item label="Language">{t.language}</Item>
          <Item label="Order">
            {order ? `${order.number} · ${order.status}` : t.orderNumber ? `${t.orderNumber} not found` : 'No order number found'}
          </Item>
          <Item label="Assigned to">{AGENTS[t.assignee].name}</Item>
          <Item label="Reply due by">{ticket.firstReplyAt ? 'Answered automatically' : byTime(t.dueAt, now)}</Item>
          <Item label="Confidence">
            <span className="flex items-center gap-2">
              <span className="tabular-nums">{t.confidence}%</span>
              <span className="h-1.5 w-full max-w-20 rounded-full bg-slate-200" aria-hidden="true">
                <span className="block h-full rounded-full bg-(--accent)" style={{ width: `${t.confidence}%` }} />
              </span>
            </span>
          </Item>
        </dl>
        <p className="mt-3 text-sm text-slate-800">
          <span className="font-semibold">Automatic answer: </span>
          {ticket.autoAnswered
            ? `Live tracking was sent straight away.${autoClosed ? ' The order is on time, so the ticket was closed.' : ' The ticket stays open for the team to follow up.'}`
            : decision.reason}
        </p>
        <h4 className="mt-4 text-xs font-semibold tracking-wide text-slate-600 uppercase">Why</h4>
        <div className="mt-2">
          <ReasonList reasons={t.reasons} />
        </div>
        <AppButton icon={ArrowRight} className="mt-4 w-full sm:w-auto" onClick={() => onOpen(ticket.id)}>
          Open in Inbox
        </AppButton>
      </section>
    </div>
  )
}

function Item({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-xs text-slate-600">{label}</dt>
      <dd className="mt-0.5 font-medium break-words text-slate-900">{children}</dd>
    </div>
  )
}
