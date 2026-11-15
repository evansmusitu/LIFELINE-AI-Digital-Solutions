import type { AppId, CoreAppId, ExtraAppId, FieldKind, FlowId, MappingId, SourceField, TargetField, TransformId } from './types'

/*
 * The apps, flows and field schemas in the sample hub. App names are generic ("Accounting", "Tenant CRM")
 * because a real build connects whatever tools the client already uses. Icons live in parts.tsx.
 */

export const BUSINESS = {
  name: 'Linden Hollow Property Management',
  descriptor: 'Rental property management · Atlanta, Georgia',
  leasingEmail: 'leasing@lindenhollowpm.com',
}

export const STAFF = {
  ops: { name: 'Denise Carter', role: 'Operations manager', email: 'denise.carter@lindenhollowpm.com', phone: '(404) 555-0177' },
  accounts: { name: 'Marcus Bell', role: 'Accounts' },
  maintenance: { name: 'Priya Raman', role: 'Maintenance coordinator' },
}

export interface AppDef {
  name: string
  tile: string
  /** Short "What it syncs" line on the Hub card. */
  syncs: string
  permissions: string[]
  /** Only for apps on the Connect app screen. */
  description?: string
  options?: string[]
  testMs?: number
}

export const APPS: Record<AppId, AppDef> = {
  forms: {
    name: 'Website forms',
    tile: 'bg-sky-50 text-sky-700',
    syncs: 'Rental enquiries and tenant portal requests',
    permissions: ['Read form entries'],
  },
  crm: {
    name: 'Tenant CRM',
    tile: 'bg-violet-50 text-violet-700',
    syncs: 'Tenants, prospects and balances',
    permissions: ['Read and update tenants', 'Create prospects'],
  },
  payments: {
    name: 'Rent payments',
    tile: 'bg-emerald-50 text-emerald-700',
    syncs: 'Online rent payments as they clear',
    permissions: ['Read payments'],
  },
  accounting: {
    name: 'Accounting',
    tile: 'bg-indigo-50 text-indigo-700',
    syncs: 'Payments into each unit’s ledger',
    permissions: ['Read and create payments', 'Read unit ledgers'],
  },
  email: {
    name: 'Email',
    tile: 'bg-blue-50 text-blue-700',
    syncs: 'Receipts, team alerts and owner notices',
    permissions: ['Send email from lindenhollowpm.com'],
  },
  whatsapp: {
    name: 'WhatsApp Business',
    tile: 'bg-green-50 text-green-700',
    syncs: 'Confirmations and updates to tenants',
    permissions: ['Send template messages'],
  },
  maintenance: {
    name: 'Maintenance app',
    tile: 'bg-orange-50 text-orange-700',
    syncs: 'Work orders and repair estimates',
    permissions: ['Create and read work orders'],
  },
  calendar: {
    name: 'Calendar',
    tile: 'bg-cyan-50 text-cyan-700',
    syncs: 'Viewing slots for prospects',
    permissions: ['Read free times', 'Create events'],
  },
  esign: {
    name: 'E-signatures',
    tile: 'bg-rose-50 text-rose-700',
    syncs: '',
    description: 'Send lease renewals for signing and file them when signed.',
    permissions: ['Create and send documents for signing', 'Read signing status'],
    options: ['Lease renewals', 'New leases', 'Pet and parking addendums'],
    testMs: 214,
  },
  reports: {
    name: 'Owner reports',
    tile: 'bg-teal-50 text-teal-700',
    syncs: '',
    description: 'Monthly statements for each owner, filled into a spreadsheet.',
    permissions: ['Create and edit spreadsheets in one folder'],
    options: ['Monthly owner statements', 'Rent roll', 'Repair spending by unit'],
    testMs: 187,
  },
  locks: {
    name: 'Smart locks',
    tile: 'bg-amber-50 text-amber-700',
    syncs: '',
    description: 'One-time door codes for viewings and repair visits.',
    permissions: ['Create one-time access codes', 'Read lock status'],
    options: ['Codes for viewings', 'Codes for repair visits', 'Reset codes at move-out'],
    testMs: 241,
  },
  sms: {
    name: 'Text messages (SMS)',
    tile: 'bg-fuchsia-50 text-fuchsia-700',
    syncs: '',
    description: 'A text message fallback when a tenant doesn’t use WhatsApp.',
    permissions: ['Send text messages', 'Read delivery reports'],
    options: ['Fallback for WhatsApp updates', 'Rent reminders', 'Viewing reminders'],
    testMs: 168,
  },
}

