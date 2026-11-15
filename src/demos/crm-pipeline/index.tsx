import { ChartColumn, Globe, ListChecks, Sparkles, SquareKanban } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useToast } from '../../components/toast-context'
import { clockTime, duration, firstName, moneyWhole, num, pct, shortDate } from '../../lib/format'
import { usePersistentState } from '../../lib/storage'
import { useDemoClock, useTicker } from '../../lib/time'
import { useDemoMetrics } from '../metrics'
import { DemoAppShell, type DemoScreen } from '../shell'
import { createInitialState } from './data'
import {
  BUSINESS,
  OWNERS,
  addDays,
  assignOwner,
  autoTasks,
  captureLead,
  completeTask,
  followUpCounts,
  forecast,
  isOpen,
  logActivity,
  logCall,
  monthly,
  moveDeal,
  openTasks,
  quarterStart,
  sendProposal,
  setNextStep,
  setRule,
  snoozeTask,
  stageLabel,
  weeklyAutomation,
  winRate,
} from './engine'
import { FollowupsScreen } from './FollowupsScreen'
import { FormScreen, type FormResult } from './FormScreen'
import { PipelineScreen, type PipelineActions } from './PipelineScreen'
import { ReportsScreen } from './ReportsScreen'
import type { CrmState, Enquiry, RuleId } from './types'

const SLUG = 'crm-pipeline'
const ACCENT = { base: '#047857', strong: '#065f46', soft: '#ecfdf5', ink: '#064e3b' }

type ScreenId = 'pipeline' | 'followups' | 'form' | 'reports'

const KIND_LOGGED: Record<string, string> = { call: 'Call', email: 'Email', note: 'Note', visit: 'Site visit' }

