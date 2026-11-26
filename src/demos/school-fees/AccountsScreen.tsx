import { CalendarClock, HeartHandshake, MessageCircle, ShieldCheck, Users } from 'lucide-react'
import { moneyWhole, num } from '../../lib/format'
import { PhoneFrame, WaBubble } from '../school-admissions/parts'
import { AppButton, Badge, Notice, Panel, Stat, type Tone } from '../ui'
import { td, th } from '../styles'
import { SCHOOL, TERMS } from './data'
import { balanceFor, meetingMessage, nextStep, personalised, reminderMessage, statusFor, type Status } from './engine'
import type { FeesState } from './types'

interface Props {
  business: string | null
  state: FeesState
  preview: { familyId: string; kind: 'reminder' | 'meeting' } | null
  onStep: (familyId: string) => void
}

const TONE: Record<Status, Tone> = { Paid: 'green', Bursary: 'violet', 'On a plan': 'blue', Arrears: 'amber', 'Due next term': 'neutral' }

export function AccountsScreen({ business, state, preview, onStep }: Props) {
  const fams = state.families
  const arrears = fams.reduce((s, f) => s + (f.bursary === 1 ? 0 : balanceFor(state, f, 'last')), 0)
  const plans = fams.filter((f) => state.plans[f.id]).length
  const previewFamily = preview && fams.find((f) => f.id === preview.familyId)
  const name = business ?? SCHOOL.name

  return (
    <div className="space-y-5 p-3 sm:p-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`Open from ${TERMS.last.name}`} value={moneyWhole(arrears)} detail={`${fams.filter((f) => statusFor(state, f) === 'Arrears').length} accounts, sample list`} icon={Users} tone="amber" />
        <Stat label="On an agreed plan" value={num(plans)} detail="Monthly, no extra charge" icon={CalendarClock} tone="accent" />
        <Stat label="Bursary learners" value={num(fams.filter((f) => f.bursary > 0).length)} detail="Covered items never invoiced" icon={HeartHandshake} />
        <Stat label="Learners sent home over fees" value="0" detail="Never, by policy" icon={ShieldCheck} tone="green" />
      </div>

      <Notice tone="accent" icon={HeartHandshake} title="The never-exclude steps">
        An account in arrears gets a polite WhatsApp reminder, then an offer of a private meeting with the bursar, then an agreed plan. The child stays in class at
        every step. The office can’t mark a learner as sent home: there is no such button.
      </Notice>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_21rem]">
        <Panel title="Family accounts" description="A sample of the school’s accounts." bodyClassName="p-0!">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem]">
              <thead className="bg-slate-50">
                <tr>
                  <th className={th}>Family</th>
                  <th className={`${th} text-right`}>{TERMS.last.name}</th>
                  <th className={`${th} text-right`}>{TERMS.next.name}</th>
                  <th className={th}>Status</th>
                  <th className={th}>
                    <span className="sr-only">Next step</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fams.map((f) => {
                  const status = statusFor(state, f)
                  const step = nextStep(state, f)
                  const last = f.bursary === 1 ? 0 : balanceFor(state, f, 'last')
                  return (
                    <tr key={f.id}>
                      <td className={td}>
                        <p className="font-semibold text-slate-900">{f.name}</p>
                        <p className="text-xs text-slate-600">
                          {f.children.map((c) => `${c.name} (${c.grade})`).join(', ')} · {f.contact}
                        </p>
                      </td>
                      <td className={`${td} text-right tabular-nums`}>{last ? moneyWhole(last) : <span className="text-slate-400">–</span>}</td>
                      <td className={`${td} text-right tabular-nums`}>{f.bursary === 1 ? <span className="text-slate-400">–</span> : moneyWhole(balanceFor(state, f, 'next'))}</td>
                      <td className={td}>
                        <Badge tone={TONE[status]}>{status === 'Bursary' ? `${f.bursary === 1 ? 'Full' : 'Half'} bursary` : status}</Badge>
                        {state.reminders[f.id] && status === 'Arrears' && <p className="mt-0.5 text-[0.7rem] text-slate-600">Reminder sent{state.meetings[f.id] ? ', meeting offered' : ''}</p>}
                      </td>
                      <td className={td}>
                        {step && (
                          <AppButton size="sm" variant={step === 'Agree a plan' ? 'primary' : 'secondary'} icon={step === 'Agree a plan' ? CalendarClock : MessageCircle} onClick={() => onStep(f.id)}>
                            {step}
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
        <div>
          {previewFamily ? (
            <PhoneFrame title={previewFamily.name} subtitle="WhatsApp · preview" initials={previewFamily.name.slice(0, 2).toUpperCase()} label="Message preview">
              <div className="space-y-2 p-3">
                <WaBubble
                  text={personalised(preview.kind === 'reminder' ? reminderMessage(previewFamily, balanceFor(state, previewFamily, 'last')) : meetingMessage(previewFamily), business)}
                  author={name}
                  time="now"
                />
              </div>
            </PhoneFrame>
          ) : (
            <Notice>Tap a next step to see the WhatsApp message the family gets (a preview: nothing is sent).</Notice>
          )}
        </div>
      </div>
    </div>
  )
}
