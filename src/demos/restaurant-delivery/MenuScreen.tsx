import { Bike, Clock, Info, MapPin, Plus, ShoppingBag, Store, TriangleAlert, WandSparkles } from 'lucide-react'
import { useId, useRef, useState, type FormEvent } from 'react'
import { cn } from '../../lib/cn'
import { money } from '../../lib/format'
import { AppButton, Field, Modal, Notice, QtyStepper, Segmented, SelectInput, TextInput } from '../ui'
import { BUSINESS, CATEGORIES, SAMPLE_DETAILS } from './data'
import { EXTRAS, MIN_DELIVERY, PICKUP_MIN, SPICES, cartTotals, etaRange, maskPhone, optionSummary, priceLine, resolveCart } from './engine'
import { ItemIcon, NoteBadge, Sheet, TagBadge } from './parts'
import type { Area, CartLine, CategoryId, Details, ExtraId, LineOptions, MenuItem, Payment, Size, Spice } from './types'

interface Props {
  items: MenuItem[]
  areas: Area[]
  busy: boolean
  cart: CartLine[]
  details: Details
  onAdd: (item: MenuItem, options: LineOptions, qty: number) => void
  onSetQty: (key: string, qty: number) => void
  onDetails: (patch: Partial<Details>) => void
  onPlace: () => void
}

