/* The school fees demo: invoices, the never-exclude steps, plans, levies, the ledger and the cash forecast. */
import { describe, expect, it } from 'vitest'
import { ALL_DEMOS, DEMOS, LIST_FEES_DEMO, findDemo } from '../src/demos/registry'
import { RATES, SCHOOL, TERMS, WHOLE_SCHOOL, createInitialState } from '../src/demos/school-fees/data'
import {
  abroadMessage,
  balanceFor,
  canBill,
  checkSpend,
  forecast,
  invoiceLines,
  invoiceTotal,
  levyLedger,
  makePlan,
  meetingMessage,
  nextStep,
  parseLevyAmount,
  plannedByMonth,
  reminderMessage,
  sdcSummary,
  statusFor,
  validApprovalRef,
  zigAt,
} from '../src/demos/school-fees/engine'
import type { FeesState } from '../src/demos/school-fees/types'
import { toKnowledge } from '../src/receptionist/protocol'

const NOW = Date.UTC(2026, 10, 26, 8)
const DAY = 86_400_000
const fresh = () => createInitialState(NOW)
const fam = (s: FeesState, name: string) => s.families.find((f) => f.name === name)!

describe('invoices', () => {
  it('bills tuition and the approved levies per child, and nothing covered by a full bursary', () => {
    const s = fresh()
    const moyo = fam(s, 'Moyo family')
    expect(invoiceTotal(moyo)).toBe(840 + 65 + 620 + 65)
    const ncube = fam(s, 'Ncube family')
    expect(invoiceTotal(ncube)).toBe(0)
    expect(invoiceLines(ncube).every((l) => l.due === 0 && l.note)).toBe(true)
    const mutasa = fam(s, 'Mutasa family')
    expect(invoiceTotal(mutasa)).toBe(310 + 65)
    expect(invoiceLines(moyo).some((l) => /laboratory/i.test(l.item))).toBe(false)
  })

  it('keeps the ZiG amount at the rate fixed on the invoice', () => {
    expect(zigAt(905, TERMS.next.rate)).toBe(`ZiG ${Math.round(905 * RATES.thisTerm).toLocaleString('en-GB')}`)
    expect(RATES.today).not.toBe(RATES.thisTerm)
  })

  it('starts with sample payments that never overpay', () => {
    const s = fresh()
    for (const f of s.families) {
      for (const term of ['last', 'next'] as const) {
        const paid = s.payments.filter((p) => p.familyId === f.id && p.term === term).reduce((a, p) => a + p.amount, 0)
        expect(paid, `${f.name} ${term}`).toBeLessThanOrEqual(invoiceTotal(f))
      }
    }
    expect(balanceFor(s, fam(s, 'Sibanda family'), 'next')).toBe(0)
  })
})

describe('the never-exclude steps', () => {
  it('goes reminder, private meeting, then plan, and never further', () => {
    const s = fresh()
    const chari = fam(s, 'Chari family')
    expect(statusFor(s, chari)).toBe('Arrears')
    expect(nextStep(s, chari)).toBe('Send a reminder')
    s.reminders[chari.id] = NOW
    expect(nextStep(s, chari)).toBe('Offer a private meeting')
    s.meetings[chari.id] = NOW
    expect(nextStep(s, chari)).toBe('Agree a plan')
    s.plans[chari.id] = makePlan(500, 3, NOW, 'last')
    expect(statusFor(s, chari)).toBe('On a plan')
    expect(nextStep(s, chari)).toBeNull()
    expect(sdcSummary(s).excluded).toBe(0)
  })

  it('writes kind messages that say the children stay in class', () => {
    const s = fresh()
    const f = fam(s, 'Chari family')
    expect(reminderMessage(f, 400)).toContain('Your children stay in class')
    expect(reminderMessage(f, 400)).toContain('$400')
    expect(meetingMessage(f)).toContain('privately')
    expect(abroadMessage('Uncle Tendai', f, 905)).toContain('Hello Uncle Tendai, the Chari family')
    expect(abroadMessage('Uncle Tendai', f, 905)).toContain('not a real payment page')
  })

  it('splits a plan into equal monthly payments, the first in a week', () => {
    const p = makePlan(1000, 3, NOW, 'next')
    expect(p.instalments.map((i) => i.amount)).toEqual([333, 333, 334])
    expect(p.instalments.map((i) => i.dueInDays)).toEqual([7, 37, 67])
    expect(plannedByMonth({ x: p }, NOW)).toEqual([333, 333, 334, 0])
  })
})

