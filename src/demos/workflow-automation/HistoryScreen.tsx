import { ChevronDown, CircleCheck, CircleX, FlaskConical, OctagonX } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import { dayAndTime } from '../../lib/format'
import { Badge, Notice } from '../ui'
import { ACTIONS } from './catalog'
import { formatDuration } from './engine'
import { AppTile } from './parts'
import { StepStatusIcon } from './TestScreen'
import type { Run } from './types'

type Filter = 'all' | 'succeeded' | 'attention' | 'tests'

export function HistoryScreen({ runs, now }: { runs: Run[]; now: number }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [open, setOpen] = useState<string | null>(null)
  const sorted = [...runs].sort((a, b) => b.at - a.at)
  const needsAttention = (r: Run) => r.status === 'failed' || r.steps.some((s) => s.status === 'retried')
  const shown = sorted.filter((r) =>
    filter === 'all' ? true : filter === 'tests' ? r.test : filter === 'succeeded' ? r.status === 'succeeded' && !r.test : needsAttention(r),
  )
  const filters: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: runs.length },
    { id: 'succeeded', label: 'Succeeded', count: runs.filter((r) => r.status === 'succeeded' && !r.test).length },
    { id: 'attention', label: 'Retries and failures', count: runs.filter(needsAttention).length },
    { id: 'tests', label: 'Your test runs', count: runs.filter((r) => r.test).length },
  ]

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter runs">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition',
              filter === f.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100',
            )}
          >
            {f.label} <span className="tabular-nums opacity-80">{f.count}</span>
          </button>
        ))}
      </div>

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {shown.map((run) => {
          const isOpen = open === run.id
          const retried = run.steps.some((s) => s.status === 'retried')
          return (
            <li key={run.id}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : run.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
              >
                {run.status === 'succeeded' ? (
                  <CircleCheck className="size-5 shrink-0 text-emerald-600" aria-label="Succeeded" />
                ) : run.status === 'stopped' ? (
                  <OctagonX className="size-5 shrink-0 text-amber-600" aria-label="Stopped by a condition" />
                ) : (
                  <CircleX className="size-5 shrink-0 text-red-600" aria-label="Failed" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{run.workflowName}</span>
                    {run.test && (
                      <Badge tone="violet" icon={FlaskConical}>
                        Test
                      </Badge>
                    )}
                    {retried && <Badge tone="amber">Retried</Badge>}
                  </span>
                  <span className="block truncate text-xs text-slate-600">{run.summary}</span>
                </span>
                <span className="hidden shrink-0 text-right text-xs text-slate-600 sm:block">
                  {dayAndTime(run.at, now)}
                  <span className="block tabular-nums">{formatDuration(run.durationMs)}</span>
                </span>
                <ChevronDown className={cn('size-4 shrink-0 text-slate-500 transition', isOpen && 'rotate-180')} aria-hidden="true" />
              </button>
              {isOpen && (
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="mb-2 text-xs text-slate-600 sm:hidden">
                    {dayAndTime(run.at, now)} · {formatDuration(run.durationMs)}
                  </p>
                  {run.note && (
                    <Notice tone={run.status === 'failed' ? 'red' : 'amber'} className="mb-3">
                      {run.note}
                    </Notice>
                  )}
                  <ol className="space-y-2">
                    {run.steps.map((s, index) => (
                      <li key={s.stepId + index} className="flex items-start gap-3 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
                        <AppTile app={ACTIONS[s.action].app} size="sm" />
                        <span className="min-w-0 flex-1 text-sm">
                          <span className="font-medium text-slate-900">
                            {index + 1}. {ACTIONS[s.action].label}
                          </span>
                          <span className="block text-xs text-slate-600">{s.detail}</span>
                        </span>
                        <StepStatusIcon status={s.status} />
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </li>
          )
        })}
        {shown.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-slate-600">
            {filter === 'tests' ? 'Run a test from the Test run screen and it will appear here.' : 'No runs match this filter.'}
          </li>
        )}
      </ul>
    </div>
  )
}
