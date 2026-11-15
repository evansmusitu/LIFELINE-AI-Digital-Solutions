import { ArrowLeft, Bot, CircleCheck, PenLine, SendHorizontal, Siren, Sparkles, StickyNote, ThumbsDown, ThumbsUp, WandSparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import { clockTime, dayAndTime, initials } from '../../lib/format'
import { isSameDay } from '../../lib/time'
import { inputClass } from '../styles'
import { AppButton, Badge, Notice, Panel, SelectInput, type Tone } from '../ui'
import { AGENTS, AGENT_IDS, PRIORITIES, TOPICS, draftLanguage, suggestReply, summarise } from './engine'
import { ChannelLabel, DueText, MoodBadge, OrderDetails, PriorityBadge, ReasonList, Spinner } from './parts'
import type { Order, Ticket, TicketStatus, Triage } from './types'

export type TriageEdit = Partial<Pick<Triage, 'topic' | 'priority' | 'mood' | 'language' | 'assignee'>>

type Filter = 'open' | 'urgent' | 'unassigned' | 'waiting' | 'solved'
interface Draft {
  text: string
  fromSuggestion: boolean
}

const FILTERS: { id: Filter; label: string; test: (t: Ticket) => boolean; empty: string }[] = [
  { id: 'open', label: 'Open', test: (t) => t.status === 'Open', empty: 'No open tickets. Every customer has an answer.' },
  { id: 'urgent', label: 'Urgent', test: (t) => t.status !== 'Solved' && t.triage?.priority === 'Urgent', empty: 'No urgent tickets right now.' },
  { id: 'unassigned', label: 'Unassigned', test: (t) => t.status !== 'Solved' && !t.triage, empty: 'Every ticket has an owner.' },
  { id: 'waiting', label: 'Waiting on customer', test: (t) => t.status === 'Waiting on customer', empty: 'No tickets are waiting on a customer.' },
  { id: 'solved', label: 'Solved', test: (t) => t.status === 'Solved', empty: 'Nothing solved yet.' },
]

const same = (list: readonly string[]): [string, string][] => list.map((x) => [x, x])
const LABEL_FIELDS: [key: keyof TriageEdit & keyof Triage, label: string, options: [string, string][]][] = [
  ['topic', 'Topic', same(TOPICS)],
  ['priority', 'Priority', same(PRIORITIES)],
  ['mood', 'Mood', same(['Angry', 'Neutral', 'Positive'])],
  ['language', 'Language', same(['English', 'Afrikaans'])],
  ['assignee', 'Assigned to', AGENT_IDS.map((a) => [a, AGENTS[a].name.split(' ')[0]])],
]

const STATUS_TONE: Record<TicketStatus, Tone> = { Open: 'blue', 'Waiting on customer': 'neutral', Solved: 'green' }
const urgentFirst = (t: Ticket) => (t.status !== 'Solved' && t.triage?.priority === 'Urgent' ? 0 : 1)

interface Props {
  tickets: Ticket[]
  orders: Order[]
  now: number
  selectedId: string
  detailOpen: boolean
  run: { ids: string[]; done: number } | null
  onSelect: (id: string) => void
  onDetail: (open: boolean) => void
  onRunTriage: () => void
  onTriageOne: (id: string) => void
  onEdit: (id: string, edit: TriageEdit) => void
  onReply: (id: string, text: string, fromSuggestion: boolean) => void
  onNote: (id: string, text: string) => void
  onSolve: (id: string) => void
  onEscalate: (id: string) => void
}

export function InboxScreen(props: Props) {
  const { tickets, orders, now, selectedId, detailOpen, run, onSelect, onDetail, onRunTriage } = props
  const [filter, setFilter] = useState<Filter>(() => {
    const initial = tickets.find((t) => t.id === selectedId)
    return (initial && FILTERS.find((f) => f.test(initial))?.id) || 'open'
  })
  // Drafts are kept per ticket, so a reply typed for one customer can never be sent to another.
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const rootRef = useRef<HTMLDivElement>(null)

  const sorted = [...tickets].sort((a, b) => urgentFirst(a) - urgentFirst(b) || b.createdAt - a.createdAt)
  const listFor = (id: Filter) => {
    const list = sorted.filter(FILTERS.find((f) => f.id === id)!.test)
    return id === 'solved' ? list.sort((a, b) => (b.solvedAt ?? 0) - (a.solvedAt ?? 0)) : list
  }
  const shown = listFor(filter)
  const selected = tickets.find((t) => t.id === selectedId) ?? shown[0]
  const untriaged = tickets.filter((t) => !t.triage && t.status !== 'Solved').length
  const reading = run ? run.ids[run.done] : undefined

  // On phones the detail replaces the list, so bring its top into view.
  useEffect(() => {
    const root = rootRef.current
    if (detailOpen && root && root.getBoundingClientRect().top < 0 && window.matchMedia('(max-width: 1023px)').matches) {
      root.scrollIntoView({ block: 'start' })
    }
  }, [detailOpen, selected?.id])

  const chooseFilter = (id: Filter) => {
    setFilter(id)
    const list = listFor(id)
    if (selected && list[0] && !list.some((t) => t.id === selected.id)) onSelect(list[0].id)
  }

  return (
    <div ref={rootRef} className="scroll-mt-20">
      {(untriaged > 0 || run) && (
        <div className="flex flex-wrap items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3">
          <WandSparkles className="size-5 shrink-0 text-amber-800" aria-hidden="true" />
          <p role="status" className="min-w-0 flex-1 text-sm font-medium text-amber-950">
            {run
              ? `Triaging ${Math.min(run.done + 1, run.ids.length)} of ${run.ids.length}…`
              : `${untriaged} new ${untriaged === 1 ? 'ticket' : 'tickets'} waiting for triage`}
          </p>
          <AppButton onClick={onRunTriage} disabled={Boolean(run)} icon={run ? undefined : WandSparkles} className="max-sm:w-full">
            {run && <Spinner />}
            {run ? 'Triaging…' : 'Triage new tickets'}
          </AppButton>
        </div>
      )}

      <div className="grid grid-cols-1 lg:h-[46rem] lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside aria-label="Tickets" className={cn('flex min-h-0 flex-col border-slate-200 bg-white lg:border-r', detailOpen && 'max-lg:hidden')}>
          <div className="flex flex-wrap gap-1.5 border-b border-slate-100 p-3" role="group" aria-label="Filter tickets">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => chooseFilter(f.id)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                  filter === f.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                )}
              >
                {f.label} <span className="tabular-nums opacity-80">{listFor(f.id).length}</span>
              </button>
            ))}
          </div>
          <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
            {shown.map((t) => (
              <li key={t.id}>
                <TicketCard
                  ticket={t}
                  now={now}
                  active={t.id === selected?.id}
                  reading={reading === t.id}
                  onClick={() => {
                    onSelect(t.id)
                    onDetail(true)
                  }}
                />
              </li>
            ))}
            {shown.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-slate-600">
                {filter === 'urgent' && untriaged > 0 ? 'No urgent tickets yet. Triage the new tickets to check.' : FILTERS.find((f) => f.id === filter)?.empty}
              </li>
            )}
          </ul>
        </aside>

        <div className={cn('min-h-0 min-w-0 bg-slate-50 lg:overflow-y-auto', !detailOpen && 'max-lg:hidden')}>
          {selected ? (
            <TicketDetail
              key={selected.id}
              {...props}
              ticket={selected}
              order={orders.find((o) => o.number === selected.triage?.orderNumber)}
              running={Boolean(run)}
              draft={drafts[selected.id] ?? { text: '', fromSuggestion: false }}
              onDraft={(draft) => setDrafts((d) => ({ ...d, [selected.id]: draft }))}
              onBack={() => onDetail(false)}
            />
          ) : (
            <p className="p-8 text-center text-sm text-slate-600">Choose a ticket to see the details.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function TicketCard({ ticket: t, now, active, reading, onClick }: { ticket: Ticket; now: number; active: boolean; reading: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-current={active ? 'true' : undefined}
      onClick={onClick}
      className={cn('block w-full px-3 py-3 text-left transition', active ? 'bg-(--accent-soft)' : 'hover:bg-slate-50')}
    >
      <span className="flex items-baseline gap-2">
        <span className="min-w-0 truncate text-sm font-semibold text-slate-900">{t.customer.name}</span>
        <span className="ml-auto shrink-0 text-xs text-slate-600 tabular-nums">
          #{t.number} · {isSameDay(t.createdAt, now) ? clockTime(t.createdAt) : 'Yesterday'}
        </span>
      </span>
      <span className="mt-0.5 block truncate text-sm text-slate-700">{t.subject}</span>
      <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <ChannelLabel channel={t.channel} className="mr-1" />
        {t.triage ? (
          <>
            <Badge tone="accent">{t.triage.topic}</Badge>
            <PriorityBadge priority={t.triage.priority} />
            {t.triage.mood === 'Angry' && <MoodBadge mood="Angry" />}
          </>
        ) : reading ? (
          <Badge tone="blue">
            <Spinner small />
            Reading…
          </Badge>
        ) : (
          <Badge>Not triaged yet</Badge>
        )}
      </span>
      {t.triage && (
        <span className="mt-1.5 flex items-center justify-between gap-2">
          <DueText ticket={t} now={now} />
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-slate-200 text-[0.62rem] font-bold text-slate-700">
            <span aria-hidden="true">{initials(AGENTS[t.triage.assignee].name)}</span>
            <span className="sr-only">Assigned to {AGENTS[t.triage.assignee].name}</span>
          </span>
        </span>
      )}
    </button>
  )
}

interface LabelSelectProps {
  id: string
  label: string
  value: string
  options: [value: string, label: string][]
  onChange: (value: string) => void
  className?: string
}

function LabelSelect({ id, label, value, options, onChange, className }: LabelSelectProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-slate-700">
        {label}
      </label>
      <SelectInput id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </SelectInput>
    </div>
  )
}

function TicketDetail({
  ticket,
  order,
  now,
  running,
  draft,
  onDraft,
  onBack,
  onTriageOne,
  onEdit,
  onReply,
  onNote,
  onSolve,
  onEscalate,
}: Props & { ticket: Ticket; order?: Order; running: boolean; draft: Draft; onDraft: (draft: Draft) => void; onBack: () => void }) {
  const replyRef = useRef<HTMLTextAreaElement>(null)
  const t = ticket.triage
  const id = ticket.id
  const solved = ticket.status === 'Solved'
  const canEscalate = t && !solved && !(t.assignee === 'thandiwe' && t.priority === 'Urgent')
  const showSuggestion = t && !solved && !ticket.messages.some((m) => m.kind === 'agent')
  const suggestion = showSuggestion ? suggestReply(ticket, order, now) : ''
  const agent = AGENTS[t?.assignee ?? 'thandiwe']

  const send = (kind: 'reply' | 'note') => {
    const text = draft.text.trim()
    if (!text) return
    if (kind === 'reply') onReply(id, text, draft.fromSuggestion)
    else onNote(id, text)
    onDraft({ text: '', fromSuggestion: false })
  }

  return (
    <article aria-label={`Ticket #${ticket.number} from ${ticket.customer.name}`}>
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <AppButton variant="ghost" icon={ArrowLeft} onClick={onBack} className="mb-2 -ml-3 lg:hidden">
          Back to inbox
        </AppButton>
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1 basis-60">
            <h3 className="text-base font-semibold break-words text-slate-900">{ticket.subject}</h3>
            <p className="mt-0.5 text-xs break-words text-slate-600">
              #{ticket.number} · {ticket.customer.name} · <span className="break-all">{ticket.customer.contact}</span>
            </p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <ChannelLabel channel={ticket.channel} />
              <span className="text-xs text-slate-600">{dayAndTime(ticket.createdAt, now)}</span>
              <Badge tone={STATUS_TONE[ticket.status]}>{ticket.status}</Badge>
            </p>
          </div>
          {!solved && (
            <div className="flex flex-wrap gap-2">
              <AppButton variant="secondary" icon={CircleCheck} onClick={() => onSolve(id)}>
                Mark solved
              </AppButton>
              {canEscalate && (
                <AppButton variant="danger" icon={Siren} onClick={() => onEscalate(id)}>
                  Escalate to Thandiwe
                </AppButton>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="space-y-4 p-3 sm:p-4">
        {!t ? (
          <Notice tone="amber" icon={WandSparkles} title="Not triaged yet">
            <p>The assistant hasn’t read this ticket. Triage it to get labels, a summary, the order details and a suggested reply.</p>
            <AppButton className="mt-2" onClick={() => onTriageOne(id)} disabled={running}>
              Triage this ticket
            </AppButton>
          </Notice>
        ) : (
          <>
            <section aria-labelledby={`labels-${id}`} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h4 id={`labels-${id}`} className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                  <Bot className="size-4 text-(--accent-ink)" aria-hidden="true" />
                  Assistant labels
                </h4>
                <p className="text-xs text-slate-600">{t.confidence}% sure · change any label</p>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-5">
                {LABEL_FIELDS.map(([key, label, options]) => (
                  <LabelSelect
                    key={key}
                    id={`${key}-${id}`}
                    label={label}
                    value={t[key]}
                    options={options}
                    onChange={(value) => onEdit(id, { [key]: value } as TriageEdit)}
                    className={key === 'topic' ? 'col-span-2 sm:col-span-1' : undefined}
                  />
                ))}
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-(--accent-ink)">Why the assistant chose these</summary>
                <div className="mt-2">
                  {ticket.corrections > 0 && <p className="mb-2 text-xs text-slate-600">An agent has since changed the topic.</p>}
                  <ReasonList reasons={t.reasons} />
                </div>
              </details>
            </section>
            <Notice tone="accent" icon={Sparkles} title="Summary">
              {summarise(ticket, order)}
            </Notice>
          </>
        )}

        <div className={cn('grid grid-cols-1 gap-4', t?.orderNumber && 'xl:grid-cols-[minmax(0,1fr)_18rem]')}>
          <div className="min-w-0 space-y-4">
            <section aria-labelledby={`thread-${id}`}>
              <h4 id={`thread-${id}`} className="mb-2 text-xs font-semibold tracking-wide text-slate-600 uppercase">
                Conversation
              </h4>
              <ol className="space-y-3">
                {ticket.messages.map((m) => (
                  <li key={m.id}>
                    {m.kind === 'note' ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                        <p className="flex items-center gap-1.5 text-xs font-semibold">
                          <StickyNote className="size-3.5" aria-hidden="true" />
                          Internal note · {m.author} · {dayAndTime(m.at, now)}
                        </p>
                        <p className="mt-1 whitespace-pre-line">{m.text}</p>
                      </div>
                    ) : (
                      <div className={cn('flex flex-col', m.kind === 'customer' ? 'items-start' : 'items-end')}>
                        <span className="mb-0.5 flex flex-wrap items-center gap-x-1 px-1 text-[0.7rem] text-slate-600">
                          {m.kind === 'auto' && <Bot className="size-3" aria-hidden="true" />}
                          <span className="font-semibold">{m.author}</span>· {dayAndTime(m.at, now)}
                          {m.kind === 'auto' && ' · Sent automatically'}
                        </span>
                        <p
                          className={cn(
                            'max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words whitespace-pre-line',
                            m.kind === 'customer' && 'rounded-tl-sm border border-slate-200 bg-white text-slate-800',
                            m.kind === 'auto' && 'rounded-tr-sm bg-slate-200 text-slate-800',
                            m.kind === 'agent' && 'rounded-tr-sm bg-(--accent) text-white',
                          )}
                        >
                          {m.text}
                        </p>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </section>

            {t && showSuggestion && (
              <section aria-labelledby={`suggest-${id}`} className="rounded-xl border border-(--accent)/30 bg-(--accent-soft) p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 id={`suggest-${id}`} className="flex items-center gap-1.5 text-sm font-semibold text-(--accent-ink)">
                    <Sparkles className="size-4" aria-hidden="true" />
                    Suggested reply{draftLanguage(t) === 'Afrikaans' ? ' in Afrikaans' : ''}
                  </h4>
                  <AppButton
                    icon={PenLine}
                    onClick={() => {
                      onDraft({ text: suggestion, fromSuggestion: true })
                      replyRef.current?.focus()
                    }}
                  >
                    Use this reply
                  </AppButton>
                </div>
                {t.language === 'Afrikaans' && draftLanguage(t) === 'English' && (
                  <p className="mt-1 text-xs text-slate-700">Written in English. In this demo, Afrikaans drafts cover order questions.</p>
                )}
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-slate-800">{suggestion}</p>
              </section>
            )}

            {solved ? (
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-700">
                <CircleCheck className="size-4 text-emerald-700" aria-hidden="true" />
                Solved {ticket.solvedAt ? dayAndTime(ticket.solvedAt, now).toLowerCase() : ''}.
                {ticket.rating && (
                  <span className="inline-flex items-center gap-1">
                    {ticket.rating === 'positive' ? <ThumbsUp className="size-4" aria-hidden="true" /> : <ThumbsDown className="size-4" aria-hidden="true" />}
                    Customer rated it {ticket.rating === 'positive' ? 'good' : 'not good'}.
                  </span>
                )}
              </p>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <label htmlFor={`reply-${id}`} className="mb-1 block text-xs font-semibold text-slate-700">
                  Reply as {agent.name}
                  {ticket.channel === 'Email' && <span className="font-normal break-all text-slate-600"> from {agent.email}</span>}
                </label>
                <textarea
                  ref={replyRef}
                  id={`reply-${id}`}
                  value={draft.text}
                  onChange={(e) => onDraft({ ...draft, text: e.target.value })}
                  rows={6}
                  maxLength={2000}
                  placeholder={`Write to ${ticket.customer.name}, or add a note for the team`}
                  className={cn(inputClass, 'w-full resize-y py-2 text-sm leading-relaxed')}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <AppButton icon={SendHorizontal} onClick={() => send('reply')} disabled={!draft.text.trim()}>
                    Send reply
                  </AppButton>
                  <AppButton variant="secondary" icon={StickyNote} onClick={() => send('note')} disabled={!draft.text.trim()}>
                    Add internal note
                  </AppButton>
                </div>
              </div>
            )}
          </div>

          {t?.orderNumber && (
            <Panel title="Order" className="self-start">
              {order ? (
                <OrderDetails order={order} now={now} />
              ) : (
                <Notice tone="amber">There’s no order {t.orderNumber} in the shop. Ask the customer to check the number.</Notice>
              )}
            </Panel>
          )}
        </div>
      </div>
    </article>
  )
}
