import { CalendarPlus, Globe, LayoutDashboard, Leaf, MessageCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useToast } from '../../components/toast-context'
import { useBusinessName } from '../../lib/business-name'
import { num } from '../../lib/format'
import { usePersistentState } from '../../lib/storage'
import { uid, useTicker } from '../../lib/time'
import { GREETING_ID } from '../../receptionist/chat'
import { useDemoMetrics } from '../metrics'
import { DemoAppShell, type DemoScreen } from '../shell'
import { BookScreen } from './BookScreen'
import { BUSINESS, SERVICES, WELLNESS_SLUG } from './business'
import { DEMO_START_MINUTE, createInitialState } from './data'
import {
  addDays,
  checkBooking,
  dayWord,
  emptyDraft,
  firstNameOf,
  maskEmail,
  maskPhone,
  messageLog,
  practiceDay,
  startOf,
  timeLabel,
  validPhone,
} from './engine'
import { OwnerScreen } from './OwnerScreen'
import { SampleBanner } from './parts'
import type { Booking, Draft, Lead, WellnessState } from './types'
import { useAssistantChat } from './useAssistantChat'
import { WebsiteScreen, type LeadInput } from './WebsiteScreen'
import { WhatsAppScreen } from './WhatsAppScreen'
import { planScript, scriptLines, CLIENT, type ScriptPlan } from './whatsapp-script'

const ACCENT = { base: '#0f766e', strong: '#115e59', soft: '#f0fdfa', ink: '#134e4a' }
const SCRIPT_LEAD = 'lead-whatsapp-script'
const PLAY_MS = 1300

type ScreenId = 'website' | 'book' | 'whatsapp' | 'owner'

/**
 * The demo's clock: 09:30 practice time (UTC+2) on today's date when the page opens, then it runs in
 * real time. Slots, the sample bookings, the owner view and the messages all use it, and the screens
 * label it "Demo time", so it is never shown as the real local time.
 */
function usePracticeClock(): () => number {
  const [offset] = useState(() => startOf(practiceDay(Date.now()), DEMO_START_MINUTE) - Date.now())
  return useCallback(() => Date.now() + offset, [offset])
}

