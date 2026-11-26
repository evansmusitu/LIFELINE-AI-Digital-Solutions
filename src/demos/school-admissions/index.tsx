import { CalendarPlus, Globe, GraduationCap, LayoutDashboard, MessageCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useToast } from '../../components/toast-context'
import { useBusinessName } from '../../lib/business-name'
import { num } from '../../lib/format'
import { usePersistentState } from '../../lib/storage'
import { uid, useTicker } from '../../lib/time'
import { GREETING_ID } from '../../receptionist/chat'
import { useDemoMetrics } from '../metrics'
import { DemoAppShell, type DemoScreen } from '../shell'
import { SCHOOL, SCHOOL_SLUG } from './business'
import { createInitialState } from './data'
import {
  PARENTS_ON_LIST,
  checkTour,
  childLabel,
  cleanName,
  dayWord,
  documentReminder,
  documentsFor,
  firstFreeTour,
  freeRef,
  maskContact,
  maskPhone,
  placesLeft,
  schoolDay,
  stageFor,
  timeLabel,
} from './engine'
import { OfficeScreen } from './OfficeScreen'
import { SampleBanner } from './parts'
import type { Application, Enquiry, SchoolState, Tour } from './types'
import { useAssistantChat } from './useAssistantChat'
import { VisitScreen, type ApplyInput, type TourInput } from './VisitScreen'
import { WebsiteScreen, type LeadInput } from './WebsiteScreen'
import { WhatsAppScreen } from './WhatsAppScreen'
import { PARENT, SCRIPT_ENQUIRY, SCRIPT_TOUR, scriptLines, type ScriptPlan } from './whatsapp-script'

const ACCENT = { base: '#3730a3', strong: '#312e81', soft: '#eef2ff', ink: '#312e81' }
const PLAY_MS = 1400

type ScreenId = 'website' | 'visit' | 'whatsapp' | 'office'

/** Every reference in use: tours and applications share one sequence. */
const usedRefs = (s: SchoolState) => [...s.tours, ...s.applications]

