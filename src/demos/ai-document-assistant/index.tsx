import { ChartColumn, Library, MessageCircle, MessageSquareText, Warehouse } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '../../components/toast-context'
import { clockTime, duration, num } from '../../lib/format'
import { usePersistentState } from '../../lib/storage'
import { DAY, uid, useDemoClock, useTicker } from '../../lib/time'
import { useDemoMetrics } from '../metrics'
import { DemoAppShell, type DemoScreen } from '../shell'
import { AskScreen } from './AskScreen'
import { CustomerChatScreen } from './CustomerChatScreen'
import { CUSTOMER, HANDOFF_REPLY, LOOKUP_MINUTES, OWNER, answerMs, createInitialState, insightStats, recordAnswer } from './data'
import { BUSINESS, DELIVERY, FAQ_ID, faqDoc } from './docs'
import { DocumentsScreen } from './DocumentsScreen'
import { HANDOFF_WORDS, answer, indexDocuments } from './engine'
import { InsightsScreen } from './InsightsScreen'
import { plainKey } from './text'
import type { AppState, Channel, ChatMessage, Doc } from './types'

const SLUG = 'ai-document-assistant'
const ACCENT = { base: '#334155', strong: '#1e293b', soft: '#f1f5f9', ink: '#1e293b' }

type ScreenId = 'ask' | 'whatsapp' | 'docs' | 'insights'

