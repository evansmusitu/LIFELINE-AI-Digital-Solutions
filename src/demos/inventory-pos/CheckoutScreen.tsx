import { Banknote, CreditCard, ScanBarcode, Search, ShoppingCart, Smartphone, Trash2, TriangleAlert } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { cn } from '../../lib/cn'
import { money, round2 } from '../../lib/format'
import { AppButton, Notice, QtyStepper, Segmented, SelectInput, TextInput } from '../ui'
import { CATEGORIES, STORE, priceSale, stockStatus } from './data'
import { ProductIcon } from './parts'
import type { Category, Payment, Product, SaleLine } from './types'

export interface CartItem {
  sku: string
  qty: number
}

interface Props {
  products: Product[]
  cart: CartItem[]
  onCart: (cart: CartItem[]) => void
  onComplete: (lines: SaleLine[], discountRate: number, payment: Payment, tendered?: number) => void
  onWarn: (message: string) => void
}

const DISCOUNTS = [
  { rate: 0, label: 'No discount' },
  { rate: 0.05, label: '5% off' },
  { rate: 0.1, label: '10% off (trade customer)' },
  { rate: 0.15, label: '15% off (manager approved)' },
]

export function CheckoutScreen({ products, cart, onCart, onComplete, onWarn }: Props) {
  const [category, setCategory] = useState<Category | 'All'>('All')
  const [query, setQuery] = useState('')
  const [scan, setScan] = useState('')
  const [discountRate, setDiscountRate] = useState(0)
  const [payment, setPayment] = useState<Payment>('Card')
  const [cash, setCash] = useState('')

  const q = query.trim().toLowerCase()
  const shown = products.filter(
    (p) => (category === 'All' || p.category === category) && (!q || `${p.name} ${p.sku}`.toLowerCase().includes(q)),
  )
  const lines: SaleLine[] = cart.map((item) => {
    const p = products.find((x) => x.sku === item.sku)!
    return { sku: p.sku, name: p.name, qty: item.qty, price: p.price, cost: p.cost }
  })
  const totals = priceSale(lines, discountRate)
  const tendered = Number(cash)
  const cashShort = payment === 'Cash' && !(tendered >= totals.total)
  // Stock can change on the Inventory screen while items sit in the basket.
  const overStock = lines.filter((line) => line.qty > (products.find((p) => p.sku === line.sku)?.onHand ?? 0))

  const fitToStock = () =>
    onCart(
      cart
        .map((item) => ({ ...item, qty: Math.min(item.qty, products.find((p) => p.sku === item.sku)?.onHand ?? 0) }))
        .filter((item) => item.qty > 0),
    )

  const add = (sku: string) => {
    const product = products.find((p) => p.sku === sku)
    if (!product) return
    const inCart = cart.find((c) => c.sku === sku)?.qty ?? 0
    if (inCart + 1 > product.onHand) {
      onWarn(product.onHand === 0 ? `${product.name} is out of stock.` : `Only ${product.onHand} ${product.name} in stock.`)
      return
    }
    onCart(inCart ? cart.map((c) => (c.sku === sku ? { ...c, qty: c.qty + 1 } : c)) : [...cart, { sku, qty: 1 }])
  }

  const onScan = (event: FormEvent) => {
    event.preventDefault()
    const code = scan.trim().toUpperCase()
    if (!code) return
    const product = products.find((p) => p.sku === code)
    if (product) add(product.sku)
    else onWarn(`No product with the code ${code}. Codes look like PT-203.`)
    setScan('')
  }

  const setQty = (sku: string, qty: number) => onCart(qty <= 0 ? cart.filter((c) => c.sku !== sku) : cart.map((c) => (c.sku === sku ? { ...c, qty } : c)))

  const complete = () => {
    if (!lines.length || cashShort || overStock.length) return
    onComplete(lines, discountRate, payment, payment === 'Cash' ? round2(tendered) : undefined)
    setCash('')
    setDiscountRate(0)
  }

  const quickCash = [totals.total, 20, 50, 100].filter((v, i) => i === 0 || v > totals.total)

  return (
    <div className="grid grid-cols-1 gap-4 p-3 sm:p-5 lg:grid-cols-[1fr_24rem]">
      <div className="min-w-0 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <form onSubmit={onScan} className="relative">
            <ScanBarcode className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <label htmlFor="pos-scan" className="sr-only">
              Scan or type a product code, then press Enter
            </label>
            <TextInput
              id="pos-scan"
              value={scan}
              onChange={(e) => setScan(e.target.value)}
              placeholder="Scan or type a code, e.g. PT-203"
              className="pl-9 font-mono uppercase placeholder:normal-case"
              autoComplete="off"
            />
          </form>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <label htmlFor="pos-search" className="sr-only">
              Search products
            </label>
            <TextInput id="pos-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products" className="pl-9" />
          </div>
        </div>

        <div role="group" aria-label="Product categories" className="no-scrollbar -mx-3 flex gap-2 relative overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0">
          {(['All', ...CATEGORIES] as const).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition',
                category === c ? 'bg-(--accent) text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-(--accent)',
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
          {shown.map((product) => {
            const status = stockStatus(product)
            return (
              <li key={product.sku}>
                <button
                  type="button"
                  onClick={() => add(product.sku)}
                  disabled={status === 'out'}
                  className="flex h-full w-full flex-col rounded-xl bg-white p-3 text-left shadow-sm ring-1 ring-slate-200 transition hover:ring-2 hover:ring-(--accent) disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex items-start justify-between gap-2">
                    <ProductIcon product={product} size="sm" />
                    <span className="font-mono text-[0.65rem] text-slate-500">{product.sku}</span>
                  </span>
                  <span className="mt-2 line-clamp-2 text-sm leading-snug font-medium text-slate-900">{product.name}</span>
                  <span className="mt-auto flex items-end justify-between gap-1 pt-2">
                    <span className="font-semibold text-slate-900 tabular-nums">{money(product.price)}</span>
                    <span
                      className={cn(
                        'text-[0.7rem] font-medium',
                        status === 'out' ? 'text-red-700' : status === 'low' ? 'text-amber-800' : 'text-slate-600',
                      )}
                    >
                      {status === 'out' ? 'Out of stock' : `${product.onHand} in stock`}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <section aria-label="Current sale" className="self-start rounded-xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-20">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ShoppingCart className="size-4" aria-hidden="true" />
            Current sale
          </h3>
          {cart.length > 0 && (
            <AppButton variant="ghost" size="sm" icon={Trash2} onClick={() => onCart([])}>
              Clear
            </AppButton>
          )}
        </div>
        <div className="p-4">
          {lines.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-600">
              Tap a product or scan a code to start a sale.
            </p>
          ) : (
            <ul className="space-y-3">
              {lines.map((line) => {
                const product = products.find((p) => p.sku === line.sku)!
                return (
                  <li key={line.sku} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{line.name}</p>
                      <p className="text-xs text-slate-600 tabular-nums">{money(line.price)} each</p>
                    </div>
                    <QtyStepper value={line.qty} min={0} max={product.onHand} onChange={(qty) => setQty(line.sku, qty)} label={line.name} />
                    <p className="w-16 text-right text-sm font-semibold tabular-nums">{money(line.qty * line.price)}</p>
                  </li>
                )
              })}
            </ul>
          )}

          {overStock.length > 0 && (
            <Notice tone="amber" icon={TriangleAlert} className="mt-4" title="Not enough stock for this sale">
              <ul>
                {overStock.map((line) => (
                  <li key={line.sku}>
                    {line.name}: {products.find((p) => p.sku === line.sku)?.onHand ?? 0} in stock, {line.qty} in the basket
                  </li>
                ))}
              </ul>
              <AppButton size="sm" variant="secondary" className="mt-2" onClick={fitToStock}>
                Match the basket to stock
              </AppButton>
            </Notice>
          )}

          <div className="mt-4">
            <label htmlFor="pos-discount" className="mb-1 block text-xs font-semibold text-slate-700">
              Discount
            </label>
            <SelectInput id="pos-discount" value={discountRate} onChange={(e) => setDiscountRate(Number(e.target.value))}>
              {DISCOUNTS.map((d) => (
                <option key={d.rate} value={d.rate}>
                  {d.label}
                </option>
              ))}
            </SelectInput>
          </div>

          <dl className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Subtotal</dt>
              <dd className="tabular-nums">{money(totals.subtotal)}</dd>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between">
                <dt className="text-slate-600">Discount</dt>
                <dd className="tabular-nums">−{money(totals.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-600">Sales tax ({(STORE.taxRate * 100).toFixed(2)}%)</dt>
              <dd className="tabular-nums">{money(totals.tax)}</dd>
            </div>
            <div className="flex justify-between text-lg font-bold text-slate-900">
              <dt>Total</dt>
              <dd className="tabular-nums">{money(totals.total)}</dd>
            </div>
          </dl>

          <div className="mt-4">
            <p className="mb-1 text-xs font-semibold text-slate-700">Payment</p>
            <Segmented
              label="Payment method"
              value={payment}
              onChange={setPayment}
              className="w-full"
              options={[
                { value: 'Card', label: 'Card', icon: CreditCard },
                { value: 'Cash', label: 'Cash', icon: Banknote },
                { value: 'Mobile wallet', label: 'Wallet', icon: Smartphone },
              ]}
            />
          </div>

          {payment === 'Cash' && lines.length > 0 && (
            <div className="mt-3">
              <label htmlFor="pos-cash" className="mb-1 block text-xs font-semibold text-slate-700">
                Cash received
              </label>
              <TextInput id="pos-cash" type="number" inputMode="decimal" min={0} step={0.01} value={cash} onChange={(e) => setCash(e.target.value)} placeholder="0.00" />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {quickCash.map((value, i) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCash(value.toFixed(2))}
                    className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-200"
                  >
                    {i === 0 ? 'Exact' : money(value)}
                  </button>
                ))}
              </div>
              {tendered >= totals.total && (
                <p className="mt-2 text-sm font-semibold text-emerald-800">Change due: {money(round2(tendered - totals.total))}</p>
              )}
            </div>
          )}

          {payment !== 'Cash' && lines.length > 0 && (
            <Notice tone="neutral" className="mt-3">
              Demo till: the {payment === 'Card' ? 'card reader' : 'wallet payment'} is simulated and approves straight away.
            </Notice>
          )}

          <AppButton className="mt-4 h-12! w-full text-base!" onClick={complete} disabled={!lines.length || cashShort || overStock.length > 0}>
            {lines.length ? `Charge ${money(totals.total)}` : 'Charge'}
          </AppButton>
        </div>
      </section>
    </div>
  )
}
