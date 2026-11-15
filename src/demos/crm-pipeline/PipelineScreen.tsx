import { GripVertical, Info, Search, SendHorizontal, TrendingUp, Trophy } from 'lucide-react'
import { useEffect, useRef, useState, type DragEvent } from 'react'
import { cn } from '../../lib/cn'
import { firstName, moneyWhole, num, shortDate } from '../../lib/format'
import { AppButton, Badge, Field, Modal, Notice, SelectInput, TextInput } from '../ui'
import { DealDetail, type DealActions } from './DealDetail'
import {
  ADD_ONS,
  BUSINESS,
  LOST_REASONS,
  OWNERS,
  OWNER_IDS,
  SOURCES,
  STAGES,
  addDays,
  dayDiff,
  daysSince,
  forecast,
  fromDateInput,
  isOpen,
  isStuck,
  monthly,
  nextTask,
  perWeekLabel,
  priceProposal,
  stageLabel,
  stageTotals,
  toDateInput,
} from './engine'
import { useMediaQuery } from './hooks'
import { DueBadge, EmailPreview, OwnerChip, SourceBadge, StuckBadge } from './parts'
import type { CrmState, Deal, LostReason, OwnerId, ProposalInput, Source, Stage, Task } from './types'

export interface PipelineActions extends Omit<DealActions, 'move'> {
  move: (id: string, stage: Stage, extra?: { lostReason?: LostReason; startDate?: number }) => void
  sendProposal: (id: string, input: ProposalInput) => void
}

interface Props {
  state: CrmState
  now: number
  openId: string | null
  highlightId: string | null
  onOpen: (id: string | null) => void
  actions: PipelineActions
}