export const CORE_APPS: CoreAppId[] = ['forms', 'crm', 'payments', 'accounting', 'email', 'whatsapp', 'maintenance', 'calendar']
export const EXTRA_APPS: ExtraAppId[] = ['esign', 'reports', 'locks', 'sms']

export interface FlowHopDef {
  app: CoreAppId
  action: string
  mapping?: MappingId
}

export interface FlowDef {
  id: FlowId
  name: string
  source: CoreAppId
  trigger: string
  button: string
  /** "payment", "enquiry", "request" */
  noun: string
  hops: FlowHopDef[]
}

export const FLOWS: Record<FlowId, FlowDef> = {
  rent: {
    id: 'rent',
    name: 'Rent payment',
    source: 'payments',
    trigger: 'Rent paid online',
    button: 'Simulate a rent payment',
    noun: 'payment',
    hops: [
      { app: 'accounting', action: 'Payment recorded in unit ledger', mapping: 'rent-accounting' },
      { app: 'crm', action: 'Rent marked paid' },
      { app: 'email', action: 'Receipt emailed' },
      { app: 'whatsapp', action: 'Payment confirmation sent' },
    ],
  },
  enquiry: {
    id: 'enquiry',
    name: 'Website enquiry',
    source: 'forms',
    trigger: 'Rental enquiry form sent',
    button: 'Simulate a website enquiry',
    noun: 'enquiry',
    hops: [
      { app: 'crm', action: 'New prospect added', mapping: 'enquiry-crm' },
      { app: 'calendar', action: 'Viewing slot offered' },
      { app: 'whatsapp', action: 'Viewing confirmation sent' },
      { app: 'email', action: 'Leasing team alerted' },
    ],
  },
  maintenance: {
    id: 'maintenance',
    name: 'Maintenance request',
    source: 'forms',
    trigger: 'Tenant portal request',
    button: 'Simulate a maintenance request',
    noun: 'request',
    hops: [
      { app: 'maintenance', action: 'Work order created', mapping: 'maintenance-app' },
      { app: 'whatsapp', action: 'Update sent to tenant' },
      { app: 'email', action: 'Owner notice (over $500)' },
    ],
  },
}

export const FLOW_ORDER: FlowId[] = ['rent', 'enquiry', 'maintenance']

export interface MappingDef {
  id: MappingId
  flow: FlowId
  app: CoreAppId
  label: string
  sourceName: string
  sources: SourceField[]
  targets: TargetField[]
}

