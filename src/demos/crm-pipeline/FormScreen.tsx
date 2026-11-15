import { ArrowRight, Bot, CircleCheck, Info, SendHorizontal } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { clockTime, firstName, money, moneyWhole, num } from '../../lib/format'
import { AppButton, Badge, Field, Notice, Panel, SelectInput, TextArea, TextInput } from '../ui'
import {
  BUSINESS,
  FACILITIES,
  OWNERS,
  PER_WEEK,
  ROTATION,
  addDays,
  monthly,
  perWeekLabel,
  toDateInput,
  validateEnquiry,
  type Quote,
} from './engine'
import { EmailPreview } from './parts'
import type { Deal, Enquiry, Facility, PerWeek, Task } from './types'

export interface FormResult {
  deal: Deal
  task: Task
  quote: Quote
}

interface Props {
  now: number
  result: FormResult | null
  onSubmit: (enquiry: Enquiry) => void
  onAnother: () => void
  onSeePipeline: (dealId: string) => void
}

const EMPTY: Enquiry = { company: '', name: '', email: '', phone: '', facility: 'Office', sqft: '', perWeek: 3, start: '', message: '' }

interface InputExtra {
  type?: string
  autoComplete?: string
  inputMode?: 'numeric' | 'tel' | 'email'
  placeholder?: string
}

const FREQUENCY: Record<PerWeek, string> = { 1: 'Once a week', 2: 'Twice a week', 3: '3 times a week', 5: 'Every weekday' }

