import { BarChart3, Boxes, Hammer, PackagePlus, ScanBarcode } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../../components/toast-context'
import { duration, money, num } from '../../lib/format'
import { usePersistentState } from '../../lib/storage'
import { uid, useDemoClock, useTicker } from '../../lib/time'
import { useDemoMetrics } from '../metrics'
import { DemoAppShell, type DemoScreen } from '../shell'
import { AppButton, Modal, TextInput } from '../ui'
import { CheckoutScreen, type CartItem } from './CheckoutScreen'
import { STORE, SUPPLIERS, createInitialState, priceSale, salesSummary, stockStatus } from './data'
import { InventoryScreen } from './InventoryScreen'
import { Receipt } from './parts'
import { ReorderScreen } from './ReorderScreen'
import { SalesScreen } from './SalesScreen'
import type { Payment, PoLine, PosState, Sale, SaleLine } from './types'

const SLUG = 'inventory-pos'
const ACCENT = { base: '#c2410c', strong: '#9a3412', soft: '#fff7ed', ink: '#7c2d12' }

type ScreenId = 'checkout' | 'inventory' | 'reorder' | 'sales'

export default function InventoryPosDemo() {
  const clock = useDemoClock(15, 10)
  const now = useTicker(clock)
  const toast = useToast()
  const [state, setState] = usePersistentState<PosState>(`${SLUG}.state`, createInitialState, { version: 1, freshDaily: true })
  const [screen, setScreen] = useState<ScreenId>('checkout')
  const [cart, setCart] = useState<CartItem[]>([])
  const [receipt, setReceipt] = useState<Sale | null>(null)
  const [email, setEmail] = useState('')

  const { products, sales, orders } = state

  const completeSale = (lines: SaleLine[], discountRate: number, payment: Payment, tendered?: number) => {
    const short = lines.find((l) => l.qty > (products.find((p) => p.sku === l.sku)?.onHand ?? 0))
    if (short) {
      toast(`Not enough ${short.name} in stock for this sale.`, 'warning')
      return
    }
    const totals = priceSale(lines, discountRate)
    const sale: Sale = {
      id: uid('sale'),
      number: state.nextSale,
      at: clock(),
      lines,
      ...totals,
      payment,
      tendered,
      change: tendered !== undefined ? Math.round((tendered - totals.total) * 100) / 100 : undefined,
      cashier: STORE.cashier,
    }
    const nowLow = products.filter((p) => {
      const sold = lines.find((l) => l.sku === p.sku)?.qty ?? 0
      return sold > 0 && p.onHand > p.reorderPoint && p.onHand - sold <= p.reorderPoint
    })
    setState((s) => ({
      ...s,
      sales: [...s.sales, sale],
      nextSale: s.nextSale + 1,
      products: s.products.map((p) => {
        const sold = lines.find((l) => l.sku === p.sku)?.qty ?? 0
        return sold ? { ...p, onHand: Math.max(0, p.onHand - sold) } : p
      }),
    }))
    setCart([])
    setReceipt(sale)
    for (const p of nowLow) {
      const left = p.onHand - (lines.find((l) => l.sku === p.sku)?.qty ?? 0)
      toast(`Low stock: ${p.name} is down to ${left}. It’s on the Reorder list.`, 'warning')
    }
  }

  const receive = (sku: string, qty: number) => {
    const product = products.find((p) => p.sku === sku)
    setState((s) => ({
      ...s,
      products: s.products.map((p) => (p.sku === sku ? { ...p, onHand: p.onHand + qty } : p)),
      adjustments: [...s.adjustments, { id: uid('adj'), at: clock(), sku, name: product?.name ?? sku, change: qty, reason: 'Received' }],
    }))
    toast(`Received ${qty} × ${product?.name}.`, 'success')
  }

  const adjust = (sku: string, count: number, reason: string) => {
    const product = products.find((p) => p.sku === sku)
    if (!product) return
    setState((s) => ({
      ...s,
      products: s.products.map((p) => (p.sku === sku ? { ...p, onHand: count } : p)),
      adjustments: [...s.adjustments, { id: uid('adj'), at: clock(), sku, name: product.name, change: count - product.onHand, reason }],
    }))
    toast(`${product.name}: stock set to ${count} (${reason.toLowerCase()}).`, 'info')
  }

  const createPo = (supplierId: string, lines: PoLine[]) => {
    const id = uid('po')
    setState((s) => ({
      ...s,
      nextPo: s.nextPo + 1,
      orders: [...s.orders, { id, number: `PO-${s.nextPo}`, supplierId, createdAt: clock(), lines, status: 'Draft' }],
    }))
    return id
  }

  const sendPo = (id: string) => {
    const po = orders.find((o) => o.id === id)
    const supplier = SUPPLIERS.find((s) => s.id === po?.supplierId)
    setState((s) => ({ ...s, orders: s.orders.map((o) => (o.id === id ? { ...o, status: 'Sent', sentAt: clock() } : o)) }))
    toast(`${po?.number ?? 'Purchase order'} emailed to ${supplier?.email ?? 'the supplier'}.`, 'success')
  }

  const receivePo = (id: string) => {
    const po = orders.find((o) => o.id === id)
    if (!po) return
    setState((s) => ({
      ...s,
      orders: s.orders.map((o) => (o.id === id ? { ...o, status: 'Received', receivedAt: clock() } : o)),
      products: s.products.map((p) => {
        const line = po.lines.find((l) => l.sku === p.sku)
        return line ? { ...p, onHand: p.onHand + line.qty } : p
      }),
    }))
    toast(`${po.number} received. Stock levels updated.`, 'success')
  }

  const onOrderSkus = new Set(orders.filter((o) => o.status !== 'Received').flatMap((o) => o.lines.map((l) => l.sku)))
  const alerts = products.filter((p) => stockStatus(p) !== 'ok' && !onOrderSkus.has(p.sku)).length
  const summary = salesSummary(sales)

  useDemoMetrics([
    { label: 'Sales today', value: money(summary.total), detail: `${num(summary.items)} items sold` },
    { label: 'Transactions', value: num(sales.length), detail: `Average ${money(sales.length ? summary.total / sales.length : 0)}` },
    { label: 'Low-stock alerts', value: num(alerts), detail: 'Not yet on a purchase order' },
    { label: 'Admin time saved today (est.)', value: duration(sales.length + 30), detail: 'Stock book and end-of-day count, done for you' },
  ])

  const screens: DemoScreen<ScreenId>[] = [
    { id: 'checkout', label: 'Checkout', icon: ScanBarcode, audience: 'team' },
    { id: 'inventory', label: 'Inventory', icon: Boxes, audience: 'team' },
    { id: 'reorder', label: 'Reorder', icon: PackagePlus, audience: 'team', badge: alerts || undefined },
    { id: 'sales', label: 'Daily sales', icon: BarChart3, audience: 'team' },
  ]

  return (
    <DemoAppShell
      slug={SLUG}
      business={{ name: STORE.name, descriptor: 'Hardware and garden store · Austin, Texas', icon: Hammer }}
      accent={ACCENT}
      screens={screens}
      active={screen}
      onChange={setScreen}
      headerRight={
        <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 sm:inline-flex">
          Till 1 · {STORE.cashier} · {new Date(now).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </span>
      }
    >
      {screen === 'checkout' && (
        <CheckoutScreen products={products} cart={cart} onCart={setCart} onComplete={completeSale} onWarn={(m) => toast(m, 'warning')} />
      )}
      {screen === 'inventory' && <InventoryScreen products={products} onReceive={receive} onAdjust={adjust} />}
      {screen === 'reorder' && <ReorderScreen products={products} orders={orders} onCreate={createPo} onSend={sendPo} onReceive={receivePo} />}
      {screen === 'sales' && <SalesScreen sales={sales} now={now} />}

      <Modal
        open={Boolean(receipt)}
        onClose={() => setReceipt(null)}
        title="Sale complete"
        description={receipt ? `Receipt #${receipt.number} · paid by ${receipt.payment.toLowerCase()}` : undefined}
        size="sm"
        footer={
          <AppButton onClick={() => setReceipt(null)} className="w-full">
            New sale
          </AppButton>
        }
      >
        {receipt && (
          <div className="space-y-4">
            {receipt.change !== undefined && receipt.change > 0 && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-center text-lg font-bold text-emerald-900">Change due: {money(receipt.change)}</p>
            )}
            <Receipt sale={receipt} />
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                  toast('Please enter a valid email address.', 'warning')
                  return
                }
                toast(`Receipt emailed to ${email.trim()} (simulated).`, 'success')
                setEmail('')
              }}
            >
              <label htmlFor="receipt-email" className="sr-only">
                Customer email for the receipt
              </label>
              <TextInput id="receipt-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email the receipt" />
              <AppButton type="submit" variant="secondary">
                Send
              </AppButton>
            </form>
          </div>
        )}
      </Modal>
    </DemoAppShell>
  )
}
