import { Bell, CalendarCheck, ClipboardList, Clock, Inbox, Send, Users } from 'lucide-react'
import { useId, useState } from 'react'
import { num, relativeTime } from '../../lib/format'
import { AppButton, Badge, Field, Notice, Panel, SelectInput, Stat, TextArea, TextInput } from '../ui'
import { th, td } from '../styles'
import { GRADES, SCHOOL } from './business'
import {
  NOTICE_TEMPLATES,
  PARENTS_ON_LIST,
  PLACES,
  addDays,
  dayShort,
  medianReply,
  missingDocs,
  noticeMessage,
  personalised,
  placesLeft,
  replyLabel,
  schoolDay,
  timeLabel,
  waitingList,
} from './engine'
import { PhoneFrame, SourceBadge, StageBadge, StatusBadge, WaBubble } from './parts'
import type { Application, Enquiry, SentNotice, Tour } from './types'

interface Props {
  business: string | null
  now: number
  enquiries: Enquiry[]
  tours: Tour[]
  applications: Application[]
  notices: SentNotice[]
  onContacted: (id: string) => void
  onRemindDocs: (id: string) => void
  onAdvance: (id: string) => void
  onSendNotice: (title: string, body: string) => void
}

export function OfficeScreen(props: Props) {
  const { now, enquiries, tours, applications } = props
  const open = enquiries.filter((e) => e.status === 'New' || e.status === 'Handed over')
  const today = schoolDay(now)
  const week = tours.filter((t) => t.start >= now && schoolDay(t.start) <= addDays(today, 7))
  const missing = applications.filter((a) => a.stage === 'Documents missing')
  const median = medianReply(enquiries)

  return (
    <div className="space-y-5 p-3 sm:p-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Waiting for the office" value={num(open.length)} detail="New or handed over by the assistant" icon={Inbox} tone={open.length ? 'red' : 'green'} />
        <Stat label="Typical first answer" value={replyLabel(median)} detail="The assistant answers at once, day and night" icon={Clock} tone="accent" />
        <Stat label="Tours, next 7 days" value={num(week.length)} detail={`${num(week.filter((t) => t.mine || t.id.includes('script')).length)} booked in this demo`} icon={CalendarCheck} />
        <Stat label="Applications missing documents" value={num(missing.length)} detail="One tap asks the family on WhatsApp" icon={ClipboardList} tone={missing.length ? 'amber' : 'green'} />
      </div>

      <EnquiriesPanel {...props} />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_24rem]">
        <ApplicationsPanel {...props} />
        <ToursPanel tours={week} />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <PlacesPanel applications={applications} />
        <NoticePanel {...props} />
      </div>
    </div>
  )
}