export function FormScreen({ now, result, onSubmit, onAnother, onSeePipeline }: Props) {
  const [form, setForm] = useState<Enquiry>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof Enquiry, string>>>({})
  const resultRef = useRef<HTMLDivElement>(null)

  // The send button disappears with the form, so move focus to the result.
  useEffect(() => {
    if (result) resultRef.current?.focus()
  }, [result])

  const set = <K extends keyof Enquiry>(key: K, value: Enquiry[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next = validateEnquiry(form, now)
    setErrors(next)
    const first = Object.keys(next)[0]
    if (first) {
      document.getElementById(`enq-${first}`)?.focus()
      return
    }
    onSubmit(form)
    setForm(EMPTY)
  }

  const example = () => {
    setErrors({})
    setForm({
      company: 'Pebblecreek Family Dental',
      name: 'Natalie Vance',
      email: 'natalie.vance@example.com',
      phone: '(919) 555-0136',
      facility: 'Medical',
      sqft: '2,800',
      perWeek: 3,
      start: toDateInput(addDays(now, 14)),
      message: 'Two dentists, 5 operatories, a front desk and 2 restrooms. We’d like cleaning after 6 PM.',
    })
  }

  const input = (key: keyof Enquiry, label: string, extra: InputExtra = {}) => (
    <Field label={label} htmlFor={`enq-${key}`} error={errors[key]}>
      <TextInput
        id={`enq-${key}`}
        type={extra.type ?? 'text'}
        value={String(form[key])}
        onChange={(e) => set(key, e.target.value)}
        autoComplete={extra.autoComplete}
        inputMode={extra.inputMode}
        placeholder={extra.placeholder}
        min={extra.type === 'date' ? toDateInput(now) : undefined}
        maxLength={80}
        aria-invalid={Boolean(errors[key])}
        aria-describedby={errors[key] ? `enq-${key}-error` : undefined}
      />
    </Field>
  )

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-3 sm:p-5">
      <p className="truncate rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm">
        <span className="sr-only">Prospect’s view of </span>
        {BUSINESS.site}/free-quote
      </p>

      {result ? (
        <div ref={resultRef} tabIndex={-1} className="outline-none">
          <Result result={result} onAnother={onAnother} onSeePipeline={onSeePipeline} />
        </div>
      ) : (
        <Panel
          className="mx-auto max-w-2xl"
          bodyClassName="max-sm:p-3"
          title="Get a free cleaning quote"
          description="Offices, clinics, schools and gyms across Raleigh. Tell us about your building and we’ll call you within one business hour."
        >
          <form noValidate onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {input('company', 'Company or building', { autoComplete: 'organization' })}
              {input('name', 'Your name', { autoComplete: 'name' })}
              {input('email', 'Email', { type: 'email', autoComplete: 'email', inputMode: 'email' })}
              {input('phone', 'Phone', { type: 'tel', autoComplete: 'tel', inputMode: 'tel', placeholder: '(919) 555-0100' })}
              <Field label="Type of building" htmlFor="enq-facility">
                <SelectInput id="enq-facility" value={form.facility} onChange={(e) => set('facility', e.target.value as Facility)}>
                  {FACILITIES.map((f) => (
                    <option key={f} value={f}>
                      {f === 'Medical' ? 'Medical or dental' : f}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              {input('sqft', 'Approximate square feet', { inputMode: 'numeric', placeholder: '4,000' })}
              <Field label="How often" htmlFor="enq-perWeek">
                <SelectInput id="enq-perWeek" value={form.perWeek} onChange={(e) => set('perWeek', Number(e.target.value) as PerWeek)}>
                  {PER_WEEK.map((n) => (
                    <option key={n} value={n}>
                      {FREQUENCY[n]}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              {input('start', 'Start date (optional)', { type: 'date' })}
            </div>
            <Field label="Anything we should know? (optional)" htmlFor="enq-message">
              <TextArea id="enq-message" rows={3} maxLength={500} value={form.message} onChange={(e) => set('message', e.target.value)} placeholder="Rooms, opening hours, what your current cleaner misses" />
            </Field>
            <div className="flex flex-col gap-2 sm:flex-row">
              <AppButton type="submit" icon={SendHorizontal}>
                Send enquiry
              </AppButton>
              <AppButton variant="secondary" onClick={example}>
                Fill in an example
              </AppButton>
            </div>
          </form>
        </Panel>
      )}

      <p className="mx-auto flex max-w-2xl gap-2 text-xs text-slate-600">
        <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        In this demo nothing leaves your browser. Your version connects the form on your own website and sends the reply from your email.
      </p>
    </div>
  )
}

function Result({ result, onAnother, onSeePipeline }: { result: FormResult; onAnother: () => void; onSeePipeline: (id: string) => void }) {
  const { deal, task, quote } = result
  const owner = OWNERS[deal.owner]
  const previous = OWNERS[ROTATION[(ROTATION.indexOf(deal.owner) + ROTATION.length - 1) % ROTATION.length]]
  const ownerFirst = firstName(owner.name)
  const first = firstName(deal.contact.name)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel title="What the prospect sees" description={BUSINESS.site}>
        <div className="space-y-4">
          <Notice tone="green" icon={CircleCheck} title={`Thanks, ${first}. We’ve got your request.`}>
            {ownerFirst} will call you within one business hour to book a free walkthrough. Your fixed monthly price follows by email.
          </Notice>
          <div>
            <h4 className="mb-2 text-xs font-semibold tracking-wide text-slate-600 uppercase">Instant reply in your inbox</h4>
            <EmailPreview from={`${BUSINESS.name} <${BUSINESS.email}>`} to={deal.contact.email} subject="We’ve got your quote request">
              <p>Hi {first},</p>
              <p>
                Thanks for asking about cleaning for {deal.company}. {owner.name} will call you on {deal.contact.phone} within one business
                hour.
              </p>
              <p>
                For {num(deal.sqft)} sq ft cleaned {perWeekLabel(deal.perWeek)}, our estimate is about {moneyWhole(deal.value)} a month.{' '}
                {ownerFirst} will confirm a fixed price after a short walkthrough.
              </p>
              <p>The {BUSINESS.name} team</p>
            </EmailPreview>
          </div>
          <AppButton variant="secondary" onClick={onAnother} className="w-full sm:w-auto">
            Send another enquiry
          </AppButton>
        </div>
      </Panel>

      <section aria-labelledby="crm-behind" className="self-start rounded-xl border-2 border-dashed border-slate-300 bg-slate-100/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="crm-behind" className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Bot className="size-4 text-(--accent-ink)" aria-hidden="true" />
            What happened in the CRM
          </h3>
          <Badge>Team view</Badge>
        </div>
        <ul className="mt-3 space-y-2.5 rounded-lg bg-white p-3 text-sm text-slate-800">
          <Step>
            Lead created in <span className="font-semibold">New lead</span>: {deal.company}
          </Step>
          <Step>
            Source: <span className="font-semibold">Website form</span>
          </Step>
          <Step>
            Owner: <span className="font-semibold">{owner.name}</span>, by round robin. {firstName(previous.name)} had the last website lead.
          </Step>
          <Step>
            Estimated value: <span className="font-semibold">{monthly(deal.value)}</span>
            <span className="block text-xs text-slate-600 tabular-nums">
              {num(quote.sqft)} sq ft × ${quote.rate.toFixed(3)}
              {quote.minimumApplied && `, minimum ${money(quote.minimum)}`} = {money(quote.perVisit)} a visit × {quote.visits} visits a month,
              rounded to the nearest $5
            </span>
          </Step>
          <Step>
            Follow-up for {ownerFirst}: <span className="font-semibold">“{task.text}”</span>, due {clockTime(task.due, 'en-US')}
          </Step>
          <Step>Instant reply sent to {first}</Step>
        </ul>
        <p className="mt-3 text-xs text-slate-600">The time-saved estimate counts 8 minutes for each lead entered for you.</p>
        <AppButton icon={ArrowRight} className="mt-3 w-full sm:w-auto" onClick={() => onSeePipeline(deal.id)}>
          See it on the Pipeline
        </AppButton>
      </section>
    </div>
  )
}

function Step({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2">
      <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden="true" />
      <span className="min-w-0 break-words">{children}</span>
    </li>
  )
}
