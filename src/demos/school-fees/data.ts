import { LEVIES, SCHOOL as ADMISSIONS_SCHOOL, tuitionFor, type Grade } from '../school-admissions/business'
import type { FeesState, Family, LevyEntry, Payment, Spend } from './types'

/*
 * The sample school's fees and accountability data: the same invented school and fee list as the
 * admissions demo, with invented families, payments, levies and spending. Dates are counted from today,
 * so the demo always looks current.
 */

export const FEES_SLUG = 'school-fees'

export const SCHOOL = {
  name: ADMISSIONS_SCHOOL.name,
  short: ADMISSIONS_SCHOOL.short,
  bursar: 'Mrs R. Chikore, Bursar',
  /** The two people who must approve any spending from a levy. */
  approvers: ['Mrs R. Chikore (Bursar)', 'Mr P. Mlambo (SDC treasurer)'],
} as const

export const DAY = 86_400_000

/** Sample ZiG rates: the one fixed on each invoice when it was issued, and today's. */
export const RATES = { lastTerm: 26.2, thisTerm: 26.8, today: 27.15 } as const

export const TERMS = {
  last: { name: 'Term 3 2026', issuedDaysAgo: 85, dueDaysAgo: 70, rate: RATES.lastTerm },
  next: { name: 'Term 1 2027', issuedDaysAgo: 6, dueInDays: 47, rate: RATES.thisTerm },
} as const

/** One learner's fees for a term: tuition and the approved levies. Bursaries take a share off tuition only. */
export const childTerm = (grade: Grade) => tuitionFor(grade) + LEVIES.reduce((s, l) => s + l.amount, 0)

/** [parent, masked phone, children as [name, grade], bursary share of tuition, paid last term as a share, paid this term as a share, plan] */
const FAMILIES: [string, string, [string, Grade][], number, number, number][] = [
  ['Moyo family', '+263 ••• ••• 214', [['Tanaka M.', 'Form 4'], ['Rudo M.', 'Grade 5']], 0, 1, 0.5],
  ['Sibanda family', '+44 ••• ••• 630', [['Blessing S.', 'Form 2']], 0, 1, 1],
  ['Chari family', '+263 ••• ••• 145', [['Ruvimbo C.', 'Lower 6']], 0, 0.6, 0],
  ['Dube family', '+263 ••• ••• 377', [['Farai D.', 'ECD B'], ['Nyasha D.', 'Grade 3']], 0, 1, 0],
  ['Gumbo family', '+27 ••• ••• 902', [['Kuda G.', 'Grade 4']], 0, 0.75, 0],
  ['Ncube family', '+263 ••• ••• 209', [['Memory N.', 'Form 3']], 1, 1, 1],
  ['Mutasa family', '+263 ••• ••• 564', [['Tafadzwa M.', 'Grade 6']], 0.5, 1, 0.5],
  ['Nyoni family', '+263 ••• ••• 118', [['Rufaro N.', 'Form 1']], 0, 1, 1],
  ['Marufu family', '+263 ••• ••• 590', [['Chiedza M.', 'Grade 6'], ['Tino M.', 'Form 1']], 0, 0.4, 0],
  ['Kanengoni family', '+263 ••• ••• 263', [['Tawanda K.', 'Grade 6']], 0, 1, 0.25],
  ['Dlamini family', '+263 ••• ••• 371', [['Nokuthula D.', 'Lower 6']], 0, 1, 0],
  ['Gwatidzo family', '+263 ••• ••• 904', [['Simba G.', 'ECD A']], 0, 0.9, 0],
]

const METHODS = ['EcoCash', 'Bank transfer (USD)', 'InnBucks', 'Bank transfer (ZiG)', 'Card at the bursary', 'Paid from abroad'] as const

