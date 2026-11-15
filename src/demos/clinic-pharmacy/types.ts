export type ClinicianId = 'mutasa' | 'khumalo' | 'ndlovu'

export interface Clinician {
  id: ClinicianId
  name: string
  short: string
  role: string
  room: string
}

export type ServiceId = 'gp' | 'chronic' | 'child' | 'antenatal' | 'bp' | 'refill'

export interface Service {
  id: ServiceId
  name: string
  minutes: number
  fee: number
}

export interface Patient {
  id: string
  name: string
  age: string
  phone: string
}

export type AppointmentStatus = 'Booked' | 'Confirmed' | 'Arrived' | 'With clinician' | 'Done' | 'No-show'

export interface Appointment {
  id: string
  patientId: string
  clinicianId: ClinicianId
  serviceId: ServiceId
  start: number
  status: AppointmentStatus
  arrivedAt?: number
  startedAt?: number
  finishedAt?: number
}

export interface Batch {
  batchNo: string
  expiry: number
  qty: number
}

export interface Medicine {
  id: string
  name: string
  unit: string
  reorderLevel: number
  batches: Batch[]
  onOrder?: boolean
}

export interface RxItem {
  medicineId: string
  dose: string
  qty: number
}

export type RxStatus = 'Waiting' | 'Ready' | 'Collected'

export interface Prescription {
  id: string
  number: string
  patientId: string
  clinicianId: ClinicianId
  at: number
  items: RxItem[]
  status: RxStatus
  source: 'Consultation' | 'Refill request'
  readyAt?: number
  notifiedAt?: number
  collectedAt?: number
  /** Batches used, first expiry first out. */
  dispensed?: { medicineId: string; batchNo: string; qty: number }[]
}

export type ReminderKind = 'day-before' | 'same-day' | 'refill' | 'missed'
export type ReminderStatus = 'Scheduled' | 'Sent' | 'Confirmed' | 'New time requested' | 'Refill requested' | 'Call booked'

export interface Reminder {
  id: string
  kind: ReminderKind
  patientId: string
  /** The appointment this reminder is about, so a patient's reply can confirm it. */
  appointmentId?: string
  /** "Tomorrow 08:30" or "Today 11:15", as shown in the message. */
  when?: string
  clinicianId?: ClinicianId
  medicineId?: string
  sendAt: number
  status: ReminderStatus
  channel: 'WhatsApp' | 'SMS'
  sentAt?: number
  reply?: string
  repliedAt?: number
}

export interface ClinicState {
  patients: Patient[]
  appointments: Appointment[]
  medicines: Medicine[]
  prescriptions: Prescription[]
  reminders: Reminder[]
  templates: Record<ReminderKind, string>
  nextRx: number
}
