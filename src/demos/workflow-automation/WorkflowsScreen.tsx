import { ChevronRight, FlaskConical, Pencil, Plus, ShoppingBag } from 'lucide-react'
import { Fragment } from 'react'
import { duration, num, relativeTime } from '../../lib/format'
import { AppButton, Badge, Toggle } from '../ui'
import { ACTIONS, TRIGGERS } from './catalog'
import { AppTile } from './parts'
import type { Workflow } from './types'

interface Props {
  workflows: Workflow[]
  now: number
  onToggle: (id: string, active: boolean) => void
  onEdit: (id: string) => void
  onTest: (id: string) => void
  onNew: () => void
  onSimulateOrder: () => void
}

export function WorkflowsScreen({ workflows, now, onToggle, onEdit, onTest, onNew, onSimulateOrder }: Props) {
  return (
    <div className="space-y-4 p-3 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <p className="font-semibold text-slate-900">Try it as if a customer just ordered</p>
          <p className="text-sm text-slate-600">Every active workflow that handles new orders runs at once. Watch the figures above update.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AppButton icon={ShoppingBag} onClick={onSimulateOrder}>
            Simulate a new order
          </AppButton>
          <AppButton variant="secondary" icon={Plus} onClick={onNew}>
            New workflow
          </AppButton>
        </div>
      </div>

      <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {workflows.map((workflow) => {
          const trigger = TRIGGERS[workflow.trigger]
          return (
            <li key={workflow.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{workflow.name}</p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    When: {trigger.label} · edited {relativeTime(workflow.updatedAt, now)}
                  </p>
                </div>
                <Badge tone={workflow.active ? 'green' : 'neutral'}>{workflow.active ? 'Active' : 'Paused'}</Badge>
              </div>

              <ol className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="Steps">
                <li>
                  <AppTile app={trigger.app} size="sm" />
                </li>
                {workflow.steps.map((step) => (
                  <Fragment key={step.id}>
                    <li aria-hidden="true">
                      <ChevronRight className="size-3.5 text-slate-400" />
                    </li>
                    <li>
                      <AppTile app={ACTIONS[step.action].app} size="sm" />
                    </li>
                  </Fragment>
                ))}
              </ol>

              <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                <div>
                  <dt className="text-xs text-slate-600">Runs this month</dt>
                  <dd className="font-semibold text-slate-900 tabular-nums">{num(workflow.runsThisMonth)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-600">Time saved (est.)</dt>
                  <dd className="font-semibold text-slate-900 tabular-nums">{duration(workflow.runsThisMonth * workflow.minutesPerRun)}</dd>
                </div>
              </dl>

              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
                <Toggle
                  checked={workflow.active}
                  onChange={(active) => onToggle(workflow.id, active)}
                  label={workflow.active ? 'On' : 'Off'}
                  ariaLabel={`Run ${workflow.name} automatically`}
                  className="w-28"
                />
                <div className="flex gap-2">
                  <AppButton variant="secondary" size="sm" icon={FlaskConical} onClick={() => onTest(workflow.id)} aria-label={`Test ${workflow.name}`}>
                    Test
                  </AppButton>
                  <AppButton size="sm" icon={Pencil} onClick={() => onEdit(workflow.id)} aria-label={`Edit ${workflow.name}`}>
                    Edit
                  </AppButton>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
