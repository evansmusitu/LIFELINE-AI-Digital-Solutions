import { FlaskConical, History, LayoutTemplate, Layers, ListChecks, Workflow as WorkflowIcon } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../../components/toast-context'
import { hoursLabel, money, num, pct, round2 } from '../../lib/format'
import { usePersistentState } from '../../lib/storage'
import { uid, useDemoClock, useTicker } from '../../lib/time'
import { useDemoMetrics } from '../metrics'
import { DemoAppShell, type DemoScreen } from '../shell'
import { BuilderScreen } from './BuilderScreen'
import { TRIGGERS, type Template } from './catalog'
import { createInitialState } from './data'
import { defaultsFor } from './defaults'
import { formatDuration, simulate, type Counters } from './engine'
import { HistoryScreen } from './HistoryScreen'
import { TemplatesScreen } from './TemplatesScreen'
import { TestScreen } from './TestScreen'
import type { ActionId, Run, Workflow, WorkflowState } from './types'
import { WorkflowsScreen } from './WorkflowsScreen'

const SLUG = 'workflow-automation'
const ACCENT = { base: '#4f46e5', strong: '#4338ca', soft: '#eef2ff', ink: '#3730a3' }

type ScreenId = 'workflows' | 'builder' | 'test' | 'history' | 'templates'

/** Customers for the "Simulate a new order" button. */
const ORDER_POOL: [string, string, string][] = [
  ['Chloe Martin', '1 × Herringbone wool throw, Slate ($98.00)', 'Australia'],
  ['Ravi Patel', '2 × Washed linen cushion cover, Sage ($44.00 each); 1 × Stonewashed linen napkins, set of 4 (Oat) ($52.00)', 'United States'],
  ['Sofia Russo', '1 × Waffle cotton bath towel set, Ink ($64.00)', 'Italy'],
  ['Kwame Boateng', '1 × Herringbone wool throw, Slate ($98.00); 1 × Washed linen cushion cover, Sage ($44.00)', 'United Kingdom'],
]

function orderTotal(items: string): number {
  return round2(
    items.split(/;\s*/).reduce((sum, part) => {
      const m = part.match(/^(\d+)\s*×.*\(\$([\d.]+)( each)?\)$/)
      return m ? sum + (m[3] ? Number(m[1]) * Number(m[2]) : Number(m[2])) : sum
    }, 0),
  )
}

