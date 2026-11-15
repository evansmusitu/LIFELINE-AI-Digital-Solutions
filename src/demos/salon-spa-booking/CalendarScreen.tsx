import { Ban, CircleCheck, Coffee, Send, ShieldCheck, Sparkles, StickyNote, UserCheck, UserX, Wallet } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import { clockTime, dayAndTime, duration, firstName, hoursLabel, money, moneyWhole } from '../../lib/format'
import { MINUTE } from '../../lib/time'
import { AppButton, Modal, Notice, Panel, Segmented } from '../ui'
import {
  SALON,
  STAFF,
  billFor,
  cancellationOutcome,
  dayAgenda,
  dayLabel,
  dayStart,
  hhmm,
  minuteOfDay,
  openDays,
  pointsFor,
  sameDay,
  serviceById,
  staffById,
  utilisation,
  whenLabel,
} from './engine'
import { Chip, DepositBadge, Rows, StatusBadge } from './parts'
import { GROUP_STYLE } from './theme'
import type { Appointment, Client, PaymentMethod, StaffId } from './types'

const PX = 1.25 // pixels per minute in the day view
const HEIGHT = (SALON.close - SALON.open) * PX
const top = (minute: number) => (minute - SALON.open) * PX
const HOUR_MARKS = Array.from({ length: 10 }, (_, i) => (9 + i) * 60)

export interface CalendarFocus {
  day: number
  id?: string
}

interface Props {
  appointments: Appointment[]
  clients: Client[]
  now: number
  focus: CalendarFocus | null
  onCheckIn: (id: string) => void
  onComplete: (id: string, method: PaymentMethod) => void
  onNoShow: (id: string) => void
  onCancel: (id: string) => void
  onRemind: (id: string) => void
}

