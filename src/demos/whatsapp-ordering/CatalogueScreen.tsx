import { Bike, Clock, MapPin, Search, ShoppingBag, Star } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import { money } from '../../lib/format'
import { AppButton, Badge, QtyStepper, SelectInput, TextInput } from '../ui'
import { CATEGORIES, NEXT_DAY_PRODUCTS } from './data'
import { ProductIcon } from './parts'
import type { CartLine, CategoryId, Product } from './types'

interface Props {
  products: Product[]
  cart: CartLine[]
  itemCount: number
  subtotal: number
  onAdd: (productId: string, choiceId?: string) => void
  onSetQty: (key: string, qty: number) => void
  onReview: () => void
}

export function CatalogueScreen({ products, cart, itemCount, subtotal, onAdd, onSetQty, onReview }: Props) {
  const [category, setCategory] = useState<CategoryId | 'all'>('all')
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const shown = products.filter(
    (p) => (category === 'all' || p.category === category) && (!q || `${p.name} ${p.description}`.toLowerCase().includes(q)),
  )

  return (
    <div className="relative">
      <div className="border-b border-slate-200 bg-[linear-gradient(120deg,#faf5ff,#ffffff_60%)] px-4 py-5 sm:px-6">
        <p className="text-lg font-bold text-slate-900">Order fresh from our Avondale bakery</p>
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-700">
          <li className="flex items-center gap-1.5">
            <Clock className="size-4 text-(--accent)" aria-hidden="true" />
            Open today 07:00–18:00
          </li>
          <li className="flex items-center gap-1.5">
            <Bike className="size-4 text-(--accent)" aria-hidden="true" />
            Delivery across Harare from $2
          </li>
          <li className="flex items-center gap-1.5">
            <MapPin className="size-4 text-(--accent)" aria-hidden="true" />
            Or collect for free
          </li>
        </ul>
      </div>

      <div className="space-y-3 px-3 pt-4 sm:px-6">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <label htmlFor="catalogue-search" className="sr-only">
            Search the menu
          </label>
          <TextInput
            id="catalogue-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bread, cakes, coffee…"
            className="pl-9"
          />
        </div>
        <div role="group" aria-label="Menu sections" className="no-scrollbar -mx-3 flex gap-2 relative overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0">
          {[{ id: 'all' as const, label: 'Everything' }, ...CATEGORIES].map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition',
                category === c.id ? 'bg-(--accent) text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-(--accent)',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <ul className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
        {shown.map((product) => (
          <ProductCard key={product.id} product={product} cart={cart} onAdd={onAdd} onSetQty={onSetQty} />
        ))}
        {shown.length === 0 && (
          <li className="col-span-full rounded-xl bg-white p-6 text-center text-sm text-slate-600 ring-1 ring-slate-200">
            Nothing matches “{query}”. Try “bread” or “coffee”.
          </li>
        )}
      </ul>

      <div className="sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-10 px-3 pb-4 sm:px-6 md:bottom-4">
        <div
          className={cn(
            'flex items-center justify-between gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-xl transition',
            itemCount === 0 && 'opacity-95',
          )}
        >
          <p className="flex items-center gap-2 text-sm">
            <ShoppingBag className="size-5" aria-hidden="true" />
            {itemCount === 0 ? (
              'Your order is empty'
            ) : (
              <span>
                <span className="font-semibold">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </span>{' '}
                · {money(subtotal)}
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={onReview}
            disabled={itemCount === 0}
            className="h-10 rounded-xl bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-50"
          >
            Review order
          </button>
        </div>
      </div>
    </div>
  )
}

function ProductCard({
  product,
  cart,
  onAdd,
  onSetQty,
}: {
  product: Product
  cart: CartLine[]
  onAdd: (productId: string, choiceId?: string) => void
  onSetQty: (key: string, qty: number) => void
}) {
  const [choice, setChoice] = useState(product.option?.choices[0]?.id)
  const key = `${product.id}:${choice ?? ''}`
  const line = cart.find((l) => l.key === key)
  const delta = product.option?.choices.find((c) => c.id === choice)?.delta ?? 0

  return (
    <li className={cn('flex flex-col rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200', !product.available && 'opacity-75')}>
      <div className="flex gap-3">
        <ProductIcon icon={product.icon} category={product.category} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold leading-snug text-slate-900">{product.name}</p>
            <p className="shrink-0 font-semibold text-slate-900 tabular-nums">{money(product.price + delta)}</p>
          </div>
          <p className="mt-0.5 text-sm text-slate-600">{product.description}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {product.popular && (
              <Badge tone="accent" icon={Star}>
                Popular
              </Badge>
            )}
            {NEXT_DAY_PRODUCTS.has(product.id) && <Badge tone="amber">Order a day ahead</Badge>}
          </div>
        </div>
      </div>

      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        {product.option ? (
          <div className="min-w-0 flex-1">
            <label htmlFor={`opt-${product.id}`} className="sr-only">
              {product.option.label} for {product.name}
            </label>
            <SelectInput
              id={`opt-${product.id}`}
              value={choice}
              onChange={(e) => setChoice(e.target.value)}
              disabled={!product.available}
            >
              {product.option.choices.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                  {c.delta ? ` (+${money(c.delta)})` : ''}
                </option>
              ))}
            </SelectInput>
          </div>
        ) : (
          <span />
        )}
        {!product.available ? (
          <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">Sold out today</span>
        ) : line ? (
          <QtyStepper value={line.qty} onChange={(qty) => onSetQty(line.key, qty)} label={product.name} />
        ) : (
          <AppButton size="sm" onClick={() => onAdd(product.id, choice)} aria-label={`Add ${product.name} to your order`}>
            Add
          </AppButton>
        )}
      </div>
    </li>
  )
}