export function createInitialState(now: number): FeesState {
  const families: Family[] = FAMILIES.map(([name, contact, children, bursary], i) => ({
    id: `f${i + 1}`,
    name,
    contact,
    children: children.map(([child, grade]) => ({ name: child, grade })),
    bursary,
  }))
  const payments: Payment[] = []
  FAMILIES.forEach(([, , children, bursary, lastShare, nextShare], i) => {
    // The same as the invoice: tuition less the bursary, and the levies unless the bursary is full.
    const owed = children.reduce((s, [, g]) => s + Math.round(tuitionFor(g) * (1 - bursary)) + (bursary === 1 ? 0 : childTerm(g) - tuitionFor(g)), 0)
    const add = (term: 'last' | 'next', share: number, daysAgo: number) => {
      const amount = Math.round(owed * share)
      if (amount <= 0) return
      payments.push({
        id: `p${payments.length + 1}`,
        familyId: `f${i + 1}`,
        term,
        amount,
        method: i === 1 ? 'Paid from abroad' : METHODS[(i + payments.length) % METHODS.length],
        at: now - daysAgo * DAY,
        ref: `RCPT-${4100 + payments.length}`,
      })
    }
    add('last', lastShare, 80 - i * 3)
    add('next', nextShare, 4 - (i % 4))
  })

  const levies: LevyEntry[] = [
    ...LEVIES.map((l, i) => ({ id: l.id, name: l.name, amount: l.amount, purpose: i === 0 ? 'Classroom block roof and new desks' : 'Computer lab, internet and sports kit', approvalRef: l.approval.match(/MRA\/LEV\/\d+/)?.[0], approvedDaysAgo: 210 - i * 40 })),
    { id: 'lab', name: 'Science laboratory levy', amount: 15, purpose: 'Equipment and chemicals for the new science laboratory' },
  ]

  const spending: Spend[] = [
    { id: 's1', levyId: 'development', item: 'Roof sheets and labour, Block C', amount: 6_850, receipt: 'INV-22817 (fiscal)', approvedBy: [...SCHOOL.approvers], at: now - 41 * DAY },
    { id: 's2', levyId: 'development', item: '60 learner desks', amount: 3_900, receipt: 'INV-1093 (fiscal)', approvedBy: [...SCHOOL.approvers], at: now - 19 * DAY },
    { id: 's3', levyId: 'ict-sport', item: 'Internet, three months', amount: 1_140, receipt: 'INV-55302 (fiscal)', approvedBy: [...SCHOOL.approvers], at: now - 28 * DAY },
    { id: 's4', levyId: 'ict-sport', item: 'Football and netball kit', amount: 820, receipt: 'INV-7710 (fiscal)', approvedBy: [...SCHOOL.approvers], at: now - 9 * DAY },
  ]

  return {
    families,
    payments,
    plans: {},
    reminders: {},
    meetings: {},
    levies,
    spending,
    audit: [
      { id: 'a1', at: now - 41 * DAY, who: SCHOOL.approvers[0], action: 'Spending approved: Roof sheets and labour, Block C, $6,850 from the development levy' },
      { id: 'a2', at: now - 6 * DAY, who: SCHOOL.approvers[0], action: `Invoices issued for ${TERMS.next.name} at ZiG ${RATES.thisTerm} to the US dollar` },
    ],
    abroadLinks: [],
  }
}

/* Whole-school figures for the cash forecast (sample) */

export const WHOLE_SCHOOL = {
  learners: 1_024,
  cashNow: 39_000,
  /** Salaries and statutory payments each month. */
  salaries: 61_500,
  /** Other running costs each month: power, water, food for boarders, transport. */
  running: 18_200,
  /** Fees still owed from last term across the school. */
  arrears: 46_300,
  /** Next term's invoices across the school. */
  nextTermInvoiced: 742_000,
  /** How much of next term's fees usually comes in each month: before the term, then the first, second and third months. */
  collection: [0.04, 0.5, 0.22, 0.1],
  /** How much of the arrears usually comes in each month. */
  arrearsRecovery: 0.2,
} as const

/* Income that needs a fiscal receipt (ZIMRA) */

export interface ShopSale {
  id: string
  source: string
  amount: number
  /** Whether the till issued a fiscal receipt through the fiscal device. */
  fiscalised: boolean
}

export const SHOP_SALES: readonly ShopSale[] = [
  { id: 'tuck', source: 'Tuck shop, this week', amount: 1_284, fiscalised: true },
  { id: 'uniform', source: 'Uniform shop, this week', amount: 2_960, fiscalised: true },
  { id: 'hall', source: 'Hall hire, Saturday wedding', amount: 450, fiscalised: false },
]
