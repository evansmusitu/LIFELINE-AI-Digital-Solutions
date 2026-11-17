import { CalendarDays, CalendarPlus, ChartColumn, Gift, Scissors, Users } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../../components/toast-context'
import { useBusinessName } from '../../lib/business-name'
import { clockTime, duration, firstName, money, moneyWhole, num } from '../../lib/format'
import { usePersistentState } from '../../lib/storage'
import { uid, useDemoClock, useTicker } from '../../lib/time'
import { useDemoMetrics } from '../metrics'
import { DemoAppShell, type DemoScreen } from '../shell'
import { BookScreen } from './BookScreen'
import { CalendarScreen, type CalendarFocus } from './CalendarScreen'
import { ClientsScreen } from './ClientsScreen'
import { BEFORE_DEPOSITS, SAMPLE_CARD_CLIENT, createInitialState, monthSoFar } from './data'
import {
  REWARDS,
  SALON,
  SERVICES,
  STARTER_POINTS,
  atMinute,
  billFor,
  cancellationOutcome,
  checkBooking,
  dayStart,
  depositFor,
  depositsHeld,
  emptyDraft,
  maskPhone,
  noShowsThisMonth,
  pointsBalance,
  pointsFor,
  rebookMessage,
  referralCode,
  rewardCode,
  serviceById,
  staffFirst,
  weekStats,
  whenLabel,
  withArticle,
} from './engine'
import { LoyaltyScreen } from './LoyaltyScreen'
import { ReportsScreen } from './ReportsScreen'
import type { Appointment, Client, Draft, PaymentMethod, RewardId, SalonState } from './types'

const SLUG = 'salon-spa-booking'
const ACCENT = { base: '#be185d', strong: '#9d174d', soft: '#fdf2f8', ink: '#831843' }
const VISITOR_ID = 'you'
/** Minutes of phone time an online booking saves the front desk. */
const PHONE_MINUTES = 6

type ScreenId = 'book' | 'calendar' | 'clients' | 'loyalty' | 'reports'

