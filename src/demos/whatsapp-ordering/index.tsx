import { BookOpen, ClipboardList, Package, ShoppingBasket, Wheat } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../../components/toast-context'
import { duration, money, num, round2 } from '../../lib/format'
import { usePersistentState } from '../../lib/storage'
import { useDemoClock } from '../../lib/time'
import { useDemoMetrics } from '../metrics'
import { DemoAppShell, type DemoScreen } from '../shell'
import { CatalogueScreen } from './CatalogueScreen'
import { AREAS, EMPTY_DETAILS, createInitialState } from './data'
import { nextStatus, statusMessage } from './message'
import { OrderScreen, type Stage } from './OrderScreen'
import { OrdersScreen, ProductsScreen } from './ShopScreens'
import type { Details, Order, OrderingState, Product } from './types'

const SLUG = 'whatsapp-ordering'
const ACCENT = { base: '#7e22ce', strong: '#6b21a8', soft: '#faf5ff', ink: '#581c87' }

type ScreenId = 'catalogue' | 'order' | 'orders' | 'products'

export default function WhatsAppOrderingDemo() {
  const clock = useDemoClock(10, 40)
  const toast = useToast()
  const [state, setState] = usePersistentState<OrderingState>(`${SLUG}.state`, createInitialState, { version: 1, freshDaily: true })
  const [screen, setScreen] = useState<ScreenId>('catalogue')
  const [stage, setStage] = useState<Stage>('details')
  const [draft, setDraft] = useState<Order | null>(null)
  const [placedRef, setPlacedRef] = useState<string | null>(null)

  const { products, cart, details, orders } = state
  const lineTotal = (productId: string, choiceId: string | undefined, qty: number) => {
    const product = products.find((p) => p.id === productId)
    const delta = product?.option?.choices.find((c) => c.id === choiceId)?.delta ?? 0
    return qty * ((product?.price ?? 0) + delta)
  }
  const itemCount = cart.reduce((n, l) => n + l.qty, 0)
  const subtotal = round2(cart.reduce((sum, l) => sum + lineTotal(l.productId, l.choiceId, l.qty), 0))

  const add = (productId: string, choiceId?: string) => {
    const key = `${productId}:${choiceId ?? ''}`
    setState((s) => {
      const existing = s.cart.find((l) => l.key === key)
      const nextCart = existing
        ? s.cart.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l))
        : [...s.cart, { key, productId, choiceId, qty: 1 }]
      return { ...s, cart: nextCart }
    })
    if (stage !== 'details') setStage('details')
  }

  const setQty = (key: string, qty: number) =>
    setState((s) => ({ ...s, cart: qty <= 0 ? s.cart.filter((l) => l.key !== key) : s.cart.map((l) => (l.key === key ? { ...l, qty } : l)) }))

  const buildOrder = (d: Details): Order => {
    const lines = cart.map((l) => {
      const product = products.find((p) => p.id === l.productId)!
      const choice = product.option?.choices.find((c) => c.id === l.choiceId)
      return { name: choice ? `${product.name} (${choice.label})` : product.name, qty: l.qty, unitPrice: product.price + (choice?.delta ?? 0) }
    })
    const fee = d.method === 'delivery' ? (AREAS.find((a) => a.name === d.area)?.fee ?? 0) : 0
    return {
      id: `o-${state.nextRef}`,
      ref: `JR-${state.nextRef}`,
      at: clock(),
      customer: d.name.trim(),
      method: d.method,
      area: d.method === 'delivery' ? d.area : undefined,
      address:
        d.method === 'delivery'
          ? d.address.trim().toLowerCase().includes(d.area.toLowerCase())
            ? d.address.trim()
            : `${d.address.trim()}, ${d.area}`
          : undefined,
      time: d.time,
      payment: d.payment,
      notes: d.notes.trim() || undefined,
      lines,
      subtotal,
      deliveryFee: fee,
      total: round2(subtotal + fee),
      status: 'New',
      updates: [],
      mine: true,
    }
  }

  const preview = (d: Details) => {
    setState((s) => ({ ...s, details: d }))
    setDraft(buildOrder(d))
    setStage('preview')
  }

  const place = (viaWhatsApp: boolean) => {
    if (!draft) return
    const order = { ...draft, at: clock() }
    setState((s) => ({ ...s, orders: [order, ...s.orders], cart: [], nextRef: s.nextRef + 1, details: { ...EMPTY_DETAILS, name: s.details.name } }))
    setPlacedRef(order.ref)
    setStage('placed')
    setDraft(null)
    toast(
      viaWhatsApp
        ? `Order ${order.ref} placed. WhatsApp opened with your demo order for LIFELINE.`
        : `Order ${order.ref} placed in the shop dashboard.`,
      'success',
    )
  }

  const advance = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId)
    if (!order) return
    const status = nextStatus(order)
    if (!status) return
    const text = statusMessage(order, status)
    setState((s) => ({
      ...s,
      orders: s.orders.map((o) => (o.id === orderId ? { ...o, status, updates: [...o.updates, { at: clock(), text }] } : o)),
    }))
    toast(`${order.ref} is now “${status}”. WhatsApp update sent to ${order.customer}.`, 'success')
  }

  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text).then(
      () => toast('Copied. You can paste it into any chat.', 'info'),
      () => toast('Copying isn’t allowed in this browser. Select the text instead.', 'warning'),
    )
  }

  const updateProduct = (product: Product) =>
    setState((s) => ({
      ...s,
      products: s.products.map((p) => (p.id === product.id ? product : p)),
      cart: product.available ? s.cart : s.cart.filter((l) => l.productId !== product.id),
    }))

  const sales = orders.reduce((sum, o) => sum + o.total, 0)
  const waiting = orders.filter((o) => o.status === 'New').length

  useDemoMetrics([
    { label: 'WhatsApp orders today', value: num(orders.length), detail: 'No phone calls or typing' },
    { label: 'Sales today', value: money(sales), detail: `Average order ${money(orders.length ? sales / orders.length : 0)}` },
    { label: 'Waiting to confirm', value: num(waiting), detail: 'Confirm in one tap from Shop orders' },
    { label: 'Order-taking time saved (est.)', value: duration(orders.length * 4), detail: 'About 4 minutes per order taken by phone' },
  ])

  const screens: DemoScreen<ScreenId>[] = [
    { id: 'catalogue', label: 'Menu', icon: BookOpen, audience: 'customer' },
    { id: 'order', label: 'Your order', icon: ShoppingBasket, audience: 'customer', badge: itemCount || undefined },
    { id: 'orders', label: 'Shop orders', icon: ClipboardList, audience: 'team', badge: waiting || undefined },
    { id: 'products', label: 'Products', icon: Package, audience: 'team' },
  ]

  return (
    <DemoAppShell
      slug={SLUG}
      business={{ name: 'Jacaranda & Rye Bakehouse', descriptor: 'Bakery and café · Avondale, Harare', icon: Wheat }}
      accent={ACCENT}
      screens={screens}
      active={screen}
      onChange={(id) => {
        if (id === 'order' && stage === 'placed') setStage('details')
        setScreen(id)
      }}
      headerRight={
        <span className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 sm:inline-flex">
          <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
          Taking orders
        </span>
      }
    >
      {screen === 'catalogue' && (
        <CatalogueScreen
          products={products}
          cart={cart}
          itemCount={itemCount}
          subtotal={subtotal}
          onAdd={add}
          onSetQty={setQty}
          onReview={() => {
            setStage('details')
            setScreen('order')
          }}
        />
      )}
      {screen === 'order' && (
        <OrderScreen
          products={products}
          cart={cart}
          details={details}
          draft={draft}
          stage={stage}
          placedRef={placedRef}
          onSetQty={setQty}
          onDetails={(d) => setState((s) => ({ ...s, details: d }))}
          onPreview={preview}
          onBack={() => setStage('details')}
          onPlace={place}
          onCopy={copy}
          onBrowse={() => {
            setStage('details')
            setScreen('catalogue')
          }}
          onSeeShop={() => setScreen('orders')}
        />
      )}
      {screen === 'orders' && <OrdersScreen orders={orders} onAdvance={advance} onCopy={copy} />}
      {screen === 'products' && <ProductsScreen products={products} onUpdate={updateProduct} />}
    </DemoAppShell>
  )
}
