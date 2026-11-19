import type { Mode, PractitionerId, ServiceId } from './business'

/** Where an enquiry or booking came from. Facebook and LinkedIn visitors arrive through links to the website. */
export type Source = 'Website chat' | 'Booking page' | 'WhatsApp' | 'Facebook' | 'LinkedIn'

export type BookingStatus = 'Booked' | 'Completed' | 'Cancelled'

export interface Booking {
  id: string
  ref: string
  /** Only what booking needs: no health information is ever asked for or stored. */
  client: { name: string; phone: string; email?: string }
  serviceId: ServiceId
  practitionerId: PractitionerId
  mode: Mode
  /** Start time, in milliseconds since 1970 (UTC). */
  start: number
  minutes: number
  status: BookingStatus
  source: Source
  createdAt: number
  /** The visitor's own booking, made in this browser. */
  mine?: boolean
}

export type LeadStatus = 'New' | 'Handed over' | 'Contacted' | 'Booked'

export interface Lead {
  id: string
  name: string
  /** Masked phone number or email. */
  contact: string
  source: Source
  interest: string
  /** What they asked, in a few words. */
  note: string
  at: number
  status: LeadStatus
  mine?: boolean
}

export interface WellnessState {
  bookings: Booking[]
  leads: Lead[]
  nextRef: number
  /** Manual reminders sent from the owner view, by booking id. */
  remindedAt: Record<string, number>
}

/** The booking in progress on the Book screen. */
export interface Draft {
  step: 1 | 2 | 3 | 4
  mode?: Mode
  serviceId?: ServiceId
  practitioner: PractitionerId | 'any'
  day?: number
  minute?: number
  name: string
  phone: string
  email: string
}
