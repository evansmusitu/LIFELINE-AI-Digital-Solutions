import { CalendarCheck, Globe, ShieldCheck, UserX } from 'lucide-react'
import { firstName, hoursLabel, moneyWhole, num, pct } from '../../lib/format'
import { BarChart, Badge, Panel, Stat } from '../ui'
import { depositsHeld, noShowsThisMonth, weekStats } from './engine'
import { BEFORE_DEPOSITS, monthSoFar } from './data'
import { GROUP_STYLE } from './theme'
import type { Appointment } from './types'

export function ReportsScreen({ appointments, now }: { appointments: Appointment[]; now: number }) {
  const w = weekStats(appointments, now)
  const held = depositsHeld(appointments)
  const month = monthSoFar(now)
  const noShows = month.noShows + noShowsThisMonth(appointments, now)
  const seen = month.visits + appointments.filter((a) => a.status === 'Completed').length + noShowsThisMonth(appointments, now)
  const noShowRate = seen ? (noShows / seen) * 100 : 0
  const maxRevenue = Math.max(1, ...w.revenue.map((r) => r.value))
  const totalRevenue = w.revenue.reduce((sum, r) => sum + r.value, 0)
  const byHour = w.byHour.map((value, i) => ({ label: String(i * 2).padStart(2, '0'), value, muted: i * 2 < 18 }))

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={CalendarCheck} label="Bookings this week" value={num(w.week.length)} detail={`${w.online.length} made online`} tone="accent" />
        <Stat icon={Globe} label="Online bookings" value={pct(w.onlinePct)} detail={`${w.online.length} of ${w.week.length} bookings`} tone="green" />
        <Stat icon={ShieldCheck} label="Deposits held" value={moneyWhole(held.amount)} detail={`Protecting ${held.count} bookings`} />
        <Stat
          icon={UserX}
          label="No-show rate this month"
          value={pct(noShowRate, 1)}
          detail={
            <span className="flex flex-wrap items-center gap-1.5">
              Was {BEFORE_DEPOSITS.noShowRate}% before deposits <Badge>Sample</Badge>
            </span>
          }
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Booked revenue by service group" description={`This week · ${moneyWhole(totalRevenue)} in total`}>
          <ul className="space-y-3">
            {w.revenue.map((r) => (
              <li key={r.group}>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-slate-800">
                    <span className={`size-2.5 rounded-sm ${GROUP_STYLE[r.group].swatch}`} aria-hidden="true" />
                    {r.group}
                  </span>
                  <span className="font-semibold tabular-nums">{moneyWhole(r.value)}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-slate-100" aria-hidden="true">
                  <div className={`h-full rounded-full ${GROUP_STYLE[r.group].swatch}`} style={{ width: `${(r.value / maxRevenue) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Staff utilisation this week" description="Booked so far, today and the next 6 open days">
          <ul className="space-y-3">
            {w.staff.map((s) => (
              <li key={s.staff.id}>
                <div className="flex flex-wrap justify-between gap-x-3 text-sm">
                  <span className="text-slate-800">{firstName(s.staff.name)}</span>
                  <span className="text-slate-700 tabular-nums">
                    <span className="font-semibold text-slate-900">{s.pct}%</span> · {hoursLabel(s.booked)} of {hoursLabel(s.available)}
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-slate-100" aria-hidden="true">
                  <div className="h-full rounded-full bg-(--accent)" style={{ width: `${Math.min(100, s.pct)}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-600">Later days fill up as clients book. Today is usually the fullest.</p>
        </Panel>
      </div>

      <Panel title="When online bookings are made" description="This week’s online bookings by the hour they came in">
        <p className="mb-3 text-sm text-slate-800">
          <span className="font-semibold">{w.eveningPct}% of online bookings were made after 18:00</span>, when the salon is closed and nobody could
          answer the phone.
        </p>
        <BarChart data={byHour} format={(v) => `${v} ${v === 1 ? 'booking' : 'bookings'}`} label="Online bookings by the hour they were made, in two-hour blocks" />
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600" aria-hidden="true">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-(--accent)" />
            After 18:00
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-slate-200" />
            During the day
          </span>
          <span>Each bar is two hours, starting at the time shown.</span>
        </p>
      </Panel>
    </div>
  )
}