export const MAPPINGS: Record<MappingId, MappingDef> = {
  'enquiry-crm': {
    id: 'enquiry-crm',
    flow: 'enquiry',
    app: 'crm',
    label: 'Website enquiry → Tenant CRM',
    sourceName: 'Website form',
    sources: [
      { key: 'full_name', label: 'Full name', kind: 'name' },
      { key: 'email', label: 'Email', kind: 'email' },
      { key: 'phone', label: 'Mobile number', kind: 'phone' },
      { key: 'unit', label: 'Unit', kind: 'unit' },
      { key: 'property', label: 'Property', kind: 'text' },
      { key: 'bedrooms', label: 'Bedrooms', kind: 'number' },
      { key: 'budget', label: 'Monthly budget', kind: 'money' },
      { key: 'move_in_date', label: 'Move-in date', kind: 'date', note: 'Changed 9:30 AM' },
      { key: 'message', label: 'Message', kind: 'text' },
    ],
    targets: [
      { key: 'first_name', label: 'First name', required: true },
      { key: 'last_name', label: 'Last name', required: true },
      { key: 'email', label: 'Email', required: true },
      { key: 'mobile', label: 'Mobile' },
      { key: 'unit_of_interest', label: 'Unit of interest' },
      { key: 'property', label: 'Property' },
      { key: 'bedrooms', label: 'Bedrooms' },
      { key: 'desired_move_in', label: 'Desired move-in', required: true },
      { key: 'budget_cents', label: 'Budget (cents)' },
      { key: 'notes', label: 'Notes' },
    ],
  },
  'rent-accounting': {
    id: 'rent-accounting',
    flow: 'rent',
    app: 'accounting',
    label: 'Rent payment → Accounting',
    sourceName: 'Rent payments',
    sources: [
      { key: 'payer_name', label: 'Payer name', kind: 'name' },
      { key: 'amount', label: 'Amount', kind: 'money' },
      { key: 'paid_at', label: 'Paid at', kind: 'date' },
      { key: 'unit', label: 'Unit', kind: 'unit' },
      { key: 'property', label: 'Property', kind: 'text' },
      { key: 'payment_id', label: 'Payment ID', kind: 'text' },
      { key: 'card_last4', label: 'Card', kind: 'text' },
    ],
    targets: [
      { key: 'customer', label: 'Customer', required: true },
      { key: 'amount_cents', label: 'Amount (cents)', required: true },
      { key: 'payment_date', label: 'Payment date', required: true },
      { key: 'ledger_unit', label: 'Ledger unit', required: true },
      { key: 'reference', label: 'Reference' },
      { key: 'memo', label: 'Memo' },
    ],
  },
  'maintenance-app': {
    id: 'maintenance-app',
    flow: 'maintenance',
    app: 'maintenance',
    label: 'Maintenance request → Maintenance app',
    sourceName: 'Tenant portal form',
    sources: [
      { key: 'tenant_name', label: 'Tenant name', kind: 'name' },
      { key: 'unit', label: 'Unit', kind: 'unit' },
      { key: 'property', label: 'Property', kind: 'text' },
      { key: 'phone', label: 'Mobile number', kind: 'phone' },
      { key: 'category', label: 'Category', kind: 'text' },
      { key: 'description', label: 'What’s wrong', kind: 'text' },
      { key: 'urgency', label: 'Urgency', kind: 'text' },
      { key: 'entry_ok', label: 'OK to enter if not home', kind: 'text' },
      { key: 'submitted_at', label: 'Submitted', kind: 'date' },
    ],
    targets: [
      { key: 'tenant', label: 'Tenant', required: true },
      { key: 'unit', label: 'Unit', required: true },
      { key: 'property', label: 'Property', required: true },
      { key: 'issue_type', label: 'Issue type', required: true },
      { key: 'details', label: 'Details', required: true },
      { key: 'priority', label: 'Priority' },
      { key: 'contact_phone', label: 'Contact phone' },
      { key: 'permission_to_enter', label: 'Permission to enter' },
      { key: 'reported_on', label: 'Reported on' },
    ],
  },
}

export const MAPPING_ORDER: MappingId[] = ['enquiry-crm', 'rent-accounting', 'maintenance-app']

export interface TransformDef {
  label: string
  kinds: FieldKind[] | 'all'
  /** Target keys this transform fills, when it fills more than the chosen one. */
  writes?: string[]
}

export const TRANSFORMS: Record<TransformId, TransformDef> = {
  none: { label: 'None', kinds: 'all' },
  split: { label: 'Split full name into first and last', kinds: ['name'], writes: ['first_name', 'last_name'] },
  phone: { label: 'Phone to international format', kinds: ['phone'] },
  date: { label: 'Date to MM/DD/YYYY', kinds: ['date'] },
  upper: { label: 'Uppercase unit number', kinds: ['unit'] },
  cents: { label: 'Money to cents', kinds: ['money'] },
}

/** Owner notices go out only for repairs above this estimate. */
export const OWNER_NOTICE_OVER = 500
