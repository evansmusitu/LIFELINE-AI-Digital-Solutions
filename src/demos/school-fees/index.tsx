import { Landmark, LineChart, ReceiptText, ScrollText, Users } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useToast } from '../../components/toast-context'
import { useBusinessName } from '../../lib/business-name'
import { moneyWhole, num } from '../../lib/format'
import { usePersistentState } from '../../lib/storage'
import { uid, useTicker } from '../../lib/time'
import { useDemoMetrics } from '../metrics'
import { DemoAppShell, type DemoScreen } from '../shell'
import { AccountsScreen } from './AccountsScreen'
import { CashScreen } from './CashScreen'
import { FEES_SLUG, SCHOOL, TERMS, createInitialState } from './data'
import { balanceFor, checkSpend, forecast, levyLedger, makePlan, nextStep, plannedByMonth, statusFor } from './engine'
import { FamilyScreen } from './FamilyScreen'
import { LeviesScreen } from './LeviesScreen'
import type { AuditEntry, FeesState } from './types'

const ACCENT = { base: '#047857', strong: '#065f46', soft: '#ecfdf5', ink: '#064e3b' }

type ScreenId = 'family' | 'accounts' | 'levies' | 'cash'

const entry = (who: string, action: string): AuditEntry => ({ id: uid('audit'), at: Date.now(), who, action })

