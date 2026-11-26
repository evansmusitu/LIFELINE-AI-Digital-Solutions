import type { Grade } from '../school-admissions/business'

export interface Child {
  /** First name and initial only. */
  name: string
  grade: Grade
}

export interface Family {
  id: string
  name: string
  /** Masked phone number. */
  contact: string
  children: Child[]
  /** Share of tuition covered by a bursary: 0, 0.5 or 1. Levies are covered too when it is 1. */
  bursary: number
}

export type TermId = 'last' | 'next'

export interface Payment {
  id: string
  familyId: string
  term: TermId
  /** USD. */
  amount: number
  method: string
  at: number
  ref: string
  /** Made in this demo. */
  mine?: boolean
}

export interface Instalment {
  /** Days from when the plan was agreed. */
  dueInDays: number
  amount: number
}

export interface Plan {
  agreedAt: number
  instalments: Instalment[]
  /** For arrears (a meeting outcome) or next term's fees (asked for by the family). */
  term: TermId
}

export interface LevyEntry {
  id: string
  name: string
  /** Per learner per term, USD. */
  amount: number
  purpose: string
  /** The Permanent Secretary's approval: without both, the levy can't be billed. */
  approvalRef?: string
  approvedDaysAgo?: number
}

export interface Spend {
  id: string
  levyId: string
  item: string
  amount: number
  receipt: string
  approvedBy: string[]
  at: number
}

export interface AuditEntry {
  id: string
  at: number
  who: string
  action: string
}

export interface AbroadLink {
  id: string
  familyId: string
  payer: string
  country: string
  amount: number
  at: number
}

export interface FeesState {
  families: Family[]
  payments: Payment[]
  plans: Record<string, Plan>
  reminders: Record<string, number>
  /** A private meeting with the bursar, by family: when it was booked. */
  meetings: Record<string, number>
  levies: LevyEntry[]
  spending: Spend[]
  audit: AuditEntry[]
  abroadLinks: AbroadLink[]
}
