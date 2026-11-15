import { ArrowLeftRight, ChevronDown, CircleCheck, Clock, LoaderCircle, Mail, Phone, Plug, RotateCw, Send, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { cn } from '../../lib/cn'
import { firstName } from '../../lib/format'
import { AppButton, Field, Notice, Panel, TextInput, Toggle } from '../ui'
import { APPS, STAFF } from './catalog'
import { isUnresolved, maskPhone, type Problem } from './engine'
import { AppTile } from './parts'
import type { AppId, HubState, MappingId } from './types'

interface Props {
  state: HubState
  problems: Problem[]
  onReconnect: (app: AppId) => void
  onAddPhone: (eventId: string, index: number, phone: string) => void
  onEmailInstead: (eventId: string, index: number) => void
  onRetryMapping: (mapping: MappingId) => void
  onOpenMapping: (mapping: MappingId) => void
  onDismiss: (id: string) => void
  onAlerts: (alerts: HubState['alerts']) => void
}

const validPhone = (value: string) => {
  const digits = value.replace(/\D/g, '')
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'))
}

export function ErrorsScreen({ state, problems, onReconnect, onAddPhone, onEmailInstead, onRetryMapping, onOpenMapping, onDismiss, onAlerts }: Props) {
  // Problems the visitor acted on stay in place after they're fixed, so the result is visible.
  const [pinned, setPinned] = useState<string[]>([])
  const [showResolved, setShowResolved] = useState(false)
  const pin = (id: string) => setPinned((p) => (p.includes(id) ? p : [...p, id]))
  const main = problems.filter((p) => isUnresolved(p) || (pinned.includes(p.id) && p.status === 'resolved'))
  const done = problems.filter((p) => !main.includes(p))
  const open = problems.filter(isUnresolved).length

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <p className="text-sm text-slate-700">
        {open ? `${open} ${open === 1 ? 'problem needs' : 'problems need'} you` : 'Nothing needs you right now'} ·{' '}
        {problems.filter((p) => p.kind === 'busy').length} fixed automatically today
      </p>

      {main.length === 0 && (
        <Notice tone="green" icon={CircleCheck} title="All clear">
          The hub retries by itself when an app is busy, and tells you when it needs a person.
        </Notice>
      )}

      <ul className="space-y-3">
        {main.map((p) => (
          <li key={p.id}>
            <ProblemCard
              problem={p}
              actions={{
                reconnect: () => {
                  pin(p.id)
                  onReconnect(p.app)
                },
                addPhone: (phone) => {
                  pin(p.id)
                  onAddPhone(p.items[0].eventId, p.items[0].index, phone)
                },
                emailInstead: () => {
                  pin(p.id)
                  onEmailInstead(p.items[0].eventId, p.items[0].index)
                },
                retry: () => {
                  if (!p.mapping) return
                  pin(p.id)
                  onRetryMapping(p.mapping)
                },
                openMapping: () => p.mapping && onOpenMapping(p.mapping),
                dismiss: () => onDismiss(p.id),
              }}
            />
          </li>
        ))}
      </ul>

      {done.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <button
            type="button"
            aria-expanded={showResolved}
            onClick={() => setShowResolved(!showResolved)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Resolved today ({done.length})
            <ChevronDown className={cn('size-4 text-slate-500 transition', showResolved && 'rotate-180')} aria-hidden="true" />
          </button>
          {showResolved && (
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {done.map((p) => (
                <li key={p.id} className="flex items-start gap-3 px-4 py-3">
                  {p.status === 'dismissed' ? (
                    <X className="mt-0.5 size-4 shrink-0 text-slate-600" aria-label="Dismissed" />
                  ) : (
                    <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-label="Resolved" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800">{p.title}</p>
                    {p.note && <p className="text-xs text-slate-600">{p.note}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <Panel title="Alert settings" description="Who hears about problems the hub can’t fix by itself">
        <div className="space-y-4">
          <Toggle
            checked={state.alerts.email}
            onChange={(email) => onAlerts({ ...state.alerts, email })}
            label={`Email ${firstName(STAFF.ops.name)} when an app needs attention`}
            description={`Sent to ${STAFF.ops.email}`}
          />
          <Toggle
            checked={state.alerts.whatsapp}
            onChange={(whatsapp) => onAlerts({ ...state.alerts, whatsapp })}
            label={`WhatsApp ${firstName(STAFF.ops.name)} if a payment can’t be recorded`}
            description={`Sent to her work phone, ${maskPhone(STAFF.ops.phone)}`}
          />
        </div>
      </Panel>
    </div>
  )
}

interface Actions {
  reconnect: () => void
  addPhone: (phone: string) => void
  emailInstead: () => void
  retry: () => void
  openMapping: () => void
  dismiss: () => void
}

function ProblemCard({ problem: p, actions }: { problem: Problem; actions: Actions }) {
  const [phoneForm, setPhoneForm] = useState(false)
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const resolved = p.status === 'resolved'
  const sent = p.items.filter((i) => i.done).length

  const submitPhone = (e: FormEvent) => {
    e.preventDefault()
    if (!validPhone(phone)) {
      setPhoneError('Enter a 10-digit US mobile number.')
      return
    }
    actions.addPhone(phone.trim())
    setPhoneForm(false)
  }

  return (
    <article
      className={cn(
        'rounded-xl border bg-white p-4 shadow-sm',
        resolved ? 'border-emerald-200' : p.status === 'sending' ? 'border-sky-200' : p.kind === 'app' ? 'border-amber-300' : 'border-red-200',
      )}
    >
      <div className="flex items-start gap-3">
        <AppTile app={p.app} size="sm" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-900">{p.title}</h3>
          <p className="text-xs text-slate-600">{APPS[p.app].name}</p>
        </div>
      </div>

      {resolved ? (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {p.note ?? 'Resolved'}
        </p>
      ) : (
        <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3 sm:gap-4">
          <div>
            <dt className="text-xs font-semibold text-slate-600">What happened</dt>
            <dd className="text-slate-800">{p.happened}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-600">What the hub did</dt>
            <dd className="text-slate-800">{p.hubDid}</dd>
          </div>
          {p.todo && (
            <div>
              <dt className="text-xs font-semibold text-slate-600">What to do</dt>
              <dd className="text-slate-800">{p.status === 'sending' ? 'Nothing. The hub is sending them now.' : p.todo}</dd>
            </div>
          )}
        </dl>
      )}

      {p.kind === 'app' && p.items.length > 0 && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3">
          {p.status !== 'open' && (
            <p role="status" className="mb-2 text-xs font-semibold text-slate-700">
              {p.status === 'sending' ? `Sending waiting items: ${sent} of ${p.items.length} sent` : `All ${p.items.length} sent to ${APPS[p.app].name}`}
            </p>
          )}
          <ul className="space-y-1.5">
            {p.items.map((item) => {
              const sending = p.status === 'sending' && !item.done && p.items.find((i) => !i.done) === item
              return (
                <li key={`${item.eventId}:${item.index}`} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 text-slate-800">{item.label}</span>
                  <span className={cn('flex shrink-0 items-center gap-1 text-xs font-semibold', item.done ? 'text-emerald-800' : 'text-amber-800')}>
                    {item.done ? (
                      <CircleCheck className="size-3.5" aria-hidden="true" />
                    ) : sending ? (
                      <LoaderCircle className="size-3.5 motion-safe:animate-spin" aria-hidden="true" />
                    ) : (
                      <Clock className="size-3.5" aria-hidden="true" />
                    )}
                    {item.done ? 'Sent' : sending ? 'Sending…' : 'Waiting'}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {phoneForm && (
        <form onSubmit={submitPhone} className="mt-3 rounded-lg bg-slate-50 p-3" noValidate>
          <Field
            label="Mobile number"
            htmlFor={`${p.id}-phone`}
            error={phoneError || undefined}
            hint={validPhone(phone) ? `The message will go to ${maskPhone(phone.trim())}` : 'US number, for example (404) 555-0123'}
          >
            <TextInput
              id={`${p.id}-phone`}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              value={phone}
              aria-invalid={phoneError ? true : undefined}
              aria-describedby={phoneError ? `${p.id}-phone-error` : `${p.id}-phone-hint`}
              onChange={(e) => {
                setPhone(e.target.value)
                setPhoneError('')
              }}
            />
          </Field>
          <div className="mt-3 flex flex-wrap gap-2">
            <AppButton type="submit" icon={Send}>
              Save and resend
            </AppButton>
            <AppButton variant="ghost" onClick={() => setPhoneForm(false)}>
              Cancel
            </AppButton>
          </div>
        </form>
      )}

      {p.status === 'open' && !phoneForm && (
        <div className="mt-3 flex flex-wrap gap-2">
          {p.kind === 'app' && (
            <AppButton icon={Plug} onClick={actions.reconnect}>
              Reconnect {APPS[p.app].name}
            </AppButton>
          )}
          {p.kind === 'missing-phone' && (
            <>
              <AppButton icon={Phone} onClick={() => setPhoneForm(true)}>
                Add number and resend
              </AppButton>
              <AppButton variant="secondary" icon={Mail} onClick={actions.emailInstead}>
                Send by email instead
              </AppButton>
            </>
          )}
          {p.kind === 'missing-field' && (
            <>
              <AppButton icon={RotateCw} onClick={actions.retry}>
                Retry now
              </AppButton>
              <AppButton variant="secondary" icon={ArrowLeftRight} onClick={actions.openMapping}>
                Open Field mapping
              </AppButton>
            </>
          )}
          <AppButton variant="ghost" onClick={actions.dismiss}>
            Dismiss
          </AppButton>
        </div>
      )}
    </article>
  )
}
