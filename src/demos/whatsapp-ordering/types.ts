export type CategoryId = 'bread' | 'pastry' | 'cake' | 'savoury' | 'drinks'

export type IconName = 'wheat' | 'croissant' | 'cake' | 'cake-slice' | 'cookie' | 'sandwich' | 'beef' | 'leaf' | 'coffee' | 'cup' | 'citrus'

export interface Choice {
  id: string
  label: string
  /** Added to the base price. */
  delta: number
}

export interface Product {
  id: string
  name: string
  description: string
  category: CategoryId
  price: number
  icon: IconName
  available: boolean
  popular?: boolean
  option?: { label: string; choices: Choice[] }
}

export interface CartLine {
  key: string
  productId: string
  choiceId?: string
  qty: number
}

export type Method = 'delivery' | 'collection'

export interface Details {
  name: string
  method: Method
  area: string
  address: string
  time: string
  payment: string
  notes: string
}

export type OrderStatus = 'New' | 'Confirmed' | 'Preparing' | 'Out for delivery' | 'Ready for collection' | 'Completed'

export interface OrderLine {
  name: string
  qty: number
  unitPrice: number
}

export interface Order {
  id: string
  ref: string
  at: number
  customer: string
  method: Method
  area?: string
  address?: string
  time: string
  payment: string
  notes?: string
  lines: OrderLine[]
  subtotal: number
  deliveryFee: number
  total: number
  status: OrderStatus
  /** Messages sent to the customer on WhatsApp as the order moves along. */
  updates: { at: number; text: string }[]
  /** True for orders the visitor placed in this demo. */
  mine?: boolean
}

export interface OrderingState {
  products: Product[]
  cart: CartLine[]
  details: Details
  orders: Order[]
  nextRef: number
}