export function PipelineScreen({ state, now, openId, highlightId, onOpen, actions }: Props) {
  const [owner, setOwner] = useState<OwnerId | 'all'>('all')
  const [source, setSource] = useState<Source | 'all'>('all')
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState<{ id: string; stage: 'won' | 'lost'; fromBoard: boolean } | null>(null)
  // A moved card remounts in its new column. Focus its menu there, which also scrolls the board to it.
  const [moved, setMoved] = useState({ id: '', n: 0 })
  const focusMoved = (id: string) => setMoved((m) => ({ id, n: m.n + 1 }))
  const [preview, setPreview] = useState<{ id: string; input: ProposalInput } | null>(null)
  const [over, setOver] = useState<Stage | null>(null)
  // The dragged card lives in a ref: re-rendering during dragstart can cancel the drag in some browsers.
  const dragId = useRef<string | null>(null)
  const wide = useMediaQuery('(min-width: 768px)')
  const canDrag = useMediaQuery('(pointer: fine)')

  const { deals, tasks } = state
  const scoped = deals.filter((d) => (owner === 'all' || d.owner === owner) && (source === 'all' || d.source === source))
  const q = query.trim().toLowerCase()
  const shown = scoped.filter((d) => !q || d.company.toLowerCase().includes(q))
  const f = forecast(scoped)
  const totals = stageTotals(shown)
  const open = deals.find((d) => d.id === openId)
  const pendingDeal = deals.find((d) => d.id === pending?.id)
  const previewDeal = deals.find((d) => d.id === preview?.id)

  const requestMove = (id: string, stage: Stage, fromBoard = false) => {
    const deal = deals.find((d) => d.id === id)
    if (!deal || deal.stage === stage) return
    if (stage === 'won' || stage === 'lost') return setPending({ id, stage, fromBoard })
    actions.move(id, stage)
    if (fromBoard) focusMoved(id)
  }

  const dealActions: DealActions = { ...actions, move: requestMove }

  const drop = (event: DragEvent, stage: Stage) => {
    event.preventDefault()
    const id = dragId.current
    dragId.current = null
    setOver(null)
    if (id) requestMove(id, stage)
  }

  const board = (
    <div className="space-y-4 p-3 sm:p-5">
      <div className="flex items-start gap-2.5 rounded-xl border border-(--accent)/25 bg-(--accent-soft) px-4 py-3 text-sm text-(--accent-ink)">
        <TrendingUp className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          <span className="font-semibold">Forecast this month:</span> {moneyWhole(f.weighted)} weighted · {moneyWhole(f.ifProposalsClose)} if all
          proposals close
          {owner !== 'all' && <span className="text-(--accent-ink)/80"> ({firstName(OWNERS[owner].name)}’s deals)</span>}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <div className="relative col-span-2 sm:min-w-56 sm:flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <label htmlFor="crm-search" className="sr-only">
            Search by company
          </label>
          <TextInput id="crm-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by company" className="pl-9" />
        </div>
        <label htmlFor="crm-owner" className="sr-only">
          Owner
        </label>
        <SelectInput id="crm-owner" value={owner} onChange={(e) => setOwner(e.target.value as OwnerId | 'all')} className="min-w-0 sm:w-44">
          <option value="all">All owners</option>
          {OWNER_IDS.map((id) => (
            <option key={id} value={id}>
              {firstName(OWNERS[id].name)}
            </option>
          ))}
        </SelectInput>
        <label htmlFor="crm-source" className="sr-only">
          Source
        </label>
        <SelectInput id="crm-source" value={source} onChange={(e) => setSource(e.target.value as Source | 'all')} className="min-w-0 sm:w-44">
          <option value="all">All sources</option>
          {SOURCES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </SelectInput>
      </div>

      <p className="flex items-start gap-1.5 text-xs text-slate-600">
        <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        <span>
          {canDrag ? 'Drag a card to another column, or use “Move to…” on the card.' : 'Use “Move to…” on a card to change its stage.'}{' '}
          <span className="xl:hidden">Scroll the board sideways to see every stage.</span>
        </span>
      </p>
      {shown.length === 0 && <Notice tone="neutral">No deals match these filters.</Notice>}

      <div
        role="region"
        aria-label="Pipeline board"
        tabIndex={0}
        className="relative -mx-3 snap-x snap-mandatory scroll-px-3 overflow-x-auto px-3 pb-2 sm:-mx-5 sm:scroll-px-5 sm:px-5 xl:snap-none"
      >
        <ol className="flex gap-3 xl:grid xl:grid-cols-7 xl:gap-2">
          {STAGES.map((stage) => {
            const total = totals.find((t) => t.stage === stage.id)!
            const cards = shown.filter((d) => d.stage === stage.id).sort((a, b) => b.stageSince - a.stageSince)
            return (
              <li
                key={stage.id}
                aria-labelledby={`col-${stage.id}`}
                onDragOver={(e) => {
                  if (!dragId.current) return
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  if (over !== stage.id) setOver(stage.id)
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver((o) => (o === stage.id ? null : o))
                }}
                onDrop={(e) => drop(e, stage.id)}
                className={cn(
                  'flex w-64 shrink-0 snap-start flex-col rounded-xl border xl:w-auto xl:min-w-0',
                  over === stage.id ? 'border-(--accent) bg-(--accent-soft) ring-2 ring-(--accent)/40' : 'border-slate-200 bg-slate-100',
                )}
              >
                <div className="px-3 pt-3 pb-2 xl:px-2.5">
                  <h3 id={`col-${stage.id}`} className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-900">
                    <span className="truncate">{stage.label}</span>
                    <span className="rounded-full bg-white px-2 text-xs leading-5 tabular-nums ring-1 ring-slate-200">
                      {total.count}
                      <span className="sr-only"> {total.count === 1 ? 'deal' : 'deals'}</span>
                    </span>
                  </h3>
                  <p className="mt-0.5 text-xs font-medium text-slate-800 tabular-nums">{monthly(total.value)}</p>
                  <p className="text-xs text-slate-600 tabular-nums">
                    {moneyWhole(total.weighted)} weighted ({stage.probability}%)
                  </p>
                </div>
                <ul className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-2">
                  {cards.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      task={nextTask(tasks, deal.id)}
                      now={now}
                      highlight={deal.id === highlightId}
                      focusMove={deal.id === moved.id ? moved.n : 0}
                      draggable={canDrag}
                      onOpen={() => onOpen(deal.id)}
                      onMove={(s) => requestMove(deal.id, s, true)}
                      onDragStart={(e) => {
                        dragId.current = deal.id
                        e.dataTransfer.effectAllowed = 'move'
                        e.dataTransfer.setData('text/plain', deal.company)
                      }}
                      onDragEnd={() => {
                        dragId.current = null
                        setOver(null)
                      }}
                    />
                  ))}
                  {cards.length === 0 && (
                    <li className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-600">
                      {over === stage.id ? 'Drop to move here' : 'No deals'}
                    </li>
                  )}
                </ul>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )

  return (
    <>
      {open && !wide ? (
        <div className="p-3 sm:p-5">
          <DealDetail key={open.id} deal={open} tasks={tasks} now={now} layout="panel" actions={dealActions} onBack={() => onOpen(null)} onPreview={(input) => setPreview({ id: open.id, input })} />
        </div>
      ) : (
        board
      )}

      <Modal
        open={Boolean(open) && wide}
        onClose={() => onOpen(null)}
        title={open?.company ?? 'Deal'}
        description={open ? `${stageLabel(open.stage)} · ${OWNERS[open.owner].name}` : undefined}
        size="lg"
      >
        {open && wide && (
          <DealDetail key={open.id} deal={open} tasks={tasks} now={now} layout="modal" actions={dealActions} onBack={() => onOpen(null)} onPreview={(input) => setPreview({ id: open.id, input })} />
        )}
      </Modal>

      {pending && pendingDeal && (
        <CloseModal
          key={pending.id + pending.stage}
          deal={pendingDeal}
          stage={pending.stage}
          now={now}
          onClose={() => setPending(null)}
          onConfirm={(extra) => {
            actions.move(pendingDeal.id, pending.stage, extra)
            if (pending.fromBoard) focusMoved(pendingDeal.id)
            setPending(null)
          }}
        />
      )}

      {/* Stays mounted, so closing it returns focus to the "Send proposal" button. */}
      <ProposalPreview
        deal={previewDeal}
        input={preview?.input}
        onClose={() => setPreview(null)}
        onSend={() => {
          if (previewDeal && preview) actions.sendProposal(previewDeal.id, preview.input)
          setPreview(null)
        }}
      />
    </>
  )
}

interface CardProps {
  deal: Deal
  task?: Task
  now: number
  highlight: boolean
  /** Changes each time this card is moved from the board, so its menu gets focus in the new column. */
  focusMove: number
  draggable: boolean
  onOpen: () => void
  onMove: (stage: Stage) => void
  onDragStart: (event: DragEvent) => void
  onDragEnd: () => void
}

function DealCard({ deal, task, now, highlight, focusMove, draggable, onOpen, onMove, onDragStart, onDragEnd }: CardProps) {
  const ref = useRef<HTMLLIElement>(null)
  const open = isOpen(deal)
  const stuck = isStuck(deal, now)
  const days = daysSince(deal.stageSince, now)

  // A lead that just came in from the website form: make sure it's on screen.
  useEffect(() => {
    if (highlight) ref.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [highlight])

  useEffect(() => {
    if (focusMove) ref.current?.querySelector('select')?.focus()
  }, [focusMove])

  return (
    <li ref={ref} className={cn('rounded-lg border bg-white shadow-sm', highlight ? 'border-(--accent) ring-2 ring-(--accent)/40' : 'border-slate-200')}>
      {/* Firefox can't start a drag on a button, so the body is the drag handle and the name is the button. */}
      <div
        draggable={draggable || undefined}
        onDragStart={draggable ? onDragStart : undefined}
        onDragEnd={draggable ? onDragEnd : undefined}
        onClick={onOpen}
        className={cn('relative cursor-pointer rounded-t-lg p-2.5 text-xs text-slate-700 transition hover:bg-slate-50', draggable && 'active:cursor-grabbing')}
      >
        <h4 className={cn('text-sm leading-snug font-semibold break-words text-slate-900', draggable && 'pr-4')}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onOpen()
            }}
            className="text-left underline-offset-2 hover:underline"
          >
            {deal.company}
          </button>
        </h4>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900 tabular-nums">
            {moneyWhole(deal.value)}
            <span className="text-xs font-normal text-slate-600">/mo</span>
          </p>
          <OwnerChip owner={deal.owner} />
        </div>
        <p className="mt-1.5 flex flex-wrap gap-1">
          {highlight && <Badge tone="accent">Just added</Badge>}
          <SourceBadge source={deal.source} />
          {stuck && <StuckBadge days={daysSince(deal.lastActivityAt, now)} />}
        </p>
        {open ? (
          task ? (
            <>
              <p className="mt-1.5 line-clamp-2 break-words">
                <span className="font-semibold">Next:</span> {task.text}
              </p>
              <p className="mt-1">
                <DueBadge due={task.due} now={now} />
              </p>
            </>
          ) : (
            <p className="mt-1.5 font-semibold text-amber-800">No next step set</p>
          )
        ) : (
          <p className="mt-1.5">
            {deal.stage === 'won' ? `Starts ${deal.startDate ? shortDate(deal.startDate, 'en-US') : 'soon'}` : `Reason: ${deal.lostReason ?? 'not given'}`}
          </p>
        )}
        <p className="mt-1 text-slate-600">
          {!open
            ? `Closed ${shortDate(deal.stageSince, 'en-US')}`
            : days > 0
              ? `${days} ${days === 1 ? 'day' : 'days'} in stage`
              : deal.stage === 'new'
                ? 'Added today'
                : 'Moved here today'}
        </p>
        {draggable && <GripVertical className="pointer-events-none absolute top-2.5 right-1.5 size-4 text-slate-500" aria-hidden="true" />}
      </div>
      <div className="border-t border-slate-100 p-2">
        <label htmlFor={`move-${deal.id}`} className="sr-only">
          Move {deal.company} to another stage
        </label>
        {/* Always shows "Move to…": picking a stage moves the deal, and the menu resets. */}
        <SelectInput id={`move-${deal.id}`} value="" onChange={(e) => onMove(e.target.value as Stage)} className="font-medium xl:h-8 xl:pl-2 xl:text-xs">
          <option value="" disabled>
            Move to…
          </option>
          {STAGES.filter((s) => s.id !== deal.stage).map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </SelectInput>
      </div>
    </li>
  )
}

function CloseModal({
  deal,
  stage,
  now,
  onClose,
  onConfirm,
}: {
  deal: Deal
  stage: 'won' | 'lost'
  now: number
  onClose: () => void
  onConfirm: (extra: { lostReason?: LostReason; startDate?: number }) => void
}) {
  const [reason, setReason] = useState<LostReason | null>(null)
  const [date, setDate] = useState(toDateInput(addDays(now, 14)))
  const start = fromDateInput(date, 18)
  const validStart = start !== null && dayDiff(start, now) >= 0
  const won = stage === 'won'
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={won ? `Mark ${deal.company} as won` : `Mark ${deal.company} as lost`}
      description={`${monthly(deal.value)} · ${OWNERS[deal.owner].name}`}
      footer={
        <>
          <AppButton variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          {won ? (
            <AppButton variant="success" icon={Trophy} disabled={!validStart} onClick={() => start !== null && onConfirm({ startDate: start })}>
              Mark as won
            </AppButton>
          ) : (
            <AppButton variant="danger" disabled={!reason} onClick={() => reason && onConfirm({ lostReason: reason })}>
              Mark as lost
            </AppButton>
          )}
        </>
      }
    >
      {won ? (
        <Field
          label="First cleaning"
          htmlFor="won-start"
          error={validStart ? undefined : 'Choose today or a later date.'}
          hint={`${firstName(OWNERS[deal.owner].name)} gets an onboarding task for tomorrow: keys, alarm codes and the cleaning checklist.`}
        >
          <TextInput id="won-start" type="date" min={toDateInput(now)} value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={!validStart} />
        </Field>
      ) : (
        <fieldset>
          <legend className="mb-2 text-xs font-semibold text-slate-700">Why was it lost?</legend>
          <div className="space-y-1.5">
            {LOST_REASONS.map((r) => (
              <label
                key={r}
                className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg border border-slate-300 px-3 text-sm text-slate-800 has-checked:border-(--accent) has-checked:bg-(--accent-soft)"
              >
                <input type="radio" name="lost-reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="size-4 accent-(--accent)" />
                {r}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-600">Open follow-ups for this deal are closed. Reports use the reason.</p>
        </fieldset>
      )}
    </Modal>
  )
}

function ProposalPreview({ deal, input, onClose, onSend }: { deal?: Deal; input?: ProposalInput; onClose: () => void; onSend: () => void }) {
  return (
    <Modal
      open={Boolean(deal && input)}
      onClose={onClose}
      title="Proposal email preview"
      description={deal && input ? `${deal.company} · ${monthly(priceProposal(input).monthly)}` : undefined}
      footer={
        <>
          <AppButton variant="secondary" onClick={onClose}>
            Back to edit
          </AppButton>
          <AppButton icon={SendHorizontal} onClick={onSend}>
            Send
          </AppButton>
        </>
      }
    >
      {deal && input && <ProposalEmail deal={deal} input={input} />}
      <p className="mt-3 text-xs text-slate-600">
        In this demo nothing is emailed. Your version sends it from your own address, with the proposal attached as a PDF.
      </p>
    </Modal>
  )
}

function ProposalEmail({ deal, input }: { deal: Deal; input: ProposalInput }) {
  const q = priceProposal(input)
  const owner = OWNERS[deal.owner]
  const extras = ADD_ONS.filter((a) => input.addOns.includes(a.id)).map((a) => a.label.toLowerCase())
  return (
    <EmailPreview
      from={`${owner.name} <${owner.email}>`}
      to={`${deal.contact.name} <${deal.contact.email}>`}
      subject={`Your cleaning proposal from ${BUSINESS.name}`}
    >
      <p>Hi {firstName(deal.contact.name)},</p>
      <p>Thanks for your time. Here’s our proposal for cleaning {deal.company}.</p>
      <ul className="list-disc space-y-0.5 pl-5">
        <li>
          {input.facility} space, {num(q.sqft)} sq ft
        </li>
        <li>
          Cleaned {perWeekLabel(input.perWeek)}, about {Math.round(q.visits)} visits a month
        </li>
        {extras.length > 0 && <li>Also included: {extras.join('; ')}</li>}
        <li>All cleaning products and equipment included</li>
      </ul>
      <p className="rounded-lg bg-(--accent-soft) px-3 py-2 font-semibold text-(--accent-ink)">Monthly price: {moneyWhole(q.monthly)}</p>
      <p>Reply to this email to go ahead, and we’ll agree a start date that suits you.</p>
      <p>
        {owner.name}
        <br />
        {owner.role}, {BUSINESS.name}
      </p>
    </EmailPreview>
  )
}
