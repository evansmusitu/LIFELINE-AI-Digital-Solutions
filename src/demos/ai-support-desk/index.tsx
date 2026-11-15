import { ChartColumn, Inbox, LifeBuoy, Tent, WandSparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useToast } from '../../components/toast-context'
import { clockTime, duration, num } from '../../lib/format'
import { usePersistentState } from '../../lib/storage'
import { uid, useDemoClock, useTicker } from '../../lib/time'
import { useDemoMetrics } from '../metrics'
import { DemoAppShell, type DemoScreen } from '../shell'
import { AutomationScreen } from './AutomationScreen'
import { createInitialState } from './data'
import { AGENTS, deskStats, dueFor, needsReply, subjectFrom, triageTicket } from './engine'
import { GetHelpScreen, type HelpInput } from './GetHelpScreen'
import { InboxScreen, type TriageEdit } from './InboxScreen'
import { ReportsScreen } from './ReportsScreen'
import type { DeskState, Settings, Ticket, TicketMessage } from './types'

const SLUG = 'ai-support-desk'
const ACCENT = { base: '#3f6212', strong: '#365314', soft: '#f7fee7', ink: '#365314' }
const TRIAGE_STEP_MS = 500

type ScreenId = 'help' | 'inbox' | 'reports' | 'rules'

const REPLY_VIA = { Email: 'by email', WhatsApp: 'on WhatsApp', 'Web chat': 'in the web chat' }

