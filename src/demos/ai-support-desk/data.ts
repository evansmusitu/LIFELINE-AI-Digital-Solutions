import { round2 } from '../../lib/format'
import { DAY, MINUTE, daysAgoAt, todayAt } from '../../lib/time'
import { AGENTS, DEFAULT_SETTINGS, subjectFrom, suggestReply, triageTicket } from './engine'
import type { AgentId, Channel, DeskState, Order, Ticket, Topic } from './types'

/* Sample business: Grysbok Outdoor, an invented online outdoor-gear store in Cape Town, South Africa. */

const CAPE_DASH = 'Cape Dash Couriers'
const KAROO = 'Karoo Express'
const COLLECTED = 'Collected from the Grysbok Outdoor warehouse in Paarden Eiland.'

function order(
  number: string,
  customer: string,
  placedAt: number,
  items: [name: string, qty: number, price: number][],
  delivery: number,
  status: Order['status'],
  extra: Partial<Order> = {},
): Order {
  const lines = items.map(([name, qty, price]) => ({ name, qty, price }))
  const total = round2(lines.reduce((sum, l) => sum + l.qty * l.price, 0) + delivery)
  return { number, customer, placedAt, items: lines, delivery, total, status, events: [], ...extra }
}

const delivered = (courier: string, tracking: string, at: number, detail: string): Partial<Order> => ({
  courier,
  tracking,
  deliveredAt: at,
  events: [{ at, text: `Delivered. ${detail}` }],
})

