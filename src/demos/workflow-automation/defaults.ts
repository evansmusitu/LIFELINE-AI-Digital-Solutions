import { ACTIONS, TRIGGERS } from './catalog'
import type { ActionId, TriggerId } from './types'

const WHATSAPP_DEFAULTS: Record<TriggerId, string> = {
  'order.paid': 'New order {{order.number}} from {{customer.name}} ({{customer.country}}), {{order.total}}.',
  'form.submitted': 'New enquiry from {{lead.name}} at {{lead.company}}. Budget: {{lead.budget}}.',
  'stock.low': 'Low stock: {{product.name}} ({{product.sku}}) is down to {{product.stock}}.',
  'cart.abandoned': '{{customer.first_name}} left {{cart.total}} in their basket.',
  'order.delivered': 'Order {{order.number}} was delivered to {{customer.first_name}}.',
  'invoice.overdue': 'Invoice {{invoice.number}} for {{customer.name}} ({{invoice.amount}}) is {{invoice.days_overdue}} days overdue.',
  'call.missed': 'Missed call from {{caller.name}} ({{caller.number}}) at {{call.time}}.',
  'booking.created': '{{customer.name}} booked a showroom visit on {{booking.date}} at {{booking.time}}.',
}

/** Starting values for a new step that make sense for the workflow's trigger. */
export function defaultsFor(action: ActionId, trigger: TriggerId): Record<string, string> {
  const vars = TRIGGERS[trigger].variables.map((v) => v.key)
  const find = (suffix: string) => vars.find((k) => k.endsWith(suffix))
  const config = { ...ACTIONS[action].defaults }

  if (action === 'email.send') {
    const email = find('.email')
    const first = find('first_name')
    config.to = email ? `{{${email}}}` : ''
    config.body = first ? `Hi {{${first}}},\n\n` : 'Hello,\n\n'
  }
  if (action === 'whatsapp.send') config.message = WHATSAPP_DEFAULTS[trigger]
  if (action === 'invoice.create') {
    const name = find('customer.name') ?? find('lead.company') ?? find('.name')
    config.customer = name ? `{{${name}}}` : ''
    config.items = vars.includes('order.items') ? '{{order.items}}' : ''
  }
  if (action === 'sheets.append') config.columns = vars.slice(0, 3).map((k) => `{{${k}}}`).join(', ')
  if (action === 'calendar.create') {
    const name = find('.name')
    config.title = name ? `Showroom visit: {{${name}}}` : 'Team event'
  }
  if (action === 'filter.only_if') {
    config.field = vars.find((k) => /total|amount|stock|budget/.test(k)) ?? vars[0] ?? ''
  }
  return config
}
