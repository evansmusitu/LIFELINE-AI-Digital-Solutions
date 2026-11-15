import { todayAt } from '../../lib/time'
import { planEvent, withRetry } from './engine'
import type { FlowId, HubState, MappingId, MappingRow, Sample, SyncEvent } from './types'

/* Sample business: Linden Hollow Property Management, an invented company managing about 140 rentals in Atlanta, Georgia. */

const row = (source: string, target: string, transform: MappingRow['transform'] = 'none'): MappingRow => ({ source, target, transform })

/** How the hub maps fields today. The enquiry form's move-in question changed at 9:30 AM, so it isn't mapped yet. */
export function initialMappings(): Record<MappingId, MappingRow[]> {
  return {
    'enquiry-crm': [
      row('full_name', 'first_name', 'split'),
      row('email', 'email'),
      row('phone', 'mobile', 'phone'),
      row('unit', 'unit_of_interest', 'upper'),
      row('property', 'property'),
      row('bedrooms', 'bedrooms'),
      row('budget', 'budget_cents', 'cents'),
      row('move_in_date', ''),
      row('message', 'notes'),
    ],
    'rent-accounting': [
      row('payer_name', 'customer'),
      row('amount', 'amount_cents', 'cents'),
      row('paid_at', 'payment_date', 'date'),
      row('unit', 'ledger_unit', 'upper'),
      row('property', 'memo'),
      row('payment_id', 'reference'),
      row('card_last4', ''),
    ],
    'maintenance-app': [
      row('tenant_name', 'tenant'),
      row('unit', 'unit', 'upper'),
      row('property', 'property'),
      row('phone', 'contact_phone', 'phone'),
      row('category', 'issue_type'),
      row('description', 'details'),
      row('urgency', 'priority'),
      row('entry_ok', 'permission_to_enter'),
      row('submitted_at', 'reported_on', 'date'),
    ],
  }
}

type Tenant = Pick<Sample, 'name' | 'email' | 'phone' | 'unit' | 'property'> & { rent: number; card: string }

const TENANTS: Record<string, Tenant> = {
  jordan: { name: 'Jordan Ellis', email: 'jordan.ellis@example.com', phone: '(404) 555-0148', unit: '4B', property: '2318 Ponce Ave', rent: 1450, card: '4417' },
  ana: { name: 'Ana Ruiz', email: 'ana.ruiz@example.com', unit: '12C', property: '940 Briar Glen Way', rent: 1725, card: '0932' },
  tamika: { name: 'Tamika Brooks', email: 'tamika.brooks@example.com', phone: '(470) 555-0126', unit: '2A', property: '1612 Magnolia Bend', rent: 1150, card: '2281' },
  wei: { name: 'Wei Chen', email: 'wei.chen@example.com', phone: '(678) 555-0193', unit: '7D', property: '415 Dogwood Terrace', rent: 2050, card: '6650' },
  malik: { name: 'Malik Johnson', email: 'malik.johnson@example.com', phone: '(404) 555-0162', unit: '3F', property: '77 Cedar Hollow Ct', rent: 1300, card: '7014' },
  darnell: { name: 'Darnell Washington', email: 'darnell.washington@example.com', phone: '(770) 555-0137', unit: '9', property: '650 Sycamore Run', rent: 2400, card: '3389' },
}

const person = ({ name, email, phone, unit, property }: Tenant) => ({ name, email, phone, unit, property })

const rent = (t: Tenant): Sample => ({ flow: 'rent', ...person(t), amount: t.rent, card: t.card })

const repair = (t: Tenant, category: string, issue: string, urgency: 'Routine' | 'Urgent', estimate: number, entryOk = true): Sample => ({
  flow: 'maintenance',
  ...person(t),
  category,
  issue,
  urgency,
  estimate,
  entryOk,
})

