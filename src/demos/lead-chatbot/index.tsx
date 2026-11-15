import { Inbox, MessagesSquare, Settings2, Sofa, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useToast } from '../../components/toast-context'
import { hoursLabel, num } from '../../lib/format'
import { usePersistentState } from '../../lib/storage'
import { uid, useDemoClock, useTicker } from '../../lib/time'
import { useDemoMetrics } from '../metrics'
import { DemoAppShell, type DemoScreen } from '../shell'
import { ChatScreen } from './ChatScreen'
import { createInitialState } from './data'
import { DESIGNER, TEMPERATURE_LABEL, newLiveConversation, quickReplyLabel, respond, type BotMessage } from './engine'
import { InboxScreen } from './InboxScreen'
import { LeadsScreen } from './LeadsScreen'
import { SettingsScreen } from './SettingsScreen'
import type { ChatState, Conversation, LeadStatus, Message, Settings } from './types'

const SLUG = 'ai-lead-chatbot'
const ACCENT = { base: '#0f766e', strong: '#115e59', soft: '#f0fdfa', ink: '#134e4a' }
const BOT_DELAY = 750

/** A canned reply from a sample customer, so taking over a sample chat feels two-way. */
const CANNED_REPLIES: Record<string, string> = {
  'c-kareem':
    'Great, thanks Omar. Tomorrow at 10:00 works for a site visit. The unit is in Dubai Hills Business Park, I’ll send the pin.',
  'c-anon': 'Thanks. Could you email me some examples of past offices?',
}

type ScreenId = 'chat' | 'inbox' | 'leads' | 'settings'