function sampleOrders(): Order[] {
  return [
    order('SO-48213', 'Ayanda Nkosi', daysAgoAt(4, 19, 12), [['Fynbos 45 L backpack', 1, 129], ['Trailhead 350 headlamp', 1, 34]], 6.5, 'Out for delivery', {
      courier: CAPE_DASH,
      tracking: 'CDC-7731-0452',
      promisedBy: daysAgoAt(1, 17),
      eta: todayAt(16),
      events: [
        { at: todayAt(8, 5), text: 'Out for delivery. Expected between 12:00 and 16:00.' },
        { at: todayAt(6, 40), text: 'Sorted at the Montague Gardens hub.' },
        { at: daysAgoAt(1, 9, 10), text: 'Delayed at the Montague Gardens hub because of a sorting backlog. New delivery date: today.' },
        { at: daysAgoAt(2, 15, 20), text: COLLECTED },
      ],
    }),
    order('SO-48190', 'Megan Botha', daysAgoAt(6, 20, 3), [['Duskfall −5 °C sleeping bag', 1, 164], ['Compression sack', 1, 14.5]], 7.9, 'Delivered', {
      ...delivered(CAPE_DASH, 'CDC-7704-1188', daysAgoAt(3, 11, 25), 'Signed for by M. Botha.'),
      promisedBy: daysAgoAt(3, 17),
      note: 'Card payment taken twice (2 × $186.40). The second payment has not been refunded yet.',
    }),
    order('SO-48221', 'Thabo Molefe', daysAgoAt(1, 21, 40), [['Ridgeback leather hiking boots', 1, 149], ['Merino hiking socks', 2, 12]], 6.5, 'Processing', {
      promisedBy: todayAt(17) + 4 * DAY,
      eta: todayAt(17) + 3 * DAY,
      events: [{ at: daysAgoAt(1, 21, 41), text: 'Payment received. Your order is being packed.' }],
    }),
    order('SO-48198', 'Fatima Isaacs', daysAgoAt(9, 12, 15), [['Kestrel 2 hiking tent', 1, 219], ['Inflatable camp pillow', 1, 19]], 6.5, 'Delivered', {
      courier: KAROO,
      tracking: 'KEX-55067-3',
      promisedBy: daysAgoAt(2, 17),
      deliveredAt: daysAgoAt(1, 14, 2),
      events: [
        { at: daysAgoAt(1, 14, 2), text: 'Delivered. Left with security at the main gate.' },
        { at: daysAgoAt(2, 16, 30), text: 'Delivery attempted. Nobody home.' },
        { at: daysAgoAt(5, 15, 5), text: COLLECTED },
      ],
    }),
    order('SO-48209', 'Annelie Venter', daysAgoAt(5, 10, 20), [['Duskfall −5 °C sleeping bag', 1, 164], ['Trailhead 350 headlamp', 1, 34]], 9.5, 'Delayed', {
      courier: KAROO,
      tracking: 'KEX-55120-8',
      promisedBy: daysAgoAt(1, 17),
      eta: todayAt(17) + DAY,
      events: [
        { at: daysAgoAt(1, 13, 30), text: 'Delayed. The delivery vehicle broke down on the N1 near Laingsburg.' },
        { at: daysAgoAt(3, 16, 10), text: COLLECTED },
      ],
    }),
    order('SO-48215', 'Sipho Ndlovu', daysAgoAt(2, 8, 50), [['Fynbos 45 L backpack', 1, 129]], 6.5, 'Shipped', {
      courier: KAROO,
      tracking: 'KEX-55188-2',
      promisedBy: todayAt(17) + 2 * DAY,
      eta: todayAt(17) + DAY,
      events: [
        { at: todayAt(7, 15), text: 'In transit to the Cape Town depot.' },
        { at: daysAgoAt(1, 15, 45), text: COLLECTED },
      ],
    }),
    order('SO-48219', 'Lindiwe Zulu', daysAgoAt(1, 18, 5), [['Titanium camping mug', 2, 22], ['Folding camp chair', 1, 49]], 6.5, 'Processing', {
      promisedBy: todayAt(17) + 3 * DAY,
      eta: todayAt(17) + 2 * DAY,
      events: [{ at: daysAgoAt(1, 18, 6), text: 'Payment received. Your order is being packed.' }],
    }),
    order('SO-48184', 'Zanele Mahlangu', daysAgoAt(8, 9, 30), [['Emberline 2-burner gas stove', 1, 119], ['Gas canister 450 g, 2-pack', 1, 18]], 6.5, 'Delivered', {
      ...delivered(CAPE_DASH, 'CDC-7690-2210', daysAgoAt(6, 12, 15), 'Signed for by Z. Mahlangu.'),
      promisedBy: daysAgoAt(6, 17),
    }),
    order('SO-48177', 'Keegan Pillay', daysAgoAt(9, 17), [['Ridgeback leather hiking boots', 1, 149]], 6.5, 'Delivered',
      delivered(CAPE_DASH, 'CDC-7652-0071', daysAgoAt(6, 10, 40), 'Signed for by K. Pillay.')),
    order('SO-48201', 'Daniel Jacobs', daysAgoAt(6, 11, 20), [['Emberline 2-burner gas stove', 1, 119]], 6.5, 'Delivered',
      delivered(CAPE_DASH, 'CDC-7711-5096', daysAgoAt(2, 13, 5), 'Left at the front door.')),
    order('SO-48205', 'Ruan Steyn', daysAgoAt(5, 7, 30), [['Kestrel 2 hiking tent', 1, 219]], 6.5, 'Delivered',
      delivered(CAPE_DASH, 'CDC-7725-3340', daysAgoAt(1, 11, 50), 'Signed for by R. Steyn.')),
    order('SO-48172', 'Shireen Abrahams', daysAgoAt(10, 13, 10), [['Kestrel 2 hiking tent', 2, 219], ['Trailhead 350 headlamp', 4, 34]], 0, 'Delivered',
      delivered(KAROO, 'KEX-54980-1', daysAgoAt(7, 10, 15), 'Signed for at reception.')),
    order('SO-48194', 'Liam Ferreira', daysAgoAt(7, 16, 25), [['Fynbos 45 L backpack', 1, 129]], 6.5, 'Delivered',
      delivered(CAPE_DASH, 'CDC-7698-4407', daysAgoAt(4, 9, 55), 'Signed for by L. Ferreira.')),
    order('SO-48160', 'Johan du Plessis', daysAgoAt(14, 9, 45), [['Ridgeback leather hiking boots', 1, 149]], 0, 'Returned', {
      events: [{ at: daysAgoAt(3, 11), text: 'Returned to the Grysbok Outdoor warehouse.' }],
    }),
  ]
}

interface Seed {
  n: number
  name: string
  channel: Channel
  at: number
  text: string
  subject?: string
  order?: string
  /** Arrived in the last 20 minutes and not read by the assistant yet. */
  untriaged?: boolean
  /** Minutes after the message. Without text, the agent sent the suggested reply. */
  reply?: { after: number; text?: string }
  follow?: { after: number; text: string }
  solved?: number
  rating?: Ticket['rating']
  /** An agent corrected the assistant. */
  fix?: { topic: Topic; assignee: AgentId; note: string }
}

