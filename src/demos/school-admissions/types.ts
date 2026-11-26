import type { DocId, Grade } from './business'

/** Where an enquiry came from. Facebook visitors arrive through links to the website. */
export type Source = 'Website chat' | 'Tour page' | 'Application' | 'WhatsApp' | 'Facebook' | 'Phone'

export type Entry = 'January 2027' | 'Mid-year transfer'

export type EnquiryStatus = 'New' | 'Handed over' | 'Contacted' | 'Tour booked' | 'Applied'

export interface Enquiry {
  id: string
  /** The parent or guardian, never the child. */
  parent: string
  /** Masked phone number or email. */
  contact: string
  source: Source
  grade: Grade
  entry: Entry
  /** What they asked, in a few words. Never the chat itself. */
  note: string
  at: number
  /** Minutes until the family got a first useful answer. The assistant answers at once (0). */
  firstReplyMinutes: number | null
  status: EnquiryStatus
  mine?: boolean
}

export interface Tour {
  id: string
  ref: string
  parent: string
  contact: string
  grade: Grade
  start: number
  source: Source
  createdAt: number
  mine?: boolean
}

export type Stage = 'Documents missing' | 'Complete' | 'Assessment booked' | 'Offer made' | 'Accepted' | 'Waiting list'

export interface Application {
  id: string
  ref: string
  /** First name and initial only. */
  child: string
  parent: string
  contact: string
  grade: Grade
  entry: Entry
  docs: Partial<Record<DocId, boolean>>
  /** The parent's written consent to keep these details. Every application has it: the form can't be sent without. */
  consent: true
  stage: Stage
  sibling: boolean
  source: Source
  at: number
  /** When the office last asked for the missing documents. */
  remindedAt?: number
  mine?: boolean
}

export interface SentNotice {
  id: string
  title: string
  body: string
  at: number
  /** Parents it went to (simulated). */
  reach: number
  urgent: boolean
}

export interface SchoolState {
  enquiries: Enquiry[]
  tours: Tour[]
  applications: Application[]
  notices: SentNotice[]
  nextRef: number
}