export default function AiDocumentAssistantDemo() {
  const clock = useDemoClock(7, 45)
  const now = useTicker(clock)
  // The WhatsApp screen shows last night, after the counter closed.
  const night = useDemoClock(21, 40)
  const toast = useToast()
  const [state, setState] = usePersistentState<AppState>(`${SLUG}.state`, createInitialState, { version: 1, freshDaily: true })
  // Documents too big for localStorage, kept for this visit only.
  const [visitDocs, setVisitDocs] = useState<Doc[]>([])
  const [screen, setScreen] = useState<ScreenId>('ask')
  const [answerFor, setAnswerFor] = useState<string | null>(null)
  // The question being answered, per chat. Not persisted, so a reload never leaves a chat stuck.
  const [pending, setPending] = useState<Partial<Record<Channel, ChatMessage>>>({})
  const timers = useRef<number[]>([])

  useEffect(() => {
    const list = timers.current
    return () => list.forEach((t) => window.clearTimeout(t))
  }, [])

  const docs = useMemo(() => [...state.docs, ...visitDocs], [state.docs, visitDocs])
  const index = useMemo(() => indexDocuments(docs), [docs])
  const ratings = useMemo(() => new Map(state.log.map((e) => [e.id, e.helpful])), [state.log])
  const usage = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const e of state.log) for (const id of e.docIds) counts[id] = (counts[id] ?? 0) + 1
    return counts
  }, [state.log])

  const ask = (channel: Channel, question: string, pick?: { rowId: string; label: string }) => {
    const q = question.trim()
    if (!q || pending[channel]) return
    const at = channel === 'counter' ? clock() : night() - DAY
    const user: ChatMessage = { id: uid('m'), role: 'user', at, text: pick?.label ?? q }
    const a = answer(q, index, { rules: DELIVERY, owner: OWNER, rowId: pick?.rowId })
    const ms = answerMs(q + (pick?.rowId ?? ''))
    const offerHandoff = channel === 'whatsapp' && (HANDOFF_WORDS.test(q.toLowerCase()) || a.reason === 'not-found')
    setPending((p) => ({ ...p, [channel]: user }))
    timers.current.push(
      window.setTimeout(() => {
        setPending((p) => ({ ...p, [channel]: undefined }))
        setState((s) => recordAnswer(s, { channel, user, question: q, answer: a, ms, offerHandoff }))
      }, ms),
    )
  }

  const rate = (logId: string, helpful: boolean) =>
    setState((s) => ({ ...s, log: s.log.map((e) => (e.id === logId ? { ...e, helpful: e.helpful === helpful ? null : helpful } : e)) }))

  const handoff = (messageId: string) => {
    const message = state.customerChat.find((m) => m.id === messageId)
    if (message?.handoff !== 'offered') return
    const at = night() - DAY
    setState((s) => ({
      ...s,
      handoffs: [...s.handoffs, { id: uid('h'), at, customer: CUSTOMER.name, phone: CUSTOMER.phone, question: message.question ?? '' }],
      customerChat: [
        ...s.customerChat.map((m) => (m.id === messageId ? { ...m, handoff: 'sent' as const } : m)),
        { id: uid('m'), role: 'assistant' as const, at, text: HANDOFF_REPLY },
      ].slice(-40),
    }))
    toast('Passed to the counter team. It’s listed in Insights.', 'success')
  }

  const toggleDoc = (id: string, enabled: boolean) => {
    const doc = docs.find((d) => d.id === id)
    if (visitDocs.some((d) => d.id === id)) setVisitDocs((v) => v.map((d) => (d.id === id ? { ...d, enabled } : d)))
    else setState((s) => ({ ...s, docs: s.docs.map((d) => (d.id === id ? { ...d, enabled } : d)) }))
    toast(enabled ? `${doc?.title} is back in answers.` : `${doc?.title} is left out of answers.`, 'info')
  }

  const addDoc = (doc: Doc) => {
    if (doc.transient) setVisitDocs((v) => [...v, doc])
    else setState((s) => ({ ...s, docs: [...s.docs, doc] }))
    toast(`${doc.title} added. The assistant can answer from it now.`, 'success')
  }

  const removeDoc = (id: string) => {
    const doc = docs.find((d) => d.id === id)
    setVisitDocs((v) => v.filter((d) => d.id !== id))
    setState((s) => ({ ...s, docs: s.docs.filter((d) => d.id !== id) }))
    toast(`${doc?.title ?? 'Document'} removed from the assistant.`, 'info')
  }

  const addAnswer = (gapId: string, question: string, text: string, docId: string) => {
    const at = clock()
    const section = { id: uid('q'), heading: question, paragraphs: [text] }
    const target = state.docs.find((d) => d.id === docId)
    setState((s) => ({
      ...s,
      docs:
        docId === FAQ_ID && !s.docs.some((d) => d.id === FAQ_ID)
          ? [...s.docs, { ...faqDoc(at), sections: [section] }]
          : s.docs.map((d) => (d.id === docId ? { ...d, enabled: true, updatedAt: at, sections: [...(d.sections ?? []), section] } : d)),
      gaps: s.gaps.map((g) => (g.id === gapId ? { ...g, question, status: 'answered' as const, answeredAt: at, docId } : g)),
    }))
    toast(`Answer saved to ${target?.title ?? 'Frequently asked questions'}. Ask the question again to check it.`, 'success')
  }

  const askOnCounter = (question: string) => {
    setScreen('ask')
    ask('counter', question)
  }

  const openAnswerForm = (question: string) => {
    const key = plainKey(question)
    setAnswerFor(state.gaps.find((g) => plainKey(g.question) === key)?.id ?? null)
    setScreen('insights')
  }

  const stats = insightStats(state.log, state.handoffs)
  const openGaps = state.gaps.filter((g) => g.status === 'open').length

  useDemoMetrics([
    { label: 'Questions answered today', value: num(stats.answered), detail: `${stats.answeredPct}% from the documents, with sources` },
    { label: 'Average answer time', value: `${(stats.avgMs / 1000).toFixed(1)} s`, detail: `Counter staff looked up ~${LOOKUP_MINUTES} min` },
    { label: 'Unanswered questions', value: num(openGaps), detail: 'Add answers to close the gaps' },
    {
      label: 'Counter time saved today (est.)',
      value: duration(stats.answered * LOOKUP_MINUTES),
      detail: 'Looking things up in price lists and policies',
    },
  ])

  const screens: DemoScreen<ScreenId>[] = [
    { id: 'ask', label: 'Ask', icon: MessageSquareText, audience: 'team' },
    { id: 'whatsapp', label: 'Customer chat', icon: MessageCircle, audience: 'customer' },
    { id: 'docs', label: 'Documents', icon: Library, audience: 'team' },
    { id: 'insights', label: 'Insights', icon: ChartColumn, audience: 'team', badge: openGaps || undefined },
  ]

  return (
    <DemoAppShell
      slug={SLUG}
      business={{ name: BUSINESS.name, descriptor: BUSINESS.descriptor, icon: Warehouse }}
      accent={ACCENT}
      screens={screens}
      active={screen}
      onChange={(id) => {
        setAnswerFor(null)
        setScreen(id)
      }}
      headerRight={
        <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 sm:inline-flex">
          Trade counter · {clockTime(now)}
        </span>
      }
    >
      {screen === 'ask' && (
        <AskScreen
          messages={state.counterChat}
          pending={pending.counter ?? null}
          docsInUse={docs.filter((d) => d.enabled).length}
          ratings={ratings}
          onAsk={(q, pick) => ask('counter', q, pick)}
          onRate={rate}
          onAddAnswer={openAnswerForm}
        />
      )}
      {screen === 'whatsapp' && (
        <CustomerChatScreen messages={state.customerChat} pending={pending.whatsapp ?? null} onAsk={(q, pick) => ask('whatsapp', q, pick)} onHandoff={handoff} />
      )}
      {screen === 'docs' && (
        <DocumentsScreen docs={docs} usage={usage} index={index} now={now} onToggle={toggleDoc} onAdd={addDoc} onRemove={removeDoc} onAsk={askOnCounter} />
      )}
      {screen === 'insights' && (
        <InsightsScreen
          log={state.log}
          gaps={state.gaps}
          handoffs={state.handoffs}
          docs={state.docs}
          now={now}
          initialGapId={answerFor}
          onAddAnswer={addAnswer}
          onAskAgain={askOnCounter}
        />
      )}
    </DemoAppShell>
  )
}