const SEEDS: Seed[] = [
  // Yesterday
  { n: 3086, name: 'Keegan Pillay', channel: 'Email', at: daysAgoAt(1, 8, 47), subject: 'Swap for a bigger size',
    text: 'Hi, the Ridgeback boots from order SO-48177 are lovely but a bit small. Can I exchange them for a size 9?',
    reply: { after: 26 }, follow: { after: 70, text: 'Perfect, Thursday morning works for the collection.' }, solved: 95, rating: 'positive' },
  { n: 3087, name: 'Sipho Ndlovu', channel: 'WhatsApp', at: daysAgoAt(1, 9, 30), text: 'Hi, any news on order SO-48215? When will it arrive?',
    follow: { after: 4, text: 'Great, thanks.' }, solved: 20, rating: 'positive' },
  { n: 3088, name: 'Daniel Jacobs', channel: 'Email', at: daysAgoAt(1, 12, 40), subject: 'Parcel left at the wrong address',
    text: 'The courier left my parcel at the wrong address. Order SO-48201. Can you help?', reply: { after: 1170 } },
  { n: 3089, name: 'Johan du Plessis', channel: 'Email', at: daysAgoAt(1, 14, 15), subject: 'Refund for returned boots', order: 'SO-48160',
    text: 'I returned the boots last week. When will I get my refund?', reply: { after: 110 }, solved: 115, rating: 'negative' },
  { n: 3090, name: 'Nomvula Khumalo', channel: 'Email', at: daysAgoAt(1, 16, 30), subject: 'Disappointed with the service',
    text: 'I’m disappointed with the service. I phoned twice about my order and nobody called me back.', reply: { after: 35 } },
  { n: 3091, name: 'Liam Ferreira', channel: 'WhatsApp', at: daysAgoAt(1, 18, 20), order: 'SO-48194',
    text: 'The buckle on my Fynbos backpack hip belt snapped on the first trip.',
    reply: { after: 40 }, follow: { after: 55, text: 'Thanks, photo attached.' }, solved: 60, rating: 'positive' },
  // Today, before the demo starts at 10:20
  { n: 3092, name: 'Naledi Sithebe', channel: 'Email', at: todayAt(6, 5), subject: 'Headlamp stopped working',
    text: 'My Trailhead 350 headlamp stopped working after one trip. It won’t charge at all.' },
  { n: 3093, name: 'Annelie Venter', channel: 'WhatsApp', at: todayAt(7, 12),
    text: 'Goeie môre. Waar is my bestelling SO-48209? Dit moes gister al hier gewees het, en ek het nog niks gehoor nie. Dankie, Annelie' },
  { n: 3094, name: 'Kyle Petersen', channel: 'Web chat', at: todayAt(7, 55),
    text: 'Is the Fynbos 45 L backpack waterproof? I’m doing the Otter Trail in June.', reply: { after: 35 } },
  { n: 3095, name: 'Tumelo Mabaso', channel: 'Email', at: todayAt(8, 15), subject: 'Boots too tight',
    text: 'Can I return my Ridgeback boots? They’re too tight across the toes and I’ve only worn them indoors.' },
  { n: 3096, name: 'Shireen Abrahams', channel: 'Email', at: todayAt(8, 58), subject: 'Tax invoice needed',
    text: 'Could you send me a tax invoice for order SO-48172 with our company name on it?' },
  { n: 3097, name: 'Lindiwe Zulu', channel: 'WhatsApp', at: todayAt(9, 20), text: 'Morning! When will my order SO-48219 be sent?',
    follow: { after: 6, text: 'Perfect, thank you.' }, solved: 21, rating: 'positive' },
  { n: 3098, name: 'Ruan Steyn', channel: 'Email', at: todayAt(9, 35), subject: 'Tent pegs missing',
    text: 'The pegs are missing from my Kestrel 2 tent, order SO-48205. Can you send some?',
    fix: { topic: 'Damaged or faulty', assignee: 'aisha', note: 'Changed the topic to Damaged or faulty. The parcel arrived, but the pegs weren’t in the box.' },
    reply: { after: 15, text: 'Hi Ruan,\n\nSorry about that. I’ve sent a full set of pegs by courier today, and they should reach you tomorrow.\n\nKind regards\nAisha\nGrysbok Outdoor' } },
  // The last 20 minutes, waiting for triage
  { n: 3099, name: 'Zanele Mahlangu', channel: 'Email', at: todayAt(10, 2), subject: 'Stove smells of gas', untriaged: true,
    text: 'The Emberline stove I bought last week smells strongly of gas as soon as I attach the canister, and there’s a hissing sound near the valve. Is it safe to use? Order SO-48184.' },
  { n: 3100, name: 'Fatima Isaacs', channel: 'WhatsApp', at: todayAt(10, 6), untriaged: true,
    text: 'My order SO-48198 says DELIVERED but nothing arrived. I’ve been waiting 9 days and nobody answers the phone. This is ridiculous.' },
  { n: 3101, name: 'Thabo Molefe', channel: 'Web chat', at: todayAt(10, 11), untriaged: true,
    text: 'Hi, when will my order SO-48221 be sent? I need the boots for a hike next week.' },
  { n: 3102, name: 'Kagiso Sithole', channel: 'Email', at: todayAt(10, 15), subject: 'Footprint for the Kestrel 2', untriaged: true,
    text: 'Does the Kestrel 2 tent come with a footprint, or do I need to buy one separately?' },
  { n: 3103, name: 'Bianca Fourie', channel: 'WhatsApp', at: todayAt(10, 18), untriaged: true, text: 'Hi, I need help with something I bought from you guys' },
]

