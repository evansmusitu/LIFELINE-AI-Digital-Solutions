import { ArrowLeft, ArrowRight, CalendarCheck, Check, Info, Laptop, MapPin, ShieldCheck } from 'lucide-react'
import { useId, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { cn } from '../../lib/cn'
import { initials } from '../../lib/format'
import { AppButton, Field, Notice, TextInput } from '../ui'
import { BUSINESS, OFFICES, ONLINE, PRACTITIONERS, modeLabel, priceLabel, type Mode } from './business'
import {
  bookableServices,
  bookingDays,
  checkDetails,
  confirmationMessage,
  dayLabel,
  dayLong,
  dayWord,
  hhmm,
  personalised,
  practiceDay,
  practiceMinute,
  practitionerById,
  practitionersFor,
  reminderAt,
  reminderMessage,
  serviceById,
  slotsFor,
  timeLabel,
} from './engine'
import { PhoneFrame, WaBubble } from './parts'
import type { Booking, Draft } from './types'

const STEPS = ['How', 'Service', 'Time', 'Details'] as const
const PARTS = [
  ['Morning', 0, 12 * 60],
  ['Afternoon', 12 * 60, 24 * 60],
] as const

interface Props {
  business: string | null
  draft: Draft
  onDraft: Dispatch<SetStateAction<Draft>>
  bookings: Booking[]
  now: number
  confirmed?: Booking
  onConfirm: (draft: Draft) => string | null
  onAnother: () => void
  onOwner: () => void
}

export function BookScreen({ business, draft, onDraft, bookings, now, confirmed, onConfirm, onAnother, onOwner }: Props) {
  const update = (patch: Partial<Draft>) => onDraft((d) => ({ ...d, ...patch }))
  const mode = draft.mode
  const service = draft.serviceId ? serviceById(draft.serviceId) : undefined
  const days = bookingDays(now)
  const slotsByDay = mode && service ? days.map((day) => slotsFor(service, mode, draft.practitioner, day, bookings, now)) : []
  const chosenIndex = draft.day === undefined ? -1 : days.indexOf(draft.day)
  const dayIndex = chosenIndex >= 0 ? chosenIndex : Math.max(0, slotsByDay.findIndex((s) => s.length > 0))
  const day = days[dayIndex]
  const slots = slotsByDay[dayIndex] ?? []
  // A chosen time that has since passed or been taken no longer counts.
  const minute = chosenIndex >= 0 && slots.some((s) => s.minute === draft.minute) ? draft.minute : undefined
  const reachable = !mode ? 1 : !service ? 2 : minute === undefined ? 3 : 4
  const step = Math.min(draft.step, reachable) as Draft['step']

  if (confirmed) return <Confirmation business={business} booking={confirmed} now={now} onAnother={onAnother} onOwner={onOwner} />

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

      {step > 1 && mode && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm">
          <span className="font-semibold text-slate-900">{modeLabel(mode)}</span>
          {service && step > 2 && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                {service.name}, {service.minutes} min, {priceLabel(service)}
              </span>
              <span aria-hidden="true">·</span>
              <span>{draft.practitioner === 'any' ? 'Any consultant' : practitionerById(draft.practitioner).name}</span>
            </>
          )}
          {step === 4 && day !== undefined && minute !== undefined && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-semibold">
                {dayLabel(day)} at {hhmm(minute)}
              </span>
            </>
          )}
        </p>
      )}

      {step === 1 && (
        <section aria-labelledby="wb-how" className="space-y-3">
          <h3 id="wb-how" className="text-lg font-semibold text-slate-900">
            How would you like to meet?
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[...OFFICES.map((o) => ({ id: o.id as Mode, title: `${o.city} office`, sub: o.area, hours: o.hoursText, icon: MapPin })), { id: 'online' as Mode, title: 'Online consultation', sub: 'Video call from anywhere', hours: ONLINE.hoursText, icon: Laptop }].map((option) => {
              const Icon = option.icon
              const selected = mode === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onDraft((d) => ({ ...d, mode: option.id, serviceId: undefined, practitioner: 'any', day: undefined, minute: undefined, step: 2 }))}
                  className={cn(
                    'flex flex-col items-start gap-1 rounded-xl border bg-white p-4 text-left shadow-sm transition hover:border-(--accent)',
                    selected ? 'border-(--accent) ring-2 ring-(--accent)/30' : 'border-slate-200',
                  )}
                >
                  <Icon className="size-5 text-(--accent)" aria-hidden="true" />
                  <span className="mt-1 font-semibold text-slate-900">{option.title}</span>
                  <span className="text-xs text-slate-600">{option.sub}</span>
                  <span className="mt-1 text-xs text-slate-700">{option.hours}</span>
                </button>
              )
            })}
          </div>
          <p className="text-xs text-slate-600">All times are {BUSINESS.timeLabel}.</p>
        </section>
      )}

      {step === 2 && mode && (
        <section aria-labelledby="wb-service" className="space-y-3">
          <h3 id="wb-service" className="text-lg font-semibold text-slate-900">
            Choose a service
          </h3>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {bookableServices(mode).map((s) => {
              const selected = draft.serviceId === s.id
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => update({ serviceId: s.id, practitioner: 'any', day: undefined, minute: undefined })}
                    className={cn(
                      'flex h-full w-full flex-col rounded-xl border bg-white p-3.5 text-left shadow-sm transition hover:border-(--accent)',
                      selected ? 'border-(--accent) ring-2 ring-(--accent)/30' : 'border-slate-200',
                    )}
                  >
                    <span className="flex w-full items-baseline justify-between gap-3">
                      <span className="font-semibold text-slate-900">{s.name}</span>
                      <span className="shrink-0 text-sm font-semibold text-(--accent-ink)">{priceLabel(s)}</span>
                    </span>
                    <span className="text-xs text-slate-600">{s.minutes} min</span>
                    <span className="mt-1 text-sm text-slate-700">{s.summary}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="text-xs text-slate-600">Workplace wellness talks are arranged with the team: use “Leave my details” in the chat.</p>
          {service && (
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-900">Consultant</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Consultant">
                {(['any', ...practitionersFor(service.id, mode).map((p) => p.id)] as const).map((id) => {
                  const selected = draft.practitioner === id
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => update({ practitioner: id, day: undefined, minute: undefined })}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-sm font-medium transition',
                        selected ? 'border-(--accent) bg-(--accent) text-white' : 'border-slate-300 bg-white text-slate-800 hover:border-(--accent)',
                      )}
                    >
                      {id === 'any' ? 'Any consultant' : PRACTITIONERS.find((p) => p.id === id)?.name}
                    </button>
                  )
                })}
              </div>
              <div className="mt-4 flex justify-between">
                <AppButton variant="ghost" icon={ArrowLeft} onClick={() => update({ step: 1 })}>
                  Back
                </AppButton>
                <AppButton onClick={() => update({ step: 3 })}>
                  Choose a time
                  <ArrowRight className="size-4" aria-hidden="true" />
                </AppButton>
              </div>
            </div>
          )}
        </section>
      )}

      {step === 3 && mode && service && (
        <section aria-labelledby="wb-time" className="space-y-3">
          <h3 id="wb-time" className="text-lg font-semibold text-slate-900">
            Pick a time
          </h3>
          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Day">
            {days.map((d, i) => {
              const count = slotsByDay[i]?.length ?? 0
              const selected = i === dayIndex
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={selected}
                  disabled={!count}
                  onClick={() => update({ day: d, minute: undefined })}
                  className={cn(
                    'flex min-w-[5.2rem] shrink-0 flex-col items-center rounded-xl border px-2 py-2 text-sm transition disabled:opacity-45',
                    selected ? 'border-(--accent) bg-(--accent) text-white' : 'border-slate-200 bg-white text-slate-800 enabled:hover:border-(--accent)',
                  )}
                >
                  <span className="font-semibold">{d === practiceDay(now) ? 'Today' : dayLabel(d).split(' ')[0]}</span>
                  <span className="text-xs">{dayLabel(d).split(' ').slice(1).join(' ')}</span>
                  <span className={cn('mt-0.5 text-[0.65rem]', selected ? 'text-white/90' : 'text-slate-600')}>{count ? `${count} free` : 'None free'}</span>
                </button>
              )
            })}
          </div>
          {slots.length === 0 ? (
            <Notice tone="amber" icon={Info}>
              No free times this week for this choice. Try another consultant, another way to meet, or leave your details in the chat.
            </Notice>
          ) : (
            PARTS.map(([label, from, to]) => {
              const part = slots.filter((s) => s.minute >= from && s.minute < to)
              if (!part.length) return null
              return (
                <div key={label}>
                  <p className="mb-1.5 text-xs font-semibold tracking-wide text-slate-600 uppercase">{label}</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {part.map((s) => {
                      const selected = minute === s.minute
                      return (
                        <button
                          key={s.minute}
                          type="button"
                          aria-pressed={selected}
                          aria-label={`${hhmm(s.minute)} on ${dayLong(day)}`}
                          onClick={() => update({ day, minute: s.minute, step: 4 })}
                          className={cn(
                            'h-10 rounded-lg border text-sm font-semibold tabular-nums transition',
                            selected ? 'border-(--accent) bg-(--accent) text-white' : 'border-slate-300 bg-white text-slate-800 hover:border-(--accent)',
                          )}
                        >
                          {hhmm(s.minute)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
          <p className="text-xs text-slate-600">
            {BUSINESS.timeLabel}. Bookable from an hour ahead.
          </p>
          <AppButton variant="ghost" icon={ArrowLeft} onClick={() => update({ step: 2 })}>
            Back
          </AppButton>
        </section>
      )}

      {step === 4 && mode && service && day !== undefined && minute !== undefined && (
        <DetailsStep draft={draft} onChange={update} onBack={() => update({ step: 3 })} onConfirm={() => onConfirm({ ...draft, day, minute })} />
      )}
    </div>
  )
}

function DetailsStep({
  draft,
  onChange,
  onBack,
  onConfirm,
}: {
  draft: Draft
  onChange: (patch: Partial<Draft>) => void
  onBack: () => void
  onConfirm: () => string | null
}) {
  const id = useId()
  const [tried, setTried] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const errors = checkDetails(draft)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    setTried(true)
    if (Object.keys(errors).length) return
    setProblem(onConfirm())
  }
  return (
    <form onSubmit={submit} noValidate aria-labelledby="wb-details" className="space-y-3">
      <h3 id="wb-details" className="text-lg font-semibold text-slate-900">
        Your details
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Full name" htmlFor={`${id}-name`} error={tried ? errors.name : undefined}>
          <TextInput id={`${id}-name`} value={draft.name} onChange={(e) => onChange({ name: e.target.value })} autoComplete="name" maxLength={60} aria-invalid={tried && !!errors.name} />
        </Field>
        <Field label="Mobile number (WhatsApp)" htmlFor={`${id}-phone`} hint="With the country code, for example +263 or +27" error={tried ? errors.phone : undefined}>
          <TextInput id={`${id}-phone`} type="tel" value={draft.phone} onChange={(e) => onChange({ phone: e.target.value })} autoComplete="tel" maxLength={24} aria-invalid={tried && !!errors.phone} />
        </Field>
        <Field label="Email (optional)" htmlFor={`${id}-email`} error={tried ? errors.email : undefined} className="sm:col-span-2">
          <TextInput id={`${id}-email`} type="email" value={draft.email} onChange={(e) => onChange({ email: e.target.value })} autoComplete="email" maxLength={100} aria-invalid={tried && !!errors.email} />
        </Field>
      </div>
      <Notice icon={ShieldCheck} tone="accent">
        That’s all we need. There are no health questions: your consultant goes through anything personal with you in the session.
        Your details are only used for this booking and its reminders.
      </Notice>
      {problem && (
        <Notice tone="red" icon={Info}>
          {problem}
        </Notice>
      )}
      <div className="flex justify-between">
        <AppButton variant="ghost" icon={ArrowLeft} onClick={onBack}>
          Back
        </AppButton>
        <AppButton type="submit" icon={CalendarCheck}>
          Confirm booking
        </AppButton>
      </div>
      <p className="text-xs text-slate-600">Demo only: nothing is booked or sent, and what you type stays in this browser.</p>
    </form>
  )
}

function Confirmation({ business, booking, now, onAnother, onOwner }: { business: string | null; booking: Booking; now: number; onAnother: () => void; onOwner: () => void }) {
  const service = serviceById(booking.serviceId)
  const day = practiceDay(booking.start)
  const from = practiceMinute(booking.start)
  const remindAt = reminderAt(booking)
  const name = business ?? BUSINESS.name
  return (
    <div className="grid grid-cols-1 gap-5 p-3 sm:p-5 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        <Notice tone="green" icon={CalendarCheck} title={`Booked: ${booking.ref}`}>
          {service.name} with {practitionerById(booking.practitionerId).name}, {dayWord(day, now)} at {hhmm(from)}.
        </Notice>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm sm:grid-cols-[8rem_1fr]">
          <dt className="text-slate-600">When</dt>
          <dd className="font-semibold text-slate-900">
            {dayLong(day)}, {hhmm(from)} to {hhmm(from + booking.minutes)}
            <span className="block text-xs font-normal text-slate-600">{BUSINESS.timeLabel}</span>
          </dd>
          <dt className="text-slate-600">Where</dt>
          <dd className="text-slate-900">{modeLabel(booking.mode)}</dd>
          <dt className="text-slate-600">Consultant</dt>
          <dd className="text-slate-900">{practitionerById(booking.practitionerId).name}</dd>
          <dt className="text-slate-600">Price</dt>
          <dd className="text-slate-900">{priceLabel(service)}, paid at the consultation. No deposit.</dd>
          <dt className="text-slate-600">Contact</dt>
          <dd className="text-slate-900">
            {booking.client.name}, {booking.client.phone}
            {booking.client.email ? `, ${booking.client.email}` : ''}
          </dd>
        </dl>
        <p className="text-sm text-slate-700">
          The booking is now in the Owner view, with its WhatsApp confirmation and reminder. In the real system the practice’s
          calendar updates at the same moment, so the time can’t be booked twice.
        </p>
        <div className="flex flex-wrap gap-2">
          <AppButton onClick={onOwner}>See it in the Owner view</AppButton>
          <AppButton variant="secondary" onClick={onAnother}>
            Book another
          </AppButton>
        </div>
      </div>
      <div>
        <PhoneFrame title={name} subtitle="WhatsApp Business · preview" initials={initials(name)} label="Preview of the WhatsApp messages the client would get">
          <div className="space-y-2 p-3">
            <p className="mx-auto w-fit rounded-md bg-white/80 px-2 py-0.5 text-[0.65rem] font-medium text-slate-600 shadow-sm">Sent when you book</p>
            <WaBubble text={personalised(confirmationMessage(booking), business)} time={timeLabel(booking.createdAt)} />
            {remindAt ? (
              <>
                <p className="mx-auto w-fit rounded-md bg-white/80 px-2 py-0.5 text-[0.65rem] font-medium text-slate-600 shadow-sm">
                  Scheduled: {dayLabel(practiceDay(remindAt))} at {timeLabel(remindAt)}
                </p>
                <WaBubble text={personalised(reminderMessage(booking), business)} time={timeLabel(remindAt)} />
              </>
            ) : (
              <p className="mx-auto w-fit max-w-[90%] rounded-md bg-white/80 px-2 py-1 text-center text-[0.65rem] font-medium text-slate-600 shadow-sm">
                Booked less than a day ahead, so the confirmation is the only message.
              </p>
            )}
          </div>
          <p className="bg-white/70 px-3 py-2 text-center text-[0.7rem] text-slate-600">Preview only. No WhatsApp message is sent.</p>
        </PhoneFrame>
      </div>
    </div>
  )
}
