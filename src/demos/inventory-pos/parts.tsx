import {
  BatteryFull,
  Cable,
  Disc,
  Drill,
  Droplets,
  FlaskConical,
  Flashlight,
  Frame,
  Hammer,
  Hand,
  Layers,
  Leaf,
  Lightbulb,
  Nut,
  PaintBucket,
  PaintRoller,
  Paintbrush,
  Plug,
  Ruler,
  Scissors,
  SprayCan,
  Sprout,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { clockTime, money } from '../../lib/format'
import { Badge } from '../ui'
import { STORE, stockStatus } from './data'
import type { Category, IconName, Product, Sale } from './types'

const ICONS: Record<IconName, LucideIcon> = {
  hammer: Hammer,
  drill: Drill,
  ruler: Ruler,
  scissors: Scissors,
  wrench: Wrench,
  hand: Hand,
  'paint-bucket': PaintBucket,
  'paint-roller': PaintRoller,
  paintbrush: Paintbrush,
  disc: Disc,
  layers: Layers,
  droplets: Droplets,
  flask: FlaskConical,
  lightbulb: Lightbulb,
  plug: Plug,
  battery: BatteryFull,
  zap: Zap,
  flashlight: Flashlight,
  sprout: Sprout,
  spray: SprayCan,
  leaf: Leaf,
  nut: Nut,
  frame: Frame,
  cable: Cable,
}

const TILES: Record<Category, string> = {
  Tools: 'bg-orange-50 text-orange-700',
  Paint: 'bg-sky-50 text-sky-700',
  Plumbing: 'bg-cyan-50 text-cyan-700',
  Electrical: 'bg-amber-50 text-amber-700',
  Garden: 'bg-emerald-50 text-emerald-700',
  Fasteners: 'bg-slate-100 text-slate-700',
}

export function ProductIcon({ product, size = 'md' }: { product: Pick<Product, 'icon' | 'category'>; size?: 'sm' | 'md' }) {
  const Icon = ICONS[product.icon]
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-lg', TILES[product.category], size === 'sm' ? 'size-8' : 'size-10')}>
      <Icon className={size === 'sm' ? 'size-4' : 'size-5'} aria-hidden="true" />
    </span>
  )
}

export function StockBadge({ product }: { product: Product }) {
  const status = stockStatus(product)
  if (status === 'out') return <Badge tone="red">Out of stock</Badge>
  if (status === 'low') return <Badge tone="amber">Low: {product.onHand} left</Badge>
  return <Badge tone="green">In stock</Badge>
}

export function Receipt({ sale }: { sale: Sale }) {
  return (
    <div className="mx-auto max-w-xs rounded-lg border border-dashed border-slate-300 bg-white p-4 font-mono text-[0.78rem] leading-relaxed text-slate-900">
      <p className="text-center font-sans text-sm font-bold">{STORE.name}</p>
      <p className="text-center">{STORE.address}</p>
      <p className="mt-2 flex justify-between">
        <span>Receipt #{sale.number}</span>
        <span>
          {new Date(sale.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {clockTime(sale.at, 'en-US')}
        </span>
      </p>
      <p>Cashier: {sale.cashier}</p>
      <ul className="my-2 border-y border-dashed border-slate-300 py-2">
        {sale.lines.map((line) => (
          <li key={line.sku}>
            <p>{line.name}</p>
            <p className="flex justify-between pl-3">
              <span>
                {line.qty} × {money(line.price)}
              </span>
              <span>{money(line.qty * line.price)}</span>
            </p>
          </li>
        ))}
      </ul>
      <p className="flex justify-between">
        <span>Subtotal</span>
        <span>{money(sale.subtotal)}</span>
      </p>
      {sale.discount > 0 && (
        <p className="flex justify-between">
          <span>Discount</span>
          <span>−{money(sale.discount)}</span>
        </p>
      )}
      <p className="flex justify-between">
        <span>Sales tax 8.25%</span>
        <span>{money(sale.tax)}</span>
      </p>
      <p className="mt-1 flex justify-between text-sm font-bold">
        <span>Total</span>
        <span>{money(sale.total)}</span>
      </p>
      <p className="mt-1 flex justify-between">
        <span>Paid by {sale.payment.toLowerCase()}</span>
        <span>{money(sale.tendered ?? sale.total)}</span>
      </p>
      {sale.change !== undefined && sale.change > 0 && (
        <p className="flex justify-between">
          <span>Change</span>
          <span>{money(sale.change)}</span>
        </p>
      )}
      <p className="mt-3 text-center">Thanks for shopping local!</p>
      <p className="text-center">Returns within 30 days with this receipt.</p>
    </div>
  )
}
