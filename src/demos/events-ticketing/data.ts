import { DAY, MINUTE, seededRandom, todayAt } from '../../lib/time'
import type { Act, CheckIn, FestivalState, GateId, PayMethod, ScanRecord, Ticket, TicketType, TypeId, VoidedTicket } from './types'

/* Sample business: Msasa Sky Festival, an invented one-day music, food and crafts festival in Harare, Zimbabwe. */

export const FESTIVAL = {
  name: 'Msasa Sky Festival',
  place: 'The festival grounds, Borrowdale',
  city: 'Harare',
  gatesOpen: '11:00',
  musicEnds: '22:00',
  email: 'tickets@msasaskyfestival.co.zw',
  domain: 'msasaskyfestival.co.zw',
  organiser: 'Tatenda Ncube',
  locale: 'en-GB',
  totalCapacity: 4000,
}

export const ZIG_RATE = 26.8
export const PROMO = { code: 'MSASA10', rate: 0.1, type: 'general' as TypeId }
export const MAX_PER_ORDER = 10
/** How far the festival-day screens run ahead of the demo clock: 10:30 on the clock is 13:50 at the gates. */
export const GATE_OFFSET = 200 * MINUTE

export const TYPES: TicketType[] = [
  {
    id: 'early',
    code: 'EBD',
    name: 'Early bird',
    price: 15,
    capacity: 500,
    includes: 'Full-day entry. The first 500 tickets.',
    gates: ['A'],
    entry: 'Gate A',
    adult: true,
  },
  {
    id: 'general',
    code: 'GEN',
    name: 'General admission',
    price: 20,
    capacity: 2800,
    includes: 'Full-day entry to both stages, the food court and the crafts market.',
    gates: ['A'],
    entry: 'Gate A',
    adult: true,
  },
  {
    id: 'vip',
    code: 'VIP',
    name: 'VIP',
    price: 45,
    capacity: 300,
    includes: 'Shaded seating by the main stage, fast-track entry at Gate B and 1 drink voucher.',
    gates: ['B'],
    entry: 'Gate B',
    adult: true,
  },
  {
    id: 'family',
    code: 'FAM',
    name: 'Family pack',
    price: 55,
    capacity: 150,
    includes: 'One ticket for 2 adults and up to 3 children under 12. Family lane at Gate B.',
    gates: ['A', 'B'],
    entry: 'Gate B family lane',
    adult: true,
  },
  {
    id: 'child',
    code: 'U12',
    name: 'Under 12',
    price: 0,
    capacity: 400,
    includes: 'Free with an adult ticket in the same order.',
    gates: ['A', 'B'],
    entry: 'Either gate, with an adult',
    adult: false,
  },
]

export const TYPE = Object.fromEntries(TYPES.map((t) => [t.id, t])) as Record<TypeId, TicketType>

export const GATES: { id: GateId; label: string; detail: string }[] = [
  { id: 'A', label: 'Gate A', detail: 'Main entrance' },
  { id: 'B', label: 'Gate B', detail: 'VIP and family' },
]

export const PAY_METHODS: { id: PayMethod; label: string }[] = [
  { id: 'mobile', label: 'Mobile money' },
  { id: 'card', label: 'Card' },
  { id: 'zig', label: 'ZiG transfer' },
]

export const LINEUP: Act[] = [
  { name: 'Mukuyu Tape Choir', stage: 'Courtyard stage', start: '11:30', end: '12:30' },
  { name: 'Tsoka Collective', stage: 'Main stage', start: '12:00', end: '13:15' },
  { name: 'Granite Hour Trio', stage: 'Courtyard stage', start: '13:15', end: '14:30' },
  { name: 'Mbira Static', stage: 'Main stage', start: '14:00', end: '15:30' },
  { name: 'Jacaranda Night Bus', stage: 'Courtyard stage', start: '15:30', end: '17:00' },
  { name: 'Chiedza & the Eastside Horns', stage: 'Main stage', start: '16:30', end: '18:15' },
  { name: 'The Kopje Lights', stage: 'Main stage', start: '19:00', end: '20:30', note: 'Headliner' },
  { name: 'DJ Flame Lily', stage: 'Main stage', start: '20:45', end: '22:00', note: 'Closing set' },
]

/* Seeded sales before the visitor arrives: 2,650 tickets over 6 weeks. */

export const SEED_SOLD: Record<TypeId, number> = { early: 500, general: 1690, vip: 160, family: 64, child: 236 }
export const SEED_PROMO = { orders: 96, tickets: 212 }
export const SEED_ORDERS: Record<PayMethod, number> = { mobile: 702, card: 331, zig: 181 }
export const SALES_DAYS = 42

const EARLY_BY_DAY = [120, 85, 60, 48, 42, 38, 40, 35, 32]

/** Tickets sold per day and type, oldest first. The last day is today. Same numbers on every visit. */
export function dailySales(): Record<TypeId, number>[] {
  const rand = seededRandom(2026)
  const weights = Array.from({ length: SALES_DAYS }, (_, d) => {
    const ramp = 1 + 2.4 * (d / (SALES_DAYS - 1)) ** 2
    const weekend = [5, 6].includes(d % 7) ? 1.35 : 1
    return ramp * weekend * (0.8 + rand() * 0.4)
  })
  const spread = (total: number, w: number[]) => {
    const sum = w.reduce((a, b) => a + b, 0)
    const raw = w.map((x) => (x / sum) * total)
    const out = raw.map(Math.floor)
    // Largest remainders get the leftover units, so each series adds up exactly.
    const order = raw.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0])
    const short = total - out.reduce((a, b) => a + b, 0)
    for (let k = 0; k < short; k++) out[order[k][1]]++
    return out
  }
  // While early bird tickets were on sale, few people paid full price.
  const general = spread(SEED_SOLD.general, weights.map((w, d) => (d < EARLY_BY_DAY.length ? w * 0.35 : w)))
  const vip = spread(SEED_SOLD.vip, weights)
  const family = spread(SEED_SOLD.family, weights.map((w, d) => w * (d % 7 >= 5 ? 1.6 : 1)))
  const child = spread(SEED_SOLD.child, family.map((f, d) => f * 2 + weights[d] * 0.6))
  return weights.map((_, d) => ({
    early: EARLY_BY_DAY[d] ?? 0,
    general: general[d],
    vip: vip[d],
    family: family[d],
    child: child[d],
  }))
}

