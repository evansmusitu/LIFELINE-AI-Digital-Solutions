import { BellRing, CalendarDays, ClipboardCheck, HeartPulse, Pill } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useToast } from '../../components/toast-context'
import { clockTime, duration, num } from '../../lib/format'
import { usePersistentState } from '../../lib/storage'
import { DAY, isSameDay, todayAt, tomorrowAt, uid, useDemoClock, useTicker } from '../../lib/time'
import { useDemoMetrics } from '../metrics'
import { DemoAppShell, type DemoScreen } from '../shell'
import { CLINICIANS, createInitialState, medicineFlags, stockOf, takeStock } from './data'
import { readyMessage } from './messages'
import { DispensingScreen, StockScreen } from './PharmacyScreens'
import { RemindersScreen } from './RemindersScreen'
import { TodayScreen, type BookingInput } from './TodayScreen'
import type { Appointment, ClinicState, Prescription, Reminder, ReminderKind, RxItem } from './types'

const SLUG = 'clinic-pharmacy'
const ACCENT = { base: '#0369a1', strong: '#075985', soft: '#f0f9ff', ink: '#0c4a6e' }

type ScreenId = 'today' | 'reminders' | 'stock' | 'dispensing'

/** How sample patients answer reminders in this demo. */
const REPLIES: Record<string, { text: string; status: Reminder['status'] } | null> = {
  p27: { text: '2', status: 'New time requested' },
  p28: null,
}

