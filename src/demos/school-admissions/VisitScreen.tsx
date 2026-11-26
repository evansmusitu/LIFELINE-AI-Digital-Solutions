import { CalendarCheck, CheckCircle2, ClipboardList, FileCheck2, LayoutDashboard, Paperclip, ShieldCheck } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { cn } from '../../lib/cn'
import { AppButton, Field, Notice, Panel, Segmented, SelectInput, TextInput } from '../ui'
import { ENTRY_COSTS, GRADES, SCHOOL, TOURS, type DocId, type Grade } from './business'
import {
  applicationReceipt,
  dayLong,
  dayShort,
  documentsFor,
  personalised,
  placesLeft,
  schoolDay,
  termFees,
  timeLabel,
  tourConfirmation,
  tourSlots,
  usdAndZig,
  validName,
  validPhone,
} from './engine'
import { PhoneFrame, WaBubble } from './parts'
import type { Application, Entry, Tour } from './types'

export interface TourInput {
  start: number
  parent: string
  phone: string
  grade: Grade
}

export interface ApplyInput {
  child: string
  parent: string
  phone: string
  grade: Grade
  entry: Entry
  sibling: boolean
  docs: Partial<Record<DocId, boolean>>
}

interface Props {
  business: string | null
  now: number
  tours: Tour[]
  applications: Application[]
  bookedTour?: Tour
  submitted?: Application
  onBookTour: (input: TourInput) => string | null
  onApply: (input: ApplyInput) => string | null
  onAnother: () => void
  onOffice: () => void
}

type Mode = 'tour' | 'apply'

export function VisitScreen(props: Props) {
  const [mode, setMode] = useState<Mode>('tour')
  return (
    <div className="space-y-4 p-3 sm:p-5">
      <Segmented<Mode>
        label="Book a tour or apply"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'tour', label: 'Book a tour', icon: CalendarCheck },
          { value: 'apply', label: 'Apply online', icon: ClipboardList },
        ]}
        className="w-full sm:w-auto"
      />
      {mode === 'tour' ? <TourBooking {...props} /> : <ApplyForm {...props} />}
    </div>
  )
}

function Confirmation({ title, message, business, onAnother, onOffice }: { title: string; message: string; business: string | null; onAnother: () => void; onOffice: () => void }) {
  const name = business ?? SCHOOL.name
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_22rem]">
      <Panel>
        <Notice tone="green" icon={CheckCircle2} title={title}>
          The WhatsApp message on the right is what the family gets (a preview: nothing is sent). The admissions office sees it straight away.
        </Notice>
        <div className="mt-4 flex flex-wrap gap-2">
          <AppButton icon={LayoutDashboard} onClick={onOffice}>
            See it in the admissions office
          </AppButton>
          <AppButton variant="secondary" onClick={onAnother}>
            Start again
          </AppButton>
        </div>
      </Panel>
      <PhoneFrame title={name} subtitle="WhatsApp Business · preview" initials="MR" label="WhatsApp message preview">
        <div className="space-y-2 p-3">
          <WaBubble text={personalised(message, business)} author={name} time="now" />
        </div>
      </PhoneFrame>
    </div>
  )
}

