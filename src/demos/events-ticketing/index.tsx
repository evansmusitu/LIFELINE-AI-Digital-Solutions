import { ChartColumn, LayoutDashboard, ScanLine, Ticket, Wallet } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useToast } from '../../components/toast-context'
import { duration, moneyWhole, num, pct, shortDate } from '../../lib/format'
import { usePersistentState } from '../../lib/storage'
import { uid, useDemoClock, useTicker } from '../../lib/time'
import { useDemoMetrics } from '../metrics'
import { DemoAppShell, type DemoScreen } from '../shell'
import { CheckinScreen } from './CheckinScreen'
import { DEFAULT_BUYER, FESTIVAL, GATE_OFFSET, createInitialState } from './data'
import {
  applyScan,
  checkinSummary,
  daysToGo,
  emptyCart,
  festivalDate,
  icsFor,
  letInAnyway,
  orderTotals,
  placeOrder,
  salesSummary,
  scanEntry,
  transferTicket,
  zig,
} from './engine'
import { SalesScreen } from './SalesScreen'
import { ScannerScreen } from './ScannerScreen'
import { TicketsScreen } from './TicketsScreen'
import type { Draft, FestivalState, GateId, ScanOutcome, ScreenId, Ticket as TicketRecord } from './types'
import { WalletScreen } from './WalletScreen'

const SLUG = 'events-ticketing'
const ACCENT = { base: '#b91c1c', strong: '#991b1b', soft: '#fef2f2', ink: '#7f1d1d' }
const PAYMENT_MS = 1000

const newDraft = (): Draft => ({
  cart: emptyCart(),
  promoInput: '',
  promo: null,
  promoError: false,
  buyer: { ...DEFAULT_BUYER },
  holders: {},
  payment: 'mobile',
})