function EnquiriesPanel({ enquiries, now, onContacted }: Props) {
  const sorted = [...enquiries].sort((a, b) => b.at - a.at)
  return (
    <Panel title="Enquiries" description="From the website chat, WhatsApp, Facebook and the phone. The note says what they asked about, never the chat itself." bodyClassName="p-0!">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem]">
          <thead className="bg-slate-50">
            <tr>
              <th className={th}>Parent</th>
              <th className={th}>Grade</th>
              <th className={th}>From</th>
              <th className={th}>About</th>
              <th className={th}>First answer</th>
              <th className={th}>Status</th>
              <th className={th}>
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((e) => (
              <tr key={e.id} className={e.mine ? 'bg-(--accent-soft)/40' : undefined}>
                <td className={td}>
                  <p className="font-semibold text-slate-900">{e.parent}</p>
                  <p className="text-xs text-slate-600">
                    {e.contact} · {relativeTime(e.at, now)}
                  </p>
                </td>
                <td className={td}>
                  {e.grade}
                  <p className="text-xs text-slate-600">{e.entry}</p>
                </td>
                <td className={td}>
                  <SourceBadge source={e.source} />
                </td>
                <td className={`${td} max-w-[16rem] text-xs`}>{e.note}</td>
                <td className={td}>{replyLabel(e.firstReplyMinutes)}</td>
                <td className={td}>
                  <StatusBadge status={e.status} />
                </td>
                <td className={td}>
                  {(e.status === 'New' || e.status === 'Handed over') && (
                    <AppButton size="sm" variant="secondary" onClick={() => onContacted(e.id)}>
                      Mark contacted
                    </AppButton>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

const NEXT_ACTION: Partial<Record<Application['stage'], string>> = { Complete: 'Book assessment', 'Assessment booked': 'Make an offer' }

function ApplicationsPanel({ applications, now, onRemindDocs, onAdvance }: Props) {
  const sorted = [...applications].sort((a, b) => b.at - a.at)
  return (
    <Panel title="Applications" description="Learners are shown by first name and initial. Every application has the parent’s written consent." bodyClassName="p-0!">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem]">
          <thead className="bg-slate-50">
            <tr>
              <th className={th}>Ref</th>
              <th className={th}>Learner</th>
              <th className={th}>Stage</th>
              <th className={th}>Still needed</th>
              <th className={th}>
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((a) => {
              const docs = missingDocs(a)
              const action = NEXT_ACTION[a.stage]
              const full = a.stage === 'Assessment booked' && placesLeft(a.grade, applications) === 0
              return (
                <tr key={a.id} className={a.mine ? 'bg-(--accent-soft)/40' : undefined}>
                  <td className={`${td} text-xs whitespace-nowrap text-slate-600`}>{a.ref}</td>
                  <td className={td}>
                    <p className="font-semibold text-slate-900">
                      {a.child} {a.sibling && <Badge tone="violet">Sibling</Badge>}
                    </p>
                    <p className="text-xs text-slate-600">
                      {a.grade} · {a.entry} · {relativeTime(a.at, now)}
                    </p>
                  </td>
                  <td className={td}>
                    <StageBadge stage={a.stage} />
                  </td>
                  <td className={`${td} text-xs`}>
                    {docs.length ? docs.map((d) => d.name.replace(/ \(.*\)$/, '')).join(', ') : <span className="text-slate-500">Nothing</span>}
                    {a.remindedAt && <p className="text-[0.7rem] text-emerald-800">Asked on WhatsApp {relativeTime(a.remindedAt, now)}</p>}
                  </td>
                  <td className={td}>
                    {a.stage === 'Documents missing' && (
                      <AppButton size="sm" variant="secondary" onClick={() => onRemindDocs(a.id)}>
                        Ask for documents
                      </AppButton>
                    )}
                    {action && (
                      <AppButton size="sm" variant="secondary" onClick={() => onAdvance(a.id)} disabled={full} title={full ? 'No places left in this grade' : undefined}>
                        {full ? 'Grade full' : action}
                      </AppButton>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

function ToursPanel({ tours }: { tours: Tour[] }) {
  const sorted = [...tours].sort((a, b) => a.start - b.start)
  return (
    <Panel title="Tours, next 7 days" description="A reminder goes to each family on WhatsApp the day before.">
      {sorted.length === 0 ? (
        <p className="text-sm text-slate-600">No tours booked yet.</p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((t) => (
            <li key={t.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">{t.parent}</p>
                <p className="text-xs text-slate-600">
                  {t.grade} · {t.contact}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">
                  {dayShort(schoolDay(t.start))}, {timeLabel(t.start)}
                </p>
                <SourceBadge source={t.source} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function PlacesPanel({ applications }: { applications: Application[] }) {
  const full = GRADES.filter((g) => placesLeft(g, applications) === 0)
  return (
    <Panel title="Places for January 2027" description="Offers made and accepted count against the places. Full grades keep a waiting list in the published order." bodyClassName="p-0!">
      <div className="max-h-[22rem] overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              <th className={th}>Grade</th>
              <th className={`${th} text-right`}>Places</th>
              <th className={`${th} text-right`}>Left</th>
              <th className={`${th} text-right`}>Waiting</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {GRADES.map((g) => {
              const left = placesLeft(g, applications)
              return (
                <tr key={g}>
                  <td className={td}>{g}</td>
                  <td className={`${td} text-right tabular-nums`}>{PLACES[g].capacity}</td>
                  <td className={`${td} text-right tabular-nums`}>{left === 0 ? <Badge tone="red">Full</Badge> : left}</td>
                  <td className={`${td} text-right tabular-nums`}>{waitingList(g, applications).length || '–'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {full.map((g) => {
        const list = waitingList(g, applications)
        if (!list.length) return null
        return (
          <div key={g} className="border-t border-slate-100 px-4 py-3">
            <p className="text-xs font-semibold text-slate-700">{g} waiting list, in order</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-sm text-slate-800">
              {list.map((a) => (
                <li key={a.id}>
                  {a.child} {a.sibling ? <Badge tone="violet">Sibling: first</Badge> : <span className="text-xs text-slate-500">by date complete</span>}
                </li>
              ))}
            </ol>
          </div>
        )
      })}
    </Panel>
  )
}

function NoticePanel({ business, now, notices, onSendNotice }: Props) {
  const id = useId()
  const [template, setTemplate] = useState(NOTICE_TEMPLATES[0].id)
  const chosen = NOTICE_TEMPLATES.find((t) => t.id === template) ?? NOTICE_TEMPLATES[0]
  const [title, setTitle] = useState(chosen.title)
  const [body, setBody] = useState(chosen.body)
  const name = business ?? SCHOOL.name
  const ready = title.trim().length >= 5 && body.trim().length >= 20

  const pick = (value: string) => {
    const t = NOTICE_TEMPLATES.find((x) => x.id === value) ?? NOTICE_TEMPLATES[0]
    setTemplate(t.id)
    setTitle(t.title)
    setBody(t.body)
  }

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <Bell className="size-4 text-red-700" aria-hidden="true" />
          Urgent notice to every parent
        </span>
      }
      description="For a health alert, a closure or a false rumour. It goes on the website’s notice board and to every parent on WhatsApp at once."
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_15rem]">
        <div className="space-y-3">
          <Field label="Start from" htmlFor={`${id}-template`}>
            <SelectInput id={`${id}-template`} value={template} onChange={(e) => pick(e.target.value)}>
              {NOTICE_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Title" htmlFor={`${id}-title`}>
            <TextInput id={`${id}-title`} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
          </Field>
          <Field label="Message" htmlFor={`${id}-body`}>
            <TextArea id={`${id}-body`} value={body} onChange={(e) => setBody(e.target.value)} maxLength={500} rows={5} />
          </Field>
          <AppButton icon={Send} variant="danger" disabled={!ready} onClick={() => onSendNotice(title.trim(), body.trim())} className="w-full">
            Send to {num(PARENTS_ON_LIST)} parents (simulated)
          </AppButton>
        </div>
        <PhoneFrame title={name} subtitle="Official school number" initials="MR" label="Preview of the notice on WhatsApp" className="max-w-[15rem] border-[6px]">
          <div className="space-y-2 p-2">
            <WaBubble text={personalised(noticeMessage(title || '…', body || '…'), business)} author={name} time="now" />
          </div>
        </PhoneFrame>
      </div>
      {notices.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Users className="size-3.5" aria-hidden="true" />
            Sent from this demo
          </p>
          {notices.map((n) => (
            <Notice key={n.id} tone="neutral" title={personalised(n.title, business)}>
              <span className="text-xs">
                To {num(n.reach)} parents · {relativeTime(n.at, now)} · also on the website
              </span>
            </Notice>
          ))}
        </div>
      )}
    </Panel>
  )
}
