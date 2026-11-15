import { ArrowLeft, CircleX, Mail, Phone, Plus, SendHorizontal, Trophy } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { dayAndTime, money, moneyWhole, num, shortDate } from '../../lib/format'
import { AppButton, Field, Notice, Segmented, SelectInput, TextArea, TextInput } from '../ui'
import {
  ADD_ONS,
  FACILITIES,
  OWNERS,
  OWNER_IDS,
  PER_WEEK,
  STAGES,
  addDays,
  addOnPrice,
  dayDiff,
  daysSince,
  isOpen,
  isStuck,
  monthly,
  nextTask,
  parseSqft,
  perWeekLabel,
  priceProposal,
  probability,
} from './engine'
import { AutoBadge, DueBadge, NextStepForm, SourceBadge, StuckBadge, Timeline } from './parts'
import type { ActivityKind, AddOn, Deal, OwnerId, PerWeek, ProposalInput, Stage, Task } from './types'

export interface DealActions {
  move: (id: string, stage: Stage) => void
  assign: (id: string, owner: OwnerId) => void
  log: (id: string, entry: { kind: ActivityKind; text: string; outcome?: string }) => void
  nextStep: (id: string, text: string, due: number, taskId?: string) => void
}

interface Props {
  deal: Deal
  tasks: Task[]
  now: number
  layout: 'modal' | 'panel'
  actions: DealActions
  onBack: () => void
  onPreview: (input: ProposalInput) => void
}

function Box({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm', className)}>
      <h4 className="mb-2.5 text-sm font-semibold text-slate-900">{title}</h4>
      {children}
    </section>
  )
}

