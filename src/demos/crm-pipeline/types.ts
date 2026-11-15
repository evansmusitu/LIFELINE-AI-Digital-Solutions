export type Stage = 'new' | 'contacted' | 'visit' | 'proposal' | 'negotiation' | 'won' | 'lost'
export type OwnerId = 'monique' | 'diego' | 'grace'
export type Source = 'Website form' | 'Referral' | 'Phone' | 'Google search' | 'Walk-in'
export type Facility = 'Office' | 'Medical' | 'School' | 'Gym'
export type PerWeek = 1 | 2 | 3 | 5
export type AddOn = 'windows' | 'carpet' | 'supplies'
export type LostReason = 'Price' | 'Chose competitor' | 'No response' | 'Not a fit'
export type ActivityKind = 'call' | 'email' | 'note' | 'visit' | 'stage' | 'proposal' | 'task' | 'form'
export type RuleId = 'stuck' | 'proposal' | 'manager'
/** Why a task was created automatically. Tasks without one were added by a person. */
export type AutoKind = RuleId | 'won' | 'form'

export interface Owner {
  id: OwnerId
  name: string
  role: string
  email: string
}

export interface Activity {
  id: string
  at: number
  kind: ActivityKind
  text: string
  author: string
  outcome?: string
}

export interface Contact {
  name: string
  role: string
  /** Masked, for example "(919) 555-••47". */
  phone: string
  email: string
}

export interface Deal {
  id: string
  company: string
  contact: Contact
  owner: OwnerId
  stage: Stage
  /** Monthly contract value in USD. */
  value: number
  source: Source
  facility: Facility
  sqft: number
  perWeek: PerWeek
  addOns: AddOn[]
  createdAt: number
  stageSince: number
  lastActivityAt: number
  /** Newest first. */
  activities: Activity[]
  closedAt?: number
  lostReason?: LostReason
  /** First cleaning, for won deals. */
  startDate?: number
}

export interface Task {
  id: string
  dealId: string
  text: string
  due: number
  owner: OwnerId
  createdAt: number
  auto?: AutoKind
  doneAt?: number
  /** Closed without being done, because the deal was won or lost. */
  cancelled?: boolean
}

export type Rules = Record<RuleId, boolean>

export interface CrmState {
  deals: Deal[]
  tasks: Task[]
  rules: Rules
}

export interface ProposalInput {
  facility: Facility
  sqft: number
  perWeek: PerWeek
  addOns: AddOn[]
}

/** What a prospect types into the "Get a free cleaning quote" form. */
export interface Enquiry {
  company: string
  name: string
  email: string
  phone: string
  facility: Facility
  sqft: string
  perWeek: PerWeek
  start: string
  message: string
}
