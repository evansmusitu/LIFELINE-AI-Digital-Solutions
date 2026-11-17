import { Bike, ClipboardCopy, Clock, MessageCircle, Receipt, ShoppingBag, Store, Wallet } from 'lucide-react'
import { useState } from 'react'
import { useBusinessName } from '../../lib/business-name'
import { cn } from '../../lib/cn'
import { clockTime, money } from '../../lib/format'
import { AppButton, Badge, Modal, Stat, Toggle, type Tone } from '../ui'
import { BUSINESS, CATEGORIES } from './data'
import { nextStatus, orderMessage } from './message'
import { PhoneChat, ProductIcon, WhatsAppText } from './parts'
import type { Order, OrderStatus, Product } from './types'

const statusTone: Record<OrderStatus, Tone> = {
  New: 'accent',
  Confirmed: 'blue',
  Preparing: 'amber',
  'Out for delivery': 'violet',
  'Ready for collection': 'violet',
  Completed: 'green',
}

const actionLabel: Partial<Record<OrderStatus, string>> = {
  Confirmed: 'Confirm order',
  Preparing: 'Start preparing',
  'Out for delivery': 'Send out for delivery',
  'Ready for collection': 'Mark ready to collect',
  Completed: 'Complete order',
}

type Filter = 'open' | 'all' | 'completed'

interface OrdersProps {
  orders: Order[]
  onAdvance: (orderId: string) => void
  onCopy: (text: string) => void
}

