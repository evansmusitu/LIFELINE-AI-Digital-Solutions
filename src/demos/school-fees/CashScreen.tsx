import { CheckCircle2, FileText, Printer, TriangleAlert } from 'lucide-react'
import { moneyWhole, num } from '../../lib/format'
import { AppButton, Badge, Notice, Panel } from '../ui'
import { td, th } from '../styles'
import { SCHOOL, TERMS, WHOLE_SCHOOL } from './data'
import { forecast, plannedByMonth, sdcSummary } from './engine'
import type { FeesState } from './types'

interface Props {
  business: string | null
  now: number
  state: FeesState
  /** Payments made in this demo, added to the cash at the bank. */
  paidNow: number
}

export function CashScreen({ business, now, state, paidNow }: Props) {
  const months = forecast(now, { paidNow, planned: plannedByMonth(state.plans, now) })
  const short = months.find((m) => !m.covered)
  const r = sdcSummary(state)
  const name = business ?? SCHOOL.name

  return (
    <div className="space-y-5 p-3 sm:p-5">
      <Panel
        title="Will next month’s salaries be paid?"
        description={`The next four months for the whole school (sample figures): ${num(WHOLE_SCHOOL.learners)} learners, salaries ${moneyWhole(WHOLE_SCHOOL.salaries)} a month, running costs ${moneyWhole(WHOLE_SCHOOL.running)}.`}
        bodyClassName="p-0!"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem]">
            <thead className="bg-slate-50">
              <tr>
                <th className={th}>Month</th>
                <th className={`${th} text-right`}>Cash at the start</th>
                <th className={`${th} text-right`}>Fees expected in</th>
                <th className={`${th} text-right`}>Salaries and costs</th>
                <th className={`${th} text-right`}>Cash at the end</th>
                <th className={th}>Salaries</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {months.map((m) => (
                <tr key={m.label}>
                  <td className={`${td} font-semibold`}>{m.label}</td>
                  <td className={`${td} text-right tabular-nums`}>{moneyWhole(m.opening)}</td>
                  <td className={`${td} text-right tabular-nums`}>{moneyWhole(m.inflow)}</td>
                  <td className={`${td} text-right tabular-nums`}>{moneyWhole(m.outflow)}</td>
                  <td className={`${td} text-right font-semibold tabular-nums ${m.closing < 0 ? 'text-red-700' : ''}`}>{moneyWhole(m.closing)}</td>
                  <td className={td}>{m.covered ? <Badge tone="green" icon={CheckCircle2}>Covered</Badge> : <Badge tone="red" icon={TriangleAlert}>At risk</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 p-4">
          {short ? (
            <Notice tone="amber" icon={TriangleAlert} title={`${short.label} salaries are at risk`}>
              Fees usually come in after the term opens. Agreeing plans for the open accounts now, and asking families to pay before {TERMS.next.name} starts, moves money into the
              months that need it.
            </Notice>
          ) : (
            <Notice tone="green" icon={CheckCircle2}>
              Salaries are covered in every month shown.
            </Notice>
          )}
          <p className="mt-2 text-xs text-slate-600">
            Built from how fees usually come in: {WHOLE_SCHOOL.collection.map((c) => `${Math.round(c * 100)}%`).join(', ')} of next term’s invoices by month, a fifth of the open
            arrears each month, plus the payments and plans made in this demo.
          </p>
        </div>
      </Panel>

      <Panel
        title={
          <span className="flex items-center gap-2">
            <FileText className="size-4 text-(--accent)" aria-hidden="true" />
            One-page report for the School Development Committee
          </span>
        }
        action={
          <AppButton size="sm" variant="secondary" icon={Printer} onClick={() => window.print()}>
            Print
          </AppButton>
        }
      >
        <div className="space-y-3 text-sm text-slate-800">
          <p className="font-semibold text-slate-900">
            {name}: fees and levies, {TERMS.last.name} to date
          </p>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {[
              ['Family accounts in this sample', num(r.accounts)],
              ['Paid up, or not due yet', num(r.paidUp)],
              ['On an agreed plan', num(r.onPlans)],
              [`Still open from ${TERMS.last.name}`, moneyWhole(r.arrears)],
              ['Families with a bursary', num(r.bursaries)],
              ['Learners sent home over fees', String(r.excluded)],
              ['Raised by the approved levies (whole school)', moneyWhole(r.levyRaised)],
              ['Spent from the levies, with receipts', moneyWhole(r.levySpent)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-slate-100 py-1">
                <dt className="text-slate-600">{k}</dt>
                <dd className="font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-slate-600">
            {r.awaitingApproval.length
              ? `Awaiting the Ministry’s approval, not billed: ${r.awaitingApproval.join(', ')}.`
              : 'Every levy on the register is approved.'}{' '}
            Every spending item has a receipt and two approvals, and the full audit trail is on the Levies screen.
          </p>
        </div>
      </Panel>
    </div>
  )
}
