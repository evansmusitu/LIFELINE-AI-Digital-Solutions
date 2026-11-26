import { moneyWhole } from '../../lib/format'
import { LEVIES, tuitionFor } from '../school-admissions/business'
import { DAY, SCHOOL, TERMS, WHOLE_SCHOOL } from './data'
import type { Family, FeesState, LevyEntry, Plan, TermId } from './types'

/*
 * The fees demo's logic: invoices in USD and ZiG at the rate fixed on the invoice, balances and account
 * status, the "never exclude" steps, payment plans, levy approvals, the levy ledger, the cash forecast
 * and the SDC report. Pure functions, tested in test/school-fees.test.ts.
 */

/* Invoices */

export interface InvoiceLine {
  child: string
  item: string
  /** USD before any bursary. */
  amount: number
  /** USD the family pays. */
  due: number
  note?: string
}

/** One term's invoice for a family. Only levies approved when the invoice was issued are on it. */
export function invoiceLines(family: Family): InvoiceLine[] {
  const lines: InvoiceLine[] = []
  for (const c of family.children) {
    const tuition = tuitionFor(c.grade)
    lines.push({
      child: c.name,
      item: `Tuition, ${c.grade}`,
      amount: tuition,
      due: Math.round(tuition * (1 - family.bursary)),
      note: family.bursary ? `${family.bursary === 1 ? 'Full' : 'Half'} bursary` : undefined,
    })
    for (const l of LEVIES) {
      lines.push({ child: c.name, item: l.name, amount: l.amount, due: family.bursary === 1 ? 0 : l.amount, note: family.bursary === 1 ? 'Covered by the bursary' : undefined })
    }
  }
  return lines
}

export const invoiceTotal = (family: Family) => invoiceLines(family).reduce((s, l) => s + l.due, 0)

/** USD to ZiG at the rate fixed on the invoice, to the whole ZiG. */
export const zigAt = (usd: number, rate: number) => `ZiG ${Math.round(usd * rate).toLocaleString('en-GB')}`

export const paidFor = (state: Pick<FeesState, 'payments'>, familyId: string, term: TermId) =>
  state.payments.filter((p) => p.familyId === familyId && p.term === term).reduce((s, p) => s + p.amount, 0)

export const balanceFor = (state: Pick<FeesState, 'payments' | 'families'>, family: Family, term: TermId) =>
  Math.max(0, invoiceTotal(family) - paidFor(state, family.id, term))

/* Account status, and the "never exclude" steps */

export type Status = 'Paid' | 'Bursary' | 'On a plan' | 'Arrears' | 'Due next term'

/**
 * Where an account stands. Arrears never lead to a learner being sent home: the next step is always a
 * polite reminder, then a private meeting with the bursar, then an agreed plan.
 */
export function statusFor(state: FeesState, family: Family): Status {
  if (family.bursary === 1) return 'Bursary'
  const arrears = balanceFor(state, family, 'last')
  if (state.plans[family.id]) return 'On a plan'
  if (arrears > 0) return 'Arrears'
  return balanceFor(state, family, 'next') > 0 ? 'Due next term' : 'Paid'
}

export type NextStep = 'Send a reminder' | 'Offer a private meeting' | 'Agree a plan' | null

export function nextStep(state: FeesState, family: Family): NextStep {
  if (statusFor(state, family) !== 'Arrears') return null
  if (!state.reminders[family.id]) return 'Send a reminder'
  if (!state.meetings[family.id]) return 'Offer a private meeting'
  return 'Agree a plan'
}

export function reminderMessage(family: Family, arrears: number, school: string = SCHOOL.name): string {
  return [
    `Hello, this is the bursary at *${school}*.`,
    `Our records show ${moneyWhole(arrears)} still open from ${TERMS.last.name} for ${family.children.map((c) => c.name.split(' ')[0]).join(' and ')}.`,
    'If paying is difficult right now, reply here and we’ll arrange a private meeting to agree a plan. Your children stay in class whatever happens.',
  ].join('\n')
}

export function meetingMessage(family: Family, school: string = SCHOOL.name): string {
  return [
    `Hello from the bursary at *${school}*.`,
    `We’d like to meet privately to agree a payment plan that works for the ${family.name.replace(' family', '')} family. Tuesday or Thursday at 15:00, at the bursary or by phone. Which suits you?`,
    'This conversation stays between you and the bursar.',
  ].join('\n')
}

/** Equal monthly instalments, the first in a week, rounded to the dollar, with the last one taking the difference. */
export function makePlan(amount: number, months: number, now: number, term: TermId): Plan {
  const each = Math.floor(amount / months)
  return {
    agreedAt: now,
    term,
    instalments: Array.from({ length: months }, (_, i) => ({ dueInDays: 7 + i * 30, amount: i === months - 1 ? amount - each * (months - 1) : each })),
  }
}

/* Paying from abroad */

export function abroadMessage(payer: string, family: Family, amount: number, school: string = SCHOOL.name): string {
  return [
    `Hello ${payer}, the ${family.name} asked *${school}* to send you this secure payment link for school fees.`,
    `Amount: *${moneyWhole(amount)}* for ${TERMS.next.name}. You can pay by card from anywhere, and the school receives it directly.`,
    'Sample link: pay.example/mra-•••• (not a real payment page)',
  ].join('\n')
}

/* Levies */