export function DealDetail({ deal, tasks, now, layout, actions, onBack, onPreview }: Props) {
  const ref = useRef<HTMLElement>(null)
  const task = nextTask(tasks, deal.id)
  const open = isOpen(deal)
  const p = probability(deal.stage)

  // On phones the detail replaces the board, so bring its top into view.
  useEffect(() => {
    const el = ref.current
    if (layout === 'panel' && el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' })
  }, [layout, deal.id])

  return (
    <article ref={ref} aria-label={`Deal: ${deal.company}`} className="scroll-mt-20 space-y-4">
      {layout === 'panel' && (
        <div>
          <AppButton variant="ghost" icon={ArrowLeft} onClick={onBack} className="-ml-3">
            Back to pipeline
          </AppButton>
          <h3 className="mt-1 text-lg font-semibold break-words text-slate-900">{deal.company}</h3>
        </div>
      )}

      <div className="flex flex-wrap items-start gap-x-4 gap-y-2 text-sm">
        <div className="min-w-0 flex-1 basis-56">
          <p className="font-medium text-slate-900">
            {deal.contact.name} <span className="font-normal text-slate-600">· {deal.contact.role}</span>
          </p>
          <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-700">
            <span className="inline-flex items-center gap-1">
              <Phone className="size-3.5" aria-hidden="true" />
              {deal.contact.phone}
            </span>
            <span className="inline-flex min-w-0 items-center gap-1">
              <Mail className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="break-all">{deal.contact.email}</span>
            </span>
          </p>
        </div>
        <p className="flex flex-wrap items-center gap-1.5">
          <SourceBadge source={deal.source} />
          {isStuck(deal, now) && <StuckBadge days={daysSince(deal.lastActivityAt, now)} />}
          <span className="text-xs text-slate-600">Added {shortDate(deal.createdAt, 'en-US')}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[25rem]:grid-cols-2 sm:grid-cols-3">
        <Field label="Stage" htmlFor={`stage-${deal.id}`}>
          <SelectInput id={`stage-${deal.id}`} value={deal.stage} onChange={(e) => actions.move(deal.id, e.target.value as Stage)}>
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Owner" htmlFor={`owner-${deal.id}`}>
          <SelectInput id={`owner-${deal.id}`} value={deal.owner} onChange={(e) => actions.assign(deal.id, e.target.value as OwnerId)}>
            {OWNER_IDS.map((id) => (
              <option key={id} value={id}>
                {OWNERS[id].name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <div className="rounded-lg bg-slate-50 px-3 py-1.5 min-[25rem]:col-span-2 sm:col-span-1">
          <p className="text-xs font-semibold text-slate-700">Monthly value</p>
          <p className="text-lg font-bold text-slate-900 tabular-nums">{monthly(deal.value)}</p>
          <p className="text-xs text-slate-600 tabular-nums">
            {p}% · {moneyWhole((deal.value * p) / 100)} weighted
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Box title="Next step" className="md:col-start-1">
          {open ? (
            <>
              {task ? (
                <p className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-700">
                  <DueBadge due={task.due} now={now} />
                  {task.auto && <AutoBadge />}
                  <span>{dayAndTime(task.due, now, 'en-US')}</span>
                </p>
              ) : (
                <Notice tone="amber" className="mb-3">
                  No next step yet. Add one so this deal doesn’t go quiet.
                </Notice>
              )}
              <NextStepForm
                key={task?.id ?? 'none'}
                id={`next-${deal.id}`}
                initialText={task?.text ?? ''}
                initialDue={task && dayDiff(task.due, now) >= 0 ? task.due : addDays(now, 1)}
                now={now}
                submitLabel="Save next step"
                onSave={(text, due) => actions.nextStep(deal.id, text, due, task?.id)}
              />
            </>
          ) : deal.stage === 'won' ? (
            <Notice tone="green" icon={Trophy} title={`Won ${deal.closedAt ? shortDate(deal.closedAt, 'en-US') : ''}`}>
              {deal.startDate && `Cleaning starts ${shortDate(deal.startDate, 'en-US')}.`} {task && `Next: ${task.text}.`}
            </Notice>
          ) : (
            <Notice tone="red" icon={CircleX} title={`Lost ${deal.closedAt ? shortDate(deal.closedAt, 'en-US') : ''}`}>
              Reason: {deal.lostReason}. Move it back to an open stage to pick it up again.
            </Notice>
          )}
        </Box>

        <Box title="Proposal builder" className="md:col-start-2 md:row-span-2 md:row-start-1 md:self-start">
          {open ? (
            <ProposalBuilder deal={deal} onPreview={onPreview} />
          ) : (
            <p className="text-sm text-slate-700">
              This deal is closed at {monthly(deal.value)}: {num(deal.sqft)} sq ft, {deal.facility.toLowerCase()}, {perWeekLabel(deal.perWeek)}.
            </p>
          )}
        </Box>

        <Box title="Activity" className="md:col-start-1">
          <LogActivity dealId={deal.id} onLog={(entry) => actions.log(deal.id, entry)} />
          <div className="mt-4 border-t border-slate-100 pt-3">
            <Timeline key={deal.id} activities={deal.activities} now={now} limit={5} />
          </div>
        </Box>
      </div>
    </article>
  )
}

const TYPES: { value: 'call' | 'email' | 'note' | 'visit'; label: string }[] = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'note', label: 'Note' },
  { value: 'visit', label: 'Site visit' },
]
const OUTCOMES = ['Spoke to them', 'Left a voicemail', 'No answer', 'Meeting booked', 'Asked for changes', 'Not interested']

function LogActivity({ dealId, onLog }: { dealId: string; onLog: (entry: { kind: ActivityKind; text: string; outcome?: string }) => void }) {
  const [kind, setKind] = useState<(typeof TYPES)[number]['value']>('call')
  const [text, setText] = useState('')
  const [outcome, setOutcome] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!text.trim()) return
    onLog({ kind, text, outcome: outcome || undefined })
    setText('')
    setOutcome('')
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <p className="mb-1 text-xs font-semibold text-slate-700">Type</p>
        <Segmented label="Activity type" value={kind} onChange={setKind} options={TYPES} className="w-full" />
      </div>
      <Field label="What happened" htmlFor={`log-${dealId}`}>
        <TextArea id={`log-${dealId}`} rows={3} maxLength={400} value={text} onChange={(e) => setText(e.target.value)} placeholder="For example: spoke with the office manager about evening cleans" />
      </Field>
      <Field label="Outcome (optional)" htmlFor={`outcome-${dealId}`}>
        <SelectInput id={`outcome-${dealId}`} value={outcome} onChange={(e) => setOutcome(e.target.value)}>
          <option value="">No outcome</option>
          {OUTCOMES.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </SelectInput>
      </Field>
      <AppButton type="submit" variant="secondary" icon={Plus} disabled={!text.trim()}>
        Log activity
      </AppButton>
    </form>
  )
}

const rate = (n: number) => `$${n.toFixed(3)}`

function ProposalBuilder({ deal, onPreview }: { deal: Deal; onPreview: (input: ProposalInput) => void }) {
  const [facility, setFacility] = useState(deal.facility)
  const [sqft, setSqft] = useState(String(deal.sqft))
  const [perWeek, setPerWeek] = useState<PerWeek>(deal.perWeek)
  const [addOns, setAddOns] = useState<AddOn[]>(deal.addOns)
  const size = parseSqft(sqft)
  const valid = Number.isInteger(size) && size >= 300 && size <= 200_000
  const input: ProposalInput = { facility, sqft: valid ? size : 0, perWeek, addOns }
  const q = priceProposal(input)
  const toggle = (id: AddOn) => setAddOns((list) => (list.includes(id) ? list.filter((a) => a !== id) : [...list, id]))
  const id = `quote-${deal.id}`

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 text-xs font-semibold text-slate-700">Facility type</p>
        <Segmented label="Facility type" value={facility} onChange={setFacility} options={FACILITIES.map((f) => ({ value: f, label: f }))} className="w-full" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-1">
        <Field label="Square feet" htmlFor={`${id}-sqft`} error={valid ? undefined : 'Enter a size between 300 and 200,000.'}>
          <TextInput
            id={`${id}-sqft`}
            inputMode="numeric"
            value={sqft}
            onChange={(e) => setSqft(e.target.value)}
            maxLength={7}
            aria-invalid={!valid}
            aria-describedby={valid ? undefined : `${id}-sqft-error`}
          />
        </Field>
        <div>
          <p className="mb-1 text-xs font-semibold text-slate-700">Cleanings per week</p>
          <Segmented
            label="Cleanings per week"
            value={String(perWeek)}
            onChange={(v) => setPerWeek(Number(v) as PerWeek)}
            options={PER_WEEK.map((n) => ({ value: String(n), label: String(n) }))}
            className="w-full"
          />
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold text-slate-700">Add-ons</p>
        <div className="flex flex-col gap-1.5" role="group" aria-label="Add-ons">
          {ADD_ONS.map((a) => {
            const on = addOns.includes(a.id)
            return (
              <button
                key={a.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(a.id)}
                className={cn(
                  'flex min-h-10 items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-left text-sm transition',
                  on ? 'border-(--accent) bg-(--accent-soft) text-(--accent-ink)' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
                )}
              >
                <span className="min-w-0">{a.label}</span>
                <span className="shrink-0 text-xs font-semibold tabular-nums">+{moneyWhole(addOnPrice(a.id, valid ? size : 0))}/mo</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
        <p className="mb-1.5 font-semibold text-slate-900">How the price is worked out</p>
        <ul className="space-y-1 tabular-nums">
          <li>
            Per visit: {num(q.sqft)} sq ft × {rate(q.rate)} ({facility.toLowerCase()} rate) = {money(q.perVisitRaw)}
            {q.minimumApplied && `, so the ${money(q.minimum)} minimum applies`}
          </li>
          <li>
            Visits a month: {perWeek} a week × 4.33 = {q.visits}
          </li>
          <li>
            Cleaning: {money(q.perVisit)} × {q.visits} = {money(q.cleaning)}
          </li>
          {q.addOns.map((a) => (
            <li key={a.id}>
              {a.label}: +{money(a.amount)}
            </li>
          ))}
          <li>Total {money(q.subtotal)}, rounded to the nearest $5</li>
        </ul>
        <p className="mt-2 flex items-baseline justify-between gap-2 border-t border-slate-200 pt-2 text-sm text-slate-900" aria-live="polite">
          <span className="font-semibold">Monthly price</span>
          <span className="text-lg font-bold">{valid ? monthly(q.monthly) : '–'}</span>
        </p>
      </div>

      <AppButton icon={SendHorizontal} className="w-full" disabled={!valid} onClick={() => onPreview(input)}>
        Send proposal
      </AppButton>
      <p className="text-xs text-slate-600">You’ll see the email before it goes.</p>
    </div>
  )
}
