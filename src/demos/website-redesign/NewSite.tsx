import { ArrowRight, Check, Clock, MapPin, Phone, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { WhatsAppIcon } from '../../components/WhatsAppIcon'
import { cn } from '../../lib/cn'
import { firstName, moneyWhole } from '../../lib/format'
import { AREAS, BODY_FONT, BUSINESS, EXTRAS, FONTS, NEW_TEXT, PACKAGES, PALETTES, SERVICES, STEPS } from './data'
import { OTHER_AREA, cleanName, maskPhone, normalisePhone, validateEnquiry, type EnquiryForm, type FormErrors } from './engine'
import { HeroScene, ServiceGlyph, SiteLogoMark } from './parts'
import type { SectionId, SiteStyle } from './types'

/*
 * Kopje Spring's redesigned website. Mobile first, laid out with container queries so it adapts to the
 * frame it sits in (a 375 px phone, an 1100 px desktop, or the demo panel), not to the visitor's screen.
 */

export type ScrollTarget = SectionId | 'form'

export interface SiteEnquiry {
  name: string
  phone: string
  area: string
  need: string
}

interface Props {
  siteStyle: SiteStyle
  /** A still picture for the comparison: no sticky header, nothing to click. */
  preview?: boolean
  /** Outlines the element for one of the numbered changes. */
  highlight?: number | null
  onNav?: (target: ScrollTarget) => void
  onCall?: () => void
  onWhatsApp?: () => void
  /** Returns the enquiry's reference number. */
  onSubmit?: (enquiry: SiteEnquiry) => string | undefined
}

const NAV: { id: SectionId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'services', label: 'Services' },
  { id: 'prices', label: 'Prices' },
  { id: 'contact', label: 'Contact' },
]

const YEAR = new Date().getFullYear()

const H = 'font-(family-name:--site-heading) font-bold tracking-tight text-slate-900'
const H2 = cn(H, 'text-[1.75rem] leading-tight @3xl:text-4xl')
const SECTION = 'px-4 py-12 @3xl:px-8 @3xl:py-16'
const PRIMARY = 'inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-(--site-accent) px-5 font-semibold text-white hover:bg-(--site-accent-strong)'