function TourBooking({ business, now, tours, bookedTour, onBookTour, onAnother, onOffice }: Props) {
  const id = useId()
  const slots = tourSlots(tours, now)
  const [start, setStart] = useState<number | null>(null)
  const [parent, setParent] = useState('')
  const [phone, setPhone] = useState('')
  const [grade, setGrade] = useState<Grade>('Form 1')
  const [tried, setTried] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (bookedTour) {
    return (
      <Confirmation
        title={`Tour booked: ${dayLong(schoolDay(bookedTour.start))} at ${timeLabel(bookedTour.start)}. Ref ${bookedTour.ref}.`}
        message={tourConfirmation(bookedTour)}
        business={business}
        onAnother={() => {
          setStart(null)
          onAnother()
        }}
        onOffice={onOffice}
      />
    )
  }

  const days = [...new Set(slots.map((s) => schoolDay(s.start)))]
  const errors = {
    start: start === null ? 'Please choose a tour time.' : undefined,
    parent: !validName(parent) ? 'Please enter your name.' : undefined,
    phone: !validPhone(phone) ? 'Please enter a WhatsApp number with the country code, for example +263 or +27.' : undefined,
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setTried(true)
    if (errors.start || errors.parent || errors.phone || start === null) return
    setError(onBookTour({ start, parent, phone, grade }))
  }

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_22rem]">
      <Panel title="Choose a tour" description={`${TOURS.text} Up to ${TOURS.capacity} families per tour. Times are ${SCHOOL.timeLabel}.`}>
        <div className="space-y-3">
          {days.map((day) => (
            <fieldset key={day}>
              <legend className="mb-1.5 text-xs font-semibold text-slate-700">{dayShort(day)}</legend>
              <div className="flex flex-wrap gap-2">
                {slots
                  .filter((s) => schoolDay(s.start) === day)
                  .map((s) => (
                    <button
                      key={s.start}
                      type="button"
                      disabled={s.full}
                      aria-pressed={start === s.start}
                      onClick={() => setStart(s.start)}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50',
                        start === s.start ? 'border-(--accent) bg-(--accent-soft) font-semibold text-(--accent-ink)' : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400',
                      )}
                    >
                      {timeLabel(s.start)}
                      <span className="block text-[0.7rem] font-normal text-slate-600">{s.full ? 'Full' : `${TOURS.capacity - s.taken} of ${TOURS.capacity} places left`}</span>
                    </button>
                  ))}
              </div>
            </fieldset>
          ))}
        </div>
        {tried && errors.start && <p className="mt-2 text-xs font-medium text-red-700">{errors.start}</p>}
      </Panel>
      <Panel title="Your details" description="Only what the office needs to welcome you.">
        <div className="space-y-3">
          <Field label="Parent or guardian’s name" htmlFor={`${id}-parent`} error={tried ? errors.parent : undefined}>
            <TextInput id={`${id}-parent`} value={parent} onChange={(e) => setParent(e.target.value)} autoComplete="name" maxLength={60} aria-invalid={tried && !!errors.parent} />
          </Field>
          <Field label="WhatsApp number" htmlFor={`${id}-phone`} error={tried ? errors.phone : undefined}>
            <TextInput id={`${id}-phone`} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+263 77 123 4567" autoComplete="tel" maxLength={20} aria-invalid={tried && !!errors.phone} />
          </Field>
          <Field label="Grade you’re interested in" htmlFor={`${id}-grade`}>
            <SelectInput id={`${id}-grade`} value={grade} onChange={(e) => setGrade(e.target.value as Grade)}>
              {GRADES.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </SelectInput>
          </Field>
          {error && <Notice tone="red">{error}</Notice>}
          <AppButton type="submit" icon={CalendarCheck} className="w-full">
            Book the tour
          </AppButton>
        </div>
      </Panel>
    </form>
  )
}

