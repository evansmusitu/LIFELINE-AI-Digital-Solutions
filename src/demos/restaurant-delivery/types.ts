export type CategoryId = 'mezze' | 'grills' | 'wraps' | 'rice' | 'sides' | 'desserts' | 'drinks'

export type Tag = 'Vegetarian' | 'Vegan' | 'Spicy' | 'Contains nuts'

export type IconName =
  | 'soup'
  | 'salad'
  | 'beef'
  | 'drumstick'
  | 'flame'
  | 'fish'
  | 'sandwich'
  | 'wheat'
  | 'pot'
  | 'leaf'
  | 'cake'
  | 'cookie'
  | 'coffee'
  | 'citrus'
  | 'cup'

export type ExtraId = 'garlic' | 'bread' | 'halloumi'
export type Size = 'Regular' | 'Large'
export type Spice = 'Mild' | 'Medium' | 'Hot'

export interface MenuItem {
  id: string
  name: string
  description: string
  category: CategoryId
  icon: IconName
  price: number
  tags: Tag[]
  /** Extra cost of a large portion. No size choice when missing. */
  largeDelta?: number
  /** Offers Mild / Medium / Hot. */
  spice?: boolean
  extras: ExtraId[]
  available: boolean
}

export interface LineOptions {
  size: Size
  spice?: Spice
  extras: ExtraId[]
  notes: string
}

export interface CartLine {
  key: string
  itemId: string
  qty: number
  options: LineOptions
}

export type Mode = 'delivery' | 'pickup' | 'dine-in'
export type Channel = 'App' | 'Website' | 'Phone' | 'Dine-in'
export type Status = 'received' | 'cooking' | 'ready' | 'out' | 'delivered' | 'collected' | 'served'
export type Payment = 'card' | 'cash' | 'online'
export type RiderId = 'bilal' | 'joseph' | 'arjun'

export interface Rider {
  id: RiderId
  name: string
  phone: string
}

export interface Area {
  id: string
  name: string
  fee: number
  etaMin: number
  etaMax: number
  /** Typical ride from the kitchen, in minutes. */
  rideMin: number
  on: boolean
}

export interface OrderLine {
  itemId: string
  name: string
  qty: number
  unit: number
  options: LineOptions
}

export interface Message {
  at: number
  text: string
}

export interface Order {
  id: string
  number: string
  mode: Mode
  channel: Channel
  customer: string
  /** Masked, e.g. +971 50 ••• 4410. */
  phone?: string
  areaId?: string
  address?: string
  table?: number
  payment: Payment
  lines: OrderLine[]
  subtotal: number
  fee: number
  vat: number
  total: number
  status: Status
  placedAt: number
  times: Partial<Record<Status, number>>
  /** Minutes promised when the order was placed. Dine-in has no promise. */
  promisedMin?: number
  rider?: RiderId
  rating?: { up: boolean; comment?: string }
  messages: Message[]
  /** Placed by the visitor in this demo. */
  mine?: boolean
}

export interface Details {
  mode: 'delivery' | 'pickup'
  areaId: string
  name: string
  phone: string
  building: string
  directions: string
  payment: Payment
}

export interface KitchenState {
  items: MenuItem[]
  areas: Area[]
  busy: boolean
  orders: Order[]
  cart: CartLine[]
  details: Details
  nextNumber: number
  /** Tonight's order shown on Track order until the visitor places one. */
  sampleId: string
}
