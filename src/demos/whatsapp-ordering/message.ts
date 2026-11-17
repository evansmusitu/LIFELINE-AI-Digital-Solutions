import { money } from '../../lib/format'
import { BUSINESS, STATUS_FLOW } from './data'
import type { Order, OrderStatus } from './types'

/** The order as it arrives on the shop's WhatsApp. Uses WhatsApp formatting: *bold*. */
export function orderMessage(order: Order, business: string = BUSINESS): string {
  const out = [`*New order ${order.ref}*`, business, '']
  for (const line of order.lines) out.push(`• ${line.qty} × ${line.name}: ${money(line.qty * line.unitPrice)}`)
  out.push('', `Subtotal: ${money(order.subtotal)}`)
  out.push(order.method === 'delivery' ? `Delivery to ${order.area}: ${money(order.deliveryFee)}` : 'Collection from the Avondale shop: free')
  out.push(`*Total: ${money(order.total)}*`, '')
  out.push(`Name: ${order.customer}`)
  if (order.method === 'delivery') out.push(`Address: ${order.address}`)
  out.push(`${order.method === 'delivery' ? 'Delivery' : 'Collection'} time: ${order.time}`)
  out.push(`Payment: ${order.payment}`)
  if (order.notes) out.push(`Notes: ${order.notes}`)
  return out.join('\n')
}

/** What the visitor sends to LIFELINE from the demo: the order plus an enquiry. */
export function demoOrderEnquiry(order: Order): string {
  return [
    'Hi LIFELINE AI CONCIERGE, I tried your WhatsApp ordering demo. This is the order message it built for me:',
    '',
    orderMessage(order),
    '',
    'I’d like a WhatsApp ordering catalogue like this for my business.',
  ].join('\n')
}

export function statusMessage(order: Order, status: OrderStatus, business: string = BUSINESS): string {
  const first = order.customer.split(' ')[0]
  switch (status) {
    case 'Confirmed':
      return `Hi ${first}, thanks for ordering from ${business}. Order ${order.ref} is confirmed: ${money(order.total)}, ${order.time.toLowerCase()}. We’ll message you when it’s ${order.method === 'delivery' ? 'on the way' : 'ready'}.`
    case 'Preparing':
      return `Good news, ${first}: we’re preparing order ${order.ref} now.`
    case 'Out for delivery':
      return `Your order ${order.ref} is on its way to ${order.area}. Our rider will call you when they arrive.`
    case 'Ready for collection':
      return `Your order ${order.ref} is ready to collect from our Avondale shop. See you soon!`
    case 'Completed':
      return `Thank you, ${first}! Order ${order.ref} is complete. Enjoy, and see you again soon.`
    default:
      return ''
  }
}

export function nextStatus(order: Order): OrderStatus | null {
  const flow = STATUS_FLOW[order.method]
  const index = flow.indexOf(order.status)
  return index >= 0 && index < flow.length - 1 ? flow[index + 1] : null
}
