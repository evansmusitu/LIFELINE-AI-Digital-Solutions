import {
  CalendarDays,
  Clock,
  CreditCard,
  Info,
  Landmark,
  LoaderCircle,
  MapPin,
  Music,
  ShoppingBag,
  Smartphone,
  Tag,
  TriangleAlert,
  UtensilsCrossed,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { cn } from '../../lib/cn'
import { money, num } from '../../lib/format'
import { AppButton, Badge, Field, Notice, Panel, QtyStepper, Segmented, TextInput } from '../ui'
import { FESTIVAL, LINEUP, PROMO, TYPE, TYPES, ZIG_RATE } from './data'
import {
  buyerIssues,
  cartIssues,
  daysToGo,
  longDate,
  maskPhone,
  maxFor,
  orderTotals,
  promoMatches,
  remainingByType,
  zig,
} from './engine'
import { HeroArt } from './parts'
import type { Buyer, Draft, Order, PayMethod, TypeId } from './types'

interface Props {
  now: number
  festival: number
  orders: Order[]
  draft: Draft
  onDraft: (draft: Draft) => void
  paying: boolean
  onPay: (draft: Draft) => void
}

const SHORT: Record<TypeId, string> = {
  early: 'early bird',
  general: 'general admission',
  vip: 'VIP',
  family: 'family packs',
  child: 'under-12',
}

export function TicketsScreen({ now, festival, orders, draft, onDraft, paying, onPay }: Props) {
  const [tried, setTried] = useState(false)
  const [mobileFocus, setMobileFocus] = useState(false)
  const remaining = remainingByType(orders)
  const totals = orderTotals(draft.cart, draft.promo)
  const issues = cartIssues(draft.cart, remaining)
  const buyerErrors = buyerIssues(draft.buyer)
  const days = daysToGo(now, festival)
  const promoOn = Boolean(draft.promo && promoMatches(draft.promo))

  const set = (patch: Partial<Draft>) => onDraft({ ...draft, ...patch })
  const setBuyer = (patch: Partial<Buyer>) => set({ buyer: { ...draft.buyer, ...patch } })
  const setQty = (id: TypeId, qty: number) => set({ cart: { ...draft.cart, [id]: qty } })

  const applyPromo = (event: FormEvent) => {
    event.preventDefault()
    const code = draft.promoInput.trim()
    if (!code) return
    if (promoMatches(code)) set({ promo: PROMO.code, promoInput: PROMO.code, promoError: false })
    else set({ promo: null, promoError: true })
  }

  const pay = () => {
    setTried(true)
    if (!totals.count || issues.length || Object.keys(buyerErrors).length) return
    // A code typed but not applied still counts, so nobody pays full price by accident.
    const typed = draft.promoInput.trim()
    if (typed && !promoOn) {
      if (!promoMatches(typed)) return set({ promo: null, promoError: true })
      const next = { ...draft, promo: PROMO.code, promoInput: PROMO.code, promoError: false }
      onDraft(next)
      return onPay(next)
    }
    onPay(draft)
  }

  const units = totals.lines.flatMap((line) => Array.from({ length: line.qty }, (_, i) => ({ type: line.type, i })))
  const err = (key: keyof Buyer) => (tried ? buyerErrors[key] : undefined)

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:grid sm:grid-cols-[1fr_1.15fr]">
        <HeroArt className="block h-40 w-full sm:h-full sm:min-h-52" />
        <div className="p-4 sm:p-5">
          <Badge tone="accent" icon={CalendarDays}>
            {days === 1 ? '1 day to go' : `${days} days to go`}
          </Badge>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{FESTIVAL.name}</h2>
          <p className="mt-1 text-sm text-slate-700">One day of live music, local food and crafts in {FESTIVAL.city}.</p>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-800">
            <li className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 size-4 shrink-0 text-(--accent)" aria-hidden="true" />
              {longDate(festival)}
            </li>
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 size-4 shrink-0 text-(--accent)" aria-hidden="true" />
              Gates open {FESTIVAL.gatesOpen} · Music until {FESTIVAL.musicEnds}
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-(--accent)" aria-hidden="true" />
              {FESTIVAL.place}, {FESTIVAL.city}
            </li>
          </ul>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_24rem]">
        <Panel title="Tickets" description={`Up to 10 tickets per order. ${num(FESTIVAL.totalCapacity)} people can come in total.`} bodyClassName="py-1!">
          <ul className="divide-y divide-slate-100">
            {TYPES.map((t) => {
              const left = remaining[t.id]
              const soldOut = left === 0
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold text-slate-900">{t.name}</span>
                      {soldOut ? (
                        <Badge tone="red">Sold out</Badge>
                      ) : left <= 150 ? (
                        <Badge tone="amber">
                          Only {num(left)} {SHORT[t.id]} left
                        </Badge>
                      ) : (
                        <Badge>{num(left)} left</Badge>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">{t.includes}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn('w-14 text-right font-semibold tabular-nums', soldOut ? 'text-slate-600 line-through' : 'text-slate-900')}>
                      {t.price ? money(t.price) : 'Free'}
                    </span>
                    {!soldOut && (
                      <QtyStepper value={draft.cart[t.id]} onChange={(qty) => setQty(t.id, qty)} max={maxFor(t.id, draft.cart, remaining)} label={t.name} />
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </Panel>

        <section aria-label="Your order" className="self-start rounded-xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-20 lg:row-span-2">
          <h3 className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
            <ShoppingBag className="size-4" aria-hidden="true" />
            Your order
          </h3>
          <div className="space-y-4 p-4">
            {totals.lines.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-3 py-5 text-center text-sm text-slate-600">Choose your tickets to start an order.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {totals.lines.map((line) => (
                  <li key={line.type} className="flex justify-between gap-3">
                    <span className="text-slate-800">
                      {line.qty} × {TYPE[line.type].name}
                    </span>
                    <span className="font-semibold tabular-nums">{line.amount ? money(line.amount) : 'Free'}</span>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={applyPromo}>
              <label htmlFor="msf-promo" className="mb-1 block text-xs font-semibold text-slate-700">
                Promo code
              </label>
              <div className="flex gap-2">
                <TextInput
                  id="msf-promo"
                  value={draft.promoInput}
                  onChange={(e) => set({ promoInput: e.target.value, promoError: false })}
                  placeholder="For example MSASA10"
                  autoComplete="off"
                  className="font-mono uppercase placeholder:font-sans placeholder:normal-case"
                  aria-invalid={draft.promoError || undefined}
                  aria-describedby="msf-promo-msg"
                />
                <AppButton type="submit" variant="secondary" icon={Tag} disabled={!draft.promoInput.trim()}>
                  Apply
                </AppButton>
              </div>
              <p id="msf-promo-msg" aria-live="polite" className="mt-1 text-xs">
                {draft.promoError && <span className="font-medium text-red-700">That code isn’t valid. Check the spelling and try again.</span>}
                {promoOn && (
                  <span className="font-medium text-emerald-800">
                    {PROMO.code} applied: 10% off General admission.
                    {!draft.cart.general && ' Add a General admission ticket to use it.'}{' '}
                    <button type="button" onClick={() => set({ promo: null, promoInput: '' })} className="font-semibold text-slate-700 underline">
                      Remove
                    </button>
                  </span>
                )}
              </p>
            </form>

            <dl className="space-y-1.5 border-t border-slate-100 pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-600">Subtotal</dt>
                <dd className="tabular-nums">{money(totals.subtotal)}</dd>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-600">Promo {PROMO.code}</dt>
                  <dd className="text-emerald-800 tabular-nums">−{money(totals.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-slate-900">
                <dt>Total</dt>
                <dd className="tabular-nums">{money(totals.total)}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-3 text-xs text-slate-600">
                <dt>In ZiG, at a sample rate of {ZIG_RATE.toFixed(2)} for this demo</dt>
                <dd className="tabular-nums">{zig(totals.total)}</dd>
              </div>
            </dl>

            <fieldset className="space-y-3 border-t border-slate-100 pt-3">
              <legend className="sr-only">Buyer</legend>
              <p className="text-xs text-slate-600">Sample details are filled in. Change the name to put yours on the tickets.</p>
              <Field label="Buyer’s name" htmlFor="msf-name" error={err('name')}>
                <TextInput
                  id="msf-name"
                  value={draft.buyer.name}
                  onChange={(e) => setBuyer({ name: e.target.value })}
                  autoComplete="name"
                  aria-invalid={Boolean(err('name')) || undefined}
                />
              </Field>
              <Field label="Mobile" htmlFor="msf-mobile" error={err('mobile')} hint="Hidden once entered, the way it shows on your order.">
                <TextInput
                  id="msf-mobile"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={mobileFocus || !draft.buyer.mobile ? draft.buyer.mobile : maskPhone(draft.buyer.mobile)}
                  onFocus={() => setMobileFocus(true)}
                  onBlur={() => setMobileFocus(false)}
                  onChange={(e) => setBuyer({ mobile: e.target.value })}
                  aria-invalid={Boolean(err('mobile')) || undefined}
                  aria-describedby={err('mobile') ? 'msf-mobile-error' : 'msf-mobile-hint'}
                />
              </Field>
              <Field label="Email" htmlFor="msf-email" error={err('email')}>
                <TextInput
                  id="msf-email"
                  type="email"
                  autoComplete="email"
                  value={draft.buyer.email}
                  onChange={(e) => setBuyer({ email: e.target.value })}
                  aria-invalid={Boolean(err('email')) || undefined}
                />
              </Field>
            </fieldset>

            {units.length > 0 && (
              <fieldset className="space-y-2 border-t border-slate-100 pt-3">
                <legend className="text-xs font-semibold text-slate-700">Ticket holders</legend>
                <p className="text-xs text-slate-600">Leave a name blank to use the buyer’s. The holder’s initials go into the QR code.</p>
                {units.map(({ type, i }) => {
                  const key = `${type}-${i}`
                  return (
                    <div key={key}>
                      <label htmlFor={`msf-holder-${key}`} className="mb-1 block text-xs text-slate-700">
                        {TYPE[type].name} {i + 1}
                      </label>
                      <TextInput
                        id={`msf-holder-${key}`}
                        compact
                        value={draft.holders[key] ?? ''}
                        onChange={(e) => set({ holders: { ...draft.holders, [key]: e.target.value } })}
                        placeholder={draft.buyer.name.trim() || 'Holder’s name'}
                      />
                    </div>
                  )
                })}
              </fieldset>
            )}

            <div className="border-t border-slate-100 pt-3">
              <p className="mb-1 text-xs font-semibold text-slate-700">Payment</p>
              <Segmented<PayMethod>
                label="Payment method"
                value={draft.payment}
                onChange={(payment) => set({ payment })}
                className="w-full"
                options={[
                  { value: 'mobile', label: 'Mobile money', icon: Smartphone },
                  { value: 'card', label: 'Card', icon: CreditCard },
                  { value: 'zig', label: 'ZiG transfer', icon: Landmark },
                ]}
              />
            </div>

            <Notice icon={Info}>Simulated payment. Nothing is charged.</Notice>

            {issues.length > 0 && (
              <Notice tone="amber" icon={TriangleAlert}>
                <ul>
                  {issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              </Notice>
            )}
            {tried && !totals.count && <p className="text-sm font-medium text-red-700">Choose at least one ticket first.</p>}

            <AppButton className="h-12! w-full text-base!" onClick={pay} disabled={paying || issues.length > 0}>
              {paying ? (
                <>
                  <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />
                  Confirming payment…
                </>
              ) : (
                'Pay and get tickets'
              )}
            </AppButton>
            <p role="status" className="sr-only">
              {paying ? 'Confirming payment…' : ''}
            </p>
          </div>
        </section>

        <Panel title="Lineup" description="Two stages, eight acts. Times are for festival day.">
          <ul className="divide-y divide-slate-100">
            {LINEUP.map((act) => (
              <li key={act.name} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                <span className="w-24 shrink-0 text-sm text-slate-600 tabular-nums">
                  {act.start}–{act.end}
                </span>
                <span className="min-w-0 flex-1 basis-36 text-sm font-medium text-slate-900">
                  {act.name}
                  {act.note && <span className="ml-2 text-xs font-semibold text-(--accent-ink)">{act.note}</span>}
                </span>
                <Badge tone={act.stage === 'Main stage' ? 'accent' : 'violet'} icon={Music}>
                  {act.stage}
                </Badge>
              </li>
            ))}
          </ul>
          <Notice icon={UtensilsCrossed} className="mt-3">
            Food court with local vendors from 11:00, a crafts market under the msasa trees and a shaded family area until
            17:00.
          </Notice>
        </Panel>
      </div>
    </div>
  )
}
