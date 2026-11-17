import { ArrowLeft, Bike, CircleCheck, ClipboardCopy, Info, Pencil, Store, Trash2, WandSparkles } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { WhatsAppIcon } from '../../components/WhatsAppIcon'
import { useBusinessName } from '../../lib/business-name'
import { money } from '../../lib/format'
import { whatsappUrl } from '../../lib/whatsapp'
import { AppButton, Field, Notice, Panel, QtyStepper, Segmented, SelectInput, TextArea, TextInput } from '../ui'
import { AREAS, BUSINESS, MIN_DELIVERY_ORDER, NEXT_DAY_PRODUCTS, PAYMENTS, TIMES_TODAY, TIMES_TOMORROW } from './data'
import { demoOrderEnquiry, orderMessage } from './message'
import { PhoneChat, ProductIcon, WhatsAppText } from './parts'
import type { CartLine, Details, Order, Product } from './types'

export type Stage = 'details' | 'preview' | 'placed'

interface Props {
  products: Product[]
  cart: CartLine[]
  details: Details
  draft: Order | null
  stage: Stage
  placedRef: string | null
  onSetQty: (key: string, qty: number) => void
  onDetails: (details: Details) => void
  onPreview: (details: Details) => void
  onBack: () => void
  onPlace: (viaWhatsApp: boolean) => void
  onCopy: (text: string) => void
  onBrowse: () => void
  onSeeShop: () => void
}

const SAMPLE_DETAILS: Partial<Details> = {
  name: 'Chiedza M.',
  address: 'Flat 3, Kenmore Court',
  notes: 'Please call when you’re at the gate.',
}

export function OrderScreen(props: Props) {
  const { cart, stage } = props
  if (stage === 'placed') return <Placed {...props} />
  if (stage === 'preview' && props.draft) return <Preview {...props} draft={props.draft} />
  if (cart.length === 0) {
    return (
      <div className="grid place-items-center px-4 py-20 text-center">
        <div className="max-w-sm">
          <p className="text-lg font-semibold text-slate-900">Your order is empty</p>
          <p className="mt-1 text-sm text-slate-600">Add a loaf, a cake or a coffee from the menu, then come back here.</p>
          <AppButton className="mt-5" onClick={props.onBrowse}>
            Browse the menu
          </AppButton>
        </div>
      </div>
    )
  }
  return <DetailsForm {...props} />
}

function lineInfo(products: Product[], line: CartLine) {
  const product = products.find((p) => p.id === line.productId)!
  const choice = product.option?.choices.find((c) => c.id === line.choiceId)
  return { product, name: choice ? `${product.name} (${choice.label})` : product.name, unit: product.price + (choice?.delta ?? 0) }
}

