import { round2 } from '../../lib/format'
import { DAY, MINUTE, seededRandom, todayAt } from '../../lib/time'
import type { Category, Payment, PosState, Product, PurchaseOrder, Sale, SaleLine, Supplier } from './types'

/* Sample business: Bramblewood Hardware & Garden, an invented neighbourhood store in Austin, Texas. */

export const STORE = {
  name: 'Bramblewood Hardware & Garden',
  address: 'South Lamar Blvd, Austin, TX',
  taxRate: 0.0825,
  cashier: 'Maria G.',
  openingFloat: 200,
}

export const CATEGORIES: Category[] = ['Tools', 'Paint', 'Plumbing', 'Electrical', 'Garden', 'Fasteners']

export const SUPPLIERS: Supplier[] = [
  { id: 'pecan', name: 'Pecan Grove Wholesale', email: 'orders@pecangrovewholesale.com', leadDays: 3 },
  { id: 'hollis', name: 'Hollis & Vane Paint Supply', email: 'orders@hollisvane.com', leadDays: 2 },
  { id: 'caliche', name: 'Caliche Creek Garden Wholesale', email: 'sales@calichecreekgarden.com', leadDays: 4 },
  { id: 'bluebonnet', name: 'Bluebonnet Electric & Plumbing Supply', email: 'orders@bluebonnetsupply.com', leadDays: 2 },
]

type Row = [sku: string, name: string, category: Category, icon: Product['icon'], price: number, cost: number, onHand: number, reorderPoint: number, reorderQty: number, supplierId: string]

const ROWS: Row[] = [
  ['TL-101', 'Claw hammer, 16 oz', 'Tools', 'hammer', 18.99, 9.8, 24, 8, 24, 'pecan'],
  ['TL-102', 'Cordless drill kit, 20V', 'Tools', 'drill', 129, 84, 6, 4, 8, 'pecan'],
  ['TL-103', 'Tape measure, 25 ft', 'Tools', 'ruler', 12.49, 5.9, 31, 10, 24, 'pecan'],
  ['TL-104', 'Utility knife with 5 blades', 'Tools', 'scissors', 8.99, 3.8, 18, 8, 24, 'pecan'],
  ['TL-105', 'Screwdriver set, 10 pieces', 'Tools', 'wrench', 24.99, 12.4, 9, 6, 12, 'pecan'],
  ['TL-106', 'Adjustable wrench, 10 in', 'Tools', 'wrench', 16.49, 7.95, 14, 6, 12, 'pecan'],
  ['TL-107', 'Work gloves, large', 'Tools', 'hand', 9.99, 4.2, 5, 12, 36, 'pecan'],
  ['PT-201', 'Interior paint, eggshell white, 1 gal', 'Paint', 'paint-bucket', 38.99, 21.5, 22, 10, 24, 'hollis'],
  ['PT-202', 'Paint roller kit, 9 in', 'Paint', 'paint-roller', 14.99, 6.8, 13, 8, 24, 'hollis'],
  ['PT-203', 'Painter’s tape, 1.88 in × 60 yd', 'Paint', 'disc', 6.49, 2.7, 9, 8, 48, 'hollis'],
  ['PT-204', 'Angled paint brush, 2 in', 'Paint', 'paintbrush', 9.49, 3.9, 17, 8, 24, 'hollis'],
  ['PT-205', 'Canvas drop cloth, 9 × 12 ft', 'Paint', 'layers', 21.99, 11.2, 7, 6, 12, 'hollis'],
  ['PL-301', 'PTFE thread seal tape', 'Plumbing', 'disc', 1.99, 0.55, 46, 20, 60, 'bluebonnet'],
  ['PL-302', 'Toilet plunger', 'Plumbing', 'droplets', 11.49, 5.1, 8, 6, 12, 'bluebonnet'],
  ['PL-303', 'Faucet washer assortment', 'Plumbing', 'droplets', 4.49, 1.6, 3, 10, 30, 'bluebonnet'],
  ['PL-304', 'Drain cleaner gel, 32 oz', 'Plumbing', 'flask', 9.99, 4.6, 12, 8, 24, 'bluebonnet'],
  ['EL-401', 'LED bulbs, 60W equivalent, 4-pack', 'Electrical', 'lightbulb', 9.99, 4.4, 27, 12, 36, 'bluebonnet'],
  ['EL-402', 'Outdoor extension cord, 25 ft', 'Electrical', 'plug', 19.99, 9.9, 4, 6, 12, 'bluebonnet'],
  ['EL-403', 'AA batteries, 8-pack', 'Electrical', 'battery', 8.49, 4.1, 33, 15, 48, 'bluebonnet'],
  ['EL-404', 'Outlet tester', 'Electrical', 'zap', 12.99, 5.8, 10, 4, 8, 'bluebonnet'],
  ['EL-405', 'Rechargeable LED work light', 'Electrical', 'flashlight', 34.99, 18.5, 6, 4, 8, 'bluebonnet'],
  ['GD-501', 'Potting mix, 1 cu ft', 'Garden', 'sprout', 11.99, 5.4, 38, 15, 40, 'caliche'],
  ['GD-502', 'Garden hose, 50 ft', 'Garden', 'droplets', 34.99, 17.8, 5, 6, 12, 'caliche'],
  ['GD-503', 'Hose nozzle, 8 patterns', 'Garden', 'spray', 12.49, 5.2, 15, 8, 24, 'caliche'],
  ['GD-504', 'Bypass pruning shears', 'Garden', 'scissors', 19.99, 9.1, 11, 6, 12, 'caliche'],
  ['GD-505', 'Vegetable seed packet', 'Garden', 'sprout', 3.49, 1.1, 64, 30, 100, 'caliche'],
  ['GD-506', 'Hardwood mulch, 2 cu ft', 'Garden', 'leaf', 5.49, 2.6, 0, 20, 60, 'caliche'],
  ['FS-601', 'Wood screws, #8 × 1-1/4 in, 1 lb box', 'Fasteners', 'nut', 8.99, 3.9, 21, 10, 24, 'pecan'],
  ['FS-602', 'Drywall anchors with screws, 50-pack', 'Fasteners', 'nut', 7.49, 2.9, 14, 8, 24, 'pecan'],
  ['FS-603', 'Picture hanging kit', 'Fasteners', 'frame', 6.99, 2.6, 19, 6, 12, 'pecan'],
  ['FS-604', 'Cable ties, 8 in, 100-pack', 'Fasteners', 'cable', 5.99, 2.1, 2, 10, 30, 'pecan'],
  ['FS-605', 'Duct tape, 1.88 in × 30 yd', 'Fasteners', 'disc', 7.99, 3.4, 25, 10, 24, 'pecan'],
]