describe('levies', () => {
  it('bills a levy only once its approval is recorded', () => {
    const s = fresh()
    expect(s.levies.filter(canBill).map((l) => l.id)).toEqual(['development', 'ict-sport'])
    const lab = s.levies.find((l) => l.id === 'lab')!
    expect(canBill(lab)).toBe(false)
    expect(canBill({ ...lab, approvalRef: 'MRA/LEV/03', approvedDaysAgo: 0 })).toBe(true)
    expect(validApprovalRef('MRA/LEV/03')).toBe(true)
    for (const bad of ['', 'ab', '<script>', 'x'.repeat(41)]) expect(validApprovalRef(bad), bad).toBe(false)
    expect(parseLevyAmount('15')).toBe(15)
    for (const bad of ['0', '501', '1.5', 'ten']) expect(parseLevyAmount(bad), bad).toBeNull()
    expect(sdcSummary(s).awaitingApproval).toEqual(['Science laboratory levy'])
  })

  it('keeps the ledger: raised, spent with receipts, and what is left', () => {
    const s = fresh()
    const [dev, ict] = levyLedger(s)
    expect(dev.raised).toBe(Math.round(40 * WHOLE_SCHOOL.learners * 0.87))
    expect(dev.spent).toBe(6_850 + 3_900)
    expect(dev.left).toBe(dev.raised - dev.spent)
    expect(ict.spent).toBe(1_140 + 820)
    for (const sp of s.spending) expect(sp.approvedBy).toEqual([...SCHOOL.approvers])
    // A levy approved today has raised nothing yet.
    const approved = { ...s, levies: s.levies.map((l) => (l.id === 'lab' ? { ...l, approvalRef: 'MRA/LEV/03', approvedDaysAgo: 0 } : l)) }
    expect(levyLedger(approved).find((l) => l.levy.id === 'lab')?.raised).toBe(0)
  })

  it('needs an item, an amount it can cover, a receipt and both approvals', () => {
    const ok = { item: 'Paint', amount: 200, receipt: 'INV-1', approvals: 2 }
    expect(checkSpend(ok, 500)).toBeNull()
    expect(checkSpend({ ...ok, approvals: 1 }, 500)).toMatch(/Both approvers/)
    expect(checkSpend({ ...ok, receipt: '' }, 500)).toMatch(/receipt/)
    expect(checkSpend({ ...ok, amount: 600 }, 500)).toMatch(/more than/)
    expect(checkSpend({ ...ok, amount: null }, 500)).toMatch(/amount/)
    expect(checkSpend({ ...ok, item: '' }, 500)).toMatch(/what the money is for/)
  })
})

describe('the cash forecast', () => {
  it('shows next month at risk in the sample, and plans or payments now can cover it', () => {
    const base = forecast(NOW, { paidNow: 0, planned: [0, 0, 0, 0] })
    expect(base).toHaveLength(4)
    expect(base[0].label).toBe('December')
    expect(base[0].covered).toBe(false)
    expect(base[1].covered).toBe(true)
    for (let i = 1; i < 4; i++) expect(base[i].opening).toBe(base[i - 1].closing)
    const short = base[0].outflow - (base[0].opening + base[0].inflow)
    expect(forecast(NOW, { paidNow: short, planned: [0, 0, 0, 0] })[0].covered).toBe(true)
    expect(forecast(NOW, { paidNow: 0, planned: [short, 0, 0, 0] })[0].covered).toBe(true)
  })

  it('places plan instalments in the right months', () => {
    const p = makePlan(900, 3, NOW - 10 * DAY, 'last')
    // The first instalment, a week after the plan, is already behind us.
    expect(plannedByMonth({ x: p }, NOW)).toEqual([300, 300, 0, 0])
  })
})

describe('listing', () => {
  it('follows the switch', () => {
    expect(findDemo('school-fees')?.business.name).toBe(SCHOOL.name)
    expect(ALL_DEMOS.some((d) => d.slug === 'school-fees')).toBe(true)
    expect(DEMOS.some((d) => d.slug === 'school-fees')).toBe(LIST_FEES_DEMO)
    expect(toKnowledge(DEMOS).demos.some((d) => d.slug === 'school-fees')).toBe(LIST_FEES_DEMO)
    expect(JSON.stringify(findDemo('school-fees'))).not.toMatch(/cloudflare|napster/i)
  })
})