function DetailsForm({ products, cart, details, onSetQty, onDetails, onPreview, onBrowse }: Props) {
  const id = useId()
  const [errors, setErrors] = useState<Partial<Record<'name' | 'address', string>>>({})
  const subtotal = cart.reduce((sum, l) => sum + l.qty * lineInfo(products, l).unit, 0)
  const fee = details.method === 'delivery' ? (AREAS.find((a) => a.name === details.area)?.fee ?? 0) : 0
  const needsNextDay = cart.some((l) => NEXT_DAY_PRODUCTS.has(l.productId))
  const times = needsNextDay ? TIMES_TOMORROW : [...TIMES_TODAY, ...TIMES_TOMORROW]
  const short = details.method === 'delivery' && subtotal < MIN_DELIVERY_ORDER
  const set = (patch: Partial<Details>) => onDetails({ ...details, ...patch })
  // Whole cakes need a day's notice, so only next-day times are offered.
  const time = times.includes(details.time) ? details.time : times[0]

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next: typeof errors = {}
    if (details.name.trim().length < 2) next.name = 'Please add the name for the order.'
    if (details.method === 'delivery' && details.address.trim().length < 4) next.address = 'Please add a delivery address or landmark.'
    setErrors(next)
    if (next.name || next.address) {
      document.getElementById(`${id}-${next.name ? 'name' : 'address'}`)?.focus()
      return
    }
    if (short) return
    onPreview({ ...details, time })
  }

  return (
    <form noValidate onSubmit={submit} className="grid grid-cols-1 gap-4 p-3 sm:p-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        <Panel
          title="Your details"
          action={
            <AppButton variant="ghost" size="sm" icon={WandSparkles} onClick={() => onDetails({ ...details, ...SAMPLE_DETAILS })}>
              Fill in sample details
            </AppButton>
          }
        >
          <div className="grid grid-cols-1 gap-4">
            <Field label="Name for the order" htmlFor={`${id}-name`} error={errors.name}>
              <TextInput
                id={`${id}-name`}
                value={details.name}
                onChange={(e) => set({ name: e.target.value })}
                autoComplete="name"
                maxLength={60}
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? `${id}-name-error` : undefined}
              />
            </Field>

            <div>
              <p className="mb-1 text-xs font-semibold text-slate-700">Delivery or collection</p>
              <Segmented
                label="Delivery or collection"
                value={details.method}
                onChange={(method) => set({ method })}
                options={[
                  { value: 'delivery', label: 'Delivery', icon: Bike },
                  { value: 'collection', label: 'Collect', icon: Store },
                ]}
                className="w-full sm:w-auto"
              />
            </div>

            {details.method === 'delivery' ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[14rem_1fr]">
                <Field label="Area" htmlFor={`${id}-area`}>
                  <SelectInput id={`${id}-area`} value={details.area} onChange={(e) => set({ area: e.target.value })}>
                    {AREAS.map((a) => (
                      <option key={a.name} value={a.name}>
                        {a.name} ({money(a.fee)})
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                <Field label="Address or landmark" htmlFor={`${id}-address`} error={errors.address}>
                  <TextInput
                    id={`${id}-address`}
                    value={details.address}
                    onChange={(e) => set({ address: e.target.value })}
                    autoComplete="street-address"
                    maxLength={100}
                    aria-invalid={errors.address ? true : undefined}
                    aria-describedby={errors.address ? `${id}-address-error` : undefined}
                  />
                </Field>
              </div>
            ) : (
              <Notice tone="neutral" icon={Store}>
                Collect from our shop on the Avondale shopping centre parade. Collection is free.
              </Notice>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={details.method === 'delivery' ? 'Delivery time' : 'Collection time'} htmlFor={`${id}-time`}>
                <SelectInput id={`${id}-time`} value={time} onChange={(e) => set({ time: e.target.value })}>
                  {times.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Payment" htmlFor={`${id}-payment`} hint="Paid on delivery or collection.">
                <SelectInput id={`${id}-payment`} value={details.payment} onChange={(e) => set({ payment: e.target.value })}>
                  {PAYMENTS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </SelectInput>
              </Field>
            </div>
            {needsNextDay && (
              <Notice tone="amber" icon={Info}>
                Whole cakes are baked to order, so the earliest time is tomorrow morning.
              </Notice>
            )}
            <Field label="Notes (optional)" htmlFor={`${id}-notes`} hint="For example, a message for the cake or gate instructions.">
              <TextArea id={`${id}-notes`} value={details.notes} maxLength={200} rows={2} onChange={(e) => set({ notes: e.target.value })} />
            </Field>
          </div>
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel title="Your order" action={<AppButton variant="ghost" size="sm" onClick={onBrowse}>Add more</AppButton>}>
          <ul className="space-y-3">
            {cart.map((line) => {
              const { product, name, unit } = lineInfo(products, line)
              return (
                <li key={line.key} className="flex items-center gap-3">
                  <ProductIcon icon={product.icon} category={product.category} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug text-slate-900">{name}</p>
                    <p className="text-xs text-slate-600 tabular-nums">{money(unit)} each</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <QtyStepper value={line.qty} min={0} onChange={(qty) => onSetQty(line.key, qty)} label={name} />
                    <button
                      type="button"
                      onClick={() => onSetQty(line.key, 0)}
                      className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-red-700"
                      aria-label={`Remove ${name}`}
                    >
                      <Trash2 className="size-3" aria-hidden="true" />
                      Remove
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          <dl className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Subtotal</dt>
              <dd className="tabular-nums">{money(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">{details.method === 'delivery' ? `Delivery to ${details.area}` : 'Collection'}</dt>
              <dd className="tabular-nums">{fee ? money(fee) : 'Free'}</dd>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900">
              <dt>Total</dt>
              <dd className="tabular-nums">{money(subtotal + fee)}</dd>
            </div>
          </dl>
          {short && (
            <Notice tone="amber" icon={Info} className="mt-3">
              Delivery starts at {money(MIN_DELIVERY_ORDER)}. Add {money(MIN_DELIVERY_ORDER - subtotal)} more, or choose collection.
            </Notice>
          )}
          <button
            type="submit"
            disabled={short}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0f7a40] px-4 text-sm font-semibold text-white hover:bg-[#0c6b37] disabled:opacity-50"
          >
            <WhatsAppIcon className="size-5" />
            Preview my WhatsApp order
          </button>
        </Panel>
      </div>
    </form>
  )
}

function Preview({ draft, onBack, onPlace, onCopy }: Props & { draft: Order }) {
  const business = useBusinessName(BUSINESS)
  const message = orderMessage(draft, business)
  return (
    <div className="grid grid-cols-1 gap-6 p-3 sm:p-6 lg:grid-cols-[1fr_22rem] lg:items-start">
      <PhoneChat title={business} subtitle="Business account">
        <p className="mx-auto w-fit rounded-md bg-white/80 px-2 py-0.5 text-[0.7rem] text-slate-600">Today</p>
        <div className="ml-auto max-w-[88%] rounded-lg rounded-tr-none bg-[#d9fdd3] px-3 py-2 text-[0.82rem] leading-relaxed text-slate-900 shadow-sm">
          <WhatsAppText text={message} />
          <span className="mt-1 block text-right text-[0.65rem] text-slate-500">ready to send</span>
        </div>
      </PhoneChat>

      <div className="space-y-4">
        <Panel title="This is what the bakery receives" description="A clear order, with nothing to type and nothing missed.">
          <div className="space-y-2.5">
            <a
              href={whatsappUrl(demoOrderEnquiry(draft))}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onPlace(true)}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0f7a40] px-4 text-sm font-semibold text-white hover:bg-[#0c6b37]"
            >
              <WhatsAppIcon className="size-5" />
              Send this demo order to LIFELINE
              <span className="sr-only"> (opens WhatsApp)</span>
            </a>
            <AppButton variant="secondary" className="w-full" onClick={() => onPlace(false)}>
              Place it without WhatsApp
            </AppButton>
            <div className="flex gap-2">
              <AppButton variant="ghost" size="sm" icon={ClipboardCopy} onClick={() => onCopy(message)}>
                Copy message
              </AppButton>
              <AppButton variant="ghost" size="sm" icon={Pencil} onClick={onBack}>
                Edit order
              </AppButton>
            </div>
          </div>
        </Panel>
        <Notice tone="accent" icon={Info}>
          In your own version, orders go straight to your shop’s WhatsApp number. In this demo they come to LIFELINE, so you
          can see one arrive and ask us about building yours.
        </Notice>
      </div>
    </div>
  )
}

function Placed({ placedRef, onSeeShop, onBrowse }: Props) {
  return (
    <div className="grid place-items-center px-4 py-16 text-center">
      <div className="max-w-md">
        <CircleCheck className="mx-auto size-12 text-emerald-600" aria-hidden="true" />
        <p className="mt-3 text-xl font-bold text-slate-900">Order {placedRef} placed</p>
        <p className="mt-2 text-slate-600">
          It’s waiting in the bakery’s order dashboard. Switch to the shop side to confirm it and send status updates.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <AppButton onClick={onSeeShop}>See it in Shop orders</AppButton>
          <AppButton variant="secondary" icon={ArrowLeft} onClick={onBrowse}>
            Start a new order
          </AppButton>
        </div>
      </div>
    </div>
  )
}
