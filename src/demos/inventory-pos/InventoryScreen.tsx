import { Boxes, CircleAlert, DollarSign, PackageX, Search, SlidersHorizontal, Truck } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import { money } from '../../lib/format'
import { td, th } from '../styles'
import { AppButton, Field, Modal, SelectInput, Stat, TextInput } from '../ui'
import { CATEGORIES, stockStatus } from './data'
import { ProductIcon, StockBadge } from './parts'
import type { Category, Product } from './types'

interface Props {
  products: Product[]
  onReceive: (sku: string, qty: number) => void
  onAdjust: (sku: string, count: number, reason: string) => void
}

type StatusFilter = 'all' | 'low' | 'out' | 'ok'

const REASONS = ['Stock count correction', 'Damaged', 'Lost or stolen', 'Found during count']

export function InventoryScreen({ products, onReceive, onAdjust }: Props) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'All'>('All')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [action, setAction] = useState<{ kind: 'receive' | 'adjust'; sku: string } | null>(null)

  const q = query.trim().toLowerCase()
  const shown = products.filter((p) => {
    const s = stockStatus(p)
    return (
      (category === 'All' || p.category === category) &&
      (status === 'all' || s === status) &&
      (!q || `${p.name} ${p.sku}`.toLowerCase().includes(q))
    )
  })
  const value = products.reduce((sum, p) => sum + p.onHand * p.cost, 0)
  const low = products.filter((p) => stockStatus(p) === 'low').length
  const out = products.filter((p) => stockStatus(p) === 'out').length
  const target = products.find((p) => p.sku === action?.sku)

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Boxes} label="Products" value={products.length} tone="accent" />
        <Stat icon={DollarSign} label="Stock value at cost" value={money(value)} tone="green" />
        <Stat icon={CircleAlert} label="Low stock" value={low} tone="amber" detail="At or below reorder level" />
        <Stat icon={PackageX} label="Out of stock" value={out} tone="red" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3">
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <label htmlFor="inv-search" className="sr-only">
              Search stock
            </label>
            <TextInput id="inv-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or code" className="pl-9" />
          </div>
          <label htmlFor="inv-category" className="sr-only">
            Category
          </label>
          <SelectInput id="inv-category" value={category} onChange={(e) => setCategory(e.target.value as Category | 'All')} fullWidth={false} className="w-44">
            <option value="All">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </SelectInput>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by stock level">
            {(
              [
                ['all', 'All'],
                ['low', 'Low'],
                ['out', 'Out'],
                ['ok', 'In stock'],
              ] as [StatusFilter, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={status === id}
                onClick={() => setStatus(id)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                  status === id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden relative overflow-x-auto md:block">
          <table className="w-full min-w-[54rem]">
            <thead className="bg-slate-50">
              <tr>
                <th className={th}>Product</th>
                <th className={th}>Category</th>
                <th className={cn(th, 'text-right')}>On hand</th>
                <th className={cn(th, 'text-right')}>Reorder at</th>
                <th className={th}>Status</th>
                <th className={cn(th, 'text-right')}>Price</th>
                <th className={cn(th, 'text-right')}>Margin</th>
                <th className={th}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((p) => (
                <tr key={p.sku}>
                  <td className={td}>
                    <div className="flex items-center gap-2.5">
                      <ProductIcon product={p} size="sm" />
                      <div>
                        <p className="font-medium text-slate-900">{p.name}</p>
                        <p className="font-mono text-xs text-slate-600">{p.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className={td}>{p.category}</td>
                  <td className={cn(td, 'text-right font-semibold tabular-nums')}>{p.onHand}</td>
                  <td className={cn(td, 'text-right text-slate-600 tabular-nums')}>{p.reorderPoint}</td>
                  <td className={td}>
                    <StockBadge product={p} />
                  </td>
                  <td className={cn(td, 'text-right tabular-nums')}>{money(p.price)}</td>
                  <td className={cn(td, 'text-right text-slate-600 tabular-nums')}>{Math.round(((p.price - p.cost) / p.price) * 100)}%</td>
                  <td className={td}>
                    <div className="flex justify-end gap-1.5">
                      <AppButton variant="secondary" size="sm" icon={Truck} onClick={() => setAction({ kind: 'receive', sku: p.sku })} aria-label={`Receive stock for ${p.name}`}>
                        Receive
                      </AppButton>
                      <AppButton variant="ghost" size="sm" icon={SlidersHorizontal} onClick={() => setAction({ kind: 'adjust', sku: p.sku })} aria-label={`Adjust stock for ${p.name}`}>
                        Adjust
                      </AppButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-slate-100 md:hidden">
          {shown.map((p) => (
            <li key={p.sku} className="flex flex-wrap items-center gap-3 p-3">
              <ProductIcon product={p} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{p.name}</p>
                <p className="text-xs text-slate-600">
                  <span className="font-mono">{p.sku}</span> · {p.onHand} on hand · reorder at {p.reorderPoint}
                </p>
              </div>
              <StockBadge product={p} />
              <div className="flex w-full gap-2">
                <AppButton variant="secondary" size="sm" icon={Truck} onClick={() => setAction({ kind: 'receive', sku: p.sku })} aria-label={`Receive stock for ${p.name}`}>
                  Receive
                </AppButton>
                <AppButton variant="ghost" size="sm" icon={SlidersHorizontal} onClick={() => setAction({ kind: 'adjust', sku: p.sku })} aria-label={`Adjust stock for ${p.name}`}>
                  Adjust
                </AppButton>
              </div>
            </li>
          ))}
        </ul>
        {shown.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-600">No products match these filters.</p>}
      </div>

      {target && action && (
        <StockModal
          key={action.kind + target.sku}
          kind={action.kind}
          product={target}
          onClose={() => setAction(null)}
          onSave={(qty, reason) => {
            if (action.kind === 'receive') onReceive(target.sku, qty)
            else onAdjust(target.sku, qty, reason)
            setAction(null)
          }}
        />
      )}
    </div>
  )
}

function StockModal({
  kind,
  product,
  onClose,
  onSave,
}: {
  kind: 'receive' | 'adjust'
  product: Product
  onClose: () => void
  onSave: (qty: number, reason: string) => void
}) {
  const [value, setValue] = useState(kind === 'receive' ? String(product.reorderQty) : String(product.onHand))
  const [reason, setReason] = useState(REASONS[0])
  const qty = Number(value)
  const valid = Number.isInteger(qty) && (kind === 'receive' ? qty > 0 && qty <= 999 : qty >= 0 && qty <= 9999)
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={kind === 'receive' ? 'Receive stock' : 'Adjust stock count'}
      description={product.name}
      footer={
        <>
          <AppButton variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton onClick={() => valid && onSave(qty, reason)} disabled={!valid}>
            Save
          </AppButton>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          On hand now: <span className="font-semibold">{product.onHand}</span>
        </p>
        <Field
          label={kind === 'receive' ? 'Quantity received' : 'Counted on the shelf'}
          htmlFor="stock-qty"
          error={!valid ? 'Enter a whole number.' : undefined}
          hint={kind === 'receive' ? `New total: ${product.onHand + (valid ? qty : 0)}` : undefined}
        >
          <TextInput id="stock-qty" type="number" inputMode="numeric" min={0} value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        {kind === 'adjust' && (
          <Field label="Reason" htmlFor="stock-reason">
            <SelectInput id="stock-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </SelectInput>
          </Field>
        )}
      </div>
    </Modal>
  )
}