export default function WellnessConsultingDemo() {
  const business = useBusinessName()
  const clock = usePracticeClock()
  const now = useTicker(clock)
  const toast = useToast()
  const [state, setState] = usePersistentState<WellnessState>(`${WELLNESS_SLUG}.state`, () => createInitialState(clock()), { version: 1, freshDaily: true })
  const [wa, setWa] = usePersistentState<{ shown: number; plan: ScriptPlan | null }>(`${WELLNESS_SLUG}.whatsapp`, () => ({ shown: 0, plan: null }), {
    version: 1,
    freshDaily: true,
  })
  const [screen, setScreen] = useState<ScreenId>('website')
  const [draft, setDraft] = useState<Draft>(() => emptyDraft())
  const [confirmedId, setConfirmedId] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const chat = useAssistantChat()
  const name = business ?? BUSINESS.name

  /* Booking */

  const confirm = (d: Draft): string | null => {
    const service = SERVICES.find((s) => s.id === d.serviceId)
    if (!service || !d.mode || d.day === undefined || d.minute === undefined) return 'Please choose how to meet, a service and a time.'
    const at = clock()
    const request = { serviceId: service.id, mode: d.mode, practitioner: d.practitioner, day: d.day, minute: d.minute }
    const check = checkBooking(state.bookings, request, at)
    if (!check.ok) return check.message
    const booking: Booking = {
      id: uid('booking'),
      ref: `SL-${state.nextRef}`,
      client: { name: d.name.trim().replace(/\s+/g, ' '), phone: maskPhone(d.phone), email: d.email.trim() ? maskEmail(d.email) : undefined },
      serviceId: service.id,
      practitionerId: check.practitionerId,
      mode: d.mode,
      start: startOf(d.day, d.minute),
      minutes: service.minutes,
      status: 'Booked',
      source: 'Booking page',
      createdAt: at,
      mine: true,
    }
    setState((s) => {
      // Checked again on the latest state, so a double click can never book the same time twice.
      if (!checkBooking(s.bookings, { ...request, practitioner: check.practitionerId }, at).ok) return s
      return { ...s, bookings: [...s.bookings, booking], nextRef: s.nextRef + 1 }
    })
    setConfirmedId(booking.id)
    toast(`Booked: ${service.name} with ${firstNameOf(check.practitionerId)} ${dayWord(d.day, at)} at ${timeLabel(booking.start)}. Ref ${booking.ref}.`, 'success')
    return null
  }

  /* Leads from the website chat */

  const addLead = (input: LeadInput) => {
    const lead: Lead = {
      id: uid('lead'),
      name: input.name,
      contact: validPhone(input.contact) ? maskPhone(input.contact) : maskEmail(input.contact),
      source: 'Website chat',
      interest: input.interest,
      // Not what they typed in the chat: it could hold health details, which the practice doesn't collect.
      note: input.handover ? 'Asked to talk to a person' : 'Left their details in the website chat',
      at: clock(),
      status: input.handover ? 'Handed over' : 'New',
      mine: true,
    }
    setState((s) => ({ ...s, leads: [lead, ...s.leads] }))
    const first = input.name.split(' ')[0]
    chat.addNote(
      input.handover
        ? `Handed over to the team. Thanks, ${first}: a person from ${BUSINESS.name} will contact you during office hours. You can keep asking ${BUSINESS.assistant} questions meanwhile.`
        : `Thanks, ${first}. Your details are with the ${BUSINESS.name} team, who will contact you during office hours.`,
      input.handover,
    )
    toast(`New lead in the Owner view: ${input.name}, from the website chat.`, 'success')
  }

  /* The WhatsApp simulation */

  const lines = scriptLines(wa.plan ?? planScript(state.bookings, now, `SL-${state.nextRef}`))
  const shown = Math.min(wa.shown, lines.length)

  const next = useCallback(() => {
    setWa((w) => ({ plan: w.plan ?? planScript(state.bookings, clock(), `SL-${state.nextRef}`), shown: w.shown + 1 }))
  }, [setWa, state.bookings, state.nextRef, clock])

  // "Play all" runs until the last line.
  const autoPlaying = playing && shown < lines.length
  useEffect(() => {
    if (!autoPlaying) return
    const id = window.setTimeout(next, shown === 0 ? 200 : PLAY_MS)
    return () => window.clearTimeout(id)
  }, [autoPlaying, shown, next])

  // What the conversation does in the practice's system: the booking, the lead and the hand-over.
  const booked = wa.plan?.booking && lines.slice(0, shown).some((l) => l.action === 'book') ? wa.plan.booking : null
  const handedOver = lines.slice(0, shown).some((l) => l.action === 'handover')
  useEffect(() => {
    if (!wa.plan || shown === 0) return
    setState((s) => {
      let changed = false
      let { bookings, leads, nextRef } = s
      if (booked && !bookings.some((b) => b.id === booked.id)) {
        bookings = [...bookings, booked]
        nextRef += 1
        changed = true
      }
      const status: Lead['status'] = handedOver ? 'Handed over' : booked ? 'Booked' : 'New'
      const existing = leads.find((l) => l.id === SCRIPT_LEAD)
      if (!existing) {
        leads = [
          {
            id: SCRIPT_LEAD,
            name: CLIENT.name,
            contact: CLIENT.phone,
            source: 'WhatsApp',
            interest: 'Online consultation',
            note: 'From the WhatsApp conversation: found the practice on Facebook',
            at: wa.plan?.booking?.createdAt ?? clock(),
            status,
          },
          ...leads,
        ]
        changed = true
      } else if (existing.status !== status && existing.status !== 'Contacted') {
        leads = leads.map((l) => (l.id === SCRIPT_LEAD ? { ...l, status, note: handedOver ? 'Booked on WhatsApp, then asked for a call about a booking for her mother' : l.note } : l))
        changed = true
      }
      return changed ? { ...s, bookings, leads, nextRef } : s
    })
  }, [wa.plan, shown, booked, handedOver, setState, clock])

  const restartScript = () => {
    setPlaying(false)
    setWa({ shown: 0, plan: null })
    setState((s) => ({ ...s, bookings: s.bookings.filter((b) => b.id !== 'whatsapp-script'), leads: s.leads.filter((l) => l.id !== SCRIPT_LEAD) }))
  }

  /* Owner actions */

  const contacted = (id: string) => setState((s) => ({ ...s, leads: s.leads.map((l) => (l.id === id ? { ...l, status: 'Contacted' } : l)) }))
  const remind = (id: string) => {
    const b = state.bookings.find((x) => x.id === id)
    setState((s) => ({ ...s, remindedAt: { ...s.remindedAt, [id]: clock() } }))
    if (b) toast(`Reminder sent to ${b.client.name.split(' ')[0]} on WhatsApp (simulated).`, 'success')
  }

  /* Live figures */

  const today = practiceDay(now)
  const week = state.bookings.filter((b) => b.status !== 'Cancelled' && practiceDay(b.start) >= today && practiceDay(b.start) <= addDays(today, 7))
  const sent = messageLog(state.bookings, now, state.remindedAt).filter((m) => m.sent).length
  const answered = chat.messages.filter((m) => m.role === 'assistant' && m.id !== GREETING_ID).length
  useDemoMetrics([
    { label: 'Enquiries captured', value: num(state.leads.length), detail: 'Website chat, WhatsApp, Facebook, LinkedIn' },
    { label: 'Bookings, next 7 days', value: num(week.length), detail: `${week.filter((b) => b.mode === 'online').length} online consultations` },
    { label: 'Questions answered', value: num(answered), detail: 'By the assistant in this chat' },
    { label: 'WhatsApp messages sent', value: num(sent), detail: 'Confirmations and reminders' },
  ])

  const screens: DemoScreen<ScreenId>[] = [
    { id: 'website', label: 'Website & assistant', icon: Globe, audience: 'customer' },
    { id: 'book', label: 'Book', icon: CalendarPlus, audience: 'customer' },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, audience: 'customer' },
    { id: 'owner', label: 'Owner view', icon: LayoutDashboard, audience: 'team', badge: state.leads.filter((l) => l.status === 'New' || l.status === 'Handed over').length },
  ]

  return (
    <DemoAppShell
      slug={WELLNESS_SLUG}
      business={{ name, descriptor: business ? 'Your business, sample data' : BUSINESS.descriptor, icon: Leaf }}
      accent={ACCENT}
      screens={screens}
      active={screen}
      onChange={setScreen}
      headerRight={
        <span
          title="The demo's own clock: it starts at 09:30 when the page opens, so there are times to book today"
          className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 sm:inline-flex"
        >
          Demo time {timeLabel(now)}, UTC+2
        </span>
      }
    >
      <SampleBanner personalised={!!business} />
      {screen === 'website' && (
        <WebsiteScreen
          business={business}
          messages={chat.messages}
          pending={chat.pending}
          busy={chat.busy}
          limitReached={chat.limitReached}
          handedOver={chat.handedOver}
          onSend={(text) => void chat.send(text)}
          onRestart={chat.restart}
          onLead={addLead}
          onBook={() => setScreen('book')}
        />
      )}
      {screen === 'book' && (
        <BookScreen
          business={business}
          draft={draft}
          onDraft={setDraft}
          bookings={state.bookings}
          now={now}
          confirmed={state.bookings.find((b) => b.id === confirmedId)}
          onConfirm={confirm}
          onAnother={() => {
            setConfirmedId(null)
            setDraft((d) => emptyDraft(d))
          }}
          onOwner={() => setScreen('owner')}
        />
      )}
      {screen === 'whatsapp' && (
        <WhatsAppScreen
          business={business}
          lines={lines}
          shown={shown}
          playing={autoPlaying}
          onNext={next}
          onPlay={() => setPlaying(true)}
          onRestart={restartScript}
          onOwner={() => setScreen('owner')}
        />
      )}
      {screen === 'owner' && (
        <OwnerScreen bookings={state.bookings} leads={state.leads} remindedAt={state.remindedAt} now={now} onContacted={contacted} onRemind={remind} />
      )}
    </DemoAppShell>
  )
}