export function sampleProducts(): Product[] {
  return ROWS.map(([sku, name, category, icon, price, cost, onHand, reorderPoint, reorderQty, supplierId]) => ({
    sku,
    name,
    category,
    icon,
    price,
    cost,
    onHand,
    reorderPoint,
    reorderQty,
    supplierId,
  }))
}

export function priceSale(lines: SaleLine[], discountRate: number) {
  const subtotal = round2(lines.reduce((sum, l) => sum + l.qty * l.price, 0))
  const discount = round2(subtotal * discountRate)
  const tax = round2((subtotal - discount) * STORE.taxRate)
  return { subtotal, discount, tax, total: round2(subtotal - discount + tax) }
}

/** Today's sales up to the demo's current time, generated the same way on every visit. */
function sampleSales(products: Product[]): Sale[] {
  const rand = seededRandom(1115)
  const weighted = products.filter((p) => p.sku !== 'GD-506').flatMap((p) => Array(Math.max(1, Math.round(12 / Math.sqrt(p.price)))).fill(p) as Product[])
  const sales: Sale[] = []
  let at = todayAt(8, 2)
  for (let i = 0; i < 58; i++) {
    at += Math.round((3.2 + rand() * 8) * MINUTE)
    const count = 1 + Math.floor(rand() * rand() * 4)
    const lines: SaleLine[] = []
    for (let j = 0; j < count; j++) {
      const p = weighted[Math.floor(rand() * weighted.length)]
      if (lines.some((l) => l.sku === p.sku)) continue
      const qty = p.price < 10 && rand() > 0.6 ? 2 + Math.floor(rand() * 2) : 1
      lines.push({ sku: p.sku, name: p.name, qty, price: p.price, cost: p.cost })
    }
    const roll = rand()
    const payment: Payment = roll < 0.62 ? 'Card' : roll < 0.87 ? 'Cash' : 'Mobile wallet'
    const discountRate = rand() > 0.9 ? 0.1 : 0
    const totals = priceSale(lines, discountRate)
    const tendered = payment === 'Cash' ? Math.ceil(totals.total / 5) * 5 + (rand() > 0.5 ? 5 : 0) : undefined
    sales.push({
      id: `sale-${1301 + i}`,
      number: 1301 + i,
      at,
      lines,
      ...totals,
      payment,
      tendered,
      change: tendered !== undefined ? round2(tendered - totals.total) : undefined,
      cashier: i % 3 === 0 ? 'Devon R.' : STORE.cashier,
    })
  }
  return sales
}

function samplePurchaseOrders(products: Product[]): PurchaseOrder[] {
  const line = (sku: string, qty: number) => {
    const p = products.find((x) => x.sku === sku)!
    return { sku, name: p.name, qty, cost: p.cost }
  }
  return [
    {
      id: 'po-1042',
      number: 'PO-1042',
      supplierId: 'caliche',
      createdAt: todayAt(16, 20) - DAY,
      sentAt: todayAt(16, 22) - DAY,
      status: 'Sent',
      lines: [line('GD-506', 60), line('GD-501', 40)],
    },
    {
      id: 'po-1041',
      number: 'PO-1041',
      supplierId: 'hollis',
      createdAt: todayAt(9, 5) - 3 * DAY,
      sentAt: todayAt(9, 6) - 3 * DAY,
      receivedAt: todayAt(14, 40) - 2 * DAY,
      status: 'Received',
      lines: [line('PT-201', 24), line('PT-202', 12)],
    },
  ]
}

export function createInitialState(): PosState {
  const products = sampleProducts()
  const sales = sampleSales(products)
  return {
    products,
    sales,
    orders: samplePurchaseOrders(products),
    adjustments: [],
    nextSale: 1301 + sales.length,
    nextPo: 1043,
  }
}

export function stockStatus(p: Product): 'out' | 'low' | 'ok' {
  if (p.onHand <= 0) return 'out'
  if (p.onHand <= p.reorderPoint) return 'low'
  return 'ok'
}

/** Totals for a list of sales, used by the sales report and the live metrics. */
export function salesSummary(sales: Sale[]) {
  const total = round2(sales.reduce((s, x) => s + x.total, 0))
  const tax = round2(sales.reduce((s, x) => s + x.tax, 0))
  const discounts = round2(sales.reduce((s, x) => s + x.discount, 0))
  const net = round2(total - tax)
  const cost = sales.reduce((s, x) => s + x.lines.reduce((n, l) => n + l.qty * l.cost, 0), 0)
  const items = sales.reduce((s, x) => s + x.lines.reduce((n, l) => n + l.qty, 0), 0)
  return { total, tax, discounts, net, cost, items, margin: net ? ((net - cost) / net) * 100 : 0 }
}
