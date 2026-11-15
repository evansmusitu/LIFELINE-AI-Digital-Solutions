export type ScreenId = 'tickets' | 'wallet' | 'scan' | 'checkin' | 'sales'

export type TypeId = 'early' | 'general' | 'vip' | 'family' | 'child'
export type TypeCode = 'EBD' | 'GEN' | 'VIP' | 'FAM' | 'U12'
export type GateId = 'A' | 'B'
export type PayMethod = 'mobile' | 'card' | 'zig'

export interface TicketType {
  id: TypeId
  code: TypeCode
  name: string
  price: number
  capacity: number
  includes: string
  /** Gates this ticket may enter by. Others get a "please use Gate X" warning. */
  gates: GateId[]
  /** Where the holder goes in, as printed on the ticket. */
  entry: string
  /** Counts as the adult that an under-12 ticket needs. */
  adult: boolean
}

export interface Act {
  name: string
  stage: 'Main stage' | 'Courtyard stage'
  start: string
  end: string
  note?: string
}

export interface Ticket {
  /** Also the ticket code printed on the ticket, e.g. MSF-GEN-4821. */
  id: string
  type: TypeId
  holder: string
  orderId?: string
  issuedAt: number
  /** Bought by the visitor in this demo. */
  mine: boolean
  transferredFrom?: string
  sharedAt?: number
}

/** A ticket replaced by a transfer. Its old QR code must no longer get anyone in. */
export interface VoidedTicket {
  id: string
  type: TypeId
  holder: string
  replacedBy: string
  at: number
  mine: boolean
}

export interface Buyer {
  name: string
  mobile: string
  email: string
}

export interface OrderLine {
  type: TypeId
  qty: number
  unit: number
}

export interface Order {
  id: string
  number: number
  at: number
  /** Mobile number already masked. */
  buyer: Buyer
  lines: OrderLine[]
  subtotal: number
  discount: number
  total: number
  promo?: string
  payment: PayMethod
  ticketIds: string[]
}

export interface CheckIn {
  ticketId: string
  type: TypeId
  at: number
  gate: GateId
  override?: boolean
  /** Part of the seeded festival-day totals, so not counted twice. */
  seed?: boolean
}

export type ScanKind = 'valid' | 'used' | 'transferred' | 'wrong-gate' | 'invalid'

export interface ScanRecord {
  id: string
  at: number
  gate: GateId
  kind: ScanKind
  code: string
  holder?: string
  type?: TypeId
  override?: boolean
  seed?: boolean
}

export interface FestivalState {
  tickets: Ticket[]
  voided: VoidedTicket[]
  orders: Order[]
  checkins: CheckIn[]
  scans: ScanRecord[]
  nextSerial: number
  nextOrder: number
}

export type Cart = Record<TypeId, number>

/** The checkout form. Kept in index.tsx (not persisted) so it survives tab switches. */
export interface Draft {
  cart: Cart
  promoInput: string
  promo: string | null
  promoError: boolean
  buyer: Buyer
  /** Holder name per ticket, keyed "general-0". Blank means the buyer. */
  holders: Record<string, string>
  payment: PayMethod
}

export interface ScanOutcome {
  kind: ScanKind
  title: string
  detail: string
  code: string
  ticketId?: string
  type?: TypeId
  /** Short holder name for the gate, e.g. "T. Moyo". */
  holder?: string
  /** Set when gate staff let a wrong-gate ticket in anyway. */
  override?: boolean
}
