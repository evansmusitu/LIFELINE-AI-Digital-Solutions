export type CoreAppId = 'forms' | 'crm' | 'payments' | 'accounting' | 'email' | 'whatsapp' | 'maintenance' | 'calendar'
export type ExtraAppId = 'esign' | 'reports' | 'locks' | 'sms'
export type AppId = CoreAppId | ExtraAppId

export type FlowId = 'rent' | 'enquiry' | 'maintenance'
export type MappingId = 'enquiry-crm' | 'rent-accounting' | 'maintenance-app'
export type TransformId = 'none' | 'split' | 'phone' | 'date' | 'upper' | 'cents'
export type FieldKind = 'text' | 'name' | 'email' | 'phone' | 'date' | 'money' | 'unit' | 'number'

export type FieldValue = string | number
export type DataRecord = Record<string, FieldValue>
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

export interface SourceField {
  key: string
  label: string
  kind: FieldKind
  /** Shown as a badge, for example when a form field changed recently. */
  note?: string
}

export interface TargetField {
  key: string
  label: string
  required?: boolean
}

/** One source field and where it goes. `target: ''` means "Don't send". */
export interface MappingRow {
  source: string
  target: string
  transform: TransformId
}

export interface ConnectedApp {
  id: AppId
  status: 'connected' | 'expired'
  lastSyncAt: number
  expiredAt?: number
  reconnectedAt?: number
  /** Set for apps added on the Connect app screen. */
  connectedAt?: number
  syncs?: string[]
}

interface Person {
  name: string
  email: string
  /** Raw number as typed, e.g. "(404) 555-0148". Missing when the tenant never gave one. */
  phone?: string
  unit: string
  property: string
}

export type Sample =
  | ({ flow: 'rent'; amount: number; card: string } & Person)
  | ({ flow: 'enquiry'; bedrooms: number; budget: number; moveInDays: number; message: string } & Person)
  | ({ flow: 'maintenance'; category: string; issue: string; urgency: 'Routine' | 'Urgent'; estimate: number; entryOk: boolean } & Person)

export type HopStatus = 'sent' | 'retried' | 'queued' | 'failed' | 'skipped'
export type HopCode = 'app-expired' | 'missing-phone' | 'missing-field' | 'busy'

export interface Hop {
  app: AppId
  action: string
  status: HopStatus
  ms: number
  /** Plain-language result. */
  detail: string
  code?: HopCode
  /** Seconds the hub waited before its automatic retry. */
  retryAfterS?: number
  request: Json
  response: Json
  /** Set when a waiting or failed hop was sent later. */
  resolved?: { at: number; from: 'queued' | 'failed'; note: string }
}

export interface SyncEvent {
  id: string
  number: number
  flow: FlowId
  at: number
  sample: Sample
  simulated?: boolean
  hops: Hop[]
}

export interface HubState {
  apps: ConnectedApp[]
  events: SyncEvent[]
  mappings: Record<MappingId, MappingRow[]>
  alerts: { email: boolean; whatsapp: boolean }
  /** Problem id → when it was dismissed. */
  dismissed: Record<string, number>
  nextNumber: number
}
