import {
  ArrowRightLeft,
  Bot,
  CalendarCheck,
  CircleCheck,
  Clock,
  FileText,
  Globe,
  Hourglass,
  Mail,
  MapPin,
  PhoneCall,
  StickyNote,
  type LucideIcon,
} from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { dayAndTime, initials } from '../../lib/format'
import { AppButton, Badge, Field, TextInput } from '../ui'
import { OWNERS, addDays, dayDiff, dueLabel, fromDateInput, toDateInput } from './engine'
import type { Activity, ActivityKind, OwnerId, Source } from './types'

export function SourceBadge({ source }: { source: Source }) {
  return <Badge tone={source === 'Website form' ? 'blue' : 'neutral'}>{source}</Badge>
}

export function DueBadge({ due, now }: { due: number; now: number }) {
  const label = dueLabel(due, now)
  return (
    <Badge tone={label.tone} icon={Clock}>
      {label.text}
    </Badge>
  )
}

export function StuckBadge({ days }: { days: number }) {
  return (
    <Badge tone="violet" icon={Hourglass}>
      Stuck {days} days
    </Badge>
  )
}

export function AutoBadge() {
  return (
    <Badge tone="accent" icon={Bot}>
      Auto<span className="sr-only">: created automatically</span>
    </Badge>
  )
}

export function OwnerChip({ owner, showName, className }: { owner: OwnerId; showName?: boolean; className?: string }) {
  const name = OWNERS[owner].name
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5 text-xs text-slate-700', className)}>
      <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-(--accent-soft) text-[0.62rem] font-bold text-(--accent-ink)">
        {initials(name)}
      </span>
      <span className={showName ? 'truncate' : 'sr-only'}>{showName ? name : `Owner: ${name}`}</span>
    </span>
  )
}

const KIND: Record<ActivityKind, { icon: LucideIcon; label: string }> = {
  call: { icon: PhoneCall, label: 'Call' },
  email: { icon: Mail, label: 'Email' },
  note: { icon: StickyNote, label: 'Note' },
  visit: { icon: MapPin, label: 'Site visit' },
  stage: { icon: ArrowRightLeft, label: 'Stage' },
  proposal: { icon: FileText, label: 'Proposal' },
  task: { icon: CircleCheck, label: 'Follow-up' },
  form: { icon: Globe, label: 'Website form' },
}

export function Timeline({ activities, now, limit }: { activities: Activity[]; now: number; limit?: number }) {
  const [all, setAll] = useState(false)
  const shown = all || !limit ? activities : activities.slice(0, limit)
  return (
    <>
      <ol className="space-y-3">
        {shown.map((a) => {
          const Icon = KIND[a.kind].icon
          return (
            <li key={a.id} className="flex gap-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700">
                <Icon className="size-3.5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">{KIND[a.kind].label}</span> · {a.author} · {dayAndTime(a.at, now, 'en-US')}
                </p>
                <p className="mt-0.5 text-sm break-words text-slate-800">{a.text}</p>
                {a.outcome && (
                  <Badge className="mt-1" tone="neutral">
                    {a.outcome}
                  </Badge>
                )}
              </div>
            </li>
          )
        })}
      </ol>
      {limit && activities.length > limit && (
        <AppButton variant="ghost" size="sm" className="mt-2 -ml-3" aria-expanded={all} onClick={() => setAll(!all)}>
          {all ? 'Show fewer' : `Show all ${activities.length}`}
        </AppButton>
      )}
    </>
  )
}

const QUICK: [label: string, days: number][] = [
  ['Tomorrow', 1],
  ['In 3 days', 3],
  ['Next week', 7],
]

/** What happens next and when. Used in the deal detail and after a follow-up is done. */
export function NextStepForm({
  id,
  initialText,
  initialDue,
  now,
  submitLabel,
  onSave,
  extra,
}: {
  id: string
  initialText: string
  initialDue: number
  now: number
  submitLabel: string
  onSave: (text: string, due: number) => void
  extra?: ReactNode
}) {
  const [text, setText] = useState(initialText)
  const [date, setDate] = useState(toDateInput(initialDue))
  const [errors, setErrors] = useState<{ text?: string; date?: string }>({})

  const submit = (event: FormEvent) => {
    event.preventDefault()
    // An unchanged date keeps its original time of day.
    const due = date === toDateInput(initialDue) ? initialDue : fromDateInput(date)
    const next = {
      text: text.trim() ? undefined : 'Write what happens next.',
      date: due !== null && dayDiff(due, now) >= 0 ? undefined : 'Choose today or a later date.',
    }
    setErrors(next)
    if (due !== null && !next.text && !next.date) onSave(text.trim(), due)
  }

  return (
    <form noValidate onSubmit={submit} className="space-y-3">
      <Field label="Next step" htmlFor={`${id}-text`} error={errors.text}>
        <TextInput
          id={`${id}-text`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={120}
          placeholder="For example: call to book the walkthrough"
          aria-invalid={Boolean(errors.text)}
          aria-describedby={errors.text ? `${id}-text-error` : undefined}
        />
      </Field>
      <div>
        <Field label="Due date" htmlFor={`${id}-date`} error={errors.date}>
          <TextInput
            id={`${id}-date`}
            type="date"
            min={toDateInput(now)}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-invalid={Boolean(errors.date)}
            aria-describedby={errors.date ? `${id}-date-error` : undefined}
          />
        </Field>
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Quick due dates">
          {QUICK.map(([label, days]) => {
            const value = toDateInput(addDays(now, days))
            return (
              <button
                key={label}
                type="button"
                aria-pressed={date === value}
                onClick={() => setDate(value)}
                className={cn(
                  'min-h-8 rounded-full px-3 py-1 text-xs font-semibold transition',
                  date === value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <AppButton type="submit" icon={CalendarCheck}>
          {submitLabel}
        </AppButton>
        {extra}
      </div>
    </form>
  )
}

/** A simulated email, shown the way the recipient would see it. */
export function EmailPreview({ from, to, subject, children }: { from: string; to: string; subject: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white text-sm">
      <dl className="space-y-0.5 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
        {[
          ['From', from],
          ['To', to],
          ['Subject', subject],
        ].map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <dt className="w-14 shrink-0 font-semibold text-slate-600">{label}</dt>
            <dd className="min-w-0 wrap-anywhere">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="space-y-2.5 px-3 py-3 leading-relaxed text-slate-800">{children}</div>
    </div>
  )
}
