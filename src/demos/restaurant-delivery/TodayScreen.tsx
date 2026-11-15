import { Banknote, Bike, Mail, ShoppingBag, ThumbsDown, ThumbsUp, Timer, TriangleAlert } from 'lucide-react'
import { duration, money, num, pct } from '../../lib/format'
import { AppButton, BarChart, Panel, Stat } from '../ui'
import { BUSINESS } from './data'
import type { DaySummary } from './engine'
import type { Order } from './types'

interface Props {
  summary: DaySummary
  orders: Order[]
  now: number
  onEmail: () => void
}

export function TodayScreen({ summary: s, orders, now, onEmail }: Props) {
  const hourNow = new Date(now).getHours()
  const chart = s.byHour.map((h) => ({ label: String(h.hour), value: h.count, muted: h.hour > hourNow }))
  const maxChannel = Math.max(1, ...s.channels.map((c) => c.count))
  const upPct = s.ratings.total ? (s.ratings.up / s.ratings.total) * 100 : 0
  const yours = orders.filter((o) => o.mine && o.rating).at(-1)

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={ShoppingBag} label="Orders today" value={num(s.count)} detail={`${s.tonight.count} since 17:00`} tone="accent" />
        <Stat icon={Banknote} label="Sales today" value={money(s.sales)} detail={`Average order ${money(s.averageOrder)}`} tone="green" />
        <Stat icon={Timer} label="Average ticket time" value={duration(s.avgTicket)} detail="Received to ready" />
        <Stat icon={Bike} label="Average delivery time" value={duration(s.avgDelivery)} detail="Order to door" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Orders by hour"
          description="11:00 to 23:00. Later hours fill in as the night goes on."
          action={
            <AppButton variant="secondary" size="sm" icon={Mail} onClick={onEmail}>
              Email tonight’s summary
            </AppButton>
          }
        >
          <BarChart data={chart} format={(v) => `${v} ${v === 1 ? 'order' : 'orders'}`} label="Orders by hour today" />
        </Panel>
        <Panel title="Channel mix" description="Where today’s orders came from">
          <ul className="space-y-3">
            {s.channels.map((c) => (
              <li key={c.channel}>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">{c.channel}</span>
                  <span className="font-semibold tabular-nums">
                    {c.count} <span className="font-normal text-slate-600">({pct(s.count ? (c.count / s.count) * 100 : 0)})</span>
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-slate-100" aria-hidden="true">
                  <div className="h-full rounded-full bg-(--accent)" style={{ width: `${(c.count / maxChannel) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Top 5 dishes" description="By portions sold today">
          <ol className="divide-y divide-slate-100">
            {s.top.map((d, i) => (
              <li key={d.name} className="flex items-center gap-3 py-2 text-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-(--accent-soft) text-xs font-bold text-(--accent-ink)">{i + 1}</span>
                <span className="min-w-0 flex-1 text-slate-800">{d.name}</span>
                <span className="font-semibold tabular-nums">× {d.qty}</span>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel title="Ratings and late orders" description="Thumbs up or down after each delivery or pickup">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-900">
                <ThumbsUp className="size-4" aria-hidden="true" />
                Thumbs up
              </p>
              <p className="mt-1 text-xl font-bold text-emerald-900 tabular-nums">{pct(upPct)}</p>
              <p className="text-xs text-emerald-900">
                {s.ratings.up} of {s.ratings.total} rated orders
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-amber-900">
                <TriangleAlert className="size-4" aria-hidden="true" />
                Late orders
              </p>
              <p className="mt-1 text-xl font-bold text-amber-900 tabular-nums">{s.late}</p>
              <p className="text-xs text-amber-900">Past the time the customer was given</p>
            </div>
          </div>
          {yours?.rating && (
            <p className="mt-3 flex items-start gap-2 text-sm text-slate-700">
              {yours.rating.up ? (
                <ThumbsUp className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden="true" />
              ) : (
                <ThumbsDown className="mt-0.5 size-4 shrink-0 text-red-700" aria-hidden="true" />
              )}
              <span className="min-w-0 break-words">
                Your rating for {yours.number}: thumbs {yours.rating.up ? 'up' : 'down'}
                {yours.rating.comment ? `, “${yours.rating.comment}”` : ''}
              </span>
            </p>
          )}
          <p className="mt-3 text-xs text-slate-600">At closing, this summary goes to {BUSINESS.manager.name} by email automatically.</p>
        </Panel>
      </div>
    </div>
  )
}