export default function EventsTicketingDemo() {
  const clock = useDemoClock(10, 30)
  const now = useTicker(clock)
  const toast = useToast()
  const [state, setState] = usePersistentState<FestivalState>(`${SLUG}.state`, createInitialState, { version: 1, freshDaily: true })
  const [screen, setScreen] = useState<ScreenId>('tickets')
  const [draft, setDraft] = useState<Draft>(newDraft)
  // Payment progress is never stored, so a reload mid-payment can't leave the checkout stuck.
  const [paying, setPaying] = useState(false)
  const [justBought, setJustBought] = useState<string | null>(null)
  const payTimer = useRef<number | null>(null)
  const icsUrl = useRef<string | null>(null)
  // Scans read and write the latest state in the same click, so two fast scans of one ticket can't both pass.
  const latest = useRef(state)

  useEffect(() => {
    latest.current = state
  }, [state])

  useEffect(
    () => () => {
      if (payTimer.current !== null) window.clearTimeout(payTimer.current)
      if (icsUrl.current) URL.revokeObjectURL(icsUrl.current)
    },
    [],
  )

  const commit = (next: FestivalState) => {
    latest.current = next
    setState(next)
  }

  const festival = festivalDate(now)
  const gateNow = now + GATE_OFFSET

  const pay = (snapshot: Draft) => {
    if (paying || !placeOrder(latest.current, snapshot, clock(), 'check')) return
    const { count } = orderTotals(snapshot.cart, snapshot.promo)
    setPaying(true)
    payTimer.current = window.setTimeout(() => {
      payTimer.current = null
      const placed = placeOrder(latest.current, snapshot, clock(), uid('order'))
      setPaying(false)
      if (!placed) {
        toast('Those tickets just sold out. Check the order and try again.', 'warning')
        return
      }
      commit(placed.state)
      setJustBought(placed.order.id)
      setDraft((d) => ({ ...newDraft(), buyer: d.buyer, payment: d.payment }))
      setScreen('wallet')
      toast(`Payment confirmed. ${count === 1 ? 'Your ticket is' : `Your ${count} tickets are`} in My tickets.`, 'success')
    }, PAYMENT_MS)
  }

  const scan = (input: string, gate: GateId) => {
    const s = latest.current
    const outcome = scanEntry(input, gate, s)
    const scanId = uid('scan')
    const at = clock() + GATE_OFFSET
    commit(applyScan(s, outcome, gate, at, scanId))
    return { outcome, scanId, at }
  }

  const letIn = (scanId: string, outcome: ScanOutcome, gate: GateId) => {
    commit(letInAnyway(latest.current, scanId, outcome, gate, clock() + GATE_OFFSET))
    toast(`${outcome.holder ?? 'Ticket holder'} let in at Gate ${gate}. The override is in the check-in report.`, 'info')
  }

  const transfer = (id: string, name: string) => {
    const result = transferTicket(latest.current, id, name, clock())
    if (!result) {
      toast('This ticket can’t be transferred. It may already be checked in.', 'warning')
      return
    }
    commit(result.state)
    toast(`Ticket moved to ${name.trim()}. New code ${result.newId}. The old QR code no longer works.`, 'success')
  }

  const share = (id: string) => {
    const at = clock()
    commit({ ...latest.current, tickets: latest.current.tickets.map((t) => (t.id === id ? { ...t, sharedAt: at } : t)) })
    toast('WhatsApp opened in a new tab with the ticket code. The QR code stays here in My tickets.', 'info')
  }

  const calendar = (ticket: TicketRecord) => {
    const blob = new Blob([icsFor(festival, ticket, clock())], { type: 'text/calendar;charset=utf-8' })
    if (icsUrl.current) URL.revokeObjectURL(icsUrl.current)
    const url = URL.createObjectURL(blob)
    icsUrl.current = url
    const link = document.createElement('a')
    link.href = url
    link.download = `msasa-sky-festival-${ticket.id.toLowerCase()}.ics`
    link.click()
    toast(`Calendar file downloaded for ${shortDate(festival, FESTIVAL.locale)}. Open it to add the festival to your calendar.`, 'success')
  }

  const sales = salesSummary(state, now)
  const checkin = checkinSummary(state, gateNow)
  const mine = state.tickets.filter((t) => t.mine).length
  const bought = state.orders.find((o) => o.id === justBought) ?? null

  useDemoMetrics([
    {
      label: 'Tickets sold',
      value: num(sales.totalSold),
      detail: `${pct((sales.totalSold / FESTIVAL.totalCapacity) * 100)} of capacity`,
    },
    { label: 'Revenue', value: moneyWhole(sales.revenue), detail: `${zig(sales.revenue, true)} at the sample rate` },
    { label: 'Checked in', value: num(checkin.total), detail: `${num(checkin.duplicates)} duplicate scans stopped` },
    {
      label: 'Box-office time saved (est.)',
      value: duration(sales.totalSold * 2),
      detail: '2 min per online ticket: no cash sales or paper lists at the gate',
    },
  ])

  const screens: DemoScreen<ScreenId>[] = [
    { id: 'tickets', label: 'Tickets', icon: Ticket, audience: 'customer' },
    { id: 'wallet', label: 'My tickets', icon: Wallet, audience: 'customer', badge: mine || undefined },
    { id: 'scan', label: 'Scanner', icon: ScanLine, audience: 'team' },
    { id: 'checkin', label: 'Check-in', icon: LayoutDashboard, audience: 'team' },
    { id: 'sales', label: 'Sales', icon: ChartColumn, audience: 'team' },
  ]

  const days = daysToGo(now, festival)

  return (
    <DemoAppShell
      slug={SLUG}
      business={{ name: FESTIVAL.name, descriptor: 'Tickets and check-in · Harare, Zimbabwe', icon: Ticket }}
      accent={ACCENT}
      screens={screens}
      active={screen}
      onChange={setScreen}
      headerRight={
        <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 sm:inline-flex">
          {new Date(festival).toLocaleDateString(FESTIVAL.locale, { weekday: 'short', day: 'numeric', month: 'short' })} ·{' '}
          {days === 1 ? '1 day' : `${days} days`} to go
        </span>
      }
    >
      {screen === 'tickets' && (
        <TicketsScreen now={now} festival={festival} orders={state.orders} draft={draft} onDraft={setDraft} paying={paying} onPay={pay} />
      )}
      {screen === 'wallet' && (
        <WalletScreen
          festival={festival}
          tickets={state.tickets}
          voided={state.voided}
          checkins={state.checkins}
          justBought={bought}
          onBuy={() => setScreen('tickets')}
          onShared={share}
          onCalendar={calendar}
          onTransfer={transfer}
        />
      )}
      {screen === 'scan' && (
        <ScannerScreen gateNow={gateNow} tickets={state.tickets} voided={state.voided} scans={state.scans} onScan={scan} onLetIn={letIn} />
      )}
      {screen === 'checkin' && (
        <CheckinScreen summary={checkin} sold={sales.sold} totalSold={sales.totalSold} scans={state.scans} gateNow={gateNow} />
      )}
      {screen === 'sales' && <SalesScreen summary={sales} orders={state.orders} />}
    </DemoAppShell>
  )
}