export function MenuScreen(props: Props) {
  const { items, areas, busy, cart, details, onAdd, onDetails } = props
  const [category, setCategory] = useState<CategoryId | 'all'>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [sheet, setSheet] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const lines = resolveCart(cart, items)
  const area = areas.find((a) => a.id === details.areaId)
  const totals = cartTotals(lines, area, details.mode)
  const open = items.find((i) => i.id === openId)
  const sections = CATEGORIES.filter((c) => category === 'all' || c.id === category)
  const inCart = (itemId: string) => lines.filter((l) => l.item.id === itemId).reduce((n, l) => n + l.qty, 0)

  return (
    <div className="relative">
      <div className="border-b border-slate-200 bg-[linear-gradient(120deg,#fffbeb,#ffffff_65%)] px-3 py-4 sm:px-5">
        <p className="text-lg font-bold text-slate-900">Grills, mezze and Emirati favourites</p>
        <p className="mt-0.5 text-sm text-slate-600">Cooked to order tonight, delivered across Abu Dhabi or ready to collect.</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-700">How you’d like it</p>
            <Segmented
              label="Delivery or pickup"
              value={details.mode}
              onChange={(mode) => onDetails({ mode })}
              options={[
                { value: 'delivery', label: 'Delivery', icon: Bike },
                { value: 'pickup', label: 'Pickup', icon: Store },
              ]}
              className="w-full sm:w-auto"
            />
          </div>
          {details.mode === 'delivery' ? (
            <Field label="Deliver to" htmlFor="rd-area" className="min-w-0 sm:w-80">
              <SelectInput id="rd-area" value={details.areaId} onChange={(e) => onDetails({ areaId: e.target.value })}>
                {areas.map((a) => {
                  const [lo, hi] = etaRange(a, busy)
                  return (
                    <option key={a.id} value={a.id} disabled={!a.on}>
                      {a.on ? `${a.name} · ${money(a.fee)} · ${lo}–${hi} min` : `${a.name} · not delivering right now`}
                    </option>
                  )
                })}
              </SelectInput>
            </Field>
          ) : (
            <p className="flex items-center gap-2 text-sm text-slate-700 sm:pb-2.5">
              <Clock className="size-4 shrink-0 text-(--accent)" aria-hidden="true" />
              <span>
                <span className="font-semibold">Ready in {PICKUP_MIN} min</span> · collect from {BUSINESS.pickupFrom}
              </span>
            </p>
          )}
        </div>
        {busy && details.mode === 'delivery' && (
          <Notice tone="amber" icon={Info} className="mt-3">
            We’re very busy tonight, so deliveries take about 15 minutes longer.
          </Notice>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_23rem] lg:gap-5 lg:pr-5">
        <div className="min-w-0">
          <div className="sticky top-16 z-10 border-b border-slate-200 bg-slate-50/95 px-3 py-2 sm:px-5">
            <div role="group" aria-label="Menu sections" className="relative no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0">
              {[{ id: 'all' as const, label: 'All' }, ...CATEGORIES].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={category === c.id}
                  onClick={() => {
                    setCategory(c.id)
                    // When the chip row is stuck to the top, jump back to the start of the list.
                    const list = listRef.current
                    if (list && list.getBoundingClientRect().top < 120) list.scrollIntoView({ block: 'start' })
                  }}
                  className={cn(
                    'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition',
                    category === c.id ? 'bg-(--accent) text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-(--accent)',
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div ref={listRef} className="scroll-mt-32 space-y-6 p-3 sm:p-5">
            {sections.map((section) => (
              <section key={section.id} aria-labelledby={`rd-sec-${section.id}`}>
                <h3 id={`rd-sec-${section.id}`} className="mb-2 text-base font-bold text-slate-900">
                  {section.label}
                </h3>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {items
                    .filter((i) => i.category === section.id)
                    .map((item) => (
                      <li key={item.id}>
                        <ItemCard item={item} count={inCart(item.id)} onOpen={() => setOpenId(item.id)} />
                      </li>
                    ))}
                </ul>
              </section>
            ))}
          </div>
        </div>

        <aside aria-label="Your order" className="hidden lg:block">
          <div className="sticky top-20 mt-5 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <h3 className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
              <ShoppingBag className="size-4" aria-hidden="true" />
              Your order
            </h3>
            <CartPanel {...props} />
          </div>
        </aside>
      </div>

      <div className="sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-10 px-3 pb-3 md:bottom-4 lg:hidden">
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-xl">
          <p className="flex min-w-0 items-center gap-2 text-sm">
            <ShoppingBag className="size-5 shrink-0" aria-hidden="true" />
            {totals.items === 0 ? (
              'Your order is empty'
            ) : (
              <span className="truncate">
                <span className="font-semibold">
                  {totals.items} {totals.items === 1 ? 'item' : 'items'}
                </span>{' '}
                · {money(totals.total)}
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={() => setSheet(true)}
            disabled={totals.items === 0}
            className="h-10 shrink-0 rounded-xl bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-50"
          >
            View order
          </button>
        </div>
      </div>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Your order">
        <CartPanel {...props} />
      </Sheet>

      {open && (
        <ItemModal
          key={open.id}
          item={open}
          onClose={() => setOpenId(null)}
          onAdd={(options, qty) => {
            onAdd(open, options, qty)
            setOpenId(null)
          }}
        />
      )}
    </div>
  )
}

function ItemCard({ item, count, onOpen }: { item: MenuItem; count: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!item.available}
      className="flex h-full w-full gap-3 rounded-xl bg-white p-3 text-left shadow-sm ring-1 ring-slate-200 transition enabled:hover:ring-2 enabled:hover:ring-(--accent) disabled:cursor-not-allowed disabled:bg-slate-100"
    >
      <ItemIcon icon={item.icon} category={item.category} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-start justify-between gap-2">
          <span className="font-semibold leading-snug text-slate-900">{item.name}</span>
          <span className={cn('shrink-0 font-semibold tabular-nums', item.available ? 'text-slate-900' : 'text-slate-600')}>
            {money(item.price)}
          </span>
        </span>
        <span className="mt-0.5 text-sm text-slate-600">{item.description}</span>
        <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
          {item.tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
          <span className="ml-auto flex items-center gap-2">
            {count > 0 && <span className="text-xs font-semibold text-(--accent-ink)">{count} in your order</span>}
            {item.available ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-(--accent) px-2.5 py-1 text-xs font-semibold text-white">
                <Plus className="size-3.5" aria-hidden="true" />
                Add
              </span>
            ) : (
              <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-800">Sold out tonight</span>
            )}
          </span>
        </span>
      </span>
    </button>
  )
}

function ItemModal({ item, onClose, onAdd }: { item: MenuItem; onClose: () => void; onAdd: (options: LineOptions, qty: number) => void }) {
  const id = useId()
  const [size, setSize] = useState<Size>('Regular')
  const [spice, setSpice] = useState<Spice>('Medium')
  const [extras, setExtras] = useState<ExtraId[]>([])
  const [notes, setNotes] = useState('')
  const [qty, setQty] = useState(1)
  const options: LineOptions = { size, spice: item.spice ? spice : undefined, extras, notes: notes.trim() }
  const unit = priceLine(item, options)

  return (
    <Modal
      open
      onClose={onClose}
      title={item.name}
      description={item.description}
      footer={
        <>
          <AppButton variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton icon={Plus} onClick={() => onAdd(options, qty)}>
            Add to order
          </AppButton>
        </>
      }
    >
      <div className="space-y-4">
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        )}
        {item.largeDelta !== undefined && (
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-700">Size</p>
            <Segmented
              label="Size"
              value={size}
              onChange={setSize}
              className="w-full"
              options={[
                { value: 'Regular', label: 'Regular' },
                { value: 'Large', label: `Large +${money(item.largeDelta)}` },
              ]}
            />
          </div>
        )}
        {item.spice && (
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-700">Spice level</p>
            <Segmented label="Spice level" value={spice} onChange={setSpice} className="w-full" options={SPICES.map((s) => ({ value: s, label: s }))} />
          </div>
        )}
        {item.extras.length > 0 && (
          <fieldset>
            <legend className="mb-1 text-xs font-semibold text-slate-700">Extras</legend>
            <div className="space-y-1.5">
              {item.extras.map((extra) => {
                const checked = extras.includes(extra)
                return (
                  <label
                    key={extra}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm',
                      checked ? 'border-(--accent) bg-(--accent-soft)' : 'border-slate-200 hover:border-slate-300',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setExtras(checked ? extras.filter((e) => e !== extra) : [...extras, extra])}
                      className="size-4 accent-(--accent)"
                    />
                    <span className="flex-1 font-medium text-slate-900">{EXTRAS[extra].label}</span>
                    <span className="text-slate-700 tabular-nums">+{money(EXTRAS[extra].price)}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        )}
        <Field label="Notes for the kitchen (optional)" htmlFor={`${id}-notes`}>
          <TextInput id={`${id}-notes`} value={notes} maxLength={80} onChange={(e) => setNotes(e.target.value)} placeholder="For example, no onions" />
        </Field>
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <QtyStepper value={qty} min={1} max={20} onChange={setQty} label={item.name} />
          <p className="text-right text-sm text-slate-700">
            {qty} × {money(unit)} = <span className="text-base font-bold text-slate-900 tabular-nums">{money(unit * qty)}</span>
          </p>
        </div>
      </div>
    </Modal>
  )
}

type FieldName = 'name' | 'phone' | 'building'

const PAYMENT_LABELS: Record<Details['mode'], Record<Payment, string>> = {
  delivery: { card: 'Card on delivery', cash: 'Cash on delivery', online: 'Paid online (simulated)' },
  pickup: { card: 'Card at pickup', cash: 'Cash at pickup', online: 'Paid online (simulated)' },
}

function CartPanel({ items, areas, busy, cart, details, onSetQty, onDetails, onPlace }: Props) {
  const id = useId()
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({})
  const lines = resolveCart(cart, items)
  const area = areas.find((a) => a.id === details.areaId)
  const totals = cartTotals(lines, area, details.mode)
  const delivery = details.mode === 'delivery'
  const areaOff = delivery && !area?.on
  const [lo, hi] = area ? etaRange(area, busy) : [0, 0]
  const masked = maskPhone(details.phone)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next: typeof errors = {}
    if (details.name.trim().length < 2) next.name = 'Please add a name for the order.'
    if (!masked) next.phone = 'Enter a UAE mobile number, for example 050 123 4410.'
    if (delivery && details.building.trim().length < 3) next.building = 'Please add the building and flat or villa number.'
    setErrors(next)
    const first = (['name', 'phone', 'building'] as FieldName[]).find((f) => next[f])
    if (first) {
      document.getElementById(`${id}-${first}`)?.focus()
      return
    }
    if (totals.items > 0 && totals.short === 0 && !areaOff) onPlace()
  }

  const fieldProps = (name: FieldName) => ({
    id: `${id}-${name}`,
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `${id}-${name}-error` : undefined,
  })

  if (totals.items === 0)
    return (
      <div className="px-4 py-8 text-center">
        <p className="font-semibold text-slate-900">Your order is empty</p>
        <p className="mt-1 text-sm text-slate-600">Tap a dish to choose its options and add it.</p>
      </div>
    )

  return (
    <form noValidate onSubmit={submit} className="space-y-4 p-4">
      <ul className="space-y-3">
        {lines.map((line) => {
          const options = optionSummary(line.options)
          return (
            <li key={line.key} className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{line.item.name}</p>
                {options.length > 0 && <p className="text-xs text-slate-600">{options.join(' · ')}</p>}
                {line.options.notes && (
                  <div className="mt-1">
                    <NoteBadge text={line.options.notes} />
                  </div>
                )}
                <p className="mt-0.5 text-xs text-slate-600 tabular-nums">{money(line.unit)} each</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <QtyStepper value={line.qty} min={0} max={20} onChange={(qty) => onSetQty(line.key, qty)} label={line.item.name} />
                <p className="text-sm font-semibold tabular-nums">{money(line.unit * line.qty)}</p>
              </div>
            </li>
          )
        })}
      </ul>

      <dl className="space-y-1.5 border-t border-slate-100 pt-3 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-600">Subtotal</dt>
          <dd className="tabular-nums">{money(totals.subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="min-w-0 text-slate-600">{delivery ? `Delivery to ${area?.name ?? 'your area'}` : 'Pickup'}</dt>
          <dd className="shrink-0 tabular-nums">{delivery ? money(totals.fee) : 'Free'}</dd>
        </div>
        <div className="flex justify-between gap-3 text-base font-bold text-slate-900">
          <dt>Total</dt>
          <dd className="tabular-nums">{money(totals.total)}</dd>
        </div>
        <div className="flex justify-between gap-3 text-xs text-slate-600">
          <dt>Includes 5% VAT</dt>
          <dd className="tabular-nums">{money(totals.vat)}</dd>
        </div>
      </dl>

      {totals.short > 0 && (
        <Notice tone="amber" icon={Info}>
          Delivery starts at {money(MIN_DELIVERY)} of food. Add {money(totals.short)} more, or switch to pickup.
        </Notice>
      )}
      {areaOff && (
        <Notice tone="red" icon={TriangleAlert}>
          We’re not delivering to {area?.name ?? 'this area'} right now. Choose another area or pickup.
        </Notice>
      )}

      <div className="space-y-3 border-t border-slate-100 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">Your details</p>
          <AppButton
            variant="ghost"
            size="sm"
            icon={WandSparkles}
            onClick={() => {
              onDetails(SAMPLE_DETAILS)
              setErrors({})
            }}
          >
            Fill in sample details
          </AppButton>
        </div>
        <Field label="Name" htmlFor={`${id}-name`} error={errors.name}>
          <TextInput {...fieldProps('name')} value={details.name} maxLength={60} autoComplete="name" onChange={(e) => onDetails({ name: e.target.value })} />
        </Field>
        <Field
          label="Mobile number"
          htmlFor={`${id}-phone`}
          error={errors.phone}
          hint={masked ? `Order updates come here. Staff and riders see ${masked}.` : 'Order updates come to this number.'}
        >
          <TextInput
            {...fieldProps('phone')}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={20}
            value={details.phone}
            placeholder="050 123 4410"
            onChange={(e) => onDetails({ phone: e.target.value })}
          />
        </Field>
        {delivery && (
          <>
            <Field label="Building and flat or villa" htmlFor={`${id}-building`} error={errors.building}>
              <TextInput
                {...fieldProps('building')}
                value={details.building}
                maxLength={80}
                autoComplete="address-line1"
                onChange={(e) => onDetails({ building: e.target.value })}
              />
            </Field>
            <Field label="Directions for the rider (optional)" htmlFor={`${id}-directions`}>
              <TextInput id={`${id}-directions`} value={details.directions} maxLength={100} onChange={(e) => onDetails({ directions: e.target.value })} />
            </Field>
          </>
        )}
        <fieldset>
          <legend className="mb-1 text-xs font-semibold text-slate-700">Payment</legend>
          <div className="space-y-1.5">
            {(Object.keys(PAYMENT_LABELS[details.mode]) as Payment[]).map((p) => (
              <label
                key={p}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium text-slate-900',
                  details.payment === p ? 'border-(--accent) bg-(--accent-soft)' : 'border-slate-200 hover:border-slate-300',
                )}
              >
                <input
                  type="radio"
                  name={`${id}-payment`}
                  value={p}
                  checked={details.payment === p}
                  onChange={() => onDetails({ payment: p })}
                  className="size-4 accent-(--accent)"
                />
                {PAYMENT_LABELS[details.mode][p]}
              </label>
            ))}
          </div>
          {details.payment === 'online' && (
            <p className="mt-1.5 text-xs text-slate-600">In this demo the online payment is simulated. Your version takes real card payments.</p>
          )}
        </fieldset>
      </div>

      <AppButton type="submit" className="h-12! w-full text-base!" disabled={totals.short > 0 || areaOff}>
        Place order
      </AppButton>
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-600">
        <MapPin className="size-3.5" aria-hidden="true" />
        {delivery && area ? `Arrives in about ${lo}–${hi} min` : `Ready to collect in about ${PICKUP_MIN} min`}
      </p>
    </form>
  )
}