export default function SchoolAdmissionsDemo() {
  const business = useBusinessName()
  const clock = useCallback(() => Date.now(), [])
  const now = useTicker(clock)
  const toast = useToast()
  const [state, setState] = usePersistentState<SchoolState>(`${SCHOOL_SLUG}.state`, () => createInitialState(Date.now()), { version: 1, freshDaily: true })
  const [wa, setWa] = usePersistentState<{ shown: number; plan: ScriptPlan | null }>(`${SCHOOL_SLUG}.whatsapp`, () => ({ shown: 0, plan: null }), {
    version: 1,
    freshDaily: true,
  })
  const [screen, setScreen] = useState<ScreenId>('website')
  const [bookedTourId, setBookedTourId] = useState<string | null>(null)
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const chat = useAssistantChat()
  const name = business ?? SCHOOL.name

  /* Tours and applications */

  const bookTour = (input: TourInput): string | null => {
    const at = Date.now()
    const check = checkTour(state.tours, input.start, at)
    if (!check.ok) return check.message
    const tour: Tour = {
      id: uid('tour'),
      ref: freeRef(usedRefs(state), state.nextRef).ref,
      parent: cleanName(input.parent),
      contact: maskPhone(input.phone),
      grade: input.grade,
      start: input.start,
      source: 'Tour page',
      createdAt: at,
      mine: true,
    }
    setState((s) => {
      // Checked again on the latest state, so a double click can never overfill a tour.
      if (!checkTour(s.tours, input.start, at).ok) return s
      const { ref, next } = freeRef(usedRefs(s), s.nextRef)
      return { ...s, tours: [...s.tours, { ...tour, ref }], nextRef: next }
    })
    setBookedTourId(tour.id)
    toast(`Tour booked ${dayWord(schoolDay(tour.start), at)} at ${timeLabel(tour.start)}. Ref ${tour.ref}.`, 'success')
    return null
  }

  const apply = (input: ApplyInput): string | null => {
    const at = Date.now()
    // Only the documents this grade and entry need, in case the form changed after something was ticked.
    const docs = Object.fromEntries(documentsFor(input.grade, input.entry).map((d) => [d.id, !!input.docs[d.id]]))
    const base = { grade: input.grade, entry: input.entry, docs }
    const application: Application = {
      id: uid('application'),
      ref: freeRef(usedRefs(state), state.nextRef).ref,
      child: childLabel(input.child),
      parent: cleanName(input.parent),
      contact: maskPhone(input.phone),
      ...base,
      consent: true,
      stage: stageFor(base, placesLeft(input.grade, state.applications)),
      sibling: input.sibling,
      source: 'Application',
      at,
      mine: true,
    }
    setState((s) => {
      const { ref, next } = freeRef(usedRefs(s), s.nextRef)
      return { ...s, applications: [{ ...application, ref }, ...s.applications], nextRef: next }
    })
    setApplicationId(application.id)
    toast(`Application ${application.ref} received for ${application.child}.`, 'success')
    return null
  }

  /* Leads from the website chat */

  const addLead = (input: LeadInput) => {
    const enquiry: Enquiry = {
      id: uid('enquiry'),
      parent: input.name,
      contact: maskContact(input.contact),
      source: 'Website chat',
      grade: input.grade,
      entry: input.entry,
      // Not what they typed in the chat: it could hold a child's details.
      note: input.handover ? 'Asked to talk to a person' : 'Left their details in the website chat',
      at: Date.now(),
      firstReplyMinutes: 0,
      status: input.handover ? 'Handed over' : 'New',
      mine: true,
    }
    setState((s) => ({ ...s, enquiries: [enquiry, ...s.enquiries] }))
    const first = input.name.split(' ')[0]
    chat.addNote(
      input.handover
        ? `Handed over to the admissions office. Thanks, ${first}: a person from ${SCHOOL.name} will contact you during office hours. You can keep asking ${SCHOOL.assistant} questions meanwhile.`
        : `Thanks, ${first}. Your details are with the ${SCHOOL.name} admissions office, who will contact you during office hours.`,
      input.handover,
    )
    toast(`New enquiry in the admissions office: ${input.name}, ${input.grade}.`, 'success')
  }

  /* The WhatsApp simulation */

  const plan = wa.plan ?? { tourStart: firstFreeTour(state.tours, now), ref: freeRef(usedRefs(state), state.nextRef).ref }
  const lines = scriptLines(plan)
  const shown = Math.min(wa.shown, lines.length)

  const next = useCallback(() => {
    setWa((w) => ({
      plan: w.plan ?? { tourStart: firstFreeTour(state.tours, Date.now()), ref: freeRef(usedRefs(state), state.nextRef).ref },
      shown: w.shown + 1,
    }))
  }, [setWa, state])

  const autoPlaying = playing && shown < lines.length
  useEffect(() => {
    if (!autoPlaying) return
    const id = window.setTimeout(next, shown === 0 ? 200 : PLAY_MS)
    return () => window.clearTimeout(id)
  }, [autoPlaying, shown, next])

  // What the conversation does in the school's system: the enquiry, the tour and the hand-over.
  const toured = wa.plan?.tourStart && lines.slice(0, shown).some((l) => l.action === 'tour') ? wa.plan : null
  const handedOver = lines.slice(0, shown).some((l) => l.action === 'handover')
  useEffect(() => {
    if (!wa.plan || shown === 0) return
    setState((s) => {
      let { tours, enquiries, nextRef } = s
      let changed = false
      if (toured?.tourStart && !tours.some((t) => t.id === SCRIPT_TOUR) && checkTour(tours, toured.tourStart, Date.now()).ok) {
        const taken = usedRefs(s).some((u) => u.ref === toured.ref)
        const { ref, next: after } = taken ? freeRef(usedRefs(s), nextRef) : { ref: toured.ref, next: Math.max(nextRef, Number(toured.ref.slice(4)) + 1) }
        tours = [...tours, { id: SCRIPT_TOUR, ref, parent: PARENT.name, contact: PARENT.phone, grade: 'Form 2', start: toured.tourStart, source: 'WhatsApp', createdAt: Date.now() }]
        nextRef = after
        changed = true
      }
      const status: Enquiry['status'] = handedOver ? 'Handed over' : toured ? 'Tour booked' : 'New'
      const existing = enquiries.find((e) => e.id === SCRIPT_ENQUIRY)
      if (!existing) {
        enquiries = [
          {
            id: SCRIPT_ENQUIRY,
            parent: PARENT.name,
            contact: PARENT.phone,
            source: 'WhatsApp',
            grade: 'Form 2',
            entry: 'Mid-year transfer',
            note: 'Moving back from Johannesburg in April. Father in the UK will pay part of the fees',
            at: Date.now(),
            firstReplyMinutes: 0,
            status,
          },
          ...enquiries,
        ]
        changed = true
      } else if (existing.status !== status && existing.status !== 'Contacted') {
        enquiries = enquiries.map((e) => (e.id === SCRIPT_ENQUIRY ? { ...e, status, note: handedOver ? 'Tour booked on WhatsApp. Asked the bursar to call about a monthly plan' : e.note } : e))
        changed = true
      }
      return changed ? { ...s, tours, enquiries, nextRef } : s
    })
  }, [wa.plan, shown, toured, handedOver, setState])

  const restartScript = () => {
    setPlaying(false)
    setWa({ shown: 0, plan: null })
    setState((s) => ({ ...s, tours: s.tours.filter((t) => t.id !== SCRIPT_TOUR), enquiries: s.enquiries.filter((e) => e.id !== SCRIPT_ENQUIRY) }))
  }

  /* Office actions */

  const contacted = (id: string) => setState((s) => ({ ...s, enquiries: s.enquiries.map((e) => (e.id === id ? { ...e, status: 'Contacted' } : e)) }))

  const remindDocs = (id: string) => {
    const a = state.applications.find((x) => x.id === id)
    setState((s) => ({ ...s, applications: s.applications.map((x) => (x.id === id ? { ...x, remindedAt: Date.now() } : x)) }))
    if (a) toast(`Sent to ${a.parent.split(' ')[0]} on WhatsApp (simulated): “${documentReminder(a).split('\n')[1]}”`, 'success')
  }

  const advance = (id: string) =>
    setState((s) => ({
      ...s,
      applications: s.applications.map((a) => {
        if (a.id !== id) return a
        if (a.stage === 'Complete') return { ...a, stage: 'Assessment booked' }
        if (a.stage === 'Assessment booked' && placesLeft(a.grade, s.applications) > 0) return { ...a, stage: 'Offer made' }
        return a
      }),
    }))

  const sendNotice = (title: string, body: string) => {
    setState((s) => ({ ...s, notices: [{ id: uid('notice'), title, body, at: Date.now(), reach: PARENTS_ON_LIST, urgent: true }, ...s.notices] }))
    toast(`Notice sent to ${num(PARENTS_ON_LIST)} parents on WhatsApp and posted on the website (simulated).`, 'success')
  }

  /* Live figures */

  const answered = chat.messages.filter((m) => m.role === 'assistant' && m.id !== GREETING_ID).length
  useDemoMetrics([
    { label: 'Enquiries captured', value: num(state.enquiries.length), detail: 'Website chat, WhatsApp, Facebook, phone' },
    { label: 'Tours booked', value: num(state.tours.length), detail: 'Next two weeks' },
    { label: 'Applications', value: num(state.applications.length), detail: `${num(state.applications.filter((a) => a.stage === 'Documents missing').length)} missing documents` },
    { label: 'Questions answered', value: num(answered), detail: 'By the assistant in this chat' },
  ])

  const screens: DemoScreen<ScreenId>[] = [
    { id: 'website', label: 'Website & assistant', icon: Globe, audience: 'customer' },
    { id: 'visit', label: 'Tour & apply', icon: CalendarPlus, audience: 'customer' },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, audience: 'customer' },
    {
      id: 'office',
      label: 'Admissions office',
      icon: LayoutDashboard,
      audience: 'team',
      badge: state.enquiries.filter((e) => e.status === 'New' || e.status === 'Handed over').length,
    },
  ]

  return (
    <DemoAppShell
      slug={SCHOOL_SLUG}
      business={{ name, descriptor: business ? 'Your school, sample data' : SCHOOL.descriptor, icon: GraduationCap }}
      accent={ACCENT}
      screens={screens}
      active={screen}
      onChange={setScreen}
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
          notices={state.notices}
          onSend={(text) => void chat.send(text)}
          onRestart={chat.restart}
          onLead={addLead}
          onVisit={() => setScreen('visit')}
        />
      )}
      {screen === 'visit' && (
        <VisitScreen
          business={business}
          now={now}
          tours={state.tours}
          applications={state.applications}
          bookedTour={state.tours.find((t) => t.id === bookedTourId)}
          submitted={state.applications.find((a) => a.id === applicationId)}
          onBookTour={bookTour}
          onApply={apply}
          onAnother={() => {
            setBookedTourId(null)
            setApplicationId(null)
          }}
          onOffice={() => setScreen('office')}
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
          onOffice={() => setScreen('office')}
        />
      )}
      {screen === 'office' && (
        <OfficeScreen
          business={business}
          now={now}
          enquiries={state.enquiries}
          tours={state.tours}
          applications={state.applications}
          notices={state.notices}
          onContacted={contacted}
          onRemindDocs={remindDocs}
          onAdvance={advance}
          onSendNotice={sendNotice}
        />
      )}
    </DemoAppShell>
  )
}
