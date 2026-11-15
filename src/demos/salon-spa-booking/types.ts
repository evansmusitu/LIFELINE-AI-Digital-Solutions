export type StaffId = 'naledi' | 'zara' | 'lerato' | 'kgomotso'

/** A booking for "Anyone available" is given to a team member when it's confirmed. */
export type StaffChoice = StaffId | 'any'

export interface Staff {
  id: StaffId
  name: string
  role: string
  email: string
  /** Working hours and lunch, in minutes after midnight. */
  start: number
  end: number
  lunch: [number, number]
  services: ServiceId[]
}

export type ServiceGroup = 'Hair' | 'Nails' | 'Spa'

export type ServiceId =
  | 'cut'
  | 'blowdry'
  | 'colour'
  | 'roots'
  | 'braids'
  | 'silkpress'
  | 'manicure'
  | 'pedicure'
  | 'removal'
  | 'swedish60'
  | 'swedish90'
  | 'deeptissue'
  | 'facial'

export interface Service {
  id: ServiceId
  name: string
  /** Name with the length where two services share a name, e.g. "Swedish massage (90 min)". */
  label: string
  group: ServiceGroup
  minutes: number
  price: number
  /** How often clients usually come back for it. Drives the "Due back" list. */
  rebookWeeks: number
}

export type ApptStatus = 'Booked' | 'Checked in' | 'Completed' | 'No-show' | 'Cancelled'

/** paid: held by the salon. applied: taken off the final bill. kept: late cancellation or no-show. */
export type DepositStatus = 'none' | 'paid' | 'refunded' | 'kept' | 'applied'

export type PaymentMethod = 'Card' | 'Cash' | 'EFT'

export interface Appointment {
  id: string
  ref: string
  clientId: string
  staffId: StaffId
  serviceId: ServiceId
  start: number
  /** Minutes. */
  duration: number
  price: number
  deposit: number
  depositStatus: DepositStatus
  status: ApptStatus
  source: 'Online' | 'Phone'
  createdAt: number
  notes?: string
  reminder: boolean
  remindedAt?: number
  checkedInAt?: number
  completedAt?: number
  cancelledAt?: number
  payment?: { method: PaymentMethod; amount: number; points: number }
}

export interface Visit {
  at: number
  serviceId: ServiceId
  staffId: StaffId
  amount: number
}

export interface PointsEntry {
  at: number
  label: string
  points: number
}

export type RewardId = 'blowdry' | 'spa15' | 'manicure'

export interface Reward {
  id: RewardId
  name: string
  points: number
  prefix: string
}

export interface RewardCode {
  code: string
  rewardId: RewardId
  at: number
}

export interface Client {
  id: string
  name: string
  /** Masked, e.g. "+27 82 ••• 4410". */
  phone: string
  email?: string
  preferredStaff?: StaffId
  notes?: string
  referralCode: string
  /** Newest first. */
  visits: Visit[]
  /** Newest first. */
  points: PointsEntry[]
  rewards: RewardCode[]
  contactedAt?: number
  /** The person trying the demo, created when they book. */
  isVisitor?: boolean
}

export interface SalonState {
  appointments: Appointment[]
  clients: Client[]
  nextRef: number
  nextReward: number
}

/** The booking a visitor is making. Screen state only, never stored. */
export interface Draft {
  step: 1 | 2 | 3 | 4
  serviceId?: ServiceId
  staffChoice: StaffChoice
  day?: number
  minute?: number
  name: string
  phone: string
  email: string
  notes: string
  reminder: boolean
  /** Simulated deposit payment, kept with the service it was paid for. */
  paid?: { serviceId: ServiceId; amount: number; last4: string }
}