export function NewSite({ siteStyle, preview, highlight, onNav, onCall, onWhatsApp, onSubmit }: Props) {
  const [need, setNeed] = useState<string | null>(null)
  const palette = PALETTES.find((p) => p.id === siteStyle.palette) ?? PALETTES[0]
  const font = FONTS.find((f) => f.id === siteStyle.font) ?? FONTS[0]
  const theme = {
    '--site-accent': palette.base,
    '--site-accent-strong': palette.strong,
    '--site-accent-soft': palette.soft,
    '--site-accent-ink': palette.ink,
    '--site-heading': font.heading,
    fontFamily: BODY_FONT,
    color: NEW_TEXT,
  } as CSSProperties
  const hl = (id: number) => highlight === id && 'rounded-xl outline-4 outline-offset-4 outline-amber-400'
  const nav = (target: ScrollTarget) => onNav?.(target)

  return (
    <div className="@container bg-slate-900 text-[17px] leading-relaxed" style={theme}>
      <header className={cn('z-10 border-b border-slate-200 bg-white', !preview && 'sticky top-0')}>
        <div className="mx-auto flex max-w-6xl items-center gap-1.5 px-3 py-2.5 @min-[23rem]:px-4 @md:gap-3 @3xl:px-8">
          <button type="button" onClick={() => nav('home')} className="flex min-w-0 items-center gap-2 rounded-lg text-left">
            <SiteLogoMark className="size-9 shrink-0" />
            <span className="hidden leading-tight @min-[23rem]:block">
              <span className={cn(H, 'block text-sm @md:text-[15px]')}>Kopje Spring</span>
              <span className="block text-xs font-semibold tracking-[0.14em] text-(--site-accent-ink) uppercase">Drilling</span>
            </span>
            <span className="sr-only @min-[23rem]:hidden">Kopje Spring Drilling, home</span>
          </button>
          <nav aria-label="Site menu" data-change={5} className={cn('ml-auto hidden gap-1 @3xl:flex', hl(5))}>
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => nav(item.id)}
                className="rounded-lg px-3 py-2 text-[15px] font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div data-change={2} className={cn('ml-auto flex shrink-0 gap-1.5 @md:gap-2 @3xl:ml-3', hl(2))}>
            <button
              type="button"
              onClick={onCall}
              className="inline-flex h-11 items-center gap-1.5 rounded-lg border-2 border-(--site-accent) px-2.5 text-sm font-semibold text-(--site-accent-ink) hover:bg-(--site-accent-soft) @md:px-3.5 @md:text-[15px]"
            >
              <Phone className="size-4" aria-hidden="true" />
              Call
            </button>
            <button
              type="button"
              onClick={onWhatsApp}
              className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-[#0f7a40] px-2.5 text-sm font-semibold text-white hover:bg-[#0c6b37] @md:px-3.5 @md:text-[15px]"
            >
              <WhatsAppIcon className="size-4" />
              WhatsApp
            </button>
          </div>
        </div>
        <nav aria-label="Site menu" data-change={5} className={cn('grid grid-cols-4 border-t border-slate-100 @3xl:hidden', hl(5))}>
          {NAV.map((item) => (
            <button key={item.id} type="button" onClick={() => nav(item.id)} className="py-2.5 text-[15px] font-semibold text-slate-700 hover:text-slate-900">
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <section data-section="home" className="bg-[linear-gradient(180deg,var(--site-accent-soft),#fff)]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-9 pb-12 @3xl:grid-cols-[1.05fr_1fr] @3xl:items-center @3xl:px-8 @3xl:py-16">
          <div>
            <p className="text-base font-semibold text-(--site-accent-ink)">Borehole drilling in Harare and Mashonaland East</p>
            <h2 data-change={1} className={cn(H, 'mt-3 text-[2rem] leading-[1.15] @xl:text-[2.6rem] @5xl:text-[3.1rem]', hl(1))}>
              Clean water on your property, drilled right the first time
            </h2>
            <p data-change={3} className={cn('mt-4 max-w-xl', hl(3))}>
              We find the best spot, drill, fit your pump and tank, and test the water. One team, and one price agreed before we
              start.
            </p>
            <button type="button" onClick={() => nav('form')} className={cn(PRIMARY, 'mt-6')}>
              Get a site survey
              <ArrowRight className="size-5" aria-hidden="true" />
            </button>
            <ul className="mt-6 space-y-1.5 text-base text-slate-700">
              {['Written quote within 24 hours', 'Solar or electric pumps', 'Water test at handover'].map((point) => (
                <li key={point} className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-(--site-accent)" aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div data-change={6} className={cn('rounded-3xl', hl(6))}>
            <HeroScene className="block h-auto w-full" />
          </div>
        </div>
      </section>

      <section data-section="services" className={cn('bg-white', SECTION)}>
        <div className="mx-auto max-w-6xl">
          <h2 data-change={7} className={cn(H2, hl(7))}>
            Everything for a working borehole
          </h2>
          <p className="mt-3 max-w-2xl">Prices are a guide. You get a fixed written quote after the site survey.</p>
          <ul className="mt-7 grid gap-4 @xl:grid-cols-2 @4xl:grid-cols-3">
            {SERVICES.map((service) => (
              <li key={service.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <span className="grid size-11 place-items-center rounded-xl bg-(--site-accent-soft) text-(--site-accent-ink)">
                  <ServiceGlyph icon={service.icon} className="size-6" />
                </span>
                <h3 className={cn(H, 'mt-4 text-xl')}>{service.title}</h3>
                <p className="mt-1.5 flex-1">{service.text}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 border-t border-slate-100 pt-3">
                  <p>
                    <span className="text-[15px] text-slate-600">from </span>
                    <span className="text-2xl font-bold text-slate-900">{moneyWhole(service.from)}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setNeed(service.need)
                      nav('form')
                    }}
                    className="-mr-2 inline-flex h-11 items-center gap-1 rounded-lg px-2 text-[15px] font-semibold text-(--site-accent-ink) hover:bg-(--site-accent-soft)"
                  >
                    Ask about this
                    <span className="sr-only">: {service.title}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section data-section="prices" className={cn('bg-slate-50', SECTION)}>
        <div className="mx-auto max-w-6xl">
          <h2 className={H2}>Prices</h2>
          <p className="mt-3 max-w-2xl">Three ways to get water flowing. Prices include labour and transport within 40 km of Harare.</p>
          <ul className="mt-7 grid gap-4 @3xl:grid-cols-3">
            {PACKAGES.map((pack, i) => (
              <li key={pack.name} className={cn('rounded-2xl border bg-white p-5', i === 2 ? 'border-(--site-accent) ring-1 ring-(--site-accent)' : 'border-slate-200')}>
                <h3 className={cn(H, 'text-xl')}>{pack.name}</h3>
                <p className="mt-1">
                  <span className="text-[15px] text-slate-600">from </span>
                  <span className="text-3xl font-extrabold text-slate-900">{moneyWhole(pack.from)}</span>
                </p>
                <ul className="mt-4 space-y-1.5">
                  {pack.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <Check className="mt-1.5 size-4 shrink-0 text-(--site-accent)" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <dl className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {EXTRAS.map(([label, price]) => (
              <div key={label} className="flex justify-between gap-4 px-5 py-3">
                <dt>{label}</dt>
                <dd className="text-right font-semibold whitespace-nowrap text-slate-900">{price}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-base text-slate-700">Prices in US dollars. You can also pay in ZiG at the day’s rate.</p>
        </div>
      </section>

      <section className={cn('bg-white', SECTION)}>
        <div className="mx-auto max-w-6xl">
          <h2 className={H2}>How it works</h2>
          <ol data-change={4} className={cn('mt-7 grid gap-4 @xl:grid-cols-2 @4xl:grid-cols-4', hl(4))}>
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-2xl bg-slate-50 p-5">
                <span className="grid size-10 place-items-center rounded-full bg-(--site-accent) text-lg font-bold text-white">{i + 1}</span>
                <h3 className={cn(H, 'mt-3 text-lg')}>{step.title}</h3>
                <p className="mt-1">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section data-section="contact" className={cn('bg-(--site-accent-soft)', SECTION)}>
        <div className="mx-auto grid max-w-6xl gap-8 @3xl:grid-cols-2">
          <div>
            <h2 className={H2}>Book a site survey</h2>
            <p className="mt-3">Leave your name and number and we’ll call you back within one working day to find a time.</p>
            <ul className="mt-6 space-y-3 text-slate-800">
              <li className="flex gap-3">
                <Phone className="mt-1 size-5 shrink-0 text-(--site-accent-ink)" aria-hidden="true" />
                <span>
                  Call or WhatsApp <span className="font-semibold whitespace-nowrap">{BUSINESS.phone}</span>
                </span>
              </li>
              <li className="flex gap-3">
                <Clock className="mt-1 size-5 shrink-0 text-(--site-accent-ink)" aria-hidden="true" />
                {BUSINESS.hours}
              </li>
              <li className="flex gap-3">
                <MapPin className="mt-1 size-5 shrink-0 text-(--site-accent-ink)" aria-hidden="true" />
                Yard and office in {BUSINESS.yard}
              </li>
            </ul>
            <h3 className={cn(H, 'mt-8 text-lg')}>Areas we cover</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {AREAS.map((area) => (
                <li key={area} className="rounded-full bg-white px-3 py-1 text-base font-medium text-slate-800 ring-1 ring-slate-200">
                  {area}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-base text-slate-700">Further out? Ask us. We travel across Zimbabwe for bigger jobs.</p>
          </div>
          <div data-section="form" data-change={8} className={cn('rounded-2xl', hl(8))}>
            <EnquiryFormCard need={need} onClearNeed={() => setNeed(null)} onSubmit={onSubmit} />
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 px-4 py-10 text-base text-slate-300 @3xl:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 @3xl:grid-cols-3">
          <div>
            <p className="flex items-center gap-2 font-bold text-white">
              <SiteLogoMark className="size-8" />
              {BUSINESS.name}
            </p>
            <p className="mt-3">Boreholes, pumps, tanks and water testing in Harare and Mashonaland East.</p>
          </div>
          <div>
            <p className="font-semibold text-white">Opening hours</p>
            <p className="mt-2">
              Mon to Fri 7:30 to 17:00
              <br />
              Sat 8:00 to 13:00
            </p>
          </div>
          <div>
            <p className="font-semibold text-white">Contact</p>
            <p className="mt-2 break-all">
              {BUSINESS.phone}
              <br />
              {BUSINESS.email}
            </p>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-6xl border-t border-slate-700 pt-5 text-sm">
          © {YEAR} {BUSINESS.legalName}
        </p>
      </footer>
    </div>
  )
}

const FIELD = 'block h-12 w-full rounded-xl border-2 border-slate-300 bg-white px-3.5 text-[17px] text-slate-900 placeholder:text-slate-500 aria-invalid:border-red-600'

function EnquiryFormCard({
  need,
  onClearNeed,
  onSubmit,
}: {
  need: string | null
  onClearNeed: () => void
  onSubmit?: (enquiry: SiteEnquiry) => string | undefined
}) {
  const id = useId()
  const thanksRef = useRef<HTMLHeadingElement>(null)
  const [form, setForm] = useState<EnquiryForm>({ name: '', phone: '', area: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [sent, setSent] = useState<{ ref: string; name: string; phone: string } | null>(null)

  const set = (key: keyof EnquiryForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found = validateEnquiry(form, AREAS)
    const first = (['name', 'phone', 'area'] as const).find((key) => found[key])
    setErrors(found)
    if (first) {
      document.getElementById(`${id}-${first}`)?.focus()
      return
    }
    const name = cleanName(form.name)
    const phone = maskPhone(normalisePhone(form.phone) ?? '')
    const ref = onSubmit?.({ name, phone, area: form.area, need: need ?? 'Site survey request' })
    if (!ref) return
    setSent({ ref, name, phone })
    setForm({ name: '', phone: '', area: '' })
    onClearNeed()
  }

  // Keyboard and screen reader users land on the thank-you message, where the form was.
  useEffect(() => {
    if (sent) thanksRef.current?.focus({ preventScroll: true })
  }, [sent])

  const describedBy = (key: keyof EnquiryForm, hint?: boolean) =>
    errors[key] ? `${id}-${key}-error` : hint ? `${id}-${key}-hint` : undefined

  if (sent) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <span className="grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-700">
          <Check className="size-6" aria-hidden="true" />
        </span>
        <h3 ref={thanksRef} tabIndex={-1} className={cn(H, 'mt-4 text-xl outline-none')}>
          Thanks, {firstName(sent.name)}. We’ve got your enquiry.
        </h3>
        <p className="mt-2">
          Your reference is <span className="font-bold text-slate-900">{sent.ref}</span>. We’ll call you on{' '}
          <span className="whitespace-nowrap">{sent.phone}</span> within one working day to book your site survey.
        </p>
        <button
          type="button"
          onClick={() => setSent(null)}
          className="mt-5 inline-flex h-11 items-center rounded-xl border-2 border-slate-300 px-4 font-semibold text-slate-800 hover:border-slate-400"
        >
          Send another enquiry
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 @md:p-6">
      <h3 className={cn(H, 'text-xl')}>Ask for a site survey</h3>
      <p className="mt-1 text-base text-slate-700">Three quick details. We’ll call you back.</p>
      {need && (
        <p className="mt-4 inline-flex max-w-full items-center gap-1 rounded-full bg-(--site-accent-soft) py-1 pr-1 pl-3 text-[15px] font-medium text-(--site-accent-ink)">
          <span className="truncate">About: {need}</span>
          <button type="button" onClick={onClearNeed} aria-label={`Remove topic: ${need}`} className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-white">
            <X className="size-4" aria-hidden="true" />
          </button>
        </p>
      )}
      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor={`${id}-name`} className="mb-1.5 block text-base font-semibold text-slate-800">
            Your name
          </label>
          <input
            id={`${id}-name`}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            autoComplete="name"
            maxLength={80}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={describedBy('name')}
            className={FIELD}
          />
          {errors.name && <FieldError id={`${id}-name-error`} text={errors.name} />}
        </div>
        <div>
          <label htmlFor={`${id}-phone`} className="mb-1.5 block text-base font-semibold text-slate-800">
            Phone number
          </label>
          <input
            id={`${id}-phone`}
            type="tel"
            inputMode="tel"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            autoComplete="tel"
            placeholder="077 123 4567"
            maxLength={24}
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={describedBy('phone', true)}
            className={FIELD}
          />
          {errors.phone ? (
            <FieldError id={`${id}-phone-error`} text={errors.phone} />
          ) : (
            <p id={`${id}-phone-hint`} className="mt-1.5 text-base text-slate-600">
              We only use it to call you back.
            </p>
          )}
        </div>
        <div>
          <label htmlFor={`${id}-area`} className="mb-1.5 block text-base font-semibold text-slate-800">
            Area
          </label>
          <select
            id={`${id}-area`}
            value={form.area}
            onChange={(e) => set('area', e.target.value)}
            aria-invalid={errors.area ? true : undefined}
            aria-describedby={describedBy('area')}
            className={FIELD}
          >
            <option value="">Choose your area</option>
            {[...AREAS, OTHER_AREA].map((area) => (
              <option key={area}>{area}</option>
            ))}
          </select>
          {errors.area && <FieldError id={`${id}-area-error`} text={errors.area} />}
        </div>
      </div>
      <button type="submit" className={cn(PRIMARY, 'mt-6 w-full')}>
        Ask for a site survey
      </button>
    </form>
  )
}

function FieldError({ id, text }: { id: string; text: string }) {
  return (
    <p id={id} className="mt-1.5 text-base font-medium text-red-700">
      {text}
    </p>
  )
}
