export type Category = 'Tools' | 'Paint' | 'Plumbing' | 'Electrical' | 'Garden' | 'Fasteners'

export type IconName =
  | 'hammer'
  | 'drill'
  | 'ruler'
  | 'scissors'
  | 'wrench'
  | 'hand'
  | 'paint-bucket'
  | 'paint-roller'
  | 'paintbrush'
  | 'disc'
  | 'layers'
  | 'droplets'
  | 'flask'
  | 'lightbulb'
  | 'plug'
  | 'battery'
  | 'zap'
  | 'flashlight'
  | 'sprout'
  | 'spray'
  | 'leaf'
  | 'nut'
  | 'frame'
  | 'cable'

export interface Product {
  sku: string
  name: string
  category: Category
  icon: IconName
  price: number
  cost: number
  onHand: number
  /** Alert when stock falls to this level. */
  reorderPoint: number
  /** Suggested order size. */
  reorderQty: number
  supplierId: string
}

export interface Supplier {
  id: string
  name: string
  email: string
  leadDays: number
}

export type Payment = 'Card' | 'Cash' | 'Mobile wallet'

export interface SaleLine {
  sku: string
  name: string
  qty: number
  price: number
  cost: number
}

export interface Sale {
  id: string
  number: number
  at: number
  lines: SaleLine[]
  subtotal: number
  discount: number
  tax: number
  total: number
  payment: Payment
  tendered?: number
  change?: number
  cashier: string
}

export interface PoLine {
  sku: string
  name: string
  qty: number
  cost: number
}

export interface PurchaseOrder {
  id: string
  number: string
  supplierId: string
  createdAt: number
  lines: PoLine[]
  status: 'Draft' | 'Sent' | 'Received'
  sentAt?: number
  receivedAt?: number
}

export interface Adjustment {
  id: string
  at: number
  sku: string
  name: string
  change: number
  reason: string
}

export interface PosState {
  products: Product[]
  sales: Sale[]
  orders: PurchaseOrder[]
  adjustments: Adjustment[]
  nextSale: number
  nextPo: number
}