const PREFIXES = ['82', '71', '83', '72', '84', '76']

function contactFor(name: string, channel: Channel, n: number): string {
  if (channel === 'WhatsApp') return `+27 ${PREFIXES[n % PREFIXES.length]} ••• ${String(1000 + ((n * 7919) % 9000))}`
  return `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`
}

function seedTicket(seed: Seed, orders: Order[]): Ticket {
  const at = (minutes: number) => seed.at + minutes * MINUTE
  let ticket: Ticket = {
    id: `t-${seed.n}`,
    number: seed.n,
    customer: { name: seed.name, contact: contactFor(seed.name, seed.channel, seed.n) },
    channel: seed.channel,
    subject: seed.subject ?? subjectFrom(seed.text),
    text: seed.text,
    orderField: seed.order,
    createdAt: seed.at,
    status: 'Open',
    messages: [{ id: `t-${seed.n}-1`, kind: 'customer', author: seed.name, text: seed.text, at: seed.at }],
    corrections: 0,
  }
  if (seed.untriaged) return ticket
  ticket = triageTicket(ticket, DEFAULT_SETTINGS, orders, at(0.3))
  const triage = ticket.triage!
  if (seed.fix) {
    const { topic, assignee, note } = seed.fix
    ticket = {
      ...ticket,
      corrections: 1,
      triage: { ...triage, topic, assignee },
      messages: [...ticket.messages, { id: `t-${seed.n}-fix`, kind: 'note', author: AGENTS[triage.assignee].name, text: note, at: at(5) }],
    }
  }
  if (seed.reply) {
    const replyAt = at(seed.reply.after)
    const text = seed.reply.text ?? suggestReply(ticket, orders.find((o) => o.number === triage.orderNumber), replyAt)
    ticket = {
      ...ticket,
      status: 'Waiting on customer',
      firstReplyAt: ticket.firstReplyAt ?? replyAt,
      messages: [
        ...ticket.messages,
        { id: `t-${seed.n}-r`, kind: 'agent', author: AGENTS[ticket.triage!.assignee].name, text, at: replyAt, fromSuggestion: !seed.reply.text },
      ],
    }
  }
  if (seed.follow) {
    const message = { id: `t-${seed.n}-f`, kind: 'customer' as const, author: seed.name, text: seed.follow.text, at: at(seed.follow.after) }
    ticket = { ...ticket, status: 'Open', messages: [...ticket.messages, message] }
  }
  if (seed.solved) ticket = { ...ticket, status: 'Solved', solvedAt: at(seed.solved) }
  if (seed.rating) ticket = { ...ticket, rating: seed.rating }
  return ticket
}

export function createInitialState(): DeskState {
  const orders = sampleOrders()
  return {
    orders,
    tickets: SEEDS.map((seed) => seedTicket(seed, orders)),
    settings: { ...DEFAULT_SETTINGS, targets: { ...DEFAULT_SETTINGS.targets } },
    nextTicket: 3104,
  }
}
