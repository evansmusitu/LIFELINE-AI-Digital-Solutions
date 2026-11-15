import { CircleCheck, FileText, PackageCheck, Send, Truck } from 'lucide-react'
import { useState } from 'react'
import { DAY } from '../../lib/time'
import { money, shortDate } from '../../lib/format'
import { AppButton, Badge, Modal, Notice, Panel } from '../ui'
import { SUPPLIERS, STORE, stockStatus } from './data'
import { ProductIcon, StockBadge } from './parts'
import type { PoLine, Product, PurchaseOrder } from './types'

interface Props {
  products: Product[]
  orders: PurchaseOrder[]
  onCreate: (supplierId: string, lines: PoLine[]) => string
  onSend: (poId: string) => void
  onReceive: (poId: string) => void
}

export function ReorderScreen({ products, orders, onCreate, onSend, onReceive }: Props) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [viewing, setViewing] = useState<string | null>(null)

  const onOrder = new Map<string, string>()
  for (const po of orders) if (po.status !== 'Received') for (const line of po.lines) onOrder.set(line.sku, po.number)

  const needed = products.filter((p) => stockStatus(p) !== 'ok' && !onOrder.has(p.sku))
  const bySupplier = SUPPLIERS.map((s) => ({ supplier: s, items: needed.filter((p) => p.supplierId === s.id) })).filter((g) => g.items.length)
  const qtyFor = (p: Product) => quantities[p.sku] ?? p.reorderQty
  const po = orders.find((o) => o.id === viewing)
  const poSupplier = SUPPLIERS.find((s) => s.id === po?.supplierId)

  const create = (supplierId: string, items: Product[]) => {
    const lines = items.filter((p) => qtyFor(p) > 0).map((p) => ({ sku: p.sku, name: p.name, qty: qtyFor(p), cost: p.cost }))
    if (!lines.length) return
    const id = onCreate(supplierId, lines)
    setViewing(id)
  }

  const sortedOrders = [...orders].sort((a, b) => b.createdAt - a.createdAt)

  return (
    <div className="grid grid-cols-1 gap-4 p-3 sm:p-5 xl:grid-cols-[1fr_24rem]">
      <div className="space-y-4">
        {bySupplier.length === 0 ? (
          <Notice tone="green" icon={CircleCheck} title="Nothing to reorder">
            Every product is above its reorder level or already on order.
          </Notice>
        ) : (
          bySupplier.map(({ supplier, items }) => {
            const total = items.reduce((sum, p) => sum + qtyFor(p) * p.cost, 0)
            return (
              <Panel
                key={supplier.id}
                title={supplier.name}
                description={`Usually delivers in ${supplier.leadDays} days · ${supplier.email}`}
                action={
                  <AppButton
                    size="sm"
                    icon={FileText}
                    onClick={() => create(supplier.id, items)}
                    aria-label={`Create purchase order for ${supplier.name}`}
                  >
                    Create purchase order
                  </AppButton>
                }
              >
                <ul className="divide-y divide-slate-100">
                  {items.map((p) => (
                    <li key={p.sku} className="flex flex-wrap items-center gap-3 py-2.5 sm:flex-nowrap">
                      <ProductIcon product={p} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-600">
                          {p.onHand} on hand · reorder at {p.reorderPoint} · {money(p.cost)} each
                        </p>
                      </div>
                      <StockBadge product={p} />
                      <div className="flex items-center gap-1.5">
                        <label htmlFor={`qty-${p.sku}`} className="text-xs text-slate-600">
                          Order
                        </label>
                        <input
                          id={`qty-${p.sku}`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={999}
                          value={qtyFor(p)}
                          onChange={(e) => setQuantities((q) => ({ ...q, [p.sku]: Math.max(0, Math.min(999, Math.round(Number(e.target.value) || 0))) }))}
                          className="h-9 w-20 rounded-lg border border-slate-300 px-2 text-sm tabular-nums"
                        />
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-right text-sm text-slate-700">
                  Estimated cost: <span className="font-semibold text-slate-900 tabular-nums">{money(total)}</span>
                </p>
              </Panel>
            )
          })
        )}
      </div>

      <Panel title="Purchase orders" description="Track what’s on the way.">
        <ul className="space-y-2.5">
          {sortedOrders.map((o) => {
            const supplier = SUPPLIERS.find((s) => s.id === o.supplierId)
            const total = o.lines.reduce((sum, l) => sum + l.qty * l.cost, 0)
            return (
              <li key={o.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{o.number}</p>
                    <p className="text-xs text-slate-600">{supplier?.name}</p>
                  </div>
                  <Badge tone={o.status === 'Received' ? 'green' : o.status === 'Sent' ? 'blue' : 'neutral'}>{o.status}</Badge>
                </div>
                <p className="mt-1.5 text-xs text-slate-600">
                  {o.lines.length} {o.lines.length === 1 ? 'line' : 'lines'} · {money(total)}
                  {o.status === 'Sent' && o.sentAt && supplier && ` · due ${shortDate(o.sentAt + supplier.leadDays * DAY, 'en-US')}`}
                  {o.status === 'Received' && o.receivedAt && ` · received ${shortDate(o.receivedAt, 'en-US')}`}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <AppButton variant="secondary" size="sm" onClick={() => setViewing(o.id)} aria-label={`View ${o.number}`}>
                    View
                  </AppButton>
                  {o.status === 'Draft' && (
                    <AppButton size="sm" icon={Send} onClick={() => onSend(o.id)} aria-label={`Send ${o.number}`}>
                      Send
                    </AppButton>
                  )}
                  {o.status === 'Sent' && (
                    <AppButton size="sm" icon={PackageCheck} onClick={() => onReceive(o.id)} aria-label={`Mark ${o.number} received`}>
                      Mark received
                    </AppButton>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </Panel>

      <Modal
        open={Boolean(po)}
        onClose={() => setViewing(null)}
        title={po ? `Purchase order ${po.number}` : 'Purchase order'}
        description={poSupplier ? `To ${poSupplier.name}, ${poSupplier.email}` : undefined}
        size="md"
        footer={
          po && (
            <>
              <AppButton variant="secondary" onClick={() => setViewing(null)}>
                Close
              </AppButton>
              {po.status === 'Draft' && (
                <AppButton
                  icon={Send}
                  onClick={() => {
                    onSend(po.id)
                    setViewing(null)
                  }}
                >
                  Email to supplier
                </AppButton>
              )}
              {po.status === 'Sent' && (
                <AppButton
                  icon={Truck}
                  onClick={() => {
                    onReceive(po.id)
                    setViewing(null)
                  }}
                >
                  Mark received
                </AppButton>
              )}
            </>
          )
        }
      >
        {po && (
          <div className="text-sm">
            <p className="text-slate-700">
              From <span className="font-semibold">{STORE.name}</span>, {STORE.address}
            </p>
            <table className="mt-3 w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-600">
                  <th className="py-1.5 font-semibold">Item</th>
                  <th className="py-1.5 text-right font-semibold">Qty</th>
                  <th className="py-1.5 text-right font-semibold">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {po.lines.map((l) => (
                  <tr key={l.sku}>
                    <td className="py-2">
                      {l.name} <span className="font-mono text-xs text-slate-500">{l.sku}</span>
                    </td>
                    <td className="py-2 text-right tabular-nums">{l.qty}</td>
                    <td className="py-2 text-right tabular-nums">{money(l.qty * l.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 flex justify-between border-t border-slate-200 pt-2 font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{money(po.lines.reduce((s, l) => s + l.qty * l.cost, 0))}</span>
            </p>
            {po.status === 'Draft' && (
              <Notice tone="neutral" className="mt-3">
                Sending emails a PDF of this order to the supplier. In this demo, nothing is sent.
              </Notice>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
