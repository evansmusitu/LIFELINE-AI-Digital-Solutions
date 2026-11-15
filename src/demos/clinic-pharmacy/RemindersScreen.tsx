import { BellRing, CalendarClock, ChevronDown, MessageCircle, MessageSquareReply, Pill, Send, UserX } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import { clockTime } from '../../lib/format'
import { AppButton, Badge, Panel, Stat, TextArea, type Tone } from '../ui'
import { CLINICIANS, fill } from './data'
import { reminderText } from './messages'
import type { Medicine, Patient, Reminder, ReminderKind, ReminderStatus } from './types'

const statusTone: Record<ReminderStatus, Tone> = {
  Scheduled: 'neutral',
  Sent: 'blue',
  Confirmed: 'green',
  'New time requested': 'amber',
  'Refill requested': 'violet',
  'Call booked': 'violet',
}

const SECTIONS: { kind: ReminderKind; title: string; description: string; icon: typeof BellRing }[] = [
  { kind: 'day-before', title: 'Tomorrow’s appointments', description: 'Sent automatically at 16:00 the day before.', icon: CalendarClock },
  { kind: 'same-day', title: 'Today’s appointments', description: 'Sent at 07:00 on the morning of the visit.', icon: BellRing },
  { kind: 'refill', title: 'Medicine refills', description: 'Sent 3 days before a chronic prescription runs out.', icon: Pill },
  { kind: 'missed', title: 'Missed appointments', description: 'Sent when a patient doesn’t arrive.', icon: UserX },
]

const TEMPLATE_LABELS: Record<ReminderKind, string> = {
  'day-before': 'Day before',
  'same-day': 'Same day',
  refill: 'Refill due',
  missed: 'Missed appointment',
}

interface Props {
  reminders: Reminder[]
  patients: Patient[]
  medicines: Medicine[]
  templates: Record<ReminderKind, string>
  onSend: (ids: string[]) => void
  onTemplate: (kind: ReminderKind, text: string) => void
}

export function RemindersScreen({ reminders, patients, medicines, templates, onSend, onTemplate }: Props) {
  const [open, setOpen] = useState<string | null>(null)
  const [editing, setEditing] = useState<ReminderKind>('day-before')
  const sent = reminders.filter((r) => r.status !== 'Scheduled')
  const confirmed = reminders.filter((r) => r.status === 'Confirmed').length
  const awaiting = reminders.filter((r) => r.status === 'Sent').length
  const replies = reminders.filter((r) => r.reply).length

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Send} label="Reminders sent" value={sent.length} tone="accent" />
        <Stat icon={MessageSquareReply} label="Replies" value={replies} detail="Patients answer in the chat" />
        <Stat icon={BellRing} label="Confirmed" value={confirmed} tone="green" />
        <Stat icon={MessageCircle} label="Waiting for a reply" value={awaiting} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          {SECTIONS.map((section) => {
            const list = reminders.filter((r) => r.kind === section.kind)
            const scheduled = list.filter((r) => r.status === 'Scheduled')
            const Icon = section.icon
            return (
              <Panel
                key={section.kind}
                title={
                  <span className="flex items-center gap-2">
                    <Icon className="size-4 text-(--accent)" aria-hidden="true" />
                    {section.title}
                  </span>
                }
                description={section.description}
                action={
                  scheduled.length > 0 && (
                    <AppButton
                      size="sm"
                      icon={Send}
                      onClick={() => onSend(scheduled.map((r) => r.id))}
                      aria-label={`Send ${scheduled.length} ${section.title.toLowerCase()} ${scheduled.length === 1 ? 'reminder' : 'reminders'} now`}
                    >
                      Send {scheduled.length === 1 ? 'now' : `${scheduled.length} now`}
                    </AppButton>
                  )
                }
                bodyClassName="p-0"
              >
                <ul className="divide-y divide-slate-100">
                  {list.map((r) => {
                    const patient = patients.find((p) => p.id === r.patientId)
                    const isOpen = open === r.id
                    return (
                      <li key={r.id}>
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          onClick={() => setOpen(isOpen ? null : r.id)}
                          className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-left hover:bg-slate-50"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-slate-900">{patient?.name}</span>
                            <span className="block text-xs text-slate-600">
                              {r.kind === 'refill'
                                ? medicines.find((m) => m.id === r.medicineId)?.name
                                : `${r.when?.replace(/^\w/, (c) => c.toUpperCase())} · ${CLINICIANS.find((c) => c.id === r.clinicianId)?.short}`}
                              {' · '}
                              {r.channel}
                            </span>
                          </span>
                          {r.reply && (
                            <span className="rounded-md bg-green-50 px-2 py-0.5 text-xs text-green-900">
                              Replied “{r.reply}”{r.repliedAt ? ` at ${clockTime(r.repliedAt)}` : ''}
                            </span>
                          )}
                          <Badge tone={statusTone[r.status]}>
                            {r.status === 'Scheduled' ? `Scheduled ${clockTime(r.sendAt)}` : r.status}
                          </Badge>
                          <ChevronDown className={cn('size-4 text-slate-500 transition', isOpen && 'rotate-180')} aria-hidden="true" />
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-3">
                            <p className="rounded-lg bg-[#d9fdd3] px-3 py-2 text-sm text-slate-900">{reminderText(r, patients, medicines, templates)}</p>
                            <p className="mt-1 text-xs text-slate-600">
                              {r.sentAt ? `Sent ${clockTime(r.sentAt)} to ${patient?.phone}` : `Will send at ${clockTime(r.sendAt)} to ${patient?.phone}`}
                            </p>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </Panel>
            )
          })}
        </div>

        <Panel title="Message templates" description="Edit the wording. Words in {braces} are filled in for each patient." className="self-start">
          <div className="no-scrollbar -mx-1 mb-3 flex gap-1.5 relative overflow-x-auto px-1" role="group" aria-label="Choose a template">
            {(Object.keys(TEMPLATE_LABELS) as ReminderKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                aria-pressed={editing === kind}
                onClick={() => setEditing(kind)}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition',
                  editing === kind ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                )}
              >
                {TEMPLATE_LABELS[kind]}
              </button>
            ))}
          </div>
          <label htmlFor="template-text" className="sr-only">
            {TEMPLATE_LABELS[editing]} template
          </label>
          <TextArea id="template-text" value={templates[editing]} maxLength={320} rows={5} onChange={(e) => onTemplate(editing, e.target.value)} />
          <p className="mt-3 text-xs font-semibold text-slate-600">Preview</p>
          <p className="mt-1 rounded-lg bg-[#d9fdd3] px-3 py-2 text-sm text-slate-900">
            {fill(templates[editing], {
              first_name: 'Rudo',
              clinician: 'Dr Farai Mutasa',
              when: editing === 'missed' ? 'today at 08:40' : editing === 'same-day' ? 'today at 11:15' : 'tomorrow at 09:20',
              medicine: 'metformin 500 mg tablets',
            })}
          </p>
          <p className="mt-2 text-xs text-slate-600">Changes apply to reminders that haven’t been sent yet.</p>
        </Panel>
      </div>
    </div>
  )
}
