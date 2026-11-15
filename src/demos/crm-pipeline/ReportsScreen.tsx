import { Percent, Timer, TrendingUp, Trophy } from 'lucide-react'
import { cn } from '../../lib/cn'
import { moneyWhole } from '../../lib/format'
import { td, th } from '../styles'
import { Panel, Stat } from '../ui'
import { OPEN_STAGES, OWNERS, OWNER_IDS, SOURCES, avgDaysToClose, dayDiff, forecast, isOpen, monthly, openTasks, quarterStart, stageTotals, winRate } from './engine'
import { OwnerChip } from './parts'
import type { CrmState } from './types'

function Bar({ share, muted }: { share: number; muted?: boolean }) {
  return (
    <div className="mt-1 h-2 rounded-full bg-slate-100" aria-hidden="true">
      <div className={cn('h-full rounded-full', muted ? 'bg-slate-400' : 'bg-(--accent)')} style={{ width: `${Math.min(100, share * 100)}%` }} />
    </div>
  )
}

export function ReportsScreen({ state, now }: { state: CrmState; now: number }) {
  const { deals, tasks } = state
  const q0 = quarterStart(now)
  const f = forecast(deals)
  const wr = winRate(deals, q0)
  const won = deals.filter((d) => d.stage === 'won' && (d.closedAt ?? 0) >= q0)
  const avg = avgDaysToClose(deals, q0)
  const byStage = stageTotals(deals).filter((t) => OPEN_STAGES.includes(t.stage))
  const maxStage = Math.max(1, ...byStage.map((t) => t.value))

  const sources = SOURCES.map((source) => {
    const list = deals.filter((d) => d.source === source)
    const r = winRate(list, 0)
    return { source, count: list.length, open: list.filter(isOpen).length, ...r }
  })
  const maxSource = Math.max(1, ...sources.map((s) => s.count))

  const overdue = openTasks(tasks).filter((t) => dayDiff(t.due, now) < 0)
  const people = OWNER_IDS.map((id) => {
    const open = deals.filter((d) => d.owner === id && isOpen(d))
    return {
      id,
      open: open.length,
      value: open.reduce((n, d) => n + d.value, 0),
      won: won.filter((d) => d.owner === id).length,
      overdue: overdue.filter((t) => t.owner === id).length,
    }
  })

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={TrendingUp} label="Open pipeline" value={monthly(f.open)} detail={`${moneyWhole(f.weighted)} weighted`} tone="accent" />
        <Stat icon={Trophy} label="Won this quarter" value={won.length} detail={`${monthly(won.reduce((n, d) => n + d.value, 0))} in new contracts`} tone="green" />
        <Stat icon={Percent} label="Win rate" value={wr.rate === null ? 'None yet' : `${wr.rate}%`} detail={`${wr.won} won · ${wr.lost} lost this quarter`} />
        <Stat icon={Timer} label="Average days to close" value={avg === null ? 'None yet' : `${avg} days`} detail="From first contact to signed" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Value by stage" description="Monthly contract value of open deals">
          <ul className="space-y-3">
            {byStage.map((t) => (
              <li key={t.stage}>
                <div className="flex flex-wrap justify-between gap-x-3 text-sm">
                  <span className="text-slate-800">
                    {t.label} <span className="text-slate-600">({t.count})</span>
                  </span>
                  <span className="font-semibold tabular-nums">{monthly(t.value)}</span>
                </div>
                <Bar share={t.value / maxStage} />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Lead sources" description="Every deal on the board. Win rate counts won and lost deals.">
          <ul className="space-y-3">
            {sources.map((s) => (
              <li key={s.source}>
                <div className="flex flex-wrap justify-between gap-x-3 text-sm">
                  <span className="text-slate-800">
                    {s.source} <span className="text-slate-600">({s.count})</span>
                  </span>
                  <span className="text-slate-700 tabular-nums">
                    {s.rate === null ? 'None closed yet' : `Win rate ${s.rate}%`}
                    <span className="text-slate-600"> · {s.open} open</span>
                  </span>
                </div>
                <Bar share={s.count / maxSource} muted={s.count === 0} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="By person" description="Open deals, wins this quarter and overdue follow-ups" bodyClassName="p-0!">
        <ul className="divide-y divide-slate-100 md:hidden">
          {people.map((p) => (
            <li key={p.id} className="p-3">
              <OwnerChip owner={p.id} showName className="text-sm font-medium text-slate-900" />
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                <dt className="text-slate-600">Open deals</dt>
                <dd className="text-right tabular-nums">{p.open}</dd>
                <dt className="text-slate-600">Open value</dt>
                <dd className="text-right tabular-nums">{monthly(p.value)}</dd>
                <dt className="text-slate-600">Won this quarter</dt>
                <dd className="text-right tabular-nums">{p.won}</dd>
                <dt className="text-slate-600">Overdue follow-ups</dt>
                <dd className={cn('text-right tabular-nums', p.overdue > 0 && 'font-semibold text-red-700')}>{p.overdue}</dd>
              </dl>
            </li>
          ))}
        </ul>
        <div className="relative hidden overflow-x-auto md:block">
          <table className="w-full min-w-[36rem]">
            <thead className="bg-slate-50">
              <tr>
                <th className={th}>Owner</th>
                <th className={cn(th, 'text-right')}>Open deals</th>
                <th className={cn(th, 'text-right')}>Open value</th>
                <th className={cn(th, 'text-right')}>Won this quarter</th>
                <th className={cn(th, 'text-right')}>Overdue follow-ups</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {people.map((p) => (
                <tr key={p.id}>
                  <td className={td}>
                    <OwnerChip owner={p.id} showName className="text-sm text-slate-900" />
                    <span className="block pl-7.5 text-xs text-slate-600">{OWNERS[p.id].role}</span>
                  </td>
                  <td className={cn(td, 'text-right tabular-nums')}>{p.open}</td>
                  <td className={cn(td, 'text-right tabular-nums')}>{monthly(p.value)}</td>
                  <td className={cn(td, 'text-right tabular-nums')}>{p.won}</td>
                  <td className={cn(td, 'text-right tabular-nums', p.overdue > 0 && 'font-semibold text-red-700')}>{p.overdue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
