import {
  Boxes,
  CalendarDays,
  ClipboardList,
  Filter,
  Mail,
  MessageCircle,
  PackagePlus,
  PhoneMissed,
  Receipt,
  Sheet,
  Store,
  Timer,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { DAY } from '../../lib/time'
import type { ActionId, AppId, Step, TriggerId } from './types'

/*
 * The connectors and building blocks in the sample automation tool. Names are generic
 * ("Online store", "Accounting") because a real build connects whatever tools the client uses.
 */

export const APPS: Record<AppId, { name: string; icon: LucideIcon; tile: string }> = {
  store: { name: 'Online store', icon: Store, tile: 'bg-emerald-50 text-emerald-700' },
  forms: { name: 'Website forms', icon: ClipboardList, tile: 'bg-sky-50 text-sky-700' },
  inventory: { name: 'Inventory', icon: Boxes, tile: 'bg-amber-50 text-amber-700' },
  invoices: { name: 'Accounting', icon: Receipt, tile: 'bg-indigo-50 text-indigo-700' },
  email: { name: 'Email', icon: Mail, tile: 'bg-blue-50 text-blue-700' },
  whatsapp: { name: 'WhatsApp Business', icon: MessageCircle, tile: 'bg-green-50 text-green-700' },
  sheets: { name: 'Spreadsheet', icon: Sheet, tile: 'bg-teal-50 text-teal-700' },
  crm: { name: 'CRM', icon: Users, tile: 'bg-violet-50 text-violet-700' },
  purchasing: { name: 'Purchasing', icon: PackagePlus, tile: 'bg-orange-50 text-orange-700' },
  phone: { name: 'Phone system', icon: PhoneMissed, tile: 'bg-rose-50 text-rose-700' },
  calendar: { name: 'Calendar', icon: CalendarDays, tile: 'bg-cyan-50 text-cyan-700' },
  delay: { name: 'Wait', icon: Timer, tile: 'bg-slate-100 text-slate-700' },
  filter: { name: 'Condition', icon: Filter, tile: 'bg-slate-100 text-slate-700' },
}

export interface Variable {
  key: string
  label: string
}

export interface TriggerDef {
  id: TriggerId
  app: AppId
  label: string
  description: string
  variables: Variable[]
  /** Sample data used in test runs. */
  sample: (now: number) => Record<string, string>
  summary: (data: Record<string, string>) => string
}

const date = (at: number) => new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export const TRIGGERS: Record<TriggerId, TriggerDef> = {
  'order.paid': {
    id: 'order.paid',
    app: 'store',
    label: 'New order is paid',
    description: 'Runs when a customer completes checkout in the online store.',
    variables: [
      { key: 'order.number', label: 'Order number' },
      { key: 'order.total', label: 'Order total' },
      { key: 'order.items', label: 'Items ordered' },
      { key: 'customer.name', label: 'Customer name' },
      { key: 'customer.first_name', label: 'Customer first name' },
      { key: 'customer.email', label: 'Customer email' },
      { key: 'customer.country', label: 'Customer country' },
      { key: 'shipping.method', label: 'Shipping method' },
    ],
    sample: () => ({
      'order.number': 'HL-10482',
      'order.total': '$186.00',
      'order.items': '1 × Herringbone wool throw, Slate ($98.00); 2 × Washed linen cushion cover, Sage ($44.00 each)',
      'customer.name': 'Amelia Hart',
      'customer.first_name': 'Amelia',
      'customer.email': 'amelia.hart@example.com',
      'customer.country': 'United States',
      'shipping.method': 'International tracked',
    }),
    summary: (d) => `Order ${d['order.number']} · ${d['customer.name']} · ${d['order.total']}`,
  },
  'form.submitted': {
    id: 'form.submitted',
    app: 'forms',
    label: 'Wholesale enquiry form is sent',
    description: 'Runs when a business fills in the trade enquiry form on the website.',
    variables: [
      { key: 'lead.name', label: 'Contact name' },
      { key: 'lead.first_name', label: 'Contact first name' },
      { key: 'lead.company', label: 'Company' },
      { key: 'lead.email', label: 'Email' },
      { key: 'lead.budget', label: 'Budget' },
      { key: 'lead.message', label: 'Message' },
    ],
    sample: () => ({
      'lead.name': 'Tomasz Nowak',
      'lead.first_name': 'Tomasz',
      'lead.company': 'Ellery Quay Hotels',
      'lead.email': 't.nowak@elleryquayhotels.com',
      'lead.budget': '$8,000–$12,000',
      'lead.message': 'We are refurbishing 42 rooms in Edinburgh and need a throw and two cushion covers for each room. Could you quote for 42 sets?',
    }),
    summary: (d) => `Enquiry from ${d['lead.name']}, ${d['lead.company']}`,
  },
  'stock.low': {
    id: 'stock.low',
    app: 'inventory',
    label: 'Stock falls below reorder level',
    description: 'Runs when a product’s stock drops below the level you set.',
    variables: [
      { key: 'product.name', label: 'Product name' },
      { key: 'product.sku', label: 'Product code (SKU)' },
      { key: 'product.stock', label: 'Stock left' },
      { key: 'product.reorder_qty', label: 'Reorder quantity' },
      { key: 'product.cost', label: 'Unit cost' },
      { key: 'supplier.name', label: 'Supplier name' },
      { key: 'supplier.email', label: 'Supplier email' },
    ],
    sample: () => ({
      'product.name': 'Herringbone wool throw, Slate',
      'product.sku': 'HL-THR-014',
      'product.stock': '6',
      'product.reorder_qty': '40',
      'product.cost': '$41.50',
      'supplier.name': 'Hebble Brook Weavers',
      'supplier.email': 'orders@hebblebrookweavers.co.uk',
    }),
    summary: (d) => `${d['product.name']} down to ${d['product.stock']}`,
  },
  'cart.abandoned': {
    id: 'cart.abandoned',
    app: 'store',
    label: 'Basket left for 3 hours',
    description: 'Runs when a signed-in customer leaves items in their basket.',
    variables: [
      { key: 'customer.first_name', label: 'Customer first name' },
      { key: 'customer.email', label: 'Customer email' },
      { key: 'cart.items', label: 'Items in basket' },
      { key: 'cart.total', label: 'Basket total' },
      { key: 'cart.link', label: 'Basket link' },
    ],
    sample: () => ({
      'customer.first_name': 'Leah',
      'customer.email': 'leah.morgan@example.com',
      'cart.items': 'Stonewashed linen napkins, set of 4 (Oat)',
      'cart.total': '$52.00',
      'cart.link': 'hartwellloom.co.uk/basket/8KX2',
    }),
    summary: (d) => `${d['customer.first_name']} left ${d['cart.total']} in the basket`,
  },
  'order.delivered': {
    id: 'order.delivered',
    app: 'store',
    label: 'Order is delivered',
    description: 'Runs when the courier marks a parcel as delivered.',
    variables: [
      { key: 'order.number', label: 'Order number' },
      { key: 'order.items', label: 'Items ordered' },
      { key: 'customer.first_name', label: 'Customer first name' },
      { key: 'customer.email', label: 'Customer email' },
    ],
    sample: () => ({
      'order.number': 'HL-10391',
      'order.items': 'Waffle cotton bath towel set, Ink',
      'customer.first_name': 'Marcus',
      'customer.email': 'marcus.bell@example.com',
    }),
    summary: (d) => `Order ${d['order.number']} delivered to ${d['customer.first_name']}`,
  },
  'invoice.overdue': {
    id: 'invoice.overdue',
    app: 'invoices',
    label: 'Invoice becomes overdue',
    description: 'Runs the day after an invoice’s due date if it is still unpaid.',
    variables: [
      { key: 'invoice.number', label: 'Invoice number' },
      { key: 'invoice.amount', label: 'Amount due' },
      { key: 'invoice.due_date', label: 'Due date' },
      { key: 'invoice.days_overdue', label: 'Days overdue' },
      { key: 'customer.name', label: 'Customer name' },
      { key: 'customer.email', label: 'Customer email' },
      { key: 'customer.phone', label: 'Customer phone' },
    ],
    sample: (now) => ({
      'invoice.number': 'INV-2026-0388',
      'invoice.amount': '$1,240.00',
      'invoice.due_date': date(now - 6 * DAY),
      'invoice.days_overdue': '6',
      'customer.name': 'Ellery Quay Hotels',
      'customer.email': 'accounts@elleryquayhotels.com',
      'customer.phone': '+44 7700 900417',
    }),
    summary: (d) => `${d['invoice.number']} · ${d['customer.name']} · ${d['invoice.amount']}`,
  },
  'call.missed': {
    id: 'call.missed',
    app: 'phone',
    label: 'Call is missed',
    description: 'Runs when nobody answers the studio phone.',
    variables: [
      { key: 'caller.name', label: 'Caller name (from CRM)' },
      { key: 'caller.first_name', label: 'Caller first name' },
      { key: 'caller.number', label: 'Caller number' },
      { key: 'call.time', label: 'Time of call' },
    ],
    sample: () => ({
      'caller.name': 'Priya Shah',
      'caller.first_name': 'Priya',
      'caller.number': '+44 7700 900286',
      'call.time': '10:12',
    }),
    summary: (d) => `Missed call from ${d['caller.name']} at ${d['call.time']}`,
  },
  'booking.created': {
    id: 'booking.created',
    app: 'calendar',
    label: 'Showroom visit is booked',
    description: 'Runs when a trade customer books a visit to the Leeds showroom.',
    variables: [
      { key: 'customer.name', label: 'Customer name' },
      { key: 'customer.first_name', label: 'Customer first name' },
      { key: 'customer.email', label: 'Customer email' },
      { key: 'booking.date', label: 'Visit date' },
      { key: 'booking.time', label: 'Visit time' },
    ],
    sample: (now) => ({
      'customer.name': 'Owen Price',
      'customer.first_name': 'Owen',
      'customer.email': 'owen.price@example.com',
      'booking.date': new Date(now + 4 * DAY).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
      'booking.time': '14:00',
    }),
    summary: (d) => `${d['customer.name']} booked ${d['booking.date']} at ${d['booking.time']}`,
  },
}

export interface FieldDef {
  key: string
  label: string
  kind: 'text' | 'textarea' | 'select'
  options?: string[]
  /** Text fields that accept {{fields}} from the trigger. */
  templated?: boolean
}

export interface ActionDef {
  id: ActionId
  app: AppId
  label: string
  description: string
  fields: FieldDef[]
  defaults: Record<string, string>
}

export const TEAM_GROUPS = ['Sales team group', 'Warehouse team', 'Accounts team', 'Customer']

export const ACTIONS: Record<ActionId, ActionDef> = {
  'invoice.create': {
    id: 'invoice.create',
    app: 'invoices',
    label: 'Create an invoice',
    description: 'Adds a numbered invoice to your accounting system.',
    fields: [
      { key: 'customer', label: 'Bill to', kind: 'text', templated: true },
      { key: 'items', label: 'Line items', kind: 'textarea', templated: true },
      { key: 'terms', label: 'Payment terms', kind: 'select', options: ['Paid in full', 'Due in 7 days', 'Due in 14 days', 'Due in 30 days'] },
    ],
    defaults: { customer: '{{customer.name}}', items: '{{order.items}}', terms: 'Paid in full' },
  },
  'email.send': {
    id: 'email.send',
    app: 'email',
    label: 'Send an email',
    description: 'Sends an email from your business address.',
    fields: [
      { key: 'to', label: 'To', kind: 'text', templated: true },
      { key: 'subject', label: 'Subject', kind: 'text', templated: true },
      { key: 'body', label: 'Message', kind: 'textarea', templated: true },
      { key: 'attach', label: 'Attachment', kind: 'select', options: ['Nothing', 'Invoice PDF', 'Purchase order PDF'] },
    ],
    defaults: { to: '{{customer.email}}', subject: 'A message from Hartwell Loom', body: 'Hi {{customer.first_name}},\n\n', attach: 'Nothing' },
  },
  'whatsapp.send': {
    id: 'whatsapp.send',
    app: 'whatsapp',
    label: 'Send a WhatsApp message',
    description: 'Messages your team or the customer through WhatsApp Business.',
    fields: [
      { key: 'to', label: 'Send to', kind: 'select', options: TEAM_GROUPS },
      { key: 'message', label: 'Message', kind: 'textarea', templated: true },
    ],
    defaults: { to: 'Sales team group', message: '' },
  },
  'inventory.update': {
    id: 'inventory.update',
    app: 'inventory',
    label: 'Update stock levels',
    description: 'Takes ordered items out of stock and flags anything running low.',
    fields: [
      { key: 'mode', label: 'Change', kind: 'select', options: ['Reduce stock by the items ordered', 'Add returned items back to stock'] },
      { key: 'alert', label: 'Low stock', kind: 'select', options: ['Alert the warehouse team', 'Don’t alert'] },
    ],
    defaults: { mode: 'Reduce stock by the items ordered', alert: 'Alert the warehouse team' },
  },
  'sheets.append': {
    id: 'sheets.append',
    app: 'sheets',
    label: 'Add a row to a spreadsheet',
    description: 'Keeps a running log your team can filter and share.',
    fields: [
      { key: 'sheet', label: 'Sheet name', kind: 'text' },
      { key: 'columns', label: 'Columns (separate with commas)', kind: 'text', templated: true },
    ],
    defaults: { sheet: 'Orders 2026', columns: '{{order.number}}, {{customer.name}}, {{order.total}}' },
  },
  'crm.upsert': {
    id: 'crm.upsert',
    app: 'crm',
    label: 'Add or update a CRM contact',
    description: 'Creates the contact and a deal in your sales pipeline.',
    fields: [
      { key: 'pipeline', label: 'Pipeline', kind: 'select', options: ['Wholesale', 'Retail', 'Trade showroom'] },
      { key: 'stage', label: 'Stage', kind: 'select', options: ['New lead', 'Qualified', 'Quote sent'] },
      { key: 'owner', label: 'Owner', kind: 'select', options: ['Ruth Akers', 'Sam Okoro', 'Imogen Hale'] },
    ],
    defaults: { pipeline: 'Wholesale', stage: 'New lead', owner: 'Ruth Akers' },
  },
  'po.create': {
    id: 'po.create',
    app: 'purchasing',
    label: 'Create a purchase order',
    description: 'Raises a numbered purchase order for a supplier.',
    fields: [
      { key: 'supplier', label: 'Supplier', kind: 'text', templated: true },
      { key: 'product', label: 'Product', kind: 'text', templated: true },
      { key: 'quantity', label: 'Quantity', kind: 'text', templated: true },
    ],
    defaults: { supplier: '{{supplier.name}}', product: '{{product.name}}', quantity: '{{product.reorder_qty}}' },
  },
  'calendar.create': {
    id: 'calendar.create',
    app: 'calendar',
    label: 'Add a calendar event',
    description: 'Blocks time in a shared team calendar.',
    fields: [
      { key: 'calendar', label: 'Calendar', kind: 'select', options: ['Showroom', 'Sales calls'] },
      { key: 'title', label: 'Event title', kind: 'text', templated: true },
    ],
    defaults: { calendar: 'Showroom', title: 'Showroom visit: {{customer.name}}' },
  },
  'delay.wait': {
    id: 'delay.wait',
    app: 'delay',
    label: 'Wait',
    description: 'Pauses the workflow before the next step.',
    fields: [{ key: 'wait', label: 'Wait for', kind: 'select', options: ['30 minutes', '3 hours', '1 day', '3 days', '5 days'] }],
    defaults: { wait: '1 day' },
  },
  'filter.only_if': {
    id: 'filter.only_if',
    app: 'filter',
    label: 'Only continue if…',
    description: 'Stops the workflow unless a condition is true.',
    fields: [
      { key: 'field', label: 'Field', kind: 'select' },
      { key: 'operator', label: 'Condition', kind: 'select', options: ['is more than', 'is less than', 'is', 'contains'] },
      { key: 'value', label: 'Value', kind: 'text' },
    ],
    defaults: { field: '', operator: 'is more than', value: '40' },
  },
}

export const ACTION_GROUPS: { title: string; actions: ActionId[] }[] = [
  { title: 'Messages', actions: ['email.send', 'whatsapp.send'] },
  { title: 'Records', actions: ['invoice.create', 'crm.upsert', 'sheets.append', 'calendar.create'] },
  { title: 'Stock', actions: ['inventory.update', 'po.create'] },
  { title: 'Logic', actions: ['filter.only_if', 'delay.wait'] },
]

export interface Template {
  id: string
  name: string
  description: string
  category: 'Sales' | 'Finance' | 'Operations' | 'Customer care'
  trigger: TriggerId
  steps: Omit<Step, 'id'>[]
  minutesPerRun: number
}

export const TEMPLATES: Template[] = [
  {
    id: 't-order',
    name: 'Order → invoice → receipt email',
    description: 'Every paid order gets an invoice and a friendly receipt, without anyone typing.',
    category: 'Finance',
    trigger: 'order.paid',
    minutesPerRun: 6,
    steps: [
      { action: 'invoice.create', config: { ...ACTIONS['invoice.create'].defaults } },
      {
        action: 'email.send',
        config: {
          to: '{{customer.email}}',
          subject: 'Your receipt for order {{order.number}}',
          body: 'Hi {{customer.first_name}},\n\nThanks for your order. Your invoice is attached.\n\nTotal paid: {{order.total}}',
          attach: 'Invoice PDF',
        },
      },
    ],
  },
  {
    id: 't-lead',
    name: 'New enquiry → CRM → WhatsApp alert',
    description: 'New enquiries land in your pipeline and your sales team hears about them in seconds.',
    category: 'Sales',
    trigger: 'form.submitted',
    minutesPerRun: 10,
    steps: [
      { action: 'crm.upsert', config: { ...ACTIONS['crm.upsert'].defaults } },
      {
        action: 'whatsapp.send',
        config: { to: 'Sales team group', message: 'New enquiry from {{lead.name}} at {{lead.company}}. Budget: {{lead.budget}}.' },
      },
    ],
  },
  {
    id: 't-stock',
    name: 'Low stock → purchase order',
    description: 'Raise a purchase order and email the supplier before a best-seller runs out.',
    category: 'Operations',
    trigger: 'stock.low',
    minutesPerRun: 15,
    steps: [
      { action: 'po.create', config: { ...ACTIONS['po.create'].defaults } },
      {
        action: 'email.send',
        config: {
          to: '{{supplier.email}}',
          subject: 'Purchase order: {{product.name}}',
          body: 'Hello,\n\nPlease find our purchase order attached for {{product.reorder_qty}} units of {{product.name}}.\n\nThank you,\nHartwell Loom',
          attach: 'Purchase order PDF',
        },
      },
    ],
  },
  {
    id: 't-overdue',
    name: 'Overdue invoice → polite reminders',
    description: 'A gentle email, then a WhatsApp nudge three days later if it’s still unpaid.',
    category: 'Finance',
    trigger: 'invoice.overdue',
    minutesPerRun: 8,
    steps: [
      {
        action: 'email.send',
        config: {
          to: '{{customer.email}}',
          subject: 'Reminder: invoice {{invoice.number}}',
          body: 'Hello,\n\nA quick reminder that invoice {{invoice.number}} for {{invoice.amount}} was due on {{invoice.due_date}}.',
          attach: 'Invoice PDF',
        },
      },
      { action: 'delay.wait', config: { wait: '3 days' } },
      { action: 'whatsapp.send', config: { to: 'Customer', message: 'Hello from Hartwell Loom. Invoice {{invoice.number}} for {{invoice.amount}} is still open. Reply here if you need a copy.' } },
    ],
  },
  {
    id: 't-missed',
    name: 'Missed call → WhatsApp follow-up',
    description: 'Callers get a WhatsApp message straight away, and the call is logged for the team.',
    category: 'Customer care',
    trigger: 'call.missed',
    minutesPerRun: 5,
    steps: [
      {
        action: 'whatsapp.send',
        config: { to: 'Customer', message: 'Hi {{caller.first_name}}, sorry we missed your call at {{call.time}}. How can we help? You can reply here.' },
      },
      { action: 'sheets.append', config: { sheet: 'Missed calls', columns: '{{caller.name}}, {{caller.number}}, {{call.time}}' } },
    ],
  },
  {
    id: 't-booking',
    name: 'Showroom booking → calendar → reminder',
    description: 'Visits go straight into the showroom calendar, with a reminder the day before.',
    category: 'Customer care',
    trigger: 'booking.created',
    minutesPerRun: 7,
    steps: [
      { action: 'calendar.create', config: { ...ACTIONS['calendar.create'].defaults } },
      {
        action: 'email.send',
        config: {
          to: '{{customer.email}}',
          subject: 'See you on {{booking.date}}',
          body: 'Hi {{customer.first_name}},\n\nYour showroom visit is booked for {{booking.date}} at {{booking.time}}.',
          attach: 'Nothing',
        },
      },
      { action: 'delay.wait', config: { wait: '1 day' } },
      { action: 'whatsapp.send', config: { to: 'Customer', message: 'Hi {{customer.first_name}}, a reminder that we’re looking forward to your visit on {{booking.date}} at {{booking.time}}.' } },
    ],
  },
]
