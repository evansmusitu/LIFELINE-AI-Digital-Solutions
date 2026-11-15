import { Banknote, ClipboardList, Percent, Receipt as ReceiptIcon, ShoppingBag, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { clockTime, money, round2 } from '../../lib/format'
import { AppButton, BarChart, Modal, Panel, Stat } from '../ui'
import { STORE, salesSummary } from './data'
import { Receipt } from './parts'
import type { Payment, Sale } from './types'

const PAYMENTS: Payment[] = ['Card', 'Cash', 'Mobile wallet']

export function SalesScreen({ sales, now }: { sales: Sale[]; now: number }) {
  const [receipt, setReceipt] = useState<Sale | null>(null)
  const [eod, setEod] = useState(false)
  const s = salesSummary(sales)
  const hourNow = new Date(now).getHours()

  const hours = Array.from({ length: 11 }, (_, i) => 8 + i)
  const byHour = hours.map((h) => ({
    label: h <= 12 ? `${h === 12 ? 12 : h}${h < 12 ? 'a' : 'p'}` : `${h - 12}p`,
    value: round2(sales.filter((x) => new Date(x.at).getHours() === h).reduce((sum, x) => sum + x.total, 0)),
    muted: h > hourNow,
  }))

  const products = new Map<string, { name: string; qty: number; revenue: number }>()
  for (const sale of sales)
    for (const line of sale.lines) {
      const entry = products.get(line.sku) ?? { name: line.name, qty: 0, revenue: 0 }
      entry.qty += line.qty
      entry.revenue += line.qty * line.price
      products.set(line.sku, entry)
    }
  const top = [...products.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  const mix = PAYMENTS.map((p) => {
    const list = sales.filter((x) => x.payment === p)
    return { payment: p, count: list.length, amount: round2(list.reduce((sum, x) => sum + x.total, 0)) }
  })
  const cash = sales.filter((x) => x.payment === 'Cash')
  const expectedCash = round2(STORE.openingFloat + cash.reduce((sum, x) => sum + x.total, 0))
  const recent = [...sales].sort((a, b) => b.at - a.at).slice(0, 8)

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={TrendingUp} label="Sales today" value={money(s.total)} detail={`${money(s.tax)} of it is sales tax`} tone="accent" />
        <Stat icon={ShoppingBag} label="Transactions" value={sales.length} detail={`${s.items} items sold`} />
        <Stat icon={ReceiptIcon} label="Average sale" value={money(sales.length ? s.total / sales.length : 0)} />
        <Stat icon={Percent} label="Gross margin" value={`${s.margin.toFixed(1)}%`} detail="After discounts, before tax" tone="green" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Sales by hour" description="Today, including sales tax" action={<AppButton variant="secondary" size="sm" icon={ClipboardList} onClick={() => setEod(true)}>End-of-day summary</AppButton>}>
          <BarChart data={byHour} format={money} label="Sales by hour today" />
        </Panel>
        <Panel title="Payment mix">
          <ul className="space-y-3">
            {mix.map((m) => (
              <li key={m.payment}>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">
                    {m.payment} <span className="text-slate-500">({m.count})</span>
                  </span>
                  <span className="font-semibold tabular-nums">{money(m.amount)}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-slate-100" aria-hidden="true">
                  <div className="h-full rounded-full bg-(--accent)" style={{ width: `${s.total ? (m.amount / s.total) * 100 : 0}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Top sellers today" description="By revenue">
          <ol className="divide-y divide-slate-100">
            {top.map((p, i) => (
              <li key={p.name} className="flex items-center gap-3 py-2 text-sm">
                <span className="grid size-6 place-items-center rounded-full bg-(--accent-soft) text-xs font-bold text-(--accent-ink)">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-slate-800">{p.name}</span>
                <span className="text-slate-600 tabular-nums">× {p.qty}</span>
                <span className="w-20 text-right font-semibold tabular-nums">{money(p.revenue)}</span>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel title="Recent sales">
          <ul className="divide-y divide-slate-100">
            {recent.map((sale) => (
              <li key={sale.id}>
                <button type="button" onClick={() => setReceipt(sale)} className="flex w-full items-center gap-3 py-2 text-left text-sm hover:bg-slate-50">
                  <span className="w-16 shrink-0 whitespace-nowrap text-slate-600 tabular-nums">{clockTime(sale.at, 'en-US')}</span>
                  <span className="min-w-0 flex-1 truncate text-slate-800">
                    #{sale.number} · {sale.lines.map((l) => l.name).join(', ')}
                  </span>
                  <span className="text-xs text-slate-600">{sale.payment}</span>
                  <span className="w-20 text-right font-semibold tabular-nums">{money(sale.total)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Modal open={Boolean(receipt)} onClose={() => setReceipt(null)} title={receipt ? `Receipt #${receipt.number}` : 'Receipt'} size="sm">
        {receipt && <Receipt sale={receipt} />}
      </Modal>

      <Modal open={eod} onClose={() => setEod(false)} title="End-of-day summary" description={new Date(now).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}>
        <dl className="space-y-2 text-sm">
          {[
            ['Gross sales (incl. tax)', money(s.total)],
            ['Discounts given', money(s.discounts)],
            ['Sales tax collected', money(s.tax)],
            ['Net sales', money(s.net)],
            ['Transactions', String(sales.length)],
            ['Items sold', String(s.items)],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <dt className="text-slate-600">{label}</dt>
              <dd className="font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
          <p className="flex items-center gap-2 font-semibold text-slate-900">
            <Banknote className="size-4" aria-hidden="true" />
            Cash drawer
          </p>
          <p className="mt-1 text-slate-700">
            Opening float {money(STORE.openingFloat)} + cash sales {money(expectedCash - STORE.openingFloat)} ={' '}
            <span className="font-semibold">{money(expectedCash)}</span> expected in the drawer.
          </p>
        </div>
        <p className="mt-3 text-xs text-slate-600">In a live system this report is emailed to the owner at closing time.</p>
      </Modal>
    </div>
  )
}
