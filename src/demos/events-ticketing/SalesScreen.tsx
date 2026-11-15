import { Armchair, Banknote, Percent, Sparkles, Ticket as TicketIcon } from 'lucide-react'
import { clockTime, money, moneyWhole, num, pct } from '../../lib/format'
import { todayAt } from '../../lib/time'
import { Badge, BarChart, Notice, Panel, Stat } from '../ui'
import { FESTIVAL, RECENT_ORDERS, TYPE, TYPES } from './data'
import { payLabel, type salesSummary, zig } from './engine'
import { Meter } from './parts'
import type { Order } from './types'

interface Props {
  summary: ReturnType<typeof salesSummary>
  orders: Order[]
}

export function SalesScreen({ summary: s, orders }: Props) {
  const totalOrders = s.payments.reduce((sum, p) => sum + p.orders, 0)
  const recent = [
    ...[...orders].reverse().map((o) => ({
      key: o.id,
      name: o.buyer.name,
      at: o.at,
      summary: o.lines.map((l) => `${l.qty} × ${TYPE[l.type].name}`).join(', ') + (o.promo ? ` (${o.promo})` : ''),
      total: o.total,
      payment: o.payment,
      yours: true,
    })),
    ...RECENT_ORDERS.map((o) => ({ key: o.name, name: o.name, at: todayAt(...o.at), summary: o.summary, total: o.total, payment: o.payment, yours: false })),
  ].slice(0, 6)

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={TicketIcon}
          label="Tickets sold"
          value={num(s.totalSold)}
          detail={`${pct((s.totalSold / FESTIVAL.totalCapacity) * 100)} of capacity`}
          tone="accent"
        />
        <Stat icon={Banknote} label="Revenue" value={moneyWhole(s.revenue)} detail={`${zig(s.revenue, true)} at the sample rate`} tone="green" />
        <Stat icon={Armchair} label="Capacity left" value={num(s.capacityLeft)} detail={`Out of ${num(FESTIVAL.totalCapacity)} places`} />
        <Stat icon={Percent} label="Promo code uses" value={num(s.promoUses)} detail={`MSASA10 · ${money(s.promoSaved)} off`} tone="amber" />
      </div>

      <Notice tone="accent" icon={Sparkles}>
        Early bird sold out in {s.earlyDays} days. The busiest week so far started {s.busiest.label}, with {num(s.busiest.value)} tickets
        {s.visitorTickets ? `, and today includes your ${s.visitorTickets} ${s.visitorTickets === 1 ? 'ticket' : 'tickets'}` : ''}.
      </Notice>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Sales per week" description="Tickets sold each week since sales opened. The last bar is this week.">
          <BarChart data={s.weeks} format={(v) => `${num(v)} tickets`} label="Tickets sold per week" />
        </Panel>
        <Panel title="Sales by ticket type" description="Sold out of capacity">
          <ul className="space-y-3">
            {TYPES.map((t) => {
              const sold = s.sold[t.id]
              const full = sold >= t.capacity
              return (
                <li key={t.id}>
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                    <span className="flex items-center gap-2 text-slate-800">
                      {t.name}
                      {full && <Badge tone="red">Sold out</Badge>}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {num(sold)} <span className="font-normal text-slate-600">of {num(t.capacity)}</span>
                    </span>
                  </div>
                  <div className="mt-1">
                    <Meter value={sold} max={t.capacity} label={`${t.name} sold`} muted={full} />
                  </div>
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Payment methods" description={`${num(totalOrders)} online orders`}>
          <ul className="space-y-3">
            {s.payments.map((p) => (
              <li key={p.id}>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-slate-800">{p.label}</span>
                  <span className="font-semibold tabular-nums">
                    {pct(totalOrders ? (p.orders / totalOrders) * 100 : 0)}{' '}
                    <span className="font-normal text-slate-600">({num(p.orders)})</span>
                  </span>
                </div>
                <div className="mt-1">
                  <Meter value={p.orders} max={totalOrders} label={`${p.label} share of orders`} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Latest orders" bodyClassName="py-1!">
          <ul className="divide-y divide-slate-100">
            {recent.map((o) => (
              <li key={o.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                <span className="w-12 shrink-0 text-slate-600 tabular-nums">{clockTime(o.at)}</span>
                <span className="min-w-0 flex-1 basis-40">
                  <span className="font-medium text-slate-900">{o.name}</span>
                  {o.yours && (
                    <Badge tone="accent" className="ml-2">
                      You
                    </Badge>
                  )}
                  <span className="block text-xs text-slate-600">
                    {o.summary} · {payLabel(o.payment)}
                  </span>
                </span>
                <span className="font-semibold tabular-nums">{money(o.total)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