export default function AiSupportDeskDemo() {
  const clock = useDemoClock(10, 20)
  const now = useTicker(clock, 20_000)
  const toast = useToast()
  const [state, setState] = usePersistentState<DeskState>(`${SLUG}.state`, createInitialState, { version: 1, freshDaily: true })
  const [screen, setScreen] = useState<ScreenId>('help')
  const [selectedId, setSelectedId] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [helpResultId, setHelpResultId] = useState<string | null>(null)
  // Batch triage progress. Not persisted, so a reload mid-run never leaves the inbox stuck.
  const [run, setRun] = useState<{ ids: string[]; done: number } | null>(null)
  const timers = useRef<number[]>([])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((t) => window.clearTimeout(t))
  }, [])

  const { tickets, orders, settings } = state
  const stats = deskStats(tickets, now)

  const updateTicket = (id: string, fn: (t: Ticket) => Ticket) =>
    setState((s) => ({ ...s, tickets: s.tickets.map((t) => (t.id === id ? fn(t) : t)) }))

  const addMessage = (t: Ticket, message: Omit<TicketMessage, 'id' | 'at'>): Ticket => ({
    ...t,
    messages: [...t.messages, { ...message, id: uid('m'), at: clock() }],
  })

  const agentName = (t: Ticket) => AGENTS[t.triage?.assignee ?? 'thandiwe'].name

  const submitHelp = (input: HelpInput) => {
    const at = clock()
    const name = input.name.trim() || 'You'
    const ticket = triageTicket(
      {
        id: uid('t'),
        number: state.nextTicket,
        customer: { name, contact: input.channel === 'WhatsApp' ? '+27 72 ••• 5170' : 'you@example.com' },
        channel: input.channel,
        subject: subjectFrom(input.text),
        text: input.text,
        orderField: input.orderField.trim() || undefined,
        createdAt: at,
        status: 'Open',
        messages: [{ id: uid('m'), kind: 'customer', author: name, text: input.text, at }],
        corrections: 0,
      },
      settings,
      orders,
      at,
    )
    setState((s) => ({ ...s, tickets: [ticket, ...s.tickets], nextTicket: s.nextTicket + 1 }))
    setHelpResultId(ticket.id)
  }

  const triageOne = (id: string) =>
    setState((s) => ({ ...s, tickets: s.tickets.map((t) => (t.id === id && !t.triage ? triageTicket(t, s.settings, s.orders, clock()) : t)) }))

  const runTriage = () => {
    const queue = tickets.filter((t) => !t.triage && t.status !== 'Solved').sort((a, b) => a.createdAt - b.createdAt)
    if (run || !queue.length) return
    const preview = queue.map((t) => triageTicket(t, settings, orders, clock()))
    const urgent = preview.filter((t) => t.triage?.priority === 'Urgent').length
    const answered = preview.filter((t) => t.autoAnswered).length
    setRun({ ids: queue.map((t) => t.id), done: 0 })
    queue.forEach((t, index) => {
      timers.current.push(
        window.setTimeout(() => {
          triageOne(t.id)
          setRun((r) => r && { ...r, done: index + 1 })
        }, (index + 1) * TRIAGE_STEP_MS),
      )
    })
    timers.current.push(
      window.setTimeout(() => {
        setRun(null)
        toast(
          `${queue.length} ${queue.length === 1 ? 'ticket' : 'tickets'} triaged: ${urgent} urgent, ${answered} answered automatically.`,
          'success',
        )
      }, queue.length * TRIAGE_STEP_MS + 300),
    )
  }

  const editTriage = (id: string, edit: TriageEdit) => {
    const ticket = tickets.find((t) => t.id === id)
    if (!ticket?.triage) return
    const corrected = edit.topic !== undefined && edit.topic !== ticket.triage.topic
    updateTicket(id, (t) => {
      if (!t.triage) return t
      const triage = { ...t.triage, ...edit }
      if (edit.priority && !t.firstReplyAt) triage.dueAt = dueFor(t.createdAt, edit.priority, settings)
      return { ...t, triage, corrections: t.corrections + (corrected ? 1 : 0) }
    })
    if (corrected) toast('Correction saved.', 'success')
    else if (edit.assignee) toast(`Assigned to ${AGENTS[edit.assignee].name}.`, 'info')
    else if (edit.priority) toast(`Priority set to ${edit.priority}. The reply-due time is updated.`, 'info')
    else toast('Saved.', 'info')
  }

  const reply = (id: string, text: string, fromSuggestion: boolean) => {
    const ticket = tickets.find((t) => t.id === id)
    if (!ticket) return
    updateTicket(id, (t) => ({
      ...addMessage(t, { kind: 'agent', author: agentName(t), text, fromSuggestion: fromSuggestion || undefined }),
      status: 'Waiting on customer',
      firstReplyAt: t.firstReplyAt ?? clock(),
    }))
    const who = ticket.customer.name === 'You' ? 'you' : ticket.customer.name
    toast(`Reply sent to ${who} ${REPLY_VIA[ticket.channel]}.`, 'success')
  }

  const addNote = (id: string, text: string) => {
    updateTicket(id, (t) => addMessage(t, { kind: 'note', author: agentName(t), text }))
    toast('Internal note added. The customer can’t see it.', 'info')
  }

  const solve = (id: string) => {
    const ticket = tickets.find((t) => t.id === id)
    updateTicket(id, (t) => ({ ...t, status: 'Solved', solvedAt: clock() }))
    toast(`Ticket #${ticket?.number} marked as solved.`, 'success')
  }

  const escalate = (id: string) => {
    updateTicket(id, (t) => {
      if (!t.triage) return t
      const noted = addMessage(t, { kind: 'note', author: agentName(t), text: 'Escalated to Thandiwe Mokoena and set to Urgent.' })
      const dueAt = t.firstReplyAt ? t.triage.dueAt : dueFor(t.createdAt, 'Urgent', settings)
      return { ...noted, triage: { ...t.triage, priority: 'Urgent', assignee: 'thandiwe', dueAt } }
    })
    toast('Escalated to Thandiwe Mokoena as urgent.', 'warning')
  }

  const updateSettings = (patch: Partial<Settings>, message: string) => {
    setState((s) => {
      const next = { ...s.settings, ...patch }
      // New reply-time targets move the due time of every ticket still waiting for its first reply.
      const updated = patch.targets
        ? s.tickets.map((t) => (t.triage && needsReply(t) ? { ...t, triage: { ...t.triage, dueAt: dueFor(t.createdAt, t.triage.priority, next) } } : t))
        : s.tickets
      return { ...s, settings: next, tickets: updated }
    })
    toast(message, 'success')
  }

  const openTicket = (id: string) => {
    setSelectedId(id)
    setDetailOpen(true)
    setScreen('inbox')
  }

  useDemoMetrics([
    { label: 'Open tickets', value: num(stats.open), detail: `${stats.urgent} urgent · ${stats.overdue} overdue` },
    {
      label: 'Average first reply',
      value: stats.avgFirstReply === null ? 'None yet' : duration(stats.avgFirstReply),
      detail: 'Today, across all channels',
    },
    { label: 'Answered automatically', value: num(stats.auto), detail: `${stats.autoPct}% of today’s tickets` },
    { label: 'Agent time saved today (est.)', value: duration(stats.minutesSaved), detail: 'Sorting, looking up orders and drafting replies' },
  ])

  const screens: DemoScreen<ScreenId>[] = [
    { id: 'help', label: 'Get help', icon: LifeBuoy, audience: 'customer' },
    { id: 'inbox', label: 'Inbox', icon: Inbox, audience: 'team', badge: stats.untriaged || undefined },
    { id: 'reports', label: 'Reports', icon: ChartColumn, audience: 'team' },
    { id: 'rules', label: 'Automation', icon: WandSparkles, audience: 'team' },
  ]

  return (
    <DemoAppShell
      slug={SLUG}
      business={{ name: 'Grysbok Outdoor', descriptor: 'Online outdoor gear store · Cape Town', icon: Tent }}
      accent={ACCENT}
      screens={screens}
      active={screen}
      onChange={setScreen}
      headerRight={
        <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 sm:inline-flex">
          Support desk · {clockTime(now)}
        </span>
      }
    >
      {screen === 'help' && (
        <GetHelpScreen
          settings={settings}
          orders={orders}
          now={now}
          result={tickets.find((t) => t.id === helpResultId)}
          onSubmit={submitHelp}
          onReset={() => setHelpResultId(null)}
          onOpen={openTicket}
        />
      )}
      {screen === 'inbox' && (
        <InboxScreen
          tickets={tickets}
          orders={orders}
          now={now}
          selectedId={selectedId}
          detailOpen={detailOpen}
          run={run}
          onSelect={setSelectedId}
          onDetail={setDetailOpen}
          onRunTriage={runTriage}
          onTriageOne={triageOne}
          onEdit={editTriage}
          onReply={reply}
          onNote={addNote}
          onSolve={solve}
          onEscalate={escalate}
        />
      )}
      {screen === 'reports' && <ReportsScreen tickets={tickets} now={now} />}
      {screen === 'rules' && <AutomationScreen settings={settings} stats={stats} onChange={updateSettings} />}
    </DemoAppShell>
  )
}