export default function WorkflowAutomationDemo() {
  const clock = useDemoClock(10, 40)
  const now = useTicker(clock)
  const toast = useToast()
  const [state, setState] = usePersistentState<WorkflowState>(`${SLUG}.state`, () => createInitialState(clock()), {
    version: 1,
    freshDaily: true,
  })
  const [screen, setScreen] = useState<ScreenId>('workflows')
  const [selectedId, setSelectedId] = useState('wf-orders')

  const { workflows, runs } = state
  const selected = workflows.find((w) => w.id === selectedId) ?? workflows[0]
  const counters: Counters = { nextInvoice: state.nextInvoice, nextPo: state.nextPo }

  const saveWorkflow = (workflow: Workflow) =>
    setState((s) => ({ ...s, workflows: s.workflows.map((w) => (w.id === workflow.id ? { ...workflow, updatedAt: clock() } : w)) }))

  const open = (id: string, target: ScreenId) => {
    setSelectedId(id)
    setScreen(target)
  }

  const addWorkflow = (workflow: Workflow, message: string) => {
    setState((s) => ({ ...s, workflows: [workflow, ...s.workflows] }))
    open(workflow.id, 'builder')
    toast(message, 'info')
  }

  const applyTemplate = (template: Template) =>
    addWorkflow(
      {
        id: uid('wf'),
        name: template.name,
        trigger: template.trigger,
        steps: template.steps.map((s) => ({ ...s, id: uid('s'), config: { ...s.config } })),
        active: false,
        runsThisMonth: 0,
        minutesPerRun: template.minutesPerRun,
        updatedAt: clock(),
      },
      'Template added. It stays paused until you switch it on.',
    )

  const blankWorkflow = () =>
    addWorkflow(
      {
        id: uid('wf'),
        name: 'My new workflow',
        trigger: 'order.paid',
        steps: [{ id: uid('s'), action: 'email.send', config: defaultsFor('email.send', 'order.paid') }],
        active: false,
        runsThisMonth: 0,
        minutesPerRun: 5,
        updatedAt: clock(),
      },
      'New workflow created. Pick a trigger and add steps.',
    )

  const addStep = (action: ActionId, index: number) => {
    const steps = [...selected.steps]
    steps.splice(index, 0, { id: uid('s'), action, config: defaultsFor(action, selected.trigger) })
    saveWorkflow({ ...selected, steps })
  }

  const deleteWorkflow = () => {
    const remaining = workflows.filter((w) => w.id !== selected.id)
    setState((s) => ({ ...s, workflows: s.workflows.filter((w) => w.id !== selected.id) }))
    setSelectedId(remaining[0]?.id ?? '')
    setScreen('workflows')
    toast(`Deleted “${selected.name}”.`, 'info')
  }

  const recordRun = (run: Run, next: Counters) =>
    setState((s) => ({ ...s, runs: [run, ...s.runs], nextInvoice: next.nextInvoice, nextPo: next.nextPo }))

  const simulateOrder = () => {
    const handlers = workflows.filter((w) => w.active && w.trigger === 'order.paid' && w.steps.length)
    if (!handlers.length) {
      toast('No active workflow handles new orders. Switch one on first.', 'warning')
      return
    }
    const [name, items, country] = ORDER_POOL[state.nextOrder % ORDER_POOL.length]
    const number = `HL-${state.nextOrder}`
    const data = {
      ...TRIGGERS['order.paid'].sample(clock()),
      'order.number': number,
      'order.items': items,
      'order.total': money(orderTotal(items)),
      'customer.name': name,
      'customer.first_name': name.split(' ')[0],
      'customer.email': `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      'customer.country': country,
    }
    let next = counters
    const newRuns = handlers.map((workflow) => {
      const result = simulate(workflow, data, next, clock(), { seed: state.nextOrder })
      next = result.counters
      return result.run
    })
    setState((s) => ({
      ...s,
      runs: [...newRuns, ...s.runs],
      nextOrder: s.nextOrder + 1,
      nextInvoice: next.nextInvoice,
      nextPo: next.nextPo,
      workflows: s.workflows.map((w) => (handlers.some((h) => h.id === w.id) ? { ...w, runsThisMonth: w.runsThisMonth + 1 } : w)),
    }))
    const failed = newRuns.some((r) => r.status === 'failed')
    toast(
      failed
        ? `Order ${number} came in, but a step failed. Check Run history.`
        : `Order ${number} from ${name} handled by ${handlers.length} ${handlers.length === 1 ? 'workflow' : 'workflows'} in ${formatDuration(newRuns[0].durationMs)}.`,
      failed ? 'warning' : 'success',
    )
  }

  const totalRuns = workflows.reduce((sum, w) => sum + w.runsThisMonth, 0)
  const minutesSaved = workflows.reduce((sum, w) => sum + w.runsThisMonth * w.minutesPerRun, 0)
  const failedRuns = state.failedThisMonth + runs.filter((r) => !r.test && r.status === 'failed' && !r.id.startsWith('run-sample')).length
  const successRate = totalRuns ? ((totalRuns - failedRuns) / totalRuns) * 100 : 100
  const tests = runs.filter((r) => r.test).length

  useDemoMetrics([
    { label: 'Active workflows', value: `${workflows.filter((w) => w.active).length} of ${workflows.length}`, detail: 'Running in the background' },
    { label: 'Runs this month', value: num(totalRuns), detail: 'Orders, enquiries, stock and invoices' },
    { label: 'Hours saved this month (est.)', value: hoursLabel(minutesSaved), detail: 'Minutes of manual work each run replaces' },
    { label: 'Success rate', value: pct(successRate, 1), detail: `${failedRuns} failed runs were flagged to the team` },
  ])

  const screens: DemoScreen<ScreenId>[] = [
    { id: 'workflows', label: 'Workflows', icon: ListChecks, audience: 'team' },
    { id: 'builder', label: 'Builder', icon: WorkflowIcon, audience: 'team' },
    { id: 'test', label: 'Test run', icon: FlaskConical, audience: 'team', badge: tests || undefined },
    { id: 'history', label: 'Run history', icon: History, audience: 'team' },
    { id: 'templates', label: 'Templates', icon: LayoutTemplate, audience: 'team' },
  ]

  return (
    <DemoAppShell
      slug={SLUG}
      business={{ name: 'Hartwell Loom · Automations', descriptor: 'Online homeware and textiles store · Leeds, UK', icon: Layers }}
      accent={ACCENT}
      screens={screens}
      active={screen}
      onChange={setScreen}
      headerRight={
        <span className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 sm:inline-flex">
          <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
          All connections healthy
        </span>
      }
    >
      {screen === 'workflows' && (
        <WorkflowsScreen
          workflows={workflows}
          now={now}
          onToggle={(id, active) => {
            const workflow = workflows.find((w) => w.id === id)
            if (workflow) saveWorkflow({ ...workflow, active })
          }}
          onEdit={(id) => open(id, 'builder')}
          onTest={(id) => open(id, 'test')}
          onNew={() => setScreen('templates')}
          onSimulateOrder={simulateOrder}
        />
      )}
      {screen === 'builder' && selected && (
        <BuilderScreen
          key={selected.id}
          workflow={selected}
          workflows={workflows}
          onSelect={setSelectedId}
          onChange={saveWorkflow}
          onAddStep={addStep}
          onTest={() => setScreen('test')}
          onDelete={deleteWorkflow}
        />
      )}
      {screen === 'test' && selected && (
        <TestScreen
          key={selected.id}
          workflow={selected}
          workflows={workflows}
          counters={counters}
          now={clock}
          onSelect={setSelectedId}
          onRecord={recordRun}
          onEdit={() => setScreen('builder')}
        />
      )}
      {screen === 'history' && <HistoryScreen runs={runs} now={now} />}
      {screen === 'templates' && <TemplatesScreen onUse={applyTemplate} onBlank={blankWorkflow} />}
      {(screen === 'builder' || screen === 'test') && !selected && (
        <div className="p-8 text-center text-sm text-slate-600">All workflows were deleted. Use Reset demo to restore the samples, or start one from Templates.</div>
      )}
    </DemoAppShell>
  )
}