export default function LeadChatbotDemo() {
  const clock = useDemoClock(10, 40)
  const now = useTicker(clock)
  const toast = useToast()
  const [state, setState] = usePersistentState<ChatState>(`${SLUG}.state`, () => createInitialState(clock()), {
    version: 1,
    freshDaily: true,
  })
  const [screen, setScreen] = useState<ScreenId>('chat')
  const [typing, setTyping] = useState(false)
  const [selectedId, setSelectedId] = useState<string>(() => state.conversations.find((c) => c.live)?.id ?? '')
  const timers = useRef<number[]>([])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((t) => window.clearTimeout(t))
  }, [])

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  const live = state.conversations.find((c) => c.live) ?? state.conversations[0]

  const updateConversation = (id: string, fn: (c: Conversation) => Conversation) =>
    setState((s) => ({ ...s, conversations: s.conversations.map((c) => (c.id === id ? fn(c) : c)) }))

  const appendMessage = (id: string, message: Omit<Message, 'id' | 'at'>, extra: Partial<Conversation> = {}) =>
    updateConversation(id, (c) => ({
      ...c,
      ...extra,
      messages: [...c.messages, { ...message, id: uid('m'), at: clock() }],
      updatedAt: clock(),
    }))

  const deliver = (id: string, replies: BotMessage[]) => {
    if (!replies.length) return
    setTyping(true)
    replies.forEach((reply, index) => {
      later(() => {
        appendMessage(id, reply)
        if (index === replies.length - 1) setTyping(false)
      }, BOT_DELAY * (index + 1))
    })
  }

  const restartLive = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
    setTyping(false)
    const fresh = newLiveConversation(state.settings, clock())
    setSelectedId(fresh.id)
    setState((s) => {
      const old = s.conversations.find((c) => c.live)
      const others = s.conversations.filter((c) => !c.live)
      // Keep the old chat in the team inbox if the visitor said anything in it.
      const archived: Conversation[] =
        old && old.messages.some((m) => m.from === 'visitor')
          ? [{ ...old, live: false, status: old.status === 'bot' ? 'closed' : old.status }]
          : []
      return { ...s, conversations: [fresh, ...archived, ...others] }
    })
  }

  const sendVisitor = (input: { text?: string; replyId?: string }) => {
    if (typing || !live) return
    const label = input.replyId ? quickReplyLabel(live, input.replyId) : (input.text ?? '')
    const visitorMessage: Message = { id: uid('m'), from: 'visitor', text: label, at: clock() }
    const withMessage: Conversation = { ...live, messages: [...live.messages, visitorMessage], updatedAt: clock() }
    const result = respond(withMessage, input, state.settings, clock())
    if (result.restart) {
      restartLive()
      return
    }
    setState((s) => {
      let leads = s.leads
      if (result.lead) leads = [result.lead, ...leads]
      if (result.leadStatus && live.leadId) {
        const status = result.leadStatus
        leads = leads.map((l) => (l.id === live.leadId ? { ...l, status } : l))
      }
      const conversation = {
        ...result.conversation,
        unread: result.conversation.unread || live.status === 'agent' || live.status === 'waiting',
      }
      return { ...s, leads, conversations: s.conversations.map((c) => (c.id === live.id ? conversation : c)) }
    })
    deliver(live.id, result.replies)
    if (result.lead) {
      const l = result.lead
      later(
        () => toast(`New ${TEMPERATURE_LABEL[l.temperature].toLowerCase()} lead: ${l.name}, score ${l.score}. It’s in Leads.`, 'success'),
        BOT_DELAY * result.replies.length + 200,
      )
    }
  }

  const openInbox = (conversationId = live?.id) => {
    if (conversationId) setSelectedId(conversationId)
    setScreen('inbox')
  }

  const setLeadStatus = (leadId: string, status: LeadStatus) =>
    setState((s) => ({ ...s, leads: s.leads.map((l) => (l.id === leadId ? { ...l, status } : l)) }))

  const takeOver = (id: string) => {
    appendMessage(id, { from: 'system', text: `${DESIGNER} joined the chat` }, { status: 'agent', assignedTo: DESIGNER, unread: false })
    toast(
      id === live?.id
        ? `You’re now chatting as ${DESIGNER}. Your replies appear in the website chat.`
        : `You’re now chatting as ${DESIGNER}.`,
      'info',
    )
  }

  const reply = (id: string, text: string) => {
    const conv = state.conversations.find((c) => c.id === id)
    appendMessage(id, { from: 'agent', text, author: DESIGNER }, { unread: false })
    if (conv?.leadId) {
      const lead = state.leads.find((l) => l.id === conv.leadId)
      if (lead?.status === 'New') setLeadStatus(lead.id, 'Contacted')
    }
    const canned = CANNED_REPLIES[id]
    const alreadyReplied = conv?.messages.some((m) => m.id.startsWith('canned-'))
    if (canned && !alreadyReplied) {
      later(() => {
        updateConversation(id, (c) => ({
          ...c,
          unread: true,
          updatedAt: clock(),
          messages: [...c.messages, { id: `canned-${uid()}`, from: 'visitor', text: canned, at: clock() }],
        }))
      }, 3500)
    }
  }

  const handBack = (id: string) =>
    appendMessage(id, { from: 'system', text: `${DESIGNER} handed the chat back to Noor` }, { status: 'bot', assignedTo: undefined })

  const closeConversation = (id: string) =>
    appendMessage(id, { from: 'system', text: `${DESIGNER} closed the chat` }, { status: 'closed', unread: false })

  const updateSettings = (settings: Settings) => setState((s) => ({ ...s, settings }))

  const select = (id: string) => {
    setSelectedId(id)
    updateConversation(id, (c) => (c.unread && c.status !== 'waiting' ? { ...c, unread: false } : c))
  }

  const { leads, conversations, settings } = state
  const hot = leads.filter((l) => l.temperature === 'hot').length
  const booked = leads.filter((l) => l.status === 'Meeting booked').length
  const waiting = conversations.filter((c) => c.status === 'waiting').length

  useDemoMetrics([
    { label: 'Leads captured this week', value: num(leads.length), detail: 'From website chat and WhatsApp' },
    { label: 'Hot leads passed to the team', value: num(hot), detail: `Score of ${settings.threshold} or more` },
    { label: 'Meetings booked', value: num(booked), detail: 'By the assistant or the team' },
    { label: 'Team time saved (est.)', value: hoursLabel(leads.length * 12), detail: 'About 12 minutes of qualifying per lead' },
  ])

  const screens: DemoScreen<ScreenId>[] = [
    { id: 'chat', label: 'Website chat', icon: MessagesSquare, audience: 'customer' },
    { id: 'inbox', label: 'Team inbox', icon: Inbox, audience: 'team', badge: waiting || undefined },
    { id: 'leads', label: 'Leads', icon: Users, audience: 'team' },
    { id: 'settings', label: 'Assistant settings', icon: Settings2, audience: 'team' },
  ]

  return (
    <DemoAppShell
      slug={SLUG}
      business={{ name: 'Dunebridge Interiors', descriptor: 'Office fit-out and interiors · Dubai, UAE', icon: Sofa }}
      accent={ACCENT}
      screens={screens}
      active={screen}
      onChange={setScreen}
      headerRight={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
          <span className={settings.afterHours ? 'size-2 rounded-full bg-amber-500' : 'size-2 rounded-full bg-emerald-500'} aria-hidden="true" />
          {settings.afterHours ? 'After hours' : 'Team online'}
        </span>
      }
    >
      {screen === 'chat' && live && (
        <ChatScreen
          conversation={live}
          typing={typing}
          afterHours={settings.afterHours}
          onSend={sendVisitor}
          onAction={(action) => action === 'open-inbox' && openInbox()}
          onRestart={restartLive}
        />
      )}
      {screen === 'inbox' && (
        <InboxScreen
          conversations={conversations}
          leads={leads}
          settings={settings}
          selectedId={selectedId}
          now={now}
          onSelect={select}
          onTakeOver={takeOver}
          onReply={reply}
          onHandBack={handBack}
          onClose={closeConversation}
          onLeadStatus={setLeadStatus}
        />
      )}
      {screen === 'leads' && (
        <LeadsScreen leads={leads} now={now} onLeadStatus={setLeadStatus} onOpenConversation={(id) => openInbox(id)} />
      )}
      {screen === 'settings' && (
        <SettingsScreen
          settings={settings}
          onChange={updateSettings}
          onRestartChat={() => {
            restartLive()
            setScreen('chat')
          }}
        />
      )}
    </DemoAppShell>
  )
}