function ApplyForm({ business, applications, submitted, onApply, onAnother, onOffice }: Props) {
  const id = useId()
  const [grade, setGrade] = useState<Grade>('Form 1')
  const [entry, setEntry] = useState<Entry>('January 2027')
  const [child, setChild] = useState('')
  const [parent, setParent] = useState('')
  const [phone, setPhone] = useState('')
  const [sibling, setSibling] = useState(false)
  const [docs, setDocs] = useState<Partial<Record<DocId, boolean>>>({})
  const [consent, setConsent] = useState(false)
  const [tried, setTried] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (submitted) {
    return (
      <Confirmation
        title={`Application received for ${submitted.child}, ${submitted.grade}. Ref ${submitted.ref}.`}
        message={applicationReceipt(submitted)}
        business={business}
        onAnother={() => {
          setChild('')
          setDocs({})
          setConsent(false)
          setTried(false)
          onAnother()
        }}
        onOffice={onOffice}
      />
    )
  }

  const needed = documentsFor(grade, entry)
  const left = placesLeft(grade, applications)
  const errors = {
    child: !validName(child) ? 'Please enter your child’s name.' : undefined,
    parent: !validName(parent) ? 'Please enter your name.' : undefined,
    phone: !validPhone(phone) ? 'Please enter a WhatsApp number with the country code.' : undefined,
    consent: !consent ? 'The school needs your consent to keep these details.' : undefined,
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setTried(true)
    if (Object.values(errors).some(Boolean)) return
    setError(onApply({ child, parent, phone, grade, entry, sibling, docs }))
  }

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-5">
        <Panel title="The learner" description="Only what the application needs. The office never asks for more in a chat.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Grade" htmlFor={`${id}-grade`}>
              <SelectInput id={`${id}-grade`} value={grade} onChange={(e) => setGrade(e.target.value as Grade)}>
                {GRADES.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Starting" htmlFor={`${id}-entry`}>
              <SelectInput id={`${id}-entry`} value={entry} onChange={(e) => setEntry(e.target.value as Entry)}>
                <option>January 2027</option>
                <option>Mid-year transfer</option>
              </SelectInput>
            </Field>
            <Field label="Child’s full name" htmlFor={`${id}-child`} hint="The office list shows only the first name and an initial." error={tried ? errors.child : undefined}>
              <TextInput id={`${id}-child`} value={child} onChange={(e) => setChild(e.target.value)} maxLength={60} aria-invalid={tried && !!errors.child} />
            </Field>
            <label className="flex items-start gap-2 self-end pb-2 text-sm text-slate-800">
              <input type="checkbox" checked={sibling} onChange={(e) => setSibling(e.target.checked)} className="mt-0.5 size-4 accent-(--accent)" />
              A brother or sister is already at the school
            </label>
          </div>
        </Panel>

        <Panel title="Documents" description="Attach a clear photo of each. You can also send the missing ones on WhatsApp later.">
          <ul className="space-y-2">
            {needed.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
                <span className="flex items-center gap-2 text-sm text-slate-800">
                  {docs[d.id] ? <FileCheck2 className="size-4 text-emerald-700" aria-hidden="true" /> : <Paperclip className="size-4 text-slate-500" aria-hidden="true" />}
                  {d.name}
                </span>
                <AppButton size="sm" variant={docs[d.id] ? 'ghost' : 'secondary'} onClick={() => setDocs((x) => ({ ...x, [d.id]: !x[d.id] }))} aria-pressed={!!docs[d.id]}>
                  {docs[d.id] ? 'Attached (sample)' : 'Attach'}
                </AppButton>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[0.7rem] text-slate-600">In this demo, “Attach” only ticks the item. No file is uploaded.</p>
        </Panel>

        <Panel title="Parent or guardian">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Your name" htmlFor={`${id}-parent`} error={tried ? errors.parent : undefined}>
              <TextInput id={`${id}-parent`} value={parent} onChange={(e) => setParent(e.target.value)} autoComplete="name" maxLength={60} aria-invalid={tried && !!errors.parent} />
            </Field>
            <Field label="WhatsApp number" htmlFor={`${id}-phone`} error={tried ? errors.phone : undefined}>
              <TextInput id={`${id}-phone`} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+263 77 123 4567" autoComplete="tel" maxLength={20} aria-invalid={tried && !!errors.phone} />
            </Field>
          </div>
          <label className="mt-3 flex items-start gap-2 text-sm text-slate-800">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 accent-(--accent)" aria-invalid={tried && !!errors.consent} />
            <span>
              I am the child’s parent or guardian, and I agree that {business ?? SCHOOL.name} keeps these details to process the application. They are deleted if the child doesn’t join.
            </span>
          </label>
          {tried && errors.consent && <p className="mt-1 text-xs font-medium text-red-700">{errors.consent}</p>}
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel title={`${grade}, ${entry.toLowerCase()}`}>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-slate-600">Fees for one term (day learner, with the approved levies)</dt>
              <dd className="font-semibold text-slate-900">{usdAndZig(termFees(grade))}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-600">Places for January 2027</dt>
              <dd className="font-semibold text-slate-900">{left > 0 ? `${left} left` : 'Full: the application joins the waiting list'}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-600">{ENTRY_COSTS.application.text}</p>
        </Panel>
        <Notice tone="accent" icon={ShieldCheck}>
          Written consent from a parent or guardian is needed before a school keeps a child’s details. The form can’t be sent without it.
        </Notice>
        {error && <Notice tone="red">{error}</Notice>}
        <AppButton type="submit" icon={ClipboardList} className="w-full">
          Send the application
        </AppButton>
      </div>
    </form>
  )
}