export default function SalonSpaBookingDemo() {
  const businessName = useBusinessName()
  const clock = useDemoClock(9, 30)
  const now = useTicker(clock)
  const toast = useToast()
  const [state, setState] = usePersistentState<SalonState>(`${SLUG}.state`, createInitialState, { version: 1, freshDaily: true })
  const [screen, setScreen] = useState<ScreenId>('book')
  // The booking in progress and the last confirmation are screen state, so a reload starts a fresh booking.
  const [draft, setDraft] = useState<Draft>(() => emptyDraft())
  const [confirmedId, setConfirmedId] = useState<string | null>(null)
  const [focus, setFocus] = useState<CalendarFocus | null>(null)

  const { appointments, clients } = state
  const clientOf = (a: Appointment) => clients.find((c) => c.id === a.clientId)
  const nameOf = (a: Appointment) => firstName(clientOf(a)?.name ?? 'The client')
  const updateAppt = (id: string, patch: Partial<Appointment>) =>
    setState((s) => ({ ...s, appointments: s.appointments.map((a) => (a.id === id ? { ...a, ...patch } : a)) }))

  const confirm = (d: Draft): string | null => {
    const service = SERVICES.find((s) => s.id === d.serviceId)
    if (!service || d.day === undefined || d.minute === undefined) return 'Please choose a service and a time.'
    const at = clock()
    const request = { serviceId: service.id, staffChoice: d.staffChoice, day: d.day, minute: d.minute }
    const check = checkBooking(appointments, request, at)
    if (!check.ok) return check.message
    const deposit = depositFor(service.price)
    if (deposit && d.paid?.serviceId !== service.id) return `Please pay the ${moneyWhole(deposit)} deposit first.`
    const visitor = clients.find((c) => c.isVisitor)
    const name = d.name.trim()
    const appt: Appointment = {
      id: uid('appt'),
      ref: `SS-${state.nextRef}`,
      clientId: VISITOR_ID,
      staffId: check.staffId,
      serviceId: service.id,
      start: atMinute(d.day, d.minute),
      duration: service.minutes,
      price: service.price,
      deposit,
      depositStatus: deposit ? 'paid' : 'none',
      status: 'Booked',
      source: 'Online',
      createdAt: at,
      notes: d.notes.trim() || undefined,
      reminder: d.reminder,
    }
    const client: Client = visitor
      ? { ...visitor, name, phone: maskPhone(d.phone), email: d.email.trim() || undefined }
      : {
          id: VISITOR_ID,
          name,
          phone: maskPhone(d.phone),
          email: d.email.trim() || undefined,
          preferredStaff: d.staffChoice === 'any' ? undefined : d.staffChoice,
          referralCode: referralCode(name),
          visits: [],
          points: [{ at, label: 'Sample points so you can try a reward', points: STARTER_POINTS }],
          rewards: [],
          isVisitor: true,
        }
    setState((s) => {
      // Checked again on the latest state, so a double click can never book the same time twice.
      if (!checkBooking(s.appointments, { ...request, staffChoice: check.staffId }, at).ok) return s
      return {
        ...s,
        appointments: [...s.appointments, appt],
        clients: visitor ? s.clients.map((c) => (c.id === VISITOR_ID ? client : c)) : [...s.clients, client],
        nextRef: s.nextRef + 1,
      }
    })
    setConfirmedId(appt.id)
    // A deposit pays for one booking only.
    setDraft((x) => ({ ...x, paid: undefined }))
    toast(`Booked: ${service.label} with ${staffFirst(check.staffId)} ${whenLabel(appt.start, at)}. Ref ${appt.ref}.`, 'success')
    return null
  }

  const checkIn = (id: string) => {
    const a = appointments.find((x) => x.id === id)
    if (!a || a.status !== 'Booked') return
    updateAppt(id, { status: 'Checked in', checkedInAt: clock() })
    toast(`${nameOf(a)} checked in for ${withArticle(serviceById(a.serviceId))} with ${staffFirst(a.staffId)}.`, 'success')
  }

  const complete = (id: string, method: PaymentMethod) => {
    const a = appointments.find((x) => x.id === id)
    if (!a || a.status !== 'Checked in') return
    const at = clock()
    const bill = billFor(a)
    const points = pointsFor(a.price, a.start)
    const service = serviceById(a.serviceId)
    setState((s) => ({
      ...s,
      appointments: s.appointments.map((x) => {
        if (x.id !== id) return x
        const depositStatus = x.depositStatus === 'paid' ? 'applied' : x.depositStatus
        return { ...x, status: 'Completed', completedAt: at, depositStatus, payment: { method, amount: bill.due, points } }
      }),
      clients: s.clients.map((c) =>
        c.id === a.clientId
          ? {
              ...c,
              visits: [{ at: a.start, serviceId: a.serviceId, staffId: a.staffId, amount: a.price }, ...c.visits],
              points: [{ at, label: service.label, points }, ...c.points],
            }
          : c,
      ),
    }))
    toast(`${money(bill.due)} paid by ${method === 'EFT' ? 'EFT' : method.toLowerCase()}. ${nameOf(a)} earned ${points} points.`, 'success')
  }

  const noShow = (id: string) => {
    const a = appointments.find((x) => x.id === id)
    if (!a || a.status !== 'Booked') return
    updateAppt(id, { status: 'No-show', depositStatus: a.depositStatus === 'paid' ? 'kept' : a.depositStatus })
    toast(a.depositStatus === 'paid' ? `${nameOf(a)} marked as a no-show. The ${moneyWhole(a.deposit)} deposit is kept.` : `${nameOf(a)} marked as a no-show.`, 'info')
  }

  const cancel = (id: string) => {
    const a = appointments.find((x) => x.id === id)
    if (!a || a.status !== 'Booked') return
    const at = clock()
    const outcome = cancellationOutcome(a, at)
    updateAppt(id, {
      status: 'Cancelled',
      cancelledAt: at,
      depositStatus: a.depositStatus === 'paid' ? (outcome.free ? 'refunded' : 'kept') : a.depositStatus,
    })
    toast(`Booking ${a.ref} cancelled. ${outcome.message} The time is free to book again.`, outcome.kept ? 'warning' : 'info')
  }

  const remind = (id: string) => {
    const a = appointments.find((x) => x.id === id)
    if (!a) return
    updateAppt(id, { remindedAt: clock() })
    toast(`Reminder sent to ${nameOf(a)} on WhatsApp (simulated).`, 'success')
  }

  const rebook = (clientId: string) => {
    const c = clients.find((x) => x.id === clientId)
    if (!c) return
    setState((s) => ({ ...s, clients: s.clients.map((x) => (x.id === clientId ? { ...x, contactedAt: clock() } : x)) }))
    toast(`WhatsApp to ${firstName(c.name)} (simulated): “${rebookMessage(c, clock())}”`, 'success')
  }

  const redeem = (clientId: string, rewardId: RewardId) => {
    const c = clients.find((x) => x.id === clientId)
    const reward = REWARDS.find((r) => r.id === rewardId)
    if (!c || !reward) return
    if (pointsBalance(c) < reward.points) {
      toast(`Not enough points yet for this reward: ${reward.name}.`, 'warning')
      return
    }
    const at = clock()
    const code = rewardCode(reward, state.nextReward)
    setState((s) => ({
      ...s,
      nextReward: s.nextReward + 1,
      clients: s.clients.map((x) =>
        x.id === clientId
          ? {
              ...x,
              points: [{ at, label: `Redeemed: ${reward.name}`, points: -reward.points }, ...x.points],
              rewards: [{ code, rewardId, at }, ...x.rewards],
            }
          : x,
      ),
    }))
    toast(`${reward.name} redeemed. Your code is ${code}.`, 'success')
  }

  const showInCalendar = (a: Appointment) => {
    setFocus({ day: dayStart(a.start), id: a.id })
    setScreen('calendar')
  }

  const changeScreen = (id: ScreenId) => {
    // Opening the Calendar from its tab starts on today.
    if (id === 'calendar') setFocus(null)
    setScreen(id)
  }

  const week = weekStats(appointments, now)
  const held = depositsHeld(appointments)
  const noShows = monthSoFar(now).noShows + noShowsThisMonth(appointments, now)
  const visitor = clients.find((c) => c.isVisitor)
  const cardClient = visitor ?? clients.find((c) => c.id === SAMPLE_CARD_CLIENT) ?? clients[0]

  useDemoMetrics([
    { label: 'Bookings this week', value: num(week.week.length), detail: `${week.online.length} made online` },
    { label: 'Deposits held', value: money(held.amount), detail: `Protecting ${held.count} bookings` },
    { label: 'No-shows this month', value: num(noShows), detail: `Down from ${BEFORE_DEPOSITS.noShowsPerMonth} before deposits` },
    { label: 'Phone time saved this week (est.)', value: duration(week.online.length * PHONE_MINUTES), detail: 'Bookings made without a call' },
  ])

  const screens: DemoScreen<ScreenId>[] = [
    { id: 'book', label: 'Book', icon: CalendarPlus, audience: 'customer' },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays, audience: 'team' },
    { id: 'clients', label: 'Clients', icon: Users, audience: 'team' },
    { id: 'loyalty', label: 'Loyalty', icon: Gift, audience: 'customer' },
    { id: 'reports', label: 'Reports', icon: ChartColumn, audience: 'team' },
  ]

  return (
    <DemoAppShell
      slug={SLUG}
      business={{
        name: businessName ?? SALON.name,
        descriptor: businessName ? 'Your business, sample data' : 'Hair, nails and spa · Parkhurst, Johannesburg',
        icon: Scissors,
      }}
      accent={ACCENT}
      screens={screens}
      active={screen}
      onChange={changeScreen}
      headerRight={
        <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 sm:inline-flex">Open 08:30–18:00 · {clockTime(now)}</span>
      }
    >
      {screen === 'book' && (
        <BookScreen
          draft={draft}
          onDraft={setDraft}
          appointments={appointments}
          now={now}
          confirmed={appointments.find((a) => a.id === confirmedId && a.status !== 'Cancelled')}
          onConfirm={confirm}
          onAnother={() => {
            setConfirmedId(null)
            setDraft((d) => emptyDraft(d))
          }}
          onShowInCalendar={showInCalendar}
        />
      )}
      {screen === 'calendar' && (
        <CalendarScreen
          appointments={appointments}
          clients={clients}
          now={now}
          focus={focus}
          onCheckIn={checkIn}
          onComplete={complete}
          onNoShow={noShow}
          onCancel={cancel}
          onRemind={remind}
        />
      )}
      {screen === 'clients' && <ClientsScreen clients={clients} appointments={appointments} now={now} onRebook={rebook} />}
      {screen === 'loyalty' && <LoyaltyScreen client={cardClient} sample={!visitor} appointments={appointments} onRedeem={redeem} />}
      {screen === 'reports' && <ReportsScreen appointments={appointments} now={now} />}
    </DemoAppShell>
  )
}
