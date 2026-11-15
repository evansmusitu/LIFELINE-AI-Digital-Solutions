import { ArrowLeft, Bot, CircleCheck, Globe, Hand, MessageCircle, SendHorizontal, Undo2 } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '../../lib/cn'
import { clockTime, dayAndTime } from '../../lib/format'
import { AppButton, Avatar, Badge, Notice, SelectInput } from '../ui'
import { BOT_NAME, DESIGNER, QUESTIONS, TEMPERATURE_LABEL, scoreBreakdown } from './engine'
import { LEAD_STATUSES, displayName, temperatureTone } from './helpers'
import type { Conversation, Lead, LeadStatus, Settings } from './types'

type Filter = 'all' | 'waiting' | 'team' | 'closed'

interface Props {
  conversations: Conversation[]
  leads: Lead[]
  settings: Settings
  selectedId: string
  now: number
  onSelect: (id: string) => void
  onTakeOver: (id: string) => void
  onReply: (id: string, text: string) => void
  onHandBack: (id: string) => void
  onClose: (id: string) => void
  onLeadStatus: (leadId: string, status: LeadStatus) => void
}

function statusBadge(conv: Conversation) {
  switch (conv.status) {
    case 'bot':
      return <Badge icon={Bot}>{BOT_NAME} is chatting</Badge>
    case 'waiting':
      return <Badge tone="amber" icon={Hand}>Needs a person</Badge>
    case 'agent':
      return <Badge tone="accent">With {(conv.assignedTo ?? DESIGNER).split(' ')[0]}</Badge>
    case 'closed':
      return <Badge tone="neutral" icon={CircleCheck}>Closed</Badge>
  }
}

export function InboxScreen(props: Props) {
  const { conversations, selectedId, onSelect } = props
  const [filter, setFilter] = useState<Filter>('all')
  const [mobileDetail, setMobileDetail] = useState(false)

  const sorted = [...conversations].sort((a, b) => {
    const rank = (c: Conversation) => (c.status === 'waiting' ? 0 : c.live ? 1 : c.status === 'closed' ? 3 : 2)
    return rank(a) - rank(b) || b.updatedAt - a.updatedAt
  })
  const counts = {
    all: conversations.length,
    waiting: conversations.filter((c) => c.status === 'waiting').length,
    team: conversations.filter((c) => c.status === 'agent').length,
    closed: conversations.filter((c) => c.status === 'closed').length,
  }
  const shown = sorted.filter((c) =>
    filter === 'all' ? true : filter === 'waiting' ? c.status === 'waiting' : filter === 'team' ? c.status === 'agent' : c.status === 'closed',
  )
  const selected = conversations.find((c) => c.id === selectedId) ?? sorted[0]

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'waiting', label: 'Needs a person' },
    { id: 'team', label: 'With team' },
    { id: 'closed', label: 'Closed' },
  ]

  return (
    <div className="grid grid-cols-1 lg:h-[44rem] lg:grid-cols-[19rem_minmax(0,1fr)] xl:grid-cols-[19rem_minmax(0,1fr)_20rem]">
      <aside
        aria-label="Conversations"
        className={cn('flex min-h-0 flex-col border-slate-200 bg-white lg:border-r', mobileDetail && 'max-lg:hidden')}
      >
        <div className="no-scrollbar flex gap-1.5 relative overflow-x-auto border-b border-slate-100 p-3">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition',
                filter === f.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
              )}
            >
              {f.label} <span className="tabular-nums opacity-80">{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
          {shown.map((conv) => {
            const last = conv.messages[conv.messages.length - 1]
            const active = conv.id === selected?.id
            return (
              <li key={conv.id}>
                <button
                  type="button"
                  aria-current={active ? 'true' : undefined}
                  onClick={() => {
                    onSelect(conv.id)
                    setMobileDetail(true)
                  }}
                  className={cn(
                    'flex w-full gap-3 px-3 py-3 text-left transition',
                    active ? 'bg-(--accent-soft)' : 'hover:bg-slate-50',
                  )}
                >
                  <Avatar name={conv.contact.name ?? (conv.live ? 'You' : 'Website visitor')} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-slate-900">{displayName(conv)}</span>
                      {conv.unread && <span className="size-2 shrink-0 rounded-full bg-(--accent)" aria-label="Unread" />}
                      <span className="ml-auto shrink-0 text-xs text-slate-600 tabular-nums">{clockTime(conv.updatedAt)}</span>
                    </span>
                    {conv.contact.company && <span className="block truncate text-xs text-slate-600">{conv.contact.company}</span>}
                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {statusBadge(conv)}
                      {conv.temperature && (
                        <Badge tone={temperatureTone[conv.temperature]}>
                          {TEMPERATURE_LABEL[conv.temperature]} {conv.score}
                        </Badge>
                      )}
                    </span>
                    {last && <span className="mt-1.5 block truncate text-xs text-slate-600">{last.text}</span>}
                  </span>
                </button>
              </li>
            )
          })}
          {shown.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-slate-600">Nothing here right now. Every chat is covered.</li>
          )}
        </ul>
      </aside>

      {selected && (
        <div className={cn('min-h-0 lg:h-[44rem] lg:overflow-y-auto xl:contents', !mobileDetail && 'max-lg:hidden')}>
          <Thread {...props} conversation={selected} onBack={() => setMobileDetail(false)} />
          <LeadPanel {...props} conversation={selected} />
        </div>
      )}
    </div>
  )
}

