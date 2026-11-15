import { ArrowLeft, ArrowRight, CalendarCheck, CalendarDays, Check, CircleCheck, CreditCard, Download, Info, Lock, Users } from 'lucide-react'
import { useEffect, useRef, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from 'react'
import { cn } from '../../lib/cn'
import { clockTime, duration, firstName, money, moneyWhole } from '../../lib/format'
import { MINUTE } from '../../lib/time'
import { AppButton, Avatar, Badge, Field, Notice, Panel, TextArea, TextInput, Toggle } from '../ui'
import {
  GROUPS,
  LEAD_MIN,
  SALON,
  SERVICES,
  assignAnyone,
  billFor,
  clientMessage,
  dayLabel,
  dayLong,
  depositFor,
  hhmm,
  icsFile,
  maskPhone,
  openDays,
  pointsFor,
  reminderPlan,
  sameDay,
  serviceById,
  slotsForService,
  staffById,
  staffFirst,
  staffFor,
  validEmail,
  validMobile,
  whenLabel,
  withArticle,
} from './engine'
import { GroupTile, Rows, Spinner, WhatsAppBubble } from './parts'
import { GROUP_STYLE } from './theme'
import type { Appointment, Draft, StaffChoice } from './types'

const STEPS = ['Service', 'Who', 'Time', 'Details'] as const
const PARTS = [
  ['Morning', 0, 12 * 60],
  ['Afternoon', 12 * 60, 16 * 60],
  ['Late afternoon', 16 * 60, 24 * 60],
] as const

/** "90 min" reads like the menu; long treatments read better in hours. */
const length = (minutes: number) => (minutes < 120 ? `${minutes} min` : duration(minutes))

interface Props {
  draft: Draft
  onDraft: Dispatch<SetStateAction<Draft>>
  appointments: Appointment[]
  now: number
  confirmed?: Appointment
  /** Returns a message when the booking can't be made. */
  onConfirm: (draft: Draft) => string | null
  onAnother: () => void
  onShowInCalendar: (appt: Appointment) => void
}

export function BookScreen({ draft, onDraft, appointments, now, confirmed, onConfirm, onAnother, onShowInCalendar }: Props) {
  const update = (patch: Partial<Draft>) => onDraft((d) => ({ ...d, ...patch }))
  const service = draft.serviceId ? serviceById(draft.serviceId) : undefined
  const days = openDays(now, 7)
  const earliest = now + LEAD_MIN * MINUTE
  const slotsByDay = service ? days.map((day) => slotsForService(service, draft.staffChoice, day, appointments, earliest)) : []
  // Until the visitor picks a day, show the first one with free times.
  const chosenIndex = draft.day === undefined ? -1 : days.indexOf(draft.day)
  const dayIndex = chosenIndex >= 0 ? chosenIndex : Math.max(0, slotsByDay.findIndex((s) => s.length > 0))
  const day = days[dayIndex]
  const slots = slotsByDay[dayIndex] ?? []
  // A chosen time that has since passed or been taken no longer counts.
  const minute = chosenIndex >= 0 && slots.some((s) => s.minute === draft.minute) ? draft.minute : undefined
  const reachable = !service ? 1 : minute === undefined ? 3 : 4
  const step = Math.min(draft.step, reachable) as Draft['step']
  const who = draft.staffChoice === 'any' ? 'Anyone available' : `With ${staffById(draft.staffChoice).name}`

  if (confirmed) return <Confirmation appt={confirmed} name={draft.name} phone={draft.phone} onAnother={onAnother} onShowInCalendar={onShowInCalendar} />

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-3 sm:p-5">
      <ol className="grid grid-cols-4 gap-1.5" aria-label="Booking steps">
        {STEPS.map((label, i) => {
          const n = (i + 1) as Draft['step']
          const state = n === step ? 'current' : n < step ? 'done' : 'todo'
          return (
            <li key={label}>
              <button
                type="button"
                disabled={n > reachable || n === step}
                aria-current={n === step ? 'step' : undefined}
                onClick={() => update({ step: n })}
                className="flex w-full flex-col items-center gap-1 rounded-lg px-1 pt-1 text-xs font-semibold text-slate-700 enabled:hover:text-slate-900"
              >
                <span
                  className={cn(
                    'grid size-7 place-items-center rounded-full text-xs font-bold',
                    { current: 'bg-(--accent) text-white', done: 'bg-(--accent-soft) text-(--accent-ink)', todo: 'bg-slate-200 text-slate-700' }[state],
                  )}
                >
                  {state === 'done' ? <Check className="size-3.5" aria-hidden="true" /> : n}
                </span>
                <span>
                  {label}
                  {state === 'done' && <span className="sr-only"> (done)</span>}
                </span>
                <span className={cn('h-1 w-full rounded-full', state === 'todo' ? 'bg-slate-200' : 'bg-(--accent)')} aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ol>

      {step > 1 && service && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm">
          <GroupTile group={service.group} />
          <p className="min-w-0 text-slate-800">
            <span className="font-semibold text-slate-900">{service.name}</span> · {length(service.minutes)} · {moneyWhole(service.price)}
            <span className="block text-xs text-slate-600">
              {who}
              {step === 4 && minute !== undefined && ` · ${dayLabel(day)} at ${hhmm(minute)}`}
            </span>
          </p>
        </div>
      )}

      {step === 1 && (
        <Panel title="Choose a service" description="Book online any time, even after we close. Treatments of $50 or more need a small deposit.">
          <div className="space-y-5">
            {GROUPS.map((group) => {
              const Icon = GROUP_STYLE[group].icon
              return (
                <section key={group} aria-labelledby={`bk-group-${group}`}>
                  <h4 id={`bk-group-${group}`} className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-600 uppercase">
                    <Icon className="size-3.5" aria-hidden="true" />
                    {group}
                  </h4>
                  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {SERVICES.filter((s) => s.group === group).map((s) => {
                      const deposit = depositFor(s.price)
                      const keepStaff = draft.staffChoice === 'any' || staffById(draft.staffChoice).services.includes(s.id)
                      return (
                        <Choice
                          key={s.id}
                          pressed={draft.serviceId === s.id}
                          onClick={() => update({ serviceId: s.id, staffChoice: keepStaff ? draft.staffChoice : 'any', day: undefined, minute: undefined, step: 2 })}
                          title={s.name}
                          detail={`${length(s.minutes)} · ${staffFor(s.id).map((x) => firstName(x.name)).join(' or ')}`}
                          end={
                            <span className="shrink-0 text-right">
                              <span className="block font-semibold text-slate-900 tabular-nums">{moneyWhole(s.price)}</span>
                              {deposit > 0 && <span className="block text-[0.7rem] text-slate-600">{moneyWhole(deposit)} deposit</span>}
                            </span>
                          }
                        />
                      )
                    })}
                  </ul>
                </section>
              )
            })}
          </div>
        </Panel>
      )}

      {step === 2 && service && (
        <Panel title="Choose who" description="Pick someone you know, or let us find whoever is free.">
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(['any', ...staffFor(service.id).map((s) => s.id)] as StaffChoice[]).map((choice) => {
              const staff = choice === 'any' ? null : staffById(choice)
              return (
                <Choice
                  key={choice}
                  pressed={draft.staffChoice === choice}
                  onClick={() => update({ staffChoice: choice, minute: undefined, step: 3 })}
                  start={
                    staff ? (
                      <Avatar name={staff.name} />
                    ) : (
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700">
                        <Users className="size-4" aria-hidden="true" />
                      </span>
                    )
                  }
                  title={staff ? staff.name : 'Anyone available'}
                  detail={staff ? staff.role : 'Shows every free time. We pick whoever has the most room that day.'}
                />
              )
            })}
          </ul>
          <AppButton variant="secondary" icon={ArrowLeft} className="mt-4" onClick={() => update({ step: 1 })}>
            Back
          </AppButton>
        </Panel>
      )}

      {step === 3 && service && (
        <Panel title="Choose a time" description={`Every time shown fits the full ${length(service.minutes)} around other bookings, lunch breaks and closing time.`}>
          <div role="group" aria-label="Day" className="relative no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {days.map((d, i) => {
              const count = slotsByDay[i].length
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={i === dayIndex}
                  onClick={() => update({ day: d, minute: undefined })}
                  className={cn(
                    'w-20 shrink-0 rounded-xl border px-1.5 py-2 text-center transition',
                    i === dayIndex ? 'border-(--accent) bg-(--accent-soft) text-(--accent-ink)' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
                  )}
                >
                  <span className="block text-xs font-semibold">{i === 0 ? 'Today' : new Date(d).toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                  <span className="block text-sm font-bold">{new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  <span className={cn('block text-[0.68rem]', count ? 'text-slate-700' : 'font-semibold text-red-700')}>
                    {count ? `${count} ${count === 1 ? 'time' : 'times'}` : 'Fully booked'}
                  </span>
                </button>
              )
            })}
          </div>

          {slots.length === 0 ? (
            <Notice tone="amber" icon={CalendarDays} title="Fully booked" className="mt-4">
              {draft.staffChoice === 'any' ? 'Nobody' : staffFirst(draft.staffChoice)} has room for {withArticle(service)} on {dayLong(day)}. Try another
              day{draft.staffChoice !== 'any' && staffFor(service.id).length > 1 ? ' or choose Anyone available' : ''}.
            </Notice>
          ) : (
            <div className="mt-4 space-y-3">
              {PARTS.map(([label, from, to]) => {
                const part = slots.filter((s) => s.minute >= from && s.minute < to)
                return (
                  part.length > 0 && (
                    <div key={label} role="group" aria-label={`${label} times`}>
                      <p className="mb-1.5 text-xs font-semibold text-slate-600">{label}</p>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                        {part.map((s) => (
                          <button
                            key={s.minute}
                            type="button"
                            aria-pressed={minute === s.minute}
                            onClick={() => update({ day, minute: s.minute })}
                            className={cn(
                              'h-10 rounded-lg border text-sm font-semibold tabular-nums transition',
                              minute === s.minute ? 'border-(--accent) bg-(--accent) text-white' : 'border-slate-300 bg-white text-slate-800 hover:border-(--accent)',
                            )}
                          >
                            {hhmm(s.minute)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                )
              })}
            </div>
          )}

          {minute !== undefined && (
            <p role="status" className="mt-3 text-sm text-slate-800">
              {dayLong(day)}, {hhmm(minute)} to {hhmm(minute + service.minutes)}
              {draft.staffChoice === 'any'
                ? ` with ${staffFirst(assignAnyone(service, day, minute, appointments) ?? staffFor(service.id)[0].id)}, who has the most free time that day.`
                : ` with ${staffFirst(draft.staffChoice)}.`}
            </p>
          )}

          <div className="mt-4 flex flex-wrap justify-between gap-2">
            <AppButton variant="secondary" icon={ArrowLeft} onClick={() => update({ step: 2 })}>
              Back
            </AppButton>
            <AppButton disabled={minute === undefined} onClick={() => update({ step: 4 })}>
              Continue
              <ArrowRight className="size-4" aria-hidden="true" />
            </AppButton>
          </div>
        </Panel>
      )}

      {step === 4 && service && minute !== undefined && (
        <DetailsStep draft={draft} onDraft={onDraft} day={day} now={now} onConfirm={onConfirm} onBackToTimes={() => update({ step: 3, minute: undefined })} />
      )}

      <p className="flex gap-2 text-xs text-slate-600">
        <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        In this demo, card payments and WhatsApp messages are simulated. Your version takes deposits through your payment provider and sends
        messages from your WhatsApp Business number.
      </p>
    </div>
  )
}

function Choice({
  pressed,
  onClick,
  start,
  title,
  detail,
  end,
}: {
  pressed: boolean
  onClick: () => void
  start?: ReactNode
  title: string
  detail: string
  end?: ReactNode
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={pressed}
        onClick={onClick}
        className={cn(
          'flex h-full w-full items-center gap-3 rounded-xl border p-3 text-left transition',
          pressed ? 'border-(--accent) bg-(--accent-soft)' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
        )}
      >
        {start}
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-slate-900">{title}</span>
          <span className="block text-xs text-slate-600">{detail}</span>
        </span>
        {end}
      </button>
    </li>
  )
}

interface Card {
  number: string
  expiry: string
  cvc: string
}

/** One plain message for the simulated card form, or null when it looks like a real card. */
function cardProblem(card: Card, now: number): string | null {
  const [mm, yy] = card.expiry.split('/').map((x) => Number(x.trim()))
  const d = new Date(now)
  const expiry = 2000 + yy < d.getFullYear() || (2000 + yy === d.getFullYear() && mm < d.getMonth() + 1)
  if (!/^\d{13,19}$/.test(card.number.replace(/\s/g, ''))) return 'Check the card number.'
  if (!/^\d{2}\s*\/\s*\d{2}$/.test(card.expiry.trim()) || !mm || mm > 12 || expiry) return 'Check the expiry date. Use MM/YY.'
  if (!/^\d{3,4}$/.test(card.cvc.trim())) return 'The CVC is the three digits on the back.'
  return null
}

function DetailsStep({
  draft,
  onDraft,
  day,
  now,
  onConfirm,
  onBackToTimes,
}: {
  draft: Draft
  onDraft: Dispatch<SetStateAction<Draft>>
  day: number
  now: number
  onConfirm: (draft: Draft) => string | null
  onBackToTimes: () => void
}) {
  const update = (patch: Partial<Draft>) => onDraft((d) => ({ ...d, ...patch }))
  const service = serviceById(draft.serviceId ?? 'cut')
  const deposit = depositFor(service.price)
  const paid = draft.paid?.serviceId === service.id ? draft.paid : undefined
  const [phoneFocus, setPhoneFocus] = useState(false)
  // Sample card details are filled in, so trying the demo takes one tap.
  const [card, setCard] = useState<Card>(() => {
    const d = new Date(now)
    return { number: '4111 1111 1111 1111', expiry: `${String(d.getMonth() + 1).padStart(2, '0')}/${(d.getFullYear() + 3) % 100}`, cvc: '123' }
  })
  const [errors, setErrors] = useState<Partial<Record<'name' | 'phone' | 'email' | 'deposit' | 'card', string>>>({})
  const [paying, setPaying] = useState(false)
  const [bookError, setBookError] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  // Leaving the screen mid-payment cancels it, so nothing is half paid.
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const pay = () => {
    const problem = cardProblem(card, now)
    setErrors((e) => ({ ...e, card: problem ?? undefined }))
    if (problem) return
    setPaying(true)
    const last4 = card.number.replace(/\s/g, '').slice(-4)
    timer.current = window.setTimeout(() => {
      setPaying(false)
      onDraft((d) => ({ ...d, paid: { serviceId: service.id, amount: deposit, last4 } }))
      setErrors((e) => ({ ...e, deposit: undefined }))
      // The pay button is replaced by the receipt, so move on to the next step.
      window.requestAnimationFrame(() => document.getElementById('bk-confirm')?.focus())
    }, 1200)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next = {
      name: draft.name.trim().length >= 2 ? undefined : 'Please enter your name.',
      phone: validMobile(draft.phone) ? undefined : 'Enter a mobile number, e.g. 082 123 4567.',
      email: !draft.email.trim() || validEmail(draft.email) ? undefined : 'Check the email address, or leave it empty.',
      deposit: deposit && !paid ? `Pay the ${moneyWhole(deposit)} deposit to confirm your booking.` : undefined,
    }
    setErrors(next)
    const first = next.name ? 'bk-name' : next.phone ? 'bk-phone' : next.email ? 'bk-email' : next.deposit ? 'bk-pay' : null
    if (first) document.getElementById(first)?.focus()
    else setBookError(onConfirm(draft))
  }

  const aria = (id: string, error?: string) => ({ 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${id}-error` : undefined })
  const cardField = (id: string, label: string, key: keyof Card, autoComplete: string, className?: string) => (
    <Field label={label} htmlFor={id} className={className}>
      <TextInput id={id} inputMode="numeric" autoComplete={autoComplete} maxLength={23} value={card[key]} onChange={(e) => setCard({ ...card, [key]: e.target.value })} />
    </Field>
  )

  return (
    <Panel title="Your details" description="We only use these for this booking and your reminders.">
      <form noValidate onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Your name" htmlFor="bk-name" error={errors.name}>
            <TextInput id="bk-name" value={draft.name} onChange={(e) => update({ name: e.target.value })} autoComplete="name" maxLength={60} {...aria('bk-name', errors.name)} />
          </Field>
          <Field label="Mobile number" htmlFor="bk-phone" error={errors.phone} hint="For your WhatsApp confirmation and reminder">
            <TextInput
              id="bk-phone"
              type="tel"
              autoComplete="tel"
              maxLength={20}
              placeholder="082 123 4567"
              // Shown masked once entered, like the confirmation message.
              value={!phoneFocus && validMobile(draft.phone) ? maskPhone(draft.phone) : draft.phone}
              onFocus={() => setPhoneFocus(true)}
              onBlur={() => setPhoneFocus(false)}
              onChange={(e) => update({ phone: e.target.value })}
              {...(errors.phone ? aria('bk-phone', errors.phone) : { 'aria-describedby': 'bk-phone-hint' })}
            />
          </Field>
          <Field label="Email (optional)" htmlFor="bk-email" error={errors.email}>
            <TextInput
              id="bk-email"
              type="email"
              value={draft.email}
              onChange={(e) => update({ email: e.target.value })}
              autoComplete="email"
              maxLength={80}
              {...aria('bk-email', errors.email)}
            />
          </Field>
          <Field label="Notes (optional)" htmlFor="bk-notes">
            <TextArea id="bk-notes" rows={2} maxLength={200} value={draft.notes} onChange={(e) => update({ notes: e.target.value })} placeholder="E.g. a sensitive scalp" />
          </Field>
        </div>

        <Toggle
          checked={draft.reminder}
          onChange={(reminder) => update({ reminder })}
          label="Send me a WhatsApp reminder the day before"
          description={sameDay(day, now) ? 'Your visit is today, so you’ll get a WhatsApp confirmation straight away instead.' : undefined}
        />

        {deposit > 0 && (
          <section aria-labelledby="bk-deposit" className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
            <h4 id="bk-deposit" className="text-base font-semibold text-slate-900">
              Deposit due now: {moneyWhole(deposit)}
            </h4>
            <p className="mt-1 text-xs text-slate-700">
              Deposits are taken off the final bill. Free cancellation up to 24 h before your visit. Later cancellations and no-shows keep the deposit.
            </p>
            {paid ? (
              <Notice tone="green" icon={CircleCheck} title={`Deposit of ${moneyWhole(paid.amount)} paid`} className="mt-3">
                Card ending {paid.last4}. You’ll pay the rest, {money(service.price - paid.amount)}, at the salon.
              </Notice>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-3">
                {cardField('bk-card', 'Card number', 'number', 'cc-number', 'col-span-2')}
                {cardField('bk-exp', 'Expiry (MM/YY)', 'expiry', 'cc-exp')}
                {cardField('bk-cvc', 'CVC', 'cvc', 'cc-csc')}
                {errors.card && <p className="col-span-2 text-xs font-medium text-red-700">{errors.card}</p>}
                <AppButton id="bk-pay" className="col-span-2" icon={paying ? undefined : CreditCard} disabled={paying} onClick={pay}>
                  {paying && <Spinner />}
                  {paying ? 'Paying…' : `Pay ${moneyWhole(deposit)} deposit`}
                </AppButton>
                <Notice icon={Lock} className="col-span-2">
                  Simulated payment. No card is charged.
                </Notice>
              </div>
            )}
            <p role="status" className="sr-only">
              {paying ? 'Paying the deposit…' : paid ? `Deposit of ${moneyWhole(paid.amount)} paid.` : ''}
            </p>
            {errors.deposit && <p className="mt-2 text-xs font-medium text-red-700">{errors.deposit}</p>}
          </section>
        )}

        {bookError && (
          <Notice tone="red" title="That time is no longer available">
            <p>{bookError}</p>
            <AppButton size="sm" variant="secondary" className="mt-2" onClick={onBackToTimes}>
              Choose another time
            </AppButton>
          </Notice>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <AppButton variant="secondary" icon={ArrowLeft} onClick={onBackToTimes}>
            Back
          </AppButton>
          <AppButton id="bk-confirm" type="submit" icon={CalendarCheck} disabled={paying}>
            Confirm booking
          </AppButton>
        </div>
      </form>
    </Panel>
  )
}

interface ConfirmationProps {
  appt: Appointment
  name: string
  phone: string
  onAnother: () => void
  onShowInCalendar: (appt: Appointment) => void
}

function Confirmation({ appt, name, phone, onAnother, onShowInCalendar }: ConfirmationProps) {
  const bill = billFor(appt)
  const points = pointsFor(appt.price, appt.start)
  // Messages keep the time the booking was made.
  const plan = reminderPlan(appt, appt.createdAt)
  const url = useRef<string | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus()
    return () => {
      if (url.current) URL.revokeObjectURL(url.current)
    }
  }, [])

  const download = () => {
    if (url.current) URL.revokeObjectURL(url.current)
    url.current = URL.createObjectURL(new Blob([icsFile(appt, appt.createdAt)], { type: 'text/calendar;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url.current
    link.download = `sunbird-and-sage-${appt.ref}.ics`
    link.click()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-3 sm:p-5">
      <Panel>
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-800">
            <CircleCheck className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 ref={heading} tabIndex={-1} className="text-lg font-bold text-slate-900 outline-none">
              You’re booked, {firstName(name)}
            </h3>
            <p className="text-sm text-slate-600">Confirmation sent to {maskPhone(phone)} on WhatsApp. It’s already in the salon’s calendar.</p>
          </div>
        </div>
        <Rows
          className="mt-3"
          rows={[
            ['Service', serviceById(appt.serviceId).label],
            ['With', staffById(appt.staffId).name],
            ['Date', dayLong(appt.start)],
            ['Time', `${clockTime(appt.start)} to ${clockTime(appt.start + appt.duration * MINUTE)}`],
            ['Reference', <span key="ref" className="font-mono">{appt.ref}</span>],
            ['Deposit paid', bill.deposit ? `${moneyWhole(bill.deposit)}, taken off your bill` : 'No deposit needed'],
            ['To pay at the salon', money(bill.due)],
            ['Points you’ll earn', <Badge key="points" tone="accent">{`${points}${points > appt.price ? ' (double on Tuesdays)' : ''}`}</Badge>],
          ]}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <AppButton icon={CalendarDays} onClick={() => onShowInCalendar(appt)}>
            See it in the Calendar
          </AppButton>
          <AppButton variant="secondary" icon={Download} onClick={download}>
            Add to calendar
          </AppButton>
          <AppButton variant="ghost" onClick={onAnother}>
            Book another visit
          </AppButton>
        </div>
      </Panel>

      <Panel
        title={plan?.kind === 'confirmation' ? 'Your WhatsApp confirmation' : 'Your WhatsApp reminder'}
        description={
          plan?.kind === 'confirmation'
            ? 'Your visit is today, so this goes out straight away.'
            : plan && `Sent ${whenLabel(plan.at, appt.createdAt)}, the day before your visit.`
        }
      >
        {plan ? (
          <WhatsAppBubble text={clientMessage(appt, name, appt.createdAt)} meta={`${SALON.short} · ${clockTime(plan.at)}`} />
        ) : (
          <p className="text-sm text-slate-700">You chose not to get a reminder. The booking is still in your calendar file.</p>
        )}
      </Panel>
    </div>
  )
}