export default function SchoolFeesDemo() {
  const business = useBusinessName()
  const now = useTicker(useCallback(() => Date.now(), []))
  const toast = useToast()
  const [state, setState] = usePersistentState<FeesState>(`${FEES_SLUG}.state`, () => createInitialState(Date.now()), { version: 1, freshDaily: true })
  const [screen, setScreen] = useState<ScreenId>('family')
  const [familyId, setFamilyId] = useState('f1')
  const [preview, setPreview] = useState<{ familyId: string; kind: 'reminder' | 'meeting' } | null>(null)
  const name = business ?? SCHOOL.name
  const familyName = (id: string) => state.families.find((f) => f.id === id)?.name ?? 'A family'

  /* The parent's side */

  const pay = (id: string, amount: number, method: string) => {
    setState((s) => ({
      ...s,
      payments: [...s.payments, { id: uid('pay'), familyId: id, term: 'next', amount, method, at: Date.now(), ref: `WEB-${s.payments.length + 1}`, mine: true }],
      audit: [...s.audit, entry('Payment system', `Payment received: ${moneyWhole(amount)} by ${method} from the ${familyName(id)}, for ${TERMS.next.name}`)],
    }))
    toast(`Paid ${moneyWhole(amount)} by ${method} (simulated). The receipt goes to WhatsApp.`, 'success')
  }

  const abroad = (id: string, payer: string, country: string, amount: number) => {
    setState((s) => ({ ...s, abroadLinks: [...s.abroadLinks, { id: uid('link'), familyId: id, payer, country, amount, at: Date.now() }] }))
    toast(`Payment link sent to ${payer} in ${country} (simulated).`, 'success')
  }

  const plan = (id: string, months: number) => {
    setState((s) => {
      const f = s.families.find((x) => x.id === id)
      if (!f || s.plans[id]) return s
      const term = balanceFor(s, f, 'last') > 0 ? 'last' : 'next'
      const amount = balanceFor(s, f, 'last') + balanceFor(s, f, 'next')
      return {
        ...s,
        plans: { ...s.plans, [id]: makePlan(amount, months, Date.now(), term) },
        audit: [...s.audit, entry(SCHOOL.approvers[0], `Plan agreed with the ${f.name}: ${moneyWhole(amount)} over ${months} months`)],
      }
    })
    toast('Monthly plan agreed. The family gets the dates on WhatsApp.', 'success')
  }

  /* The bursar's never-exclude steps */

  const step = (id: string) => {
    const f = state.families.find((x) => x.id === id)
    if (!f) return
    const next = nextStep(state, f)
    if (next === 'Send a reminder') {
      setState((s) => ({ ...s, reminders: { ...s.reminders, [id]: Date.now() }, audit: [...s.audit, entry(SCHOOL.approvers[0], `Polite reminder sent to the ${f.name}`)] }))
      setPreview({ familyId: id, kind: 'reminder' })
      toast(`Reminder sent to the ${f.name} on WhatsApp (simulated).`, 'success')
    } else if (next === 'Offer a private meeting') {
      setState((s) => ({ ...s, meetings: { ...s.meetings, [id]: Date.now() }, audit: [...s.audit, entry(SCHOOL.approvers[0], `Private meeting offered to the ${f.name}`)] }))
      setPreview({ familyId: id, kind: 'meeting' })
      toast(`Meeting offered to the ${f.name} (simulated).`, 'success')
    } else if (next === 'Agree a plan') {
      plan(id, 3)
      setPreview(null)
    }
  }

  /* Levies */

  const approveLevy = (levyId: string, ref: string) => {
    setState((s) => ({
      ...s,
      levies: s.levies.map((l) => (l.id === levyId ? { ...l, approvalRef: ref, approvedDaysAgo: 0 } : l)),
      audit: [...s.audit, entry(SCHOOL.approvers[0], `Ministry approval recorded for the ${s.levies.find((l) => l.id === levyId)?.name}: ${ref}. Billed from next term`)],
    }))
    toast('Approval recorded. The levy can go on next term’s invoices.', 'success')
  }

  const addLevy = (levyName: string, amount: number, purpose: string) => {
    setState((s) => ({
      ...s,
      levies: [...s.levies, { id: uid('levy'), name: levyName, amount, purpose }],
      audit: [...s.audit, entry(SCHOOL.approvers[0], `Levy proposed: ${levyName}, ${moneyWhole(amount)} a term. Awaiting the Ministry’s approval`)],
    }))
    toast('Levy added. It can’t be billed until the approval is recorded.', 'success')
  }

  const spend = (levyId: string, item: string, amount: number, receipt: string): string | null => {
    const left = levyLedger(state).find((l) => l.levy.id === levyId)?.left ?? 0
    const problem = checkSpend({ item, amount, receipt, approvals: 2 }, left)
    if (problem) return problem
    setState((s) => ({
      ...s,
      spending: [...s.spending, { id: uid('spend'), levyId, item, amount, receipt, approvedBy: [...SCHOOL.approvers], at: Date.now() }],
      audit: [...s.audit, entry(SCHOOL.approvers.join(' and '), `Spending approved: ${item}, ${moneyWhole(amount)} from the ${s.levies.find((l) => l.id === levyId)?.name}. Receipt ${receipt}`)],
    }))
    toast('Spending recorded with both approvals.', 'success')
    return null
  }

  /* Live figures */

  const paidNow = state.payments.filter((p) => p.mine).reduce((s, p) => s + p.amount, 0)
  const months = forecast(now, { paidNow, planned: plannedByMonth(state.plans, now) })
  const arrearsCount = state.families.filter((f) => statusFor(state, f) === 'Arrears').length
  useDemoMetrics([
    { label: 'Accounts in arrears', value: num(arrearsCount), detail: 'Every one with a next step, none sent home' },
    { label: 'Plans agreed', value: num(Object.keys(state.plans).length), detail: 'Monthly, no extra charge' },
    { label: 'Levies awaiting approval', value: num(state.levies.filter((l) => !l.approvalRef).length), detail: 'Not billed until approved' },
    { label: 'Months with salaries covered', value: `${months.filter((m) => m.covered).length} of ${months.length}`, detail: 'Cash forecast' },
  ])

  const screens: DemoScreen<ScreenId>[] = [
    { id: 'family', label: 'Family statement', icon: ReceiptText, audience: 'customer' },
    { id: 'accounts', label: 'Bursar: accounts', icon: Users, audience: 'team', badge: arrearsCount },
    { id: 'levies', label: 'Levies & audit', icon: ScrollText, audience: 'team' },
    { id: 'cash', label: 'Cash & SDC report', icon: LineChart, audience: 'team' },
  ]

  return (
    <DemoAppShell
      slug={FEES_SLUG}
      business={{ name, descriptor: business ? 'Your school, sample data' : 'Fees, levies and accountability · Harare', icon: Landmark }}
      accent={ACCENT}
      screens={screens}
      active={screen}
      onChange={setScreen}
    >
      <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 sm:px-5">
        <span className="font-semibold">Sample school, sample data.</span> The families, fees, rates, levies and figures are invented for this demo. No money moves and nothing is
        sent.
      </p>
      {screen === 'family' && <FamilyScreen business={business} state={state} familyId={familyId} onFamily={setFamilyId} onPay={pay} onAbroad={abroad} onPlan={plan} />}
      {screen === 'accounts' && <AccountsScreen business={business} state={state} preview={preview} onStep={step} />}
      {screen === 'levies' && <LeviesScreen now={now} state={state} onApprove={approveLevy} onAddLevy={addLevy} onSpend={spend} />}
      {screen === 'cash' && <CashScreen business={business} now={now} state={state} paidNow={paidNow} />}
    </DemoAppShell>
  )
}