export default function CrmPipelineDemo() {
  const clock = useDemoClock(8, 50)
  const now = useTicker(clock)
  const toast = useToast()
  const [state, setState] = usePersistentState<CrmState>(`${SLUG}.state`, createInitialState, { version: 1, freshDaily: true })
  const [screen, setScreen] = useState<ScreenId>('pipeline')
  const [openId, setOpenId] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [formResult, setFormResult] = useState<FormResult | null>(null)
  const { deals, tasks, rules } = state

  // The reminder rules run as the clock moves and whenever deals change. Nothing to add returns the same state.
  useEffect(() => {
    setState((s) => autoTasks(s, now))
  }, [now, deals, rules, setState])

  const find = (id: string) => deals.find((d) => d.id === id)

  const actions: PipelineActions = {
    move: (id, stage, extra = {}) => {
      const deal = find(id)
      if (!deal) return
      const at = clock()
      setState((s) => moveDeal(s, id, stage, { at, ...extra }))
      if (stage === 'won') toast(`${deal.company} marked as won. ${firstName(OWNERS[deal.owner].name)} has an onboarding task for tomorrow.`, 'success')
      else if (stage === 'lost') toast(`${deal.company} marked as lost: ${extra.lostReason?.toLowerCase()}.`, 'info')
      else if (stage === 'proposal' && rules.proposal) toast(`${deal.company} moved to Proposal sent. Follow-up booked for ${shortDate(addDays(at, 3), 'en-US')}.`, 'success')
      else toast(`${deal.company} moved to ${stageLabel(stage)}.`, 'success')
    },
    assign: (id, owner) => {
      setState((s) => assignOwner(s, id, owner, clock()))
      toast(`${find(id)?.company} is now ${OWNERS[owner].name}’s deal. Open follow-ups moved too.`, 'info')
    },
    log: (id, entry) => {
      setState((s) => logActivity(s, id, entry, clock()))
      toast(`${KIND_LOGGED[entry.kind] ?? 'Activity'} logged on the ${find(id)?.company} timeline.`, 'success')
    },
    nextStep: (id, text, due, taskId) => {
      setState((s) => setNextStep(s, id, { text, due, taskId }, clock()))
      toast(`Next step saved, due ${shortDate(due, 'en-US')}.`, 'success')
    },
    sendProposal: (id, input) => {
      const deal = find(id)
      if (!deal) return
      const at = clock()
      setState((s) => sendProposal(s, id, input, at))
      const follow = rules.proposal ? ` Follow-up due ${shortDate(addDays(at, 3), 'en-US')}.` : ''
      toast(`Proposal sent to ${deal.contact.name}. ${deal.company} is now in Proposal sent.${follow}`, 'success')
    },
  }

  const done = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    const deal = task && find(task.dealId)
    setState((s) => completeTask(s, taskId, clock()))
    // Open deals ask for the next step instead, which confirms it.
    if (deal && !isOpen(deal)) toast(`Done. Logged on the ${deal.company} timeline.`, 'success')
  }

  const snooze = (taskId: string, days: number) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    const at = clock()
    setState((s) => snoozeTask(s, taskId, days, at))
    toast(`Snoozed until ${shortDate(addDays(Math.max(task.due, at), days), 'en-US')}.`, 'info')
  }

  const call = (taskId: string) => {
    const deal = find(tasks.find((t) => t.id === taskId)?.dealId ?? '')
    if (!deal) return
    setState((s) => logCall(s, taskId, clock()))
    toast(`Call to ${deal.contact.name} logged. In your version, this dials from your phone.`, 'info')
  }

  const rule = (id: RuleId, on: boolean) => {
    const at = clock()
    const count = (s: CrmState) => openTasks(s.tasks).filter((t) => t.auto === id).length
    const delta = count(setRule(state, id, on, at)) - count(state)
    setState((s) => setRule(s, id, on, at))
    if (!on) toast(`Rule switched off. ${-delta} open ${delta === -1 ? 'reminder' : 'reminders'} removed.`, 'info')
    else toast(delta > 0 ? `Rule switched on. ${delta} ${delta === 1 ? 'reminder' : 'reminders'} created.` : 'Rule switched on. No reminders needed right now.', 'success')
  }

  const submit = (enquiry: Enquiry) => {
    const result = captureLead(state, enquiry, clock())
    setState(result.state)
    setFormResult({ deal: result.deal, task: result.task, quote: result.quote })
    setHighlightId(result.deal.id)
    toast(`New website lead: ${result.deal.company}, assigned to ${OWNERS[result.deal.owner].name}.`, 'info')
  }

  const go = (id: ScreenId) => {
    setScreen(id)
    if (id !== 'pipeline') setOpenId(null)
  }

  const f = forecast(deals)
  const counts = followUpCounts(tasks, now)
  const wr = winRate(deals, quarterStart(now))
  const week = weeklyAutomation(state, now)

  useDemoMetrics([
    { label: 'Open pipeline', value: monthly(f.open), detail: `${moneyWhole(f.weighted)} weighted forecast` },
    { label: 'Follow-ups due today', value: num(counts.today), detail: `${counts.overdue} overdue` },
    { label: 'Win rate this quarter', value: wr.rate === null ? 'None yet' : pct(wr.rate), detail: `${wr.won} won · ${wr.lost} lost` },
    { label: 'Admin time saved this week (est.)', value: duration(week.minutes), detail: 'Reminders, proposals and data entry done for you' },
  ])

  const screens: DemoScreen<ScreenId>[] = [
    { id: 'pipeline', label: 'Pipeline', icon: SquareKanban, audience: 'team' },
    { id: 'followups', label: 'Follow-ups', icon: ListChecks, audience: 'team', badge: counts.today + counts.overdue || undefined },
    { id: 'form', label: 'Website form', icon: Globe, audience: 'customer' },
    { id: 'reports', label: 'Reports', icon: ChartColumn, audience: 'team' },
  ]

  return (
    <DemoAppShell
      slug={SLUG}
      business={{ name: BUSINESS.name, descriptor: 'Sales pipeline · Raleigh, North Carolina', icon: Sparkles }}
      accent={ACCENT}
      screens={screens}
      active={screen}
      onChange={go}
      headerRight={
        <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 sm:inline-flex">
          Sales team · {clockTime(now, 'en-US')}
        </span>
      }
    >
      {screen === 'pipeline' && <PipelineScreen state={state} now={now} openId={openId} highlightId={highlightId} onOpen={setOpenId} actions={actions} />}
      {screen === 'followups' && (
        <FollowupsScreen
          state={state}
          now={now}
          onOpenDeal={(id) => {
            setOpenId(id)
            setScreen('pipeline')
          }}
          onDone={done}
          onSnooze={snooze}
          onCall={call}
          onNextStep={actions.nextStep}
          onRule={rule}
        />
      )}
      {screen === 'form' && (
        <FormScreen
          now={now}
          result={formResult}
          onSubmit={submit}
          onAnother={() => setFormResult(null)}
          onSeePipeline={(id) => {
            setHighlightId(id)
            go('pipeline')
          }}
        />
      )}
      {screen === 'reports' && <ReportsScreen state={state} now={now} />}
    </DemoAppShell>
  )
}
