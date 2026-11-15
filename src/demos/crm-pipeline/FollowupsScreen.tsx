import { AlarmClock, CalendarClock, CircleAlert, CircleCheck, PhoneCall, Sun } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import { clockTime } from '../../lib/format'
import { AppButton, Modal, Notice, Panel, Stat, Toggle } from '../ui'
import { addDays, dayDiff, isOpen, openTasks } from './engine'
import { AutoBadge, DueBadge, NextStepForm, OwnerChip } from './parts'
import type { CrmState, RuleId, Task } from './types'

const RULES: { id: RuleId; label: string; description: string }[] = [
  {
    id: 'stuck',
    label: 'Remind the owner when a deal has no activity for 7 days',
    description: 'Adds a check-in task for whoever owns the deal.',
  },
  {
    id: 'proposal',
    label: 'Create a follow-up 3 days after a proposal is sent',
    description: 'So no proposal sits unanswered.',
  },
  {
    id: 'manager',
    label: 'Alert Monique when a deal over $2,000/month is stuck',
    description: 'Monique gets her own task to ask what’s holding it up.',
  },
]

interface Props {
  state: CrmState
  now: number
  onOpenDeal: (id: string) => void
  onDone: (taskId: string) => void
  onSnooze: (taskId: string, days: number) => void
  onCall: (taskId: string) => void
  onNextStep: (dealId: string, text: string, due: number) => void
  onRule: (rule: RuleId, on: boolean) => void
}

export function FollowupsScreen({ state, now, onOpenDeal, onDone, onSnooze, onCall, onNextStep, onRule }: Props) {
  const [snoozing, setSnoozing] = useState<string | null>(null)
  const [asking, setAsking] = useState<{ dealId: string; done: string } | null>(null)
  const { deals, tasks, rules } = state

  const open = openTasks(tasks).sort((a, b) => a.due - b.due)
  const sections = [
    { id: 'overdue', title: 'Overdue', icon: CircleAlert, list: open.filter((t) => dayDiff(t.due, now) < 0), empty: 'Nothing overdue.' },
    { id: 'today', title: 'Today', icon: Sun, list: open.filter((t) => dayDiff(t.due, now) === 0), empty: 'Nothing else due today.' },
    {
      id: 'upcoming',
      title: 'Upcoming',
      icon: CalendarClock,
      list: open.filter((t) => dayDiff(t.due, now) > 0 && dayDiff(t.due, now) <= 7),
      empty: 'Nothing in the next 7 days.',
    },
  ]
  const later = open.filter((t) => dayDiff(t.due, now) > 7).length
  const doneToday = tasks.filter((t) => t.doneAt && !t.cancelled && dayDiff(t.doneAt, now) === 0)
  const dealFor = (t: Task) => deals.find((d) => d.id === t.dealId)
  const askingDeal = deals.find((d) => d.id === asking?.dealId)

  const done = (t: Task) => {
    onDone(t.id)
    setSnoozing(null)
    const deal = dealFor(t)
    if (deal && isOpen(deal)) setAsking({ dealId: deal.id, done: t.text })
  }

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={CircleAlert} label="Overdue" value={sections[0].list.length} tone={sections[0].list.length ? 'red' : 'neutral'} />
        <Stat icon={Sun} label="Due today" value={sections[1].list.length} tone="amber" />
        <Stat icon={CalendarClock} label="Next 7 days" value={sections[2].list.length} tone="accent" />
        <Stat icon={CircleCheck} label="Done today" value={doneToday.length} tone="green" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          {sections.map((section) => (
            <Panel
              key={section.id}
              title={
                <span className="flex items-center gap-2">
                  <section.icon className={cn('size-4', section.id === 'overdue' ? 'text-red-700' : 'text-slate-600')} aria-hidden="true" />
                  {section.title}
                  <span className="text-slate-600 tabular-nums">({section.list.length})</span>
                </span>
              }
              bodyClassName="p-0!"
            >
              {section.list.length ? (
                <ul className="divide-y divide-slate-100">
                  {section.list.map((t) => {
                    const deal = dealFor(t)
                    if (!deal) return null
                    return (
                      <li key={t.id} className="flex flex-col gap-2.5 p-3 sm:flex-row sm:items-center">
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <button
                              type="button"
                              onClick={() => onOpenDeal(deal.id)}
                              className="text-left text-sm font-semibold break-words text-slate-900 underline-offset-2 hover:underline"
                            >
                              {deal.company}
                            </button>
                            {t.auto && <AutoBadge />}
                          </p>
                          <p className="mt-0.5 text-sm break-words text-slate-800">{t.text}</p>
                          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                            <DueBadge due={t.due} now={now} />
                            <span>{clockTime(t.due, 'en-US')}</span>
                            <OwnerChip owner={t.owner} showName />
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <AppButton variant="success" icon={CircleCheck} onClick={() => done(t)}>
                            Done<span className="sr-only"> for {deal.company}</span>
                          </AppButton>
                          {snoozing === t.id ? (
                            [1, 3].map((days, i) => (
                              <AppButton
                                key={days}
                                variant="secondary"
                                autoFocus={i === 0}
                                onClick={() => {
                                  onSnooze(t.id, days)
                                  setSnoozing(null)
                                }}
                              >
                                <span className="sr-only">Snooze </span>
                                {days === 1 ? '1 day' : '3 days'}
                              </AppButton>
                            ))
                          ) : (
                            <AppButton variant="secondary" icon={AlarmClock} onClick={() => setSnoozing(t.id)}>
                              Snooze<span className="sr-only"> {deal.company}</span>
                            </AppButton>
                          )}
                          <AppButton variant="ghost" icon={PhoneCall} onClick={() => onCall(t.id)}>
                            Call<span className="sr-only"> {deal.contact.name}</span>
                          </AppButton>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="px-4 py-5 text-sm text-slate-600">{section.empty}</p>
              )}
            </Panel>
          ))}
          {later > 0 && <p className="text-xs text-slate-600">{later} more later than next week. They show up here when they’re close.</p>}
        </div>

        <div className="min-w-0">
          <Panel title="Automatic reminders" description="Changes apply straight away.">
            <ul className="divide-y divide-slate-100">
              {RULES.map((rule) => {
                const count = openTasks(tasks).filter((t) => t.auto === rule.id).length
                return (
                  <li key={rule.id} className="py-3 first:pt-0 last:pb-0">
                    <Toggle label={rule.label} description={rule.description} checked={rules[rule.id]} onChange={(on) => onRule(rule.id, on)} />
                    <p className="mt-1 text-xs font-medium text-slate-700">
                      {count} open {count === 1 ? 'reminder' : 'reminders'} from this rule
                    </p>
                  </li>
                )
              })}
            </ul>
          </Panel>
        </div>
      </div>

      <Modal open={Boolean(askingDeal)} onClose={() => setAsking(null)} title="What’s the next step?" description={askingDeal?.company} size="sm">
        {askingDeal && asking && (
          <div className="space-y-4">
            <Notice tone="green" icon={CircleCheck}>
              Marked done and logged on the timeline: {asking.done}
            </Notice>
            <NextStepForm
              id="followup-next"
              initialText=""
              initialDue={addDays(now, 3)}
              now={now}
              submitLabel="Save next step"
              onSave={(text, due) => {
                onNextStep(askingDeal.id, text, due)
                setAsking(null)
              }}
              extra={
                <AppButton variant="ghost" onClick={() => setAsking(null)}>
                  Skip for now
                </AppButton>
              }
            />
          </div>
        )}
      </Modal>
    </div>
  )
}
