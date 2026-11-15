import { CircleX, DoorOpen, Repeat, ShieldAlert, TriangleAlert, UserCheck, type LucideIcon } from 'lucide-react'
import { clockTime, num, pct } from '../../lib/format'
import { Badge, Panel, Stat } from '../ui'
import { GATES, TYPES } from './data'
import type { checkinSummary } from './engine'
import { Meter, ScanBadge, SlotChart } from './parts'
import type { ScanRecord, TypeId } from './types'

interface Props {
  summary: ReturnType<typeof checkinSummary>
  sold: Record<TypeId, number>
  totalSold: number
  scans: ScanRecord[]
  gateNow: number
}

export function CheckinScreen({ summary, sold, totalSold, scans, gateNow }: Props) {
  const share = totalSold ? (summary.total / totalSold) * 100 : 0
  const problems = scans.filter((s) => s.kind !== 'valid').sort((a, b) => b.at - a.at).slice(0, 5)
  const stopped = summary.duplicates + summary.invalid + summary.wrongGate
  const alerts: { icon: LucideIcon; label: string; value: number; detail: string }[] = [
    { icon: Repeat, label: 'Duplicate scan attempts', value: summary.duplicates, detail: 'A code that was already used. Sent to the help desk.' },
    { icon: CircleX, label: 'Invalid tickets', value: summary.invalid, detail: 'Fake, edited or transferred codes.' },
    {
      icon: TriangleAlert,
      label: 'Wrong gate',
      value: summary.wrongGate,
      detail: summary.overrides ? `Sent to the right gate. ${summary.overrides} let in anyway.` : 'Sent to the right gate.',
    },
  ]

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="blue">Festival day view (sample)</Badge>
        <p className="text-sm text-slate-600">Gates opened at 11:00. Now {clockTime(gateNow)}. Scans from the Scanner tab add up here.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={UserCheck} label="Checked in" value={num(summary.total)} detail={`of ${num(totalSold)} sold`} tone="accent" />
        {GATES.map((g) => (
          <Stat key={g.id} icon={DoorOpen} label={g.label} value={num(summary.byGate[g.id])} detail={g.detail} />
        ))}
        <Stat icon={ShieldAlert} label="Stopped at the gate" value={num(stopped)} detail="Duplicates, fakes, wrong gate" tone="red" />
      </div>

      <Panel title="Checked in so far">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <p className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
            {num(summary.total)} <span className="text-base font-medium text-slate-600">of {num(totalSold)}</span>
          </p>
          <p className="text-sm font-semibold text-slate-700">{pct(share)} of ticket holders are in</p>
        </div>
        <div className="mt-3">
          <Meter value={summary.total} max={totalSold} label="Ticket holders checked in" />
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Arrivals per 15 minutes" description="The outlined bar is the current 15 minutes, with its count so far.">
          <SlotChart data={summary.series} label="Arrivals per 15 minutes since the gates opened" />
        </Panel>
        <Panel title="By ticket type" description="Checked in, out of tickets sold">
          <ul className="space-y-3">
            {TYPES.map((t) => (
              <li key={t.id}>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-slate-800">{t.name}</span>
                  <span className="font-semibold tabular-nums">
                    {num(summary.byType[t.id])} <span className="font-normal text-slate-600">of {num(sold[t.id])}</span>
                  </span>
                </div>
                <div className="mt-1">
                  <Meter value={summary.byType[t.id]} max={sold[t.id]} label={`${t.name} checked in`} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Alerts" description="Problems the scanners caught today">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {alerts.map((a) => (
            <li key={a.label} className="rounded-lg border border-slate-200 p-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <a.icon className="size-4 text-red-700" aria-hidden="true" />
                {a.label}
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{num(a.value)}</p>
              <p className="text-xs text-slate-600">{a.detail}</p>
            </li>
          ))}
        </ul>
        {problems.length > 0 && (
          <>
            <p className="mt-4 mb-1 text-xs font-semibold text-slate-700">Latest</p>
            <ul className="divide-y divide-slate-100">
              {problems.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-2 text-sm">
                  <span className="w-12 shrink-0 text-slate-600 tabular-nums">{clockTime(s.at)}</span>
                  <ScanBadge kind={s.kind} override={s.override} />
                  <span className="min-w-0 flex-1 basis-32 truncate text-slate-800">
                    <span className="font-mono text-xs">{s.code}</span> · Gate {s.gate}
                    {s.holder && <span className="text-slate-600"> · {s.holder}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </div>
  )
}