const enquiry = (
  name: string,
  phone: string,
  unit: string,
  property: string,
  bedrooms: number,
  budget: number,
  moveInDays: number,
  message: string,
): Sample => ({
  flow: 'enquiry',
  name,
  email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`,
  phone,
  unit,
  property,
  bedrooms,
  budget,
  moveInDays,
  message,
})

/** Rotated through by the Simulate buttons, so repeated runs differ. */
export const POOLS: Record<FlowId, Sample[]> = {
  rent: [rent(TENANTS.wei), rent(TENANTS.tamika), rent(TENANTS.darnell)],
  enquiry: [
    enquiry('Keisha Williams', '(404) 555-0181', '3C', '2318 Ponce Ave', 1, 1350, 21, 'Is parking included? I work near Midtown.'),
    enquiry('Daniel Park', '(678) 555-0115', '6B', '1612 Magnolia Bend', 2, 1750, 45, 'Moving with a small dog. Is the yard fenced?'),
    enquiry('Fatima Diallo', '(470) 555-0104', '8A', '77 Cedar Hollow Ct', 2, 1600, 14, 'Could I see it this weekend?'),
  ],
  maintenance: [
    repair(TENANTS.jordan, 'Plumbing', 'Water stain on the bathroom ceiling', 'Urgent', 780),
    repair(TENANTS.wei, 'Appliances', 'Garbage disposal jammed', 'Routine', 120),
    repair(TENANTS.darnell, 'Plumbing', 'Water heater making a banging noise', 'Urgent', 560, false),
  ],
}

const FIRST_NUMBER = 1041

function seedEvents(): SyncEvent[] {
  // Before 9:30 AM the form's old move-in question was mapped, so this morning's enquiries went through.
  const seedState = {
    apps: [{ id: 'accounting' as const, status: 'expired' as const, lastSyncAt: todayAt(6, 11) }],
    mappings: { ...initialMappings(), 'enquiry-crm': initialMappings()['enquiry-crm'].map((r) => (r.source === 'move_in_date' ? row('move_in_date', 'desired_move_in', 'date') : r)) },
  }
  const plan: [number, number, Sample][] = [
    [7, 6, repair(TENANTS.tamika, 'Plumbing', 'Kitchen sink leaking under the cabinet', 'Routine', 180)],
    [7, 24, enquiry('Luis Hernandez', '(404) 555-0109', '5A', '415 Dogwood Terrace', 2, 1800, 30, 'Looking for a 12-month lease from next month.')],
    [7, 41, rent(TENANTS.jordan)],
    [7, 58, repair(TENANTS.wei, 'Heating and cooling', 'Air conditioning not cooling', 'Urgent', 640)],
    [8, 15, enquiry('Grace Okafor', '(678) 555-0172', '11B', '940 Briar Glen Way', 1, 1400, 28, 'Is the gym open to tenants?')],
    [8, 33, repair(TENANTS.ana, 'Doors and windows', 'Bedroom window won’t lock', 'Urgent', 95)],
    [8, 47, rent(TENANTS.malik)],
    [9, 2, enquiry('Emily Nguyen', '(470) 555-0158', '4', '650 Sycamore Run', 3, 2300, 40, 'Family of four. Are townhomes near schools?')],
    [9, 14, repair(TENANTS.darnell, 'Appliances', 'Dishwasher not draining', 'Routine', 220)],
    [9, 26, repair(TENANTS.malik, 'Electrical', 'Hallway light flickering', 'Routine', 85)],
  ]
  return plan
    .map(([h, m, sample], i) => {
      const number = FIRST_NUMBER + i
      const event = planEvent(sample.flow, sample, seedState, number, todayAt(h, m), { busyRetries: false })
      // The one automatic retry this morning: Tenant CRM rate-limited Grace's enquiry.
      return number === FIRST_NUMBER + 4 ? { ...event, hops: [withRetry(event.hops[0], 30), ...event.hops.slice(1)] } : event
    })
    .reverse()
}

export function createInitialState(): HubState {
  const events = seedEvents()
  return {
    apps: [
      { id: 'forms', status: 'connected', lastSyncAt: todayAt(6, 58) },
      { id: 'crm', status: 'connected', lastSyncAt: todayAt(6, 58) },
      { id: 'payments', status: 'connected', lastSyncAt: todayAt(6, 58) },
      { id: 'accounting', status: 'expired', lastSyncAt: todayAt(6, 11), expiredAt: todayAt(6, 12) },
      { id: 'email', status: 'connected', lastSyncAt: todayAt(6, 58) },
      { id: 'whatsapp', status: 'connected', lastSyncAt: todayAt(6, 58) },
      { id: 'maintenance', status: 'connected', lastSyncAt: todayAt(6, 58) },
      { id: 'calendar', status: 'connected', lastSyncAt: todayAt(6, 58) },
    ],
    events,
    mappings: initialMappings(),
    alerts: { email: true, whatsapp: true },
    dismissed: {},
    nextNumber: FIRST_NUMBER + events.length,
  }
}
