import { HeartHandshake, Lock, MessageSquareHeart, Phone } from 'lucide-react'
import { useState } from 'react'
import { relativeTime } from '../../lib/format'
import { AppButton, Badge, Notice, Panel, SelectInput } from '../ui'
import { LEARNERS, SCHOOL } from './data'
import { REFERRAL_REASONS, attendanceRate, lastCheckIn, needsCheckIn, recentAbsences } from './engine'
import type { CheckIn, CheckInKind, Learner } from './types'

interface Props {
  now: number
  checkIns: CheckIn[]
  onLog: (learnerId: string, kind: CheckInKind, note: string) => void
}

export function PastoralScreen({ now, checkIns, onLog }: Props) {
  const suggested = LEARNERS.filter(needsCheckIn)
  return (
    <div className="space-y-5 p-3 sm:p-5">
      <Notice tone="accent" icon={HeartHandshake} title="A nudge to check in, never a label">
        When a learner’s attendance drops (under 90% over four weeks, or three days missed in the last two), the teacher gets a reminder to have a kind word. The
        learner never sees a flag, and nothing here is shared with other learners or parents.
      </Notice>
      <Panel title="Check-in suggested" description={`${suggested.length} learners in ${SCHOOL.className} this week`} bodyClassName="p-0!">
        <ul className="divide-y divide-slate-100">
          {suggested.map((l) => (
            <CheckInRow key={l.id} learner={l} now={now} last={lastCheckIn(checkIns, l.id)} onLog={(kind, note) => onLog(l.id, kind, note)} />
          ))}
        </ul>
      </Panel>
      {checkIns.length > 0 && (
        <Panel title="Logged in this demo">
          <ul className="space-y-1.5 text-sm">
            {checkIns.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-900">{LEARNERS.find((l) => l.id === c.learnerId)?.name}</span>
                <Badge tone={c.kind === 'Referred to the counsellor' ? 'violet' : 'neutral'} icon={c.kind === 'Referred to the counsellor' ? Lock : undefined}>
                  {c.kind}
                </Badge>
                <span className="text-xs text-slate-600">
                  {c.note} · {relativeTime(c.at, now)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  )
}

function CheckInRow({ learner, now, last, onLog }: { learner: Learner; now: number; last?: CheckIn; onLog: (kind: CheckInKind, note: string) => void }) {
  const [referring, setReferring] = useState(false)
  const [reason, setReason] = useState<string>(REFERRAL_REASONS[0])
  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">{learner.name}</p>
          <p className="text-xs text-slate-600">
            Attendance {attendanceRate(learner)}% over 20 days · {recentAbsences(learner)} missed in the last 10
            {last ? ` · last: ${last.kind.toLowerCase()} ${relativeTime(last.at, now)}` : ''}
          </p>
          <p className="mt-1 flex gap-0.5" aria-label="Last 20 school days">
            {learner.attendance.map((p, i) => (
              <span key={i} className={p ? 'size-2.5 rounded-sm bg-emerald-400' : 'size-2.5 rounded-sm bg-amber-400'} title={p ? 'Present' : 'Absent'} />
            ))}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <AppButton size="sm" variant="secondary" icon={MessageSquareHeart} onClick={() => onLog('Check-in with the learner', 'Had a quiet word after the lesson')}>
            Log a check-in
          </AppButton>
          <AppButton size="sm" variant="secondary" icon={Phone} onClick={() => onLog('Call home', 'Spoke to a parent or guardian')}>
            Log a call home
          </AppButton>
          <AppButton size="sm" variant="ghost" icon={Lock} onClick={() => setReferring((r) => !r)} aria-expanded={referring}>
            Refer to the counsellor
          </AppButton>
        </div>
      </div>
      {referring && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-violet-200 bg-violet-50 p-3">
          <div className="min-w-[14rem] flex-1">
            <label htmlFor={`reason-${learner.id}`} className="mb-1 block text-xs font-semibold text-violet-900">
              Reason (private, goes to the counsellor only)
            </label>
            <SelectInput id={`reason-${learner.id}`} compact value={reason} onChange={(e) => setReason(e.target.value)}>
              {REFERRAL_REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </SelectInput>
          </div>
          <AppButton
            size="sm"
            onClick={() => {
              onLog('Referred to the counsellor', reason)
              setReferring(false)
            }}
          >
            Send privately
          </AppButton>
          <p className="w-full text-[0.7rem] text-violet-900">A reason, not a diagnosis. Anything more is said in person.</p>
        </div>
      )}
    </li>
  )
}