/* Seeded festival-day check-ins up to 13:50, the start of the gate clock. */

export const SEED_CHECKINS = {
  byType: { early: 330, general: 760, vip: 72, family: 31, child: 91 } as Record<TypeId, number>,
  byGate: { A: 1149, B: 135 } as Record<GateId, number>,
  /** Arrivals per 15 minutes from 11:00. The last slot (13:45) is still in progress. */
  slots: [205, 188, 146, 121, 112, 95, 99, 84, 86, 70, 57, 21],
  duplicates: 9,
  invalid: 4,
  wrongGate: 6,
}

export const SAMPLE_TICKET_ID = 'MSF-GEN-3907'
/** A screenshot someone edited from VIP to a new code: the checksum gives it away. */
export const FAKE_PAYLOAD = 'MSF26|MSF-VIP-0999|VIP|JK|7Q2M'

export const RECENT_ORDERS: { name: string; at: [number, number]; summary: string; total: number; payment: PayMethod }[] = [
  { name: 'Priya Naidoo', at: [10, 22], summary: '2 × General admission', total: 40, payment: 'mobile' },
  { name: 'Themba Mlambo', at: [10, 9], summary: '1 × VIP', total: 45, payment: 'card' },
  { name: 'Gugu Ndlovu', at: [9, 51], summary: '1 × Family pack', total: 55, payment: 'mobile' },
  { name: 'Hannah Clarke', at: [9, 37], summary: '3 × General admission (MSASA10)', total: 54, payment: 'zig' },
]

function seedTickets(): Ticket[] {
  const issued = todayAt(9, 0) - 12 * DAY
  return [
    { id: SAMPLE_TICKET_ID, type: 'general', holder: 'Nyasha Dube', issuedAt: issued, mine: false },
    { id: 'MSF-VIP-0412', type: 'vip', holder: 'Farai Mhlanga', issuedAt: issued - 9 * DAY, mine: false },
    { id: 'MSF-EBD-0188', type: 'early', holder: 'Kudzai Sibanda', issuedAt: issued - 26 * DAY, mine: false },
    { id: 'MSF-FAM-0073', type: 'family', holder: 'Chipo Banda', issuedAt: issued - 5 * DAY, mine: false },
    {
      id: 'MSF-GEN-3311',
      type: 'general',
      holder: 'Rumbi Gumbo',
      issuedAt: todayAt(8, 40) - 2 * DAY,
      mine: false,
      transferredFrom: 'MSF-GEN-2650',
    },
  ]
}

function seedVoided(): VoidedTicket[] {
  return [
    { id: 'MSF-GEN-2650', type: 'general', holder: 'Tapiwa Gumbo', replacedBy: 'MSF-GEN-3311', at: todayAt(8, 40) - 2 * DAY, mine: false },
  ]
}

function seedCheckins(): CheckIn[] {
  return [{ ticketId: 'MSF-EBD-0188', type: 'early', at: todayAt(11, 24), gate: 'A', seed: true }]
}

function seedScans(): ScanRecord[] {
  const row = (h: number, m: number, gate: GateId, kind: ScanRecord['kind'], code: string, holder?: string, type?: TypeId): ScanRecord => ({
    id: `seed-${gate}-${h}${m}`,
    at: todayAt(h, m),
    gate,
    kind,
    code,
    holder,
    type,
    seed: true,
  })
  return [
    row(13, 49, 'A', 'valid', 'MSF-GEN-2207', 'R. Mutasa', 'general'),
    row(13, 48, 'B', 'valid', 'MSF-VIP-0288', 'T. Mlambo', 'vip'),
    row(13, 47, 'A', 'used', 'MSF-EBD-0188', 'K. Sibanda', 'early'),
    row(13, 46, 'A', 'valid', 'MSF-GEN-1984', 'S. Nyoni', 'general'),
    row(13, 45, 'B', 'valid', 'MSF-FAM-0061', 'G. Ndlovu', 'family'),
    row(13, 44, 'A', 'wrong-gate', 'MSF-VIP-0377', 'L. Chari', 'vip'),
    row(13, 42, 'A', 'invalid', 'Unreadable code'),
    row(13, 41, 'B', 'wrong-gate', 'MSF-GEN-3020', 'B. Moyo', 'general'),
    row(13, 39, 'B', 'valid', 'MSF-U12-0954', 'A. Ndlovu', 'child'),
  ]
}

export function createInitialState(): FestivalState {
  return {
    tickets: seedTickets(),
    voided: seedVoided(),
    orders: [],
    checkins: seedCheckins(),
    scans: seedScans(),
    // The visitor's first ticket is MSF-GEN-4821.
    nextSerial: 4821,
    nextOrder: 1215,
  }
}

export const DEFAULT_BUYER = { name: 'Tendai Moyo', mobile: '+263 77 214 4410', email: 'tendai.moyo@example.com' }