/** A levy can be billed only once the Permanent Secretary's approval reference and date are recorded. */
export const canBill = (levy: Pick<LevyEntry, 'approvalRef' | 'approvedDaysAgo'>) => !!levy.approvalRef?.trim() && levy.approvedDaysAgo !== undefined

/** An approval reference: letters, numbers, slashes and dashes, 4 to 40 characters. */
export const validApprovalRef = (raw: string) => /^[A-Za-z0-9][A-Za-z0-9/ .-]{3,39}$/.test(raw.trim())

/** A levy amount: a whole number of dollars from 1 to 500. */
export function parseLevyAmount(raw: string): number | null {
  if (!/^\d{1,3}$/.test(raw.trim())) return null
  const n = Number(raw.trim())
  return n >= 1 && n <= 500 ? n : null
}

/** What a levy has raised in the sample: per learner, times the learners, times the share collected last term. */
export const COLLECTED_SHARE = 0.87

export function levyLedger(state: Pick<FeesState, 'levies' | 'spending'>) {
  return state.levies.filter(canBill).map((l) => {
    // A levy approved this term has raised nothing yet: it goes on next term's invoices.
    const raised = (l.approvedDaysAgo ?? 0) >= 90 ? Math.round(l.amount * WHOLE_SCHOOL.learners * COLLECTED_SHARE) : 0
    const spent = state.spending.filter((s) => s.levyId === l.id).reduce((a, s) => a + s.amount, 0)
    return { levy: l, raised, spent, left: raised - spent }
  })
}

/** Spending needs an item, an amount it can cover, a receipt number and both approvers. */
export function checkSpend(input: { item: string; amount: number | null; receipt: string; approvals: number }, left: number): string | null {
  if (input.item.trim().length < 3) return 'Say what the money is for.'
  if (!input.amount || input.amount <= 0) return 'Enter the amount in US dollars.'
  if (input.amount > left) return `That is more than the ${moneyWhole(left)} left in this levy.`
  if (input.receipt.trim().length < 3) return 'Add the receipt or invoice number.'
  if (input.approvals < 2) return 'Both approvers must approve spending from a levy.'
  return null
}

/* The cash forecast */

export interface ForecastMonth {
  label: string
  opening: number
  inflow: number
  outflow: number
  closing: number
  /** Covered when the cash at the start plus what comes in pays the salaries and costs. */
  covered: boolean
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/**
 * Four months ahead, starting next month. Inflows: next term's usual collection curve, recovered arrears,
 * and the extra from payments and plans made in this demo.
 */
export function forecast(now: number, extra: { paidNow: number; planned: number[] }): ForecastMonth[] {
  const d = new Date(now)
  const months: ForecastMonth[] = []
  let cash = WHOLE_SCHOOL.cashNow + extra.paidNow
  let arrears = WHOLE_SCHOOL.arrears
  for (let i = 0; i < 4; i++) {
    const recovered = Math.round(arrears * WHOLE_SCHOOL.arrearsRecovery)
    arrears -= recovered
    const inflow = Math.round(WHOLE_SCHOOL.nextTermInvoiced * WHOLE_SCHOOL.collection[i]) + recovered + (extra.planned[i] ?? 0)
    const outflow = WHOLE_SCHOOL.salaries + WHOLE_SCHOOL.running
    const opening = cash
    cash = opening + inflow - outflow
    months.push({ label: MONTHS[(d.getUTCMonth() + 1 + i) % 12], opening, inflow, outflow, closing: cash, covered: opening + inflow >= outflow })
  }
  return months
}

/**
 * Plan instalments by forecast month (0 is next month), from the demo's plans, by calendar month.
 * Instalments already due are left out; any still due this month count towards next month's cash.
 */
export function plannedByMonth(plans: Record<string, Plan>, now: number): number[] {
  const out = [0, 0, 0, 0]
  const n = new Date(now)
  const next = n.getUTCFullYear() * 12 + n.getUTCMonth() + 1
  for (const p of Object.values(plans)) {
    for (const ins of p.instalments) {
      const at = p.agreedAt + ins.dueInDays * DAY
      if (at < now) continue
      const d = new Date(at)
      const i = Math.max(0, d.getUTCFullYear() * 12 + d.getUTCMonth() - next)
      if (i < 4) out[i] += ins.amount
    }
  }
  return out
}

/* The SDC report */

export function sdcSummary(state: FeesState) {
  const ledger = levyLedger(state)
  const families = state.families
  return {
    accounts: families.length,
    paidUp: families.filter((f) => ['Paid', 'Due next term', 'Bursary'].includes(statusFor(state, f))).length,
    onPlans: families.filter((f) => statusFor(state, f) === 'On a plan').length,
    arrears: families.reduce((s, f) => s + (f.bursary === 1 ? 0 : balanceFor(state, f, 'last')), 0),
    bursaries: families.filter((f) => f.bursary > 0).length,
    excluded: 0,
    levyRaised: ledger.reduce((s, l) => s + l.raised, 0),
    levySpent: ledger.reduce((s, l) => s + l.spent, 0),
    awaitingApproval: state.levies.filter((l) => !canBill(l)).map((l) => l.name),
  }
}

/** The sample school name as shown to a visitor on a personalised link: theirs instead. */
export function personalised(text: string, business: string | null): string {
  if (!business || business === SCHOOL.name) return text
  return text.replaceAll(SCHOOL.name, business).replaceAll(SCHOOL.short, business)
}