function suggestedReplies(conv: Conversation): string[] {
  const first = (conv.contact.name ?? '').split(' ')[0]
  const hello = first ? `Hi ${first}, ` : 'Hi, '
  const size = QUESTIONS.size.options.find((o) => o.id === conv.answers.size)?.label
  return [
    `${hello}Omar here from Dunebridge. Thanks for the details${size ? ` on your ${size} space` : ''}. Could we have a 15-minute call tomorrow morning?`,
    'Would you like us to visit the space this week? I can do Tuesday at 11:00 or Wednesday at 15:00.',
    'I’ll email you a few similar projects and a cost range today, so you can share them with your team.',
  ]
}

function Thread({
  conversation: conv,
  now,
  onTakeOver,
  onReply,
  onHandBack,
  onClose,
  onBack,
}: Props & { conversation: Conversation; onBack: () => void }) {
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const canReply = conv.status === 'agent' && conv.assignedTo === DESIGNER

  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [conv.id, conv.messages.length])

  const send = () => {
    const text = draft.trim()
    if (!text) return
    onReply(conv.id, text)
    setDraft('')
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      send()
    }
  }

  return (
    <section
      aria-label={`Conversation with ${displayName(conv)}`}
      className="flex h-[36rem] min-w-0 flex-col bg-slate-50 lg:h-[44rem] xl:h-auto xl:min-h-0"
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="grid size-8 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{displayName(conv)}</p>
          <p className="flex items-center gap-1.5 text-xs text-slate-600">
            {conv.channel === 'WhatsApp' ? <MessageCircle className="size-3.5" aria-hidden="true" /> : <Globe className="size-3.5" aria-hidden="true" />}
            {conv.channel} · started {dayAndTime(conv.startedAt, now)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(conv.status === 'bot' || conv.status === 'waiting' || (conv.status === 'agent' && conv.assignedTo !== DESIGNER)) && (
            <AppButton icon={Hand} onClick={() => onTakeOver(conv.id)}>
              Take over as Omar
            </AppButton>
          )}
          {canReply && (
            <>
              <AppButton variant="secondary" size="sm" icon={Undo2} onClick={() => onHandBack(conv.id)}>
                Hand back to {BOT_NAME}
              </AppButton>
              <AppButton variant="secondary" size="sm" icon={CircleCheck} onClick={() => onClose(conv.id)}>
                Close chat
              </AppButton>
            </>
          )}
        </div>
      </div>

      {conv.status === 'waiting' && (
        <Notice tone="amber" icon={Hand} className="mx-4 mt-3" title="This customer is waiting for a person">
          {conv.handoffReason}. Take over to reply. {BOT_NAME} has already collected the details on the right.
        </Notice>
      )}
      {conv.status === 'agent' && conv.assignedTo !== DESIGNER && (
        <Notice tone="neutral" className="mx-4 mt-3">
          {conv.assignedTo} is handling this chat. You can join if they need help.
        </Notice>
      )}

      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {conv.messages.map((message) =>
          message.from === 'system' ? (
            <p key={message.id} className="mx-auto w-fit rounded-full bg-slate-200/70 px-3 py-1 text-center text-xs text-slate-700">
              {message.text}
            </p>
          ) : (
            <div key={message.id} className={cn('flex flex-col', message.from === 'visitor' ? 'items-start' : 'items-end')}>
              <span className="mb-0.5 px-1 text-[0.7rem] text-slate-600">
                <span className="font-semibold">
                  {message.from === 'visitor' ? displayName(conv) : message.from === 'bot' ? `${BOT_NAME} (assistant)` : (message.author ?? DESIGNER)}
                </span>{' '}
                · {clockTime(message.at)}
              </span>
              <p
                className={cn(
                  'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line',
                  message.from === 'visitor' && 'rounded-tl-sm border border-slate-200 bg-white text-slate-800',
                  message.from === 'bot' && 'rounded-tr-sm bg-slate-200 text-slate-800',
                  message.from === 'agent' && 'rounded-tr-sm bg-(--accent) text-white',
                )}
              >
                {message.text}
              </p>
            </div>
          ),
        )}
      </div>

      {canReply ? (
        <div className="border-t border-slate-200 bg-white p-3">
          <p className="mb-2 text-xs font-semibold text-slate-600">Suggested replies</p>
          <div className="no-scrollbar mb-2 flex gap-2 relative overflow-x-auto">
            {suggestedReplies(conv).map((reply) => (
              <button
                key={reply}
                type="button"
                onClick={() => setDraft(reply)}
                className="max-w-64 shrink-0 truncate rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 hover:border-(--accent)"
                title={reply}
              >
                {reply}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <label htmlFor="agent-reply" className="sr-only">
              Reply as {DESIGNER}
            </label>
            <textarea
              id="agent-reply"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              rows={2}
              maxLength={500}
              placeholder={`Reply as ${DESIGNER}…`}
              className="min-h-11 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500"
            />
            <AppButton icon={SendHorizontal} onClick={send} disabled={!draft.trim()}>
              Send
            </AppButton>
          </div>
        </div>
      ) : (
        conv.status === 'closed' && (
          <p className="border-t border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">This conversation is closed.</p>
        )
      )}
    </section>
  )
}

function LeadPanel({
  conversation: conv,
  leads,
  settings,
  onLeadStatus,
}: Props & { conversation: Conversation }) {
  const lead = leads.find((l) => l.id === conv.leadId)
  const { score, lines } = scoreBreakdown(conv.answers, settings)
  const answered = lines.filter((l) => l.answer).length
  const finalScore = lead?.score ?? conv.score
  const temperature = lead?.temperature ?? conv.temperature

  return (
    <aside aria-label="Lead details" className="border-t border-slate-200 bg-white p-4 xl:min-h-0 xl:overflow-y-auto xl:border-t-0 xl:border-l">
      <p className="text-xs font-semibold tracking-wide text-slate-600 uppercase">Lead score</p>
      <div className="mt-2 flex items-center gap-3">
        <p className="text-4xl font-bold text-slate-900 tabular-nums">{finalScore ?? score}</p>
        <div>
          {temperature ? (
            <Badge tone={temperatureTone[temperature]}>{TEMPERATURE_LABEL[temperature]} lead</Badge>
          ) : (
            <Badge>Qualifying</Badge>
          )}
          <p className="mt-1 text-xs text-slate-600">
            {temperature ? `Hot from ${settings.threshold}` : `${answered} of ${lines.length} questions answered`}
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {lines.map((line) => (
          <li key={line.question}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-slate-600">{line.label}</span>
              <span className="text-right font-medium text-slate-900">{line.answer ?? 'Not asked yet'}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-slate-100" aria-hidden="true">
              <div className="h-full rounded-full bg-(--accent)" style={{ width: `${(line.points / line.max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>

      <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-600">Company</dt>
          <dd className="text-right font-medium text-slate-900">{conv.contact.company || 'Not given'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-600">Contact</dt>
          <dd className="text-right font-medium break-all text-slate-900">{conv.contact.email ?? conv.contact.phone ?? 'Not given yet'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-600">Owner</dt>
          <dd className="text-right font-medium text-slate-900">{lead?.owner ?? conv.assignedTo ?? 'Unassigned'}</dd>
        </div>
      </dl>

      {lead && (
        <>
          <div className="mt-5 rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-600">Assistant summary</p>
            <p className="mt-1 text-sm text-slate-800">{lead.summary}</p>
          </div>
          <div className="mt-4">
            <label htmlFor="inbox-lead-status" className="mb-1 block text-xs font-semibold text-slate-700">
              Lead status
            </label>
            <SelectInput id="inbox-lead-status" value={lead.status} onChange={(e) => onLeadStatus(lead.id, e.target.value as LeadStatus)}>
              {LEAD_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </SelectInput>
          </div>
        </>
      )}
    </aside>
  )
}