export function OrdersScreen({ orders, onAdvance, onCopy }: OrdersProps) {
  const business = useBusinessName(BUSINESS)
  const [filter, setFilter] = useState<Filter>('open')
  const [viewing, setViewing] = useState<string | null>(null)
  const sorted = [...orders].sort((a, b) => b.at - a.at)
  const open = sorted.filter((o) => o.status !== 'Completed')
  const shown = filter === 'all' ? sorted : filter === 'open' ? open : sorted.filter((o) => o.status === 'Completed')
  const sales = orders.reduce((sum, o) => sum + o.total, 0)
  const viewed = orders.find((o) => o.id === viewing)

  return (
    <div className="space-y-4 p-3 sm:p-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={ShoppingBag} label="Orders today" value={orders.length} tone="accent" />
        <Stat icon={Wallet} label="Sales today" value={money(sales)} tone="green" />
        <Stat icon={Clock} label="Waiting to confirm" value={orders.filter((o) => o.status === 'New').length} tone="amber" />
        <Stat icon={Receipt} label="Average order" value={money(orders.length ? sales / orders.length : 0)} />
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter orders">
        {(
          [
            ['open', `Open ${open.length}`],
            ['completed', `Completed ${orders.length - open.length}`],
            ['all', `All ${orders.length}`],
          ] as [Filter, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition',
              filter === id ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {shown.map((order) => {
          const next = nextStatus(order)
          const items = order.lines.reduce((n, l) => n + l.qty, 0)
          const lastUpdate = order.updates[order.updates.length - 1]
          return (
            <li
              key={order.id}
              className={cn('flex flex-col rounded-xl bg-white p-4 shadow-sm ring-1', order.mine ? 'ring-2 ring-(--accent)' : 'ring-slate-200')}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                    {order.ref}
                    {order.mine && <Badge tone="accent">Your demo order</Badge>}
                  </p>
                  <p className="text-xs text-slate-600">
                    {clockTime(order.at)} · {order.customer} · {order.payment}
                  </p>
                </div>
                <Badge tone={statusTone[order.status]}>{order.status}</Badge>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-700">
                {order.method === 'delivery' ? <Bike className="size-4 text-slate-500" aria-hidden="true" /> : <Store className="size-4 text-slate-500" aria-hidden="true" />}
                {order.method === 'delivery' ? `Delivery to ${order.area}` : 'Collection'} · {order.time}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {items} {items === 1 ? 'item' : 'items'}: {order.lines.map((l) => `${l.qty} × ${l.name}`).join(', ')}
              </p>
              {order.notes && <p className="mt-1 text-sm text-slate-800">Note: {order.notes}</p>}
              {lastUpdate && (
                <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-green-50 px-2.5 py-1.5 text-xs text-green-900">
                  <MessageCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  Sent {clockTime(lastUpdate.at)}: {lastUpdate.text}
                </p>
              )}
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
                <p className="text-lg font-bold text-slate-900 tabular-nums">{money(order.total)}</p>
                <div className="flex flex-wrap gap-2">
                  <AppButton variant="secondary" size="sm" onClick={() => setViewing(order.id)} aria-label={`View the WhatsApp message for ${order.ref}`}>
                    View message
                  </AppButton>
                  {next && (
                    <AppButton size="sm" icon={MessageCircle} onClick={() => onAdvance(order.id)} aria-label={`${actionLabel[next]} ${order.ref}`}>
                      {actionLabel[next]}
                    </AppButton>
                  )}
                </div>
              </div>
            </li>
          )
        })}
        {shown.length === 0 && (
          <li className="col-span-full rounded-xl bg-white p-6 text-center text-sm text-slate-600 ring-1 ring-slate-200">
            All caught up. Every order has been completed.
          </li>
        )}
      </ul>
      <p className="text-xs text-slate-600">
        Each status change sends the customer a WhatsApp update, written for you. In this demo, nothing is sent.
      </p>

      <Modal
        open={Boolean(viewed)}
        onClose={() => setViewing(null)}
        title={viewed ? `Order ${viewed.ref} on WhatsApp` : 'Order'}
        description="The order as it arrived, and the updates sent back."
        footer={
          viewed && (
            <AppButton variant="secondary" icon={ClipboardCopy} onClick={() => onCopy(orderMessage(viewed, business))}>
              Copy order
            </AppButton>
          )
        }
      >
        {viewed && (
          <PhoneChat title={viewed.customer} subtitle="Customer">
            <div className="max-w-[88%] rounded-lg rounded-tl-none bg-white px-3 py-2 text-[0.82rem] leading-relaxed text-slate-900 shadow-sm">
              <WhatsAppText text={orderMessage(viewed, business)} />
              <span className="mt-1 block text-right text-[0.65rem] text-slate-500">{clockTime(viewed.at)}</span>
            </div>
            {viewed.updates.map((u) => (
              <div key={u.at + u.text} className="ml-auto max-w-[88%] rounded-lg rounded-tr-none bg-[#d9fdd3] px-3 py-2 text-[0.82rem] text-slate-900 shadow-sm">
                {u.text}
                <span className="mt-1 block text-right text-[0.65rem] text-slate-500">{clockTime(u.at)}</span>
              </div>
            ))}
          </PhoneChat>
        )}
      </Modal>
    </div>
  )
}

interface ProductsProps {
  products: Product[]
  onUpdate: (product: Product) => void
}

export function ProductsScreen({ products, onUpdate }: ProductsProps) {
  return (
    <div className="space-y-5 p-3 sm:p-6">
      <p className="text-sm text-slate-700">
        Mark items as sold out or change prices. The customer menu updates straight away, so nobody orders what you can’t make.
      </p>
      {CATEGORIES.map((category) => (
        <section key={category.id} aria-labelledby={`cat-${category.id}`}>
          <h3 id={`cat-${category.id}`} className="text-sm font-semibold text-slate-900">
            {category.label}
          </h3>
          <ul className="mt-2 divide-y divide-slate-100 rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            {products
              .filter((p) => p.category === category.id)
              .map((product) => (
                <li key={product.id} className="flex flex-wrap items-center gap-3 px-3 py-3 sm:flex-nowrap">
                  <ProductIcon icon={product.icon} category={product.category} size="sm" />
                  <p className="min-w-0 flex-1 text-sm font-medium text-slate-900">{product.name}</p>
                  <div className="flex items-center gap-1.5">
                    <label htmlFor={`price-${product.id}`} className="text-xs text-slate-600">
                      Price $
                    </label>
                    <input
                      id={`price-${product.id}`}
                      type="number"
                      inputMode="decimal"
                      min={0.5}
                      max={200}
                      step={0.1}
                      value={product.price}
                      onChange={(e) => {
                        const price = Number(e.target.value)
                        if (Number.isFinite(price) && price > 0) onUpdate({ ...product, price: Math.round(price * 100) / 100 })
                      }}
                      className="h-9 w-20 rounded-lg border border-slate-300 px-2 text-sm tabular-nums"
                    />
                  </div>
                  <Toggle
                    className="w-40"
                    checked={product.available}
                    onChange={(available) => onUpdate({ ...product, available })}
                    label={product.available ? 'Available' : 'Sold out'}
                    ariaLabel={`${product.name} available today`}
                  />
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