export function CalendarScreen({ appointments, clients, now, focus, onCheckIn, onComplete, onNoShow, onCancel, onRemind }: Props) {
  const days = openDays(now, 7)
  const visitor = clients.find((c) => c.isVisitor)
  const yours = appointments
    .filter((a) => (focus?.id ? a.id === focus.id : a.clientId === visitor?.id) && a.status === 'Booked')
    .sort((a, b) => a.start - b.start)[0]
  const [dayIndex, setDayIndex] = useState(() => Math.max(0, days.indexOf(dayStart(focus?.day ?? now))))
  const [staffTab, setStaffTab] = useState<StaffId>(() => (focus?.id && yours ? yours.staffId : 'naledi'))
  const [openId, setOpenId] = useState<string | null>(null)
  const day = days[dayIndex] ?? days[0]
  const isToday = dayIndex === 0
  const nowMin = minuteOfDay(now)
  const onDay = appointments.filter((a) => sameDay(a.start, day))
  const active = onDay.filter((a) => a.status !== 'Cancelled')
  const cancelled = onDay.filter((a) => a.status === 'Cancelled')
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? 'Client'
  const open = appointments.find((a) => a.id === openId)

  const openAppt = (a: Appointment) => {
    setDayIndex(Math.max(0, days.indexOf(dayStart(a.start))))
    setStaffTab(a.staffId)
    setOpenId(a.id)
  }

  const block = (a: Appointment) => {
    const service = serviceById(a.serviceId)
    const start = minuteOfDay(a.start)
    const lines = a.duration >= 45 ? 3 : a.duration >= 30 ? 2 : 1
    return (
      <button
        key={a.id}
        type="button"
        onClick={() => setOpenId(a.id)}
        aria-label={`${hhmm(start)} to ${hhmm(start + a.duration)}, ${clientName(a.clientId)}, ${service.label}, ${a.status}${a.depositStatus === 'paid' ? ', deposit paid' : ''}`}
        className={cn(
          'absolute inset-x-1 z-[1] overflow-hidden rounded-md border-l-4 px-1.5 py-1 text-left text-xs leading-tight shadow-sm transition hover:brightness-95 focus-visible:z-20',
          a.status === 'No-show' ? 'border-slate-400 bg-slate-100 text-slate-700' : GROUP_STYLE[service.group].block,
          a.id === yours?.id && 'ring-2 ring-(--accent) ring-offset-1',
        )}
        style={{ top: top(start) + 1, height: a.duration * PX - 2 }}
      >
        <span className="flex items-center gap-1 font-semibold">
          {a.status === 'Checked in' && <UserCheck className="size-3 shrink-0" aria-hidden="true" />}
          {a.status === 'Completed' && <CircleCheck className="size-3 shrink-0" aria-hidden="true" />}
          {a.status === 'No-show' && <UserX className="size-3 shrink-0" aria-hidden="true" />}
          <span className={cn('truncate', a.status === 'No-show' && 'line-through')}>{clientName(a.clientId)}</span>
          {a.depositStatus === 'paid' && <ShieldCheck className="ml-auto size-3 shrink-0" aria-hidden="true" />}
        </span>
        {lines > 1 && <span className="block truncate">{service.label}</span>}
        {lines > 2 && <span className="block tabular-nums">{`${hhmm(start)}–${hhmm(start + a.duration)}`}</span>}
      </button>
    )
  }

  return (
    <div className="space-y-4 p-3 sm:p-5">
      {yours && (
        <Notice tone="accent" icon={Sparkles} title="New online booking">
          <p>
            {clientName(yours.clientId)} · {serviceById(yours.serviceId).label} with {firstName(staffById(yours.staffId).name)},{' '}
            {whenLabel(yours.start, now)} · {yours.ref}
          </p>
          <AppButton size="sm" className="mt-2" onClick={() => openAppt(yours)}>
            Open booking
          </AppButton>
        </Notice>
      )}

      <div role="group" aria-label="Day" className="relative no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {days.map((d, i) => (
          <Chip key={d} pressed={i === dayIndex} onClick={() => setDayIndex(i)}>
            {i === 0 ? 'Today' : dayLabel(d)} ({appointments.filter((a) => sameDay(a.start, d) && a.status !== 'Cancelled').length})
          </Chip>
        ))}
      </div>

      <Panel title={isToday ? 'Today’s summary' : `Summary for ${dayLabel(day)}`} description="Booked hours against working hours, lunch excluded" bodyClassName="p-3!">
        <ul className="grid grid-cols-2 gap-2 lg:grid-cols-5">
          <li className="rounded-lg bg-slate-50 p-2.5">
            <p className="text-xs text-slate-600">Appointments</p>
            <p className="text-xl font-bold text-slate-900 tabular-nums">{active.length}</p>
            <p className="text-xs text-slate-600">
              {active.filter((a) => a.status === 'Checked in').length} in the salon · {active.filter((a) => a.status === 'Booked').length} to come
            </p>
          </li>
          {STAFF.map((s) => {
            const u = utilisation(s, day, appointments)
            return (
              <li key={s.id} className="rounded-lg bg-slate-50 p-2.5">
                <p className="flex justify-between gap-2 text-xs">
                  <span className="truncate font-semibold text-slate-900">{firstName(s.name)}</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{u.pct}%</span>
                </p>
                <div className="mt-1.5 h-1.5 rounded-full bg-slate-200" aria-hidden="true">
                  <div className="h-full rounded-full bg-(--accent)" style={{ width: `${Math.min(100, u.pct)}%` }} />
                </div>
                <p className="mt-1 text-xs text-slate-600 tabular-nums">
                  {hoursLabel(u.booked)} of {hoursLabel(u.available)}
                </p>
              </li>
            )
          })}
        </ul>
      </Panel>

      <Panel title={isToday ? 'Today' : dayLabel(day)} description={`${SALON.short} is open ${hhmm(SALON.open)} to ${hhmm(SALON.close)}`} bodyClassName="p-0!">
        <div className="hidden md:block">
          <div className="grid grid-cols-[3rem_repeat(4,minmax(0,1fr))] border-b border-slate-200">
            <div />
            {STAFF.map((s) => (
              <div key={s.id} className="min-w-0 border-l border-slate-200 px-2 py-2">
                <p className="truncate text-sm font-semibold text-slate-900">{s.name}</p>
                <p className="truncate text-xs text-slate-600">
                  {hhmm(s.start)} to {hhmm(s.end)}
                </p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[3rem_repeat(4,minmax(0,1fr))] pb-2">
            <div className="relative" style={{ height: HEIGHT }} aria-hidden="true">
              {[SALON.open, ...HOUR_MARKS].map((m) => (
                <span key={m} className="absolute right-1.5 text-[0.68rem] text-slate-600 tabular-nums" style={{ top: top(m) + 2 }}>
                  {hhmm(m)}
                </span>
              ))}
            </div>
            {STAFF.map((s) => (
              <div key={s.id} className="relative border-l border-slate-200" style={{ height: HEIGHT }}>
                {HOUR_MARKS.map((m) => (
                  <div key={m} className="absolute inset-x-0 border-t border-slate-100" style={{ top: top(m) }} aria-hidden="true" />
                ))}
                {s.start > SALON.open && <div className="absolute inset-x-0 top-0 bg-slate-100" style={{ height: top(s.start) }} aria-hidden="true" />}
                {s.end < SALON.close && <div className="absolute inset-x-0 bottom-0 bg-slate-100" style={{ top: top(s.end) }} aria-hidden="true" />}
                <div
                  className="absolute inset-x-1 flex items-center justify-center gap-1 rounded-md border border-dashed border-slate-300 bg-slate-50 text-[0.68rem] text-slate-600"
                  style={{ top: top(s.lunch[0]) + 1, height: (s.lunch[1] - s.lunch[0]) * PX - 2 }}
                >
                  <Coffee className="size-3" aria-hidden="true" />
                  Lunch
                </div>
                {active.filter((a) => a.staffId === s.id).map(block)}
                {isToday && nowMin >= SALON.open && nowMin <= SALON.close && (
                  <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-red-600" style={{ top: top(nowMin) }} aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="md:hidden">
          <div className="border-b border-slate-100 p-3">
            <Segmented label="Team member" value={staffTab} onChange={setStaffTab} options={STAFF.map((s) => ({ value: s.id, label: firstName(s.name) }))} className="w-full" />
          </div>
          <ul className="divide-y divide-slate-100">
            {dayAgenda(staffById(staffTab), day, appointments).map((item) => {
              if (item.kind !== 'appt')
                return (
                  <li key={`${item.kind}-${item.from}`} className="flex items-center gap-3 px-4 py-2 text-xs text-slate-600">
                    <span className="w-11 shrink-0 tabular-nums">{hhmm(item.from)}</span>
                    {item.kind === 'lunch' ? (
                      <span className="flex items-center gap-1">
                        <Coffee className="size-3.5" aria-hidden="true" /> Lunch until {hhmm(item.to)}
                      </span>
                    ) : (
                      <span>
                        Free until {hhmm(item.to)} ({duration(item.to - item.from)})
                      </span>
                    )}
                  </li>
                )
              const a = item.appt
              const service = serviceById(a.serviceId)
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(a.id)}
                    className={cn('flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50', a.id === yours?.id && 'bg-(--accent-soft)')}
                  >
                    <span className="w-11 shrink-0 text-sm font-semibold text-slate-900 tabular-nums">
                      {hhmm(item.from)}
                      <span className="block text-xs font-normal text-slate-600">{hhmm(item.to)}</span>
                    </span>
                    <span className={cn('w-1 shrink-0 rounded-full', GROUP_STYLE[service.group].swatch)} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block font-medium break-words text-slate-900', a.status === 'No-show' && 'line-through')}>{clientName(a.clientId)}</span>
                      <span className="block text-xs text-slate-600">{service.label}</span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        <StatusBadge status={a.status} />
                        <DepositBadge appt={a} short />
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-700">
          {(['Hair', 'Nails', 'Spa'] as const).map((g) => (
            <span key={g} className="inline-flex items-center gap-1.5">
              <span className={cn('size-2.5 rounded-sm', GROUP_STYLE[g].swatch)} aria-hidden="true" />
              {g}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" aria-hidden="true" /> Deposit paid
          </span>
          <span className="hidden items-center gap-1.5 md:inline-flex">
            <UserCheck className="size-3.5" aria-hidden="true" /> Checked in
          </span>
        </div>
      </Panel>

      {cancelled.length > 0 && (
        <Panel title="Cancelled" description="These times are free to book again">
          <ul className="space-y-1.5 text-sm">
            {cancelled.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="tabular-nums text-slate-600">{clockTime(a.start)}</span>
                <span className="text-slate-900">{clientName(a.clientId)}</span>
                <span className="text-slate-600">· {serviceById(a.serviceId).label}</span>
                <DepositBadge appt={a} />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {open && (
        <AppointmentModal
          key={open.id}
          appt={open}
          client={clients.find((c) => c.id === open.clientId)}
          now={now}
          onClose={() => setOpenId(null)}
          onCheckIn={onCheckIn}
          onComplete={onComplete}
          onNoShow={onNoShow}
          onCancel={onCancel}
          onRemind={onRemind}
        />
      )}
    </div>
  )
}

type Mode = 'view' | 'pay' | 'noshow' | 'cancel'

const METHODS: PaymentMethod[] = ['Card', 'Cash', 'EFT']

function AppointmentModal({
  appt,
  client,
  now,
  onClose,
  onCheckIn,
  onComplete,
  onNoShow,
  onCancel,
  onRemind,
}: Omit<Props, 'appointments' | 'clients' | 'focus'> & { appt: Appointment; client?: Client; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>('view')
  const [method, setMethod] = useState<PaymentMethod>('Card')
  const service = serviceById(appt.serviceId)
  const staff = staffById(appt.staffId)
  const bill = billFor(appt)
  const points = pointsFor(appt.price, appt.start)
  const outcome = cancellationOutcome(appt, now)
  const name = client?.name ?? 'Client'
  const first = firstName(name)
  const today = sameDay(appt.start, now)
  const booked = appt.status === 'Booked'
  const end = appt.start + appt.duration * MINUTE
  const act = (fn: (id: string) => void) => {
    fn(appt.id)
    setMode('view')
  }

  const depositText = {
    none: 'No deposit needed',
    paid: `${moneyWhole(appt.deposit)} paid, taken off the final bill`,
    applied: `${moneyWhole(appt.deposit)} taken off the bill`,
    refunded: `${moneyWhole(appt.deposit)} refunded`,
    kept: `${moneyWhole(appt.deposit)} kept`,
  }[appt.depositStatus]

  const back = (
    <AppButton variant="secondary" onClick={() => setMode('view')}>
      Back
    </AppButton>
  )
  const footer =
    mode === 'pay' ? (
      <>
        {back}
        <AppButton variant="success" icon={Wallet} onClick={() => act((id) => onComplete(id, method))}>
          {bill.due > 0 ? `Take ${money(bill.due)}` : 'Complete visit'}
        </AppButton>
      </>
    ) : mode === 'noshow' ? (
      <>
        {back}
        <AppButton variant="danger" icon={UserX} onClick={() => act(onNoShow)}>
          Mark as no-show
        </AppButton>
      </>
    ) : mode === 'cancel' ? (
      <>
        {back}
        <AppButton variant="danger" icon={Ban} onClick={() => act(onCancel)}>
          Confirm cancellation
        </AppButton>
      </>
    ) : booked ? (
      <>
        <AppButton variant="ghost" icon={Send} onClick={() => onRemind(appt.id)}>
          Send reminder now
        </AppButton>
        <AppButton variant="danger" onClick={() => setMode('cancel')}>
          Cancel booking
        </AppButton>
        {appt.start <= now && (
          <AppButton variant="danger" onClick={() => setMode('noshow')}>
            No-show
          </AppButton>
        )}
        {today && (
          <AppButton icon={UserCheck} onClick={() => onCheckIn(appt.id)}>
            Check in
          </AppButton>
        )}
      </>
    ) : appt.status === 'Checked in' ? (
      <AppButton variant="success" icon={Wallet} onClick={() => setMode('pay')}>
        Complete and take payment
      </AppButton>
    ) : (
      <AppButton variant="secondary" onClick={onClose}>
        Close
      </AppButton>
    )

  return (
    <Modal open onClose={onClose} title={name} description={`${service.label} · ${whenLabel(appt.start, now)}`} footer={footer}>
      {mode === 'view' && (
        <div className="space-y-3">
          <Rows
            rows={[
              ['Status', <StatusBadge key="status" status={appt.status} />],
              ['With', staff.name],
              ['Time', `${dayLabel(appt.start)}, ${clockTime(appt.start)} to ${clockTime(end)}`],
              ['Price', money(appt.price)],
              ['Deposit', depositText],
              ['Booked', `${appt.source === 'Online' ? 'Online' : 'By phone'}, ${dayAndTime(appt.createdAt, now)}`],
              [
                'Reminder',
                appt.remindedAt
                  ? `Sent on WhatsApp at ${clockTime(appt.remindedAt)}`
                  : sameDay(appt.createdAt, appt.start)
                    ? 'Confirmation sent when booked'
                    : appt.reminder
                      ? 'WhatsApp, the day before'
                      : 'Not wanted',
              ],
              ['Mobile', client?.phone ?? 'Not given'],
              ...(appt.checkedInAt ? [['Checked in', clockTime(appt.checkedInAt)] as [string, string]] : []),
              ...(appt.payment
                ? [
                    ['Paid', `${money(appt.payment.amount)} by ${appt.payment.method === 'EFT' ? 'EFT' : appt.payment.method.toLowerCase()}`] as [string, string],
                    ['Points awarded', String(appt.payment.points)] as [string, string],
                  ]
                : []),
            ]}
          />
          {(appt.notes || client?.notes) && (
            <Notice tone="amber" icon={StickyNote} title="Notes">
              {appt.notes && <p>For this visit: {appt.notes}</p>}
              {client?.notes && <p>On file: {client.notes}</p>}
            </Notice>
          )}
          {booked && !today && <p className="text-xs text-slate-600">Check-in opens on the day of the visit.</p>}
          {booked && appt.start > now && today && <p className="text-xs text-slate-600">No-show becomes available once the start time has passed.</p>}
        </div>
      )}

      {mode === 'pay' && (
        <div className="space-y-4">
          <Rows
            rows={[
              [service.label, money(bill.price)],
              ['Deposit paid', bill.deposit ? `−${money(bill.deposit)}` : money(0)],
              ['Due now', <span key="due" className="text-base font-bold">{money(bill.due)}</span>],
            ]}
          />
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-700">Payment method</p>
            <Segmented label="Payment method" value={method} onChange={setMethod} options={METHODS.map((m) => ({ value: m, label: m }))} className="w-full" />
          </div>
          <Notice tone="green" icon={Sparkles}>
            {first} earns {points} points{points > appt.price ? ', double for a Tuesday visit' : ''}.
          </Notice>
        </div>
      )}

      {mode === 'noshow' && (
        <Notice tone="amber" icon={UserX} title={`Mark ${first} as a no-show?`}>
          {appt.depositStatus === 'paid' ? `The ${moneyWhole(appt.deposit)} deposit is kept, as the booking policy says.` : 'No deposit was taken for this booking.'}
        </Notice>
      )}

      {mode === 'cancel' && (
        <Notice tone={outcome.kept ? 'amber' : 'neutral'} icon={Ban} title={`Cancel ${first}’s booking?`}>
          <p>{outcome.message}</p>
          <p className="mt-1 text-xs">Free cancellation up to 24 h before. After that, the deposit is kept.</p>
        </Notice>
      )}
    </Modal>
  )
}
