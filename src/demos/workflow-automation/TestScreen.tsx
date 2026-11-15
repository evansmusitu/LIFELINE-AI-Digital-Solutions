import { CircleCheck, CircleDashed, CircleX, Clock, FlaskConical, LoaderCircle, OctagonX, Play, RotateCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import { AppButton, Badge, Notice, Panel, SelectInput } from '../ui'
import { ACTIONS, APPS, TRIGGERS } from './catalog'
import { formatDuration, simulate, type Counters } from './engine'
import { AppTile, OutputPreview } from './parts'
import type { Run, StepResult, Workflow } from './types'

interface Props {
  workflow: Workflow
  workflows: Workflow[]
  counters: Counters
  now: () => number
  onSelect: (id: string) => void
  onRecord: (run: Run, counters: Counters) => void
  onEdit: () => void
}

const STEP_ANIMATION_MS = 650

export function StepStatusIcon({ status }: { status: StepResult['status'] }) {
  switch (status) {
    case 'done':
      return <CircleCheck className="size-5 text-emerald-600" aria-label="Done" />
    case 'retried':
      return <RotateCw className="size-5 text-amber-600" aria-label="Done after a retry" />
    case 'skipped':
      return <Clock className="size-5 text-slate-500" aria-label="Skipped" />
    case 'stopped':
      return <OctagonX className="size-5 text-amber-600" aria-label="Stopped" />
    case 'failed':
      return <CircleX className="size-5 text-red-600" aria-label="Failed" />
    default:
      return <CircleDashed className="size-5 text-slate-400" aria-label="Not run" />
  }
}

export function TestScreen({ workflow, workflows, counters, now, onSelect, onRecord, onEdit }: Props) {
  const [result, setResult] = useState<Run | null>(null)
  const [progress, setProgress] = useState(0)
  const [running, setRunning] = useState(false)
  const timers = useRef<number[]>([])
  const trigger = TRIGGERS[workflow.trigger]
  const sample = trigger.sample(now())

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((t) => window.clearTimeout(t))
  }, [])

  const start = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    const outcome = simulate(workflow, sample, counters, now(), { test: true, seed: Date.now() % 97 })
    setResult(outcome.run)
    setRunning(true)
    setProgress(0)
    const executed = outcome.run.steps.filter((s) => s.status !== 'not-run').length
    for (let i = 1; i <= executed; i++) {
      timers.current.push(window.setTimeout(() => setProgress(i), i * STEP_ANIMATION_MS))
    }
    timers.current.push(
      window.setTimeout(() => {
        setRunning(false)
        setProgress(outcome.run.steps.length)
        onRecord(outcome.run, outcome.counters)
      }, executed * STEP_ANIMATION_MS + 250),
    )
  }

  const choose = (id: string) => {
    timers.current.forEach((t) => window.clearTimeout(t))
    setResult(null)
    setRunning(false)
    onSelect(id)
  }

  const finished = result && !running
  const outputs = finished ? result.steps.filter((s) => s.output) : []

  return (
    <div className="grid grid-cols-1 gap-5 p-3 sm:p-5 lg:grid-cols-[19rem_1fr]">
      <div className="space-y-4">
        <Panel title="Test a workflow" description="Uses sample data. Nothing is sent to real customers.">
          <label htmlFor="test-workflow" className="mb-1 block text-xs font-semibold text-slate-700">
            Workflow
          </label>
          <SelectInput id="test-workflow" value={workflow.id} onChange={(e) => choose(e.target.value)}>
            {workflows.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </SelectInput>
          <AppButton icon={running ? LoaderCircle : Play} className="mt-3 w-full" onClick={start} disabled={running || !workflow.steps.length}>
            {running ? 'Running…' : result ? 'Run the test again' : 'Run test'}
          </AppButton>
          <AppButton variant="ghost" size="sm" className="mt-1 w-full" onClick={onEdit}>
            Edit this workflow
          </AppButton>
        </Panel>

        <Panel title="Sample trigger data" description={`${APPS[trigger.app].name}: ${trigger.label}`}>
          <dl className="space-y-2 text-sm">
            {trigger.variables.map((v) => (
              <div key={v.key}>
                <dt className="text-xs text-slate-600">{v.label}</dt>
                <dd className="font-medium break-words text-slate-900">{sample[v.key]}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      <div className="min-w-0 space-y-4">
        <Panel
          title={workflow.name}
          description={result ? (running ? 'Running each step…' : `Finished in ${formatDuration(result.durationMs)}`) : 'Press “Run test” to watch each step happen.'}
          action={
            finished && (
              <Badge tone={result.status === 'succeeded' ? 'green' : result.status === 'stopped' ? 'amber' : 'red'}>
                {result.status === 'succeeded' ? 'Test passed' : result.status === 'stopped' ? 'Stopped by a condition' : 'Test failed'}
              </Badge>
            )
          }
        >
          <ol className="space-y-2" aria-live="polite">
            <li className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
              <AppTile app={trigger.app} size="sm" />
              <span className="min-w-0 flex-1 text-sm">
                <span className="font-semibold text-slate-900">Trigger: {trigger.label}</span>
                <span className="block truncate text-xs text-slate-600">{trigger.summary(sample)}</span>
              </span>
              {result && <CircleCheck className="size-5 text-emerald-600" aria-label="Received" />}
            </li>
            {workflow.steps.map((step, index) => {
              const outcome = result?.steps[index]
              const reached = result && index < progress
              const current = running && index === progress && outcome?.status !== 'not-run'
              return (
                <li
                  key={step.id}
                  className={cn('flex items-start gap-3 rounded-lg border px-3 py-2.5', current ? 'border-(--accent)/50 bg-(--accent-soft)' : 'border-slate-200 bg-white')}
                >
                  <AppTile app={ACTIONS[step.action].app} size="sm" />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="font-semibold text-slate-900">
                      {index + 1}. {ACTIONS[step.action].label}
                    </span>
                    <span className="block text-xs text-slate-600">
                      {reached && outcome ? outcome.detail : current ? 'Running…' : result ? 'Waiting' : APPS[ACTIONS[step.action].app].name}
                    </span>
                  </span>
                  {current ? (
                    <LoaderCircle className="size-5 animate-spin text-(--accent)" aria-label="Running" />
                  ) : reached && outcome ? (
                    <StepStatusIcon status={outcome.status} />
                  ) : null}
                </li>
              )
            })}
          </ol>

          {finished && result.status === 'succeeded' && (
            <Notice tone="green" icon={CircleCheck} className="mt-4">
              Every step worked. In real use this saves about {workflow.minutesPerRun} minutes of manual work each time.
            </Notice>
          )}
          {finished && result.status === 'failed' && (
            <Notice tone="red" icon={CircleX} className="mt-4">
              A step failed, so the workflow stopped. Fix the highlighted field in the builder and test again. In real use, your
              team gets a WhatsApp alert when this happens.
            </Notice>
          )}
          {finished && result.status === 'stopped' && (
            <Notice tone="amber" icon={OctagonX} className="mt-4">
              The condition wasn’t met for this sample, so nothing else ran. That’s working as designed.
            </Notice>
          )}
        </Panel>

        {outputs.length > 0 && (
          <Panel title="What the test produced" description="These previews are exactly what would be created or sent.">
            <ul className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {outputs.map((s) => (
                <li key={s.stepId}>
                  <p className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <FlaskConical className="size-3.5" aria-hidden="true" />
                    {ACTIONS[s.action].label}
                  </p>
                  {s.output && <OutputPreview output={s.output} />}
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </div>
  )
}