export default function ClinicPharmacyDemo() {
  const clock = useDemoClock(10, 40)
  const now = useTicker(clock, 15_000)
  const toast = useToast()
  const [state, setState] = usePersistentState<ClinicState>(`${SLUG}.state`, createInitialState, { version: 2, freshDaily: true })
  const [screen, setScreen] = useState<ScreenId>('today')
  const timers = useRef<number[]>([])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((t) => window.clearTimeout(t))
  }, [])

  const { patients, appointments, medicines, prescriptions, reminders, templates } = state
  const patientName = (id: string) => patients.find((p) => p.id === id)?.name ?? 'Patient'
  const updateAppt = (id: string, patch: Partial<Appointment>) =>
    setState((s) => ({ ...s, appointments: s.appointments.map((a) => (a.id === id ? { ...a, ...patch } : a)) }))

  const checkIn = (id: string) => {
    const appt = appointments.find((a) => a.id === id)
    if (!appt) return
    updateAppt(id, { status: 'Arrived', arrivedAt: clock() })
    toast(`${patientName(appt.patientId)} checked in for ${CLINICIANS.find((c) => c.id === appt.clinicianId)?.short}.`, 'success')
  }

  const callIn = (id: string) => {
    const appt = appointments.find((a) => a.id === id)
    if (!appt) return
    const busy = appointments.find((a) => a.clinicianId === appt.clinicianId && a.status === 'With clinician')
    if (busy) {
      toast(`${CLINICIANS.find((c) => c.id === appt.clinicianId)?.short} is still with ${patientName(busy.patientId)}. Complete that visit first.`, 'warning')
      return
    }
    updateAppt(id, { status: 'With clinician', startedAt: clock() })
    toast(`${patientName(appt.patientId)} called in to ${CLINICIANS.find((c) => c.id === appt.clinicianId)?.room}.`, 'info')
  }

  const complete = (id: string, items: RxItem[]) => {
    const appt = appointments.find((a) => a.id === id)
    if (!appt) return
    const rx: Prescription | null = items.length
      ? {
          id: uid('rx'),
          number: `RX-${state.nextRx}`,
          patientId: appt.patientId,
          clinicianId: appt.clinicianId,
          at: clock(),
          items,
          status: 'Waiting',
          source: 'Consultation',
        }
      : null
    setState((s) => ({
      ...s,
      appointments: s.appointments.map((a) => (a.id === id ? { ...a, status: 'Done', finishedAt: clock() } : a)),
      prescriptions: rx ? [rx, ...s.prescriptions] : s.prescriptions,
      nextRx: rx ? s.nextRx + 1 : s.nextRx,
    }))
    toast(rx ? `Visit complete. ${rx.number} is in the pharmacy queue.` : `Visit complete for ${patientName(appt.patientId)}.`, 'success')
  }

  const noShow = (id: string) => {
    const appt = appointments.find((a) => a.id === id)
    if (!appt) return
    const reminder: Reminder = {
      id: uid('rem'),
      kind: 'missed',
      patientId: appt.patientId,
      clinicianId: appt.clinicianId,
      when: `today at ${clockTime(appt.start)}`,
      sendAt: clock() + 5 * 60_000,
      status: 'Scheduled',
      channel: 'WhatsApp',
    }
    setState((s) => ({
      ...s,
      appointments: s.appointments.map((a) => (a.id === id ? { ...a, status: 'No-show' } : a)),
      reminders: [...s.reminders, reminder],
    }))
    toast(`Marked as a no-show. A follow-up message for ${patientName(appt.patientId)} is ready in Reminders.`, 'info')
  }

  const book = (input: BookingInput) => {
    let patientId = input.patientId
    const newPatient = input.newPatient ? { id: uid('p'), name: input.newPatient.name, age: '–', phone: input.newPatient.phone } : null
    if (newPatient) patientId = newPatient.id
    if (!patientId) return
    const [h, m] = input.time.split(':').map(Number)
    const doctor = CLINICIANS.find((c) => c.id === input.clinicianId)
    const appt: Appointment = {
      id: uid('a'),
      patientId,
      clinicianId: input.clinicianId,
      serviceId: input.serviceId,
      start: input.day === 'today' ? todayAt(h, m) : tomorrowAt(h, m),
      status: input.confirm ? 'Confirmed' : 'Booked',
    }
    // Tomorrow's visits also get the usual day-before reminder, linked to the appointment.
    const reminder: Reminder | null =
      input.day === 'tomorrow'
        ? {
            id: uid('rem'),
            kind: 'day-before',
            patientId,
            appointmentId: appt.id,
            clinicianId: input.clinicianId,
            when: `tomorrow at ${input.time}`,
            sendAt: todayAt(16, 0),
            status: 'Scheduled',
            channel: 'WhatsApp',
          }
        : null
    setState((s) => ({
      ...s,
      patients: newPatient ? [...s.patients, newPatient] : s.patients,
      appointments: [...s.appointments, appt],
      reminders: reminder ? [...s.reminders, reminder] : s.reminders,
    }))
    const who = newPatient?.name ?? patientName(patientId)
    toast(
      `Booked ${who} with ${doctor?.short} ${input.day} at ${input.time}.${input.confirm ? ' WhatsApp confirmation sent.' : ''}${input.day === 'tomorrow' ? ' It’s under Tomorrow on the front desk.' : ''}`,
      'success',
    )
  }

  const sendReminders = (ids: string[]) => {
    const sentAt = clock()
    setState((s) => ({ ...s, reminders: s.reminders.map((r) => (ids.includes(r.id) ? { ...r, status: 'Sent', sentAt } : r)) }))
    toast(`${ids.length} ${ids.length === 1 ? 'reminder' : 'reminders'} sent. Watch the replies come in.`, 'success')

    ids.forEach((id, index) => {
      const reminder = reminders.find((r) => r.id === id)
      if (!reminder) return
      const scripted = REPLIES[reminder.patientId]
      if (scripted === null) return
      const reply =
        scripted ??
        (reminder.kind === 'refill'
          ? { text: 'YES please', status: 'Refill requested' as const }
          : reminder.kind === 'missed'
            ? { text: '1', status: 'Call booked' as const }
            : { text: '1', status: 'Confirmed' as const })
      timers.current.push(
        window.setTimeout(() => {
          const repliedAt = clock()
          setState((s) => {
            let next: ClinicState = {
              ...s,
              reminders: s.reminders.map((r) => (r.id === id ? { ...r, status: reply.status, reply: reply.text, repliedAt } : r)),
              // A "1" reply confirms the linked appointment.
              appointments:
                reply.status === 'Confirmed' && reminder.appointmentId
                  ? s.appointments.map((a) => (a.id === reminder.appointmentId && a.status === 'Booked' ? { ...a, status: 'Confirmed' } : a))
                  : s.appointments,
            }
            if (reminder.kind === 'refill' && reminder.medicineId) {
              const rx: Prescription = {
                id: uid('rx'),
                number: `RX-${next.nextRx}`,
                patientId: reminder.patientId,
                clinicianId: 'mutasa',
                at: repliedAt,
                items: [{ medicineId: reminder.medicineId, dose: reminder.medicineId === 'metf' ? '1 tablet twice a day' : '1 tablet once a day', qty: reminder.medicineId === 'metf' ? 60 : 30 }],
                status: 'Waiting',
                source: 'Refill request',
              }
              next = { ...next, prescriptions: [rx, ...next.prescriptions], nextRx: next.nextRx + 1 }
            }
            return next
          })
          if (reminder.kind === 'refill') toast(`${patientName(reminder.patientId)} replied YES. A refill is waiting in Dispensing.`, 'info')
          else if (reply.status === 'New time requested') toast(`${patientName(reminder.patientId)} asked for a new time.`, 'warning')
        }, 1400 + index * 900),
      )
    })
  }

  const setTemplate = (kind: ReminderKind, text: string) => setState((s) => ({ ...s, templates: { ...s.templates, [kind]: text } }))

  const dispense = (id: string) => {
    const rx = prescriptions.find((p) => p.id === id)
    if (!rx) return
    const at = clock()
    let nextMedicines = medicines
    const used: NonNullable<Prescription['dispensed']> = []
    for (const item of rx.items) {
      const medicine = nextMedicines.find((m) => m.id === item.medicineId)!
      const taken = takeStock(medicine, item.qty, at)
      if (!taken) {
        toast(`Not enough ${medicine.name} to dispense ${rx.number}.`, 'warning')
        return
      }
      nextMedicines = nextMedicines.map((m) => (m.id === medicine.id ? { ...m, batches: taken.batches } : m))
      used.push(...taken.used.map((u) => ({ medicineId: medicine.id, ...u })))
    }
    const newlyLow = nextMedicines.filter((m) => {
      const before = medicines.find((x) => x.id === m.id)!
      return !medicineFlags(before, at).low && medicineFlags(m, at).low
    })
    setState((s) => ({
      ...s,
      medicines: nextMedicines,
      prescriptions: s.prescriptions.map((p) => (p.id === id ? { ...p, status: 'Ready', readyAt: at, dispensed: used } : p)),
    }))
    toast(`${rx.number} dispensed for ${patientName(rx.patientId)}. Batches used: ${used.map((u) => `${u.batchNo} × ${u.qty}`).join(', ')}.`, 'success')
    for (const m of newlyLow) toast(`${m.name} is now low: ${stockOf(m, at)} ${m.unit} left.`, 'warning')
  }

  const notify = (id: string) => {
    const rx = prescriptions.find((p) => p.id === id)
    if (!rx) return
    setState((s) => ({ ...s, prescriptions: s.prescriptions.map((p) => (p.id === id ? { ...p, notifiedAt: clock() } : p)) }))
    toast(`WhatsApp sent: “${readyMessage(rx, patients.find((p) => p.id === rx.patientId))}”`, 'success')
  }

  const collected = (id: string) =>
    setState((s) => ({ ...s, prescriptions: s.prescriptions.map((p) => (p.id === id ? { ...p, status: 'Collected', collectedAt: clock() } : p)) }))

  const receive = (medicineId: string, batchNo: string, months: number, qty: number) => {
    const medicine = medicines.find((m) => m.id === medicineId)
    // One entry per batch number: a repeat delivery of the same batch is added to it.
    const existing = medicine?.batches.some((b) => b.batchNo === batchNo)
    setState((s) => ({
      ...s,
      medicines: s.medicines.map((m) => {
        if (m.id !== medicineId) return m
        const batches = m.batches.some((b) => b.batchNo === batchNo)
          ? m.batches.map((b) => (b.batchNo === batchNo ? { ...b, qty: b.qty + qty } : b))
          : [...m.batches, { batchNo, expiry: todayAt(0, 0) + Math.round(months * 30.4) * DAY, qty }]
        return { ...m, onOrder: false, batches }
      }),
    }))
    toast(
      existing
        ? `Added ${qty} ${medicine?.unit} to the existing batch ${batchNo} of ${medicine?.name}.`
        : `Added ${qty} ${medicine?.unit} of ${medicine?.name} (batch ${batchNo}).`,
      'success',
    )
  }

  const removeExpired = (medicineId: string) => {
    const at = clock()
    const medicine = medicines.find((m) => m.id === medicineId)
    setState((s) => ({ ...s, medicines: s.medicines.map((m) => (m.id === medicineId ? { ...m, batches: m.batches.filter((b) => b.expiry > at) } : m)) }))
    toast(`Expired ${medicine?.name} removed and logged for safe disposal.`, 'info')
  }

  const order = (medicineId: string) => {
    const medicine = medicines.find((m) => m.id === medicineId)
    setState((s) => ({ ...s, medicines: s.medicines.map((m) => (m.id === medicineId ? { ...m, onOrder: true } : m)) }))
    toast(`Order for ${medicine?.name} sent to the supplier.`, 'success')
  }

  const today = appointments.filter((a) => isSameDay(a.start, now))
  const done = today.filter((a) => a.status === 'Done').length
  const confirmed = reminders.filter((r) => r.status === 'Confirmed').length
  const sentCount = reminders.filter((r) => r.status !== 'Scheduled').length
  const dispensed = prescriptions.filter((p) => p.status !== 'Waiting').length
  const waitingRx = prescriptions.filter((p) => p.status === 'Waiting').length

  useDemoMetrics([
    { label: 'Appointments today', value: num(today.length), detail: `${done} seen so far` },
    { label: 'Confirmed on WhatsApp', value: num(confirmed), detail: 'Patients who replied 1 to a reminder' },
    { label: 'Prescriptions dispensed', value: num(dispensed), detail: `${waitingRx} waiting at the pharmacy` },
    { label: 'Front-desk time saved (est.)', value: duration(sentCount * 3), detail: 'About 3 minutes per reminder phone call' },
  ])

  const screens: DemoScreen<ScreenId>[] = [
    { id: 'today', label: 'Front desk', icon: CalendarDays, audience: 'team' },
    { id: 'reminders', label: 'Reminders', icon: BellRing, audience: 'team' },
    { id: 'dispensing', label: 'Dispensing', icon: ClipboardCheck, audience: 'team', badge: waitingRx || undefined },
    { id: 'stock', label: 'Pharmacy stock', icon: Pill, audience: 'team' },
  ]

  return (
    <DemoAppShell
      slug={SLUG}
      business={{ name: 'Lindhaven Family Clinic & Pharmacy', descriptor: 'Family clinic and pharmacy · Bulawayo, Zimbabwe', icon: HeartPulse }}
      accent={ACCENT}
      screens={screens}
      active={screen}
      onChange={setScreen}
      headerRight={
        <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 sm:inline-flex">
          Front desk · {clockTime(now)}
        </span>
      }
    >
      {screen === 'today' && (
        <TodayScreen
          appointments={appointments}
          patients={patients}
          medicines={medicines}
          now={now}
          onCheckIn={checkIn}
          onCallIn={callIn}
          onComplete={complete}
          onNoShow={noShow}
          onBook={book}
        />
      )}
      {screen === 'reminders' && (
        <RemindersScreen reminders={reminders} patients={patients} medicines={medicines} templates={templates} onSend={sendReminders} onTemplate={setTemplate} />
      )}
      {screen === 'dispensing' && (
        <DispensingScreen
          prescriptions={prescriptions}
          patients={patients}
          medicines={medicines}
          now={now}
          onDispense={dispense}
          onNotify={notify}
          onCollected={collected}
          onGoToStock={() => setScreen('stock')}
        />
      )}
      {screen === 'stock' && <StockScreen medicines={medicines} now={now} onReceive={receive} onRemoveExpired={removeExpired} onOrder={order} />}
    </DemoAppShell>
  )
}
