import { ArrowRight, Bot, Check, ExternalLink, FileText, MessageSquareText, PackageCheck } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Button, LinkButton, WhatsAppButton } from '../components/Button'
import { LogoBadge } from '../components/Logo'
import { MobileCtaBar } from '../components/MobileCtaBar'
import { WhatsAppIcon } from '../components/WhatsAppIcon'
import { SERVICES, SITE } from '../config/site'
import { DEMOS, INDUSTRIES, type DemoMeta, type Industry } from '../demos/registry'
import { cn } from '../lib/cn'
import { EMAIL_ENQUIRY_URL } from '../lib/email'
import { paths } from '../lib/router'
import { GENERAL_ENQUIRY, demoRequestMessage, enquiryMessage, openWhatsApp, whatsappUrl } from '../lib/whatsapp'

export function HomePage() {
  return (
    <>
      <Hero />
      <Gallery />
      <About />
      <Contact />
      <MobileCtaBar>
        <LinkButton href={paths.contact} variant="secondary" className="shrink-0 px-4!">
          Enquire
        </LinkButton>
        <WhatsAppButton message={GENERAL_ENQUIRY} label="Chat on WhatsApp" className="min-w-0 flex-1 px-4!" />
      </MobileCtaBar>
    </>
  )
}

/* Hero */

/* Sample events from the demos, placed in the corners so they never cover the logo. */
const heroEvents = [
  { icon: MessageSquareText, text: 'Order JR-2418 sent on WhatsApp', className: 'right-0 top-0' },
  { icon: Bot, text: 'Lead scored Hot, 90/100', className: 'left-0 top-14' },
  { icon: PackageCheck, text: 'Low stock reordered', className: 'right-0 bottom-14' },
  { icon: FileText, text: 'Invoice emailed automatically', className: 'left-6 bottom-0' },
]

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_10%_-10%,rgb(0_212_255/0.16),transparent_60%),radial-gradient(50rem_30rem_at_95%_10%,rgb(139_92_246/0.18),transparent_60%)]"
      />
      <div className="relative mx-auto grid grid-cols-1 max-w-7xl gap-12 px-4 pt-12 pb-16 sm:px-6 sm:pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:px-8 lg:pt-20 lg:pb-24">
        <div>
          <p className="font-display text-xs font-semibold tracking-[0.2em] text-brand-cyan uppercase sm:text-sm">
            {SITE.tagline}
          </p>
          <h1
            id="page-title"
            tabIndex={-1}
            className="heading-glow mt-4 font-display text-[2.15rem] leading-[1.12] font-extrabold text-white outline-none sm:text-5xl lg:text-[3.6rem]"
          >
            {SITE.headline} <span className="text-gradient">{SITE.headlineCta}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base text-mist-200 sm:text-lg">
            Click through working demos of the chatbots, automations and business systems we build. Each one runs on
            sample data, so you can explore freely and picture it with your own brand.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LinkButton href={paths.demos} size="lg">
              Explore the demos
              <ArrowRight className="size-4" aria-hidden="true" />
            </LinkButton>
            <WhatsAppButton variant="secondary" size="lg" message={GENERAL_ENQUIRY} label="Chat on WhatsApp" />
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-mist-300">
            {['No sign-up needed', 'Works on any phone', 'Sample data only'].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="size-4 text-brand-cyan" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative hidden h-[24rem] w-[31rem] justify-self-center lg:block" aria-hidden="true">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <LogoBadge size={240} />
          </div>
          {heroEvents.map(({ icon: Icon, text, className }) => (
            <div
              key={text}
              className={cn(
                'absolute flex items-center gap-2 rounded-full border border-white/10 bg-ink-850/95 py-2 pr-4 pl-2 text-sm font-medium whitespace-nowrap text-mist-100 shadow-[0_8px_28px_rgb(0_0_0/0.45)]',
                className,
              )}
            >
              <span className="grid size-7 place-items-center rounded-full bg-brand-cyan/15 text-brand-cyan">
                <Icon className="size-4" />
              </span>
              {text}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* Demo gallery with the industry filter */

function Gallery() {
  const [industry, setIndustry] = useState<Industry | 'all'>('all')
  const industries = INDUSTRIES.filter((i) => DEMOS.some((d) => d.industries.includes(i)))
  const shown = industry === 'all' ? DEMOS : DEMOS.filter((d) => d.industries.includes(industry))

  return (
    <section id="demos" aria-labelledby="demos-title" className="scroll-mt-16 border-t border-white/5 bg-ink-950">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold tracking-[0.18em] text-brand-cyan uppercase">Live demos</p>
          <h2
            id="demos-title"
            tabIndex={-1}
            className="heading-glow mt-2 font-display text-3xl font-bold text-white outline-none sm:text-4xl"
          >
            Pick a demo and try it
          </h2>
          <p className="mt-4 text-mist-200 sm:text-lg">
            Each demo is a working example of a system we build, set in an invented business. Like one? Ask for a quote
            on WhatsApp in one tap.
          </p>
        </div>

        <div role="group" aria-label="Filter demos by industry" className="no-scrollbar -mx-4 mt-8 flex gap-2 relative overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <FilterChip pressed={industry === 'all'} onClick={() => setIndustry('all')} count={DEMOS.length}>
            All industries
          </FilterChip>
          {industries.map((item) => (
            <FilterChip
              key={item}
              pressed={industry === item}
              onClick={() => setIndustry(item)}
              count={DEMOS.filter((d) => d.industries.includes(item)).length}
            >
              {item}
            </FilterChip>
          ))}
        </div>
        <p className="sr-only" aria-live="polite">
          Showing {shown.length} {shown.length === 1 ? 'demo' : 'demos'}
        </p>

        <ul className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((demo) => (
            <DemoCard key={demo.slug} demo={demo} />
          ))}
        </ul>

        <p className="mt-6 text-sm text-mist-300">
          We’re adding new demos here. In the meantime,{' '}
          <a
            href={SITE.earlierStudioUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-white underline underline-offset-4 hover:text-brand-cyan"
          >
            try 16 more in our earlier demo studio
            <ExternalLink className="size-3.5" aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          .
        </p>

        <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl border border-white/10 bg-ink-900 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold text-white">Need something different?</h3>
            <p className="mt-1 text-mist-200">
              We also build websites, online stores, dashboards and custom software. Tell us what your business needs.
            </p>
          </div>
          <LinkButton href={paths.contact} variant="secondary" className="shrink-0">
            Tell us what you need
            <ArrowRight className="size-4" aria-hidden="true" />
          </LinkButton>
        </div>
      </div>
    </section>
  )
}

function FilterChip({
  pressed,
  onClick,
  count,
  children,
}: {
  pressed: boolean
  onClick: () => void
  count: number
  children: string
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition',
        pressed
          ? 'border-transparent bg-brand-gradient text-ink-950'
          : 'border-white/15 bg-white/5 text-mist-100 hover:border-brand-cyan/60 hover:text-white',
      )}
    >
      {children}
      <span
        className={cn(
          'rounded-full px-1.5 text-xs leading-5 font-semibold',
          pressed ? 'bg-ink-950/15 text-ink-950' : 'bg-white/10 text-mist-200',
        )}
      >
        {count}
      </span>
    </button>
  )
}

function DemoCard({ demo }: { demo: DemoMeta }) {
  const Icon = demo.icon
  const prefetch = () => void demo.load()
  return (
    <li className="card-glow flex flex-col rounded-2xl p-5 transition-shadow duration-200 hover:shadow-[0_0_40px_-12px_rgb(0_212_255/0.75)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-12 place-items-center rounded-xl bg-ink-800 text-brand-cyan ring-1 ring-brand-cyan/35">
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs font-medium text-mist-300">
          {demo.category}
        </span>
      </div>
      <h3 className="mt-5 font-display text-xl font-bold text-white">{demo.title}</h3>
      <p className="mt-1 text-sm text-mist-300">
        Sample business: {demo.business.name}, {demo.business.location}
      </p>
      <p className="mt-3 text-mist-200">{demo.summary}</p>
      <ul className="mt-4 space-y-2 text-sm text-mist-200">
        {demo.highlights.map((item) => (
          <li key={item} className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-wrap gap-2 pt-6">
        <LinkButton
          href={paths.demo(demo.slug)}
          onPointerEnter={prefetch}
          onFocus={prefetch}
          className="min-w-40 flex-1"
          aria-label={`Try the ${demo.title} demo`}
        >
          Try the demo
          <ArrowRight className="size-4" aria-hidden="true" />
        </LinkButton>
        <WhatsAppButton
          variant="secondary"
          message={demoRequestMessage(demo.title)}
          label="Request this"
          aria-label={`Request the ${demo.title} for your business on WhatsApp`}
        />
      </div>
    </li>
  )
}

/*
 * About section, from LIFELINE's own "Meet LIFELINE" text (15 November 2026), shortened for the page.
 * Only facts LIFELINE has given: no testimonials, client names or figures (brief, section 5).
 */

const PRINCIPLES = [
  [
    'Try it before you invest.',
    'Working demos and prototypes show what your solution could look like before you commit to a bigger project.',
  ],
  [
    'Your problem comes first.',
    'Not every problem needs AI. Sometimes a clear website, an FAQ assistant or a simple automation is the better fix.',
  ],
  [
    'Scope and price agreed up front.',
    'Deliverables, milestones, revisions, price and any outside service costs are agreed before work starts.',
  ],
  [
    'Honest about what’s real.',
    'We tell you what’s a demo, what’s working, and what needs extra integrations, hosting or testing.',
  ],
  [
    'You stay in control.',
    'We show you how to use and maintain what we build, and hand over the agreed source files and documentation.',
  ],
] as const

function About() {
  const { founder } = SITE
  return (
    <section id="about" aria-labelledby="about-title" className="scroll-mt-16 border-t border-white/5 bg-ink-900">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-brand-cyan uppercase">About LIFELINE</p>
            <h2
              id="about-title"
              tabIndex={-1}
              className="heading-glow mt-2 font-display text-3xl font-bold text-white outline-none sm:text-4xl"
            >
              Technology that solves real problems
            </h2>
            <p className="mt-4 text-mist-200 sm:text-lg">
              {SITE.brand} is led by its founder, {founder.name}, a technology entrepreneur and developer based in
              Zimbabwe. We make professional websites, automation and practical business technology accessible to
              entrepreneurs, growing companies and organizations, in Zimbabwe and worldwide.
            </p>
            <p className="mt-4 text-mist-200 sm:text-lg">
              Our view is simple: technology should do more than look impressive. It should solve a real problem,
              improve your customers’ experience and make your business easier to run.
            </p>

            <div className="mt-8 flex gap-4 rounded-2xl border border-white/10 bg-ink-950 p-5">
              <span
                aria-hidden="true"
                className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-gradient font-display text-lg font-bold text-ink-950"
              >
                {founder.initials}
              </span>
              <div>
                <p className="font-display font-semibold text-white">{founder.name}</p>
                <p className="text-sm font-medium text-brand-cyan">{founder.role}</p>
                <p className="mt-2 text-sm text-mist-300">
                  Oversees planning, development, technical decisions and client communication.
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-mist-400">
              {founder.name} also leads MUSITU Intelligence, which builds AI research and financial intelligence tools.
              That’s why our email address ends in mftintelligence.com.
            </p>
          </div>

          <div>
            <h3 className="font-display text-lg font-semibold text-white">How we work</h3>
            <ul className="mt-4 space-y-4">
              {PRINCIPLES.map(([title, detail]) => (
                <li key={title} className="flex gap-3">
                  <Check className="mt-1 size-4 shrink-0 text-brand-cyan" aria-hidden="true" />
                  <p className="text-mist-200">
                    <span className="font-semibold text-white">{title}</span> {detail}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-mist-300">
              Every demo on this site uses sample data. We’ll add client projects here as clients give us permission to
              show them.
            </p>
            <div className="mt-6">
              <WhatsAppButton size="lg" message={GENERAL_ENQUIRY} label="Discuss your project" />
            </div>
          </div>
        </div>

        <div className="mt-14 border-t border-white/10 pt-8">
          <h3 className="font-display text-lg font-semibold text-white">What we build</h3>
          <ul className="mt-4 flex flex-wrap gap-2">
            {SERVICES.map((service) => (
              <li
                key={service}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-mist-200"
              >
                {service}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

/* Contact section with the enquiry form */

function Contact() {
  return (
    <section id="contact" aria-labelledby="contact-title" className="scroll-mt-16 relative overflow-hidden border-t border-white/5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(50rem_28rem_at_85%_100%,rgb(139_92_246/0.16),transparent_60%),radial-gradient(40rem_24rem_at_0%_100%,rgb(0_212_255/0.12),transparent_60%)]"
      />
      <div className="relative mx-auto grid grid-cols-1 max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
        <div>
          <p className="text-sm font-semibold tracking-[0.18em] text-brand-cyan uppercase">Start a project</p>
          <h2
            id="contact-title"
            tabIndex={-1}
            className="heading-glow mt-2 font-display text-3xl font-bold text-white outline-none sm:text-4xl"
          >
            Tell us what you want to build
          </h2>
          <p className="mt-4 max-w-xl text-mist-200 sm:text-lg">
            Message us on WhatsApp about your business and the problem you want to solve. We’ll reply with ideas, a
            timeline and a quote.
          </p>
          <div className="mt-8">
            <WhatsAppButton size="lg" message={GENERAL_ENQUIRY} label="Chat on WhatsApp" />
          </div>
          <p className="mt-4 text-sm text-mist-300">
            WhatsApp:{' '}
            <a
              href={whatsappUrl(GENERAL_ENQUIRY)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white underline-offset-4 hover:underline"
            >
              {SITE.whatsappDisplay}
            </a>
            <br />
            Email:{' '}
            <a href={EMAIL_ENQUIRY_URL} className="font-semibold text-white underline-offset-4 hover:underline">
              {SITE.email}
            </a>
            <br />
            {SITE.base}
          </p>

          <ol className="mt-10 space-y-4">
            {[
              ['Tell us about your business', 'What you sell, who your customers are and what takes up your team’s time.'],
              ['Get a clear plan', 'We suggest the right solution, a timeline and a quote. No jargon.'],
              ['We build, launch and support it', 'You see progress every week, and we stay on hand after launch.'],
            ].map(([title, detail], index) => (
              <li key={title} className="flex gap-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-gradient font-display text-sm font-bold text-ink-950">
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold text-white">{title}</p>
                  <p className="text-sm text-mist-300">{detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <EnquiryForm />
      </div>
    </section>
  )
}

const darkInput =
  'block w-full rounded-xl border border-white/15 bg-ink-950 px-4 text-white placeholder:text-mist-400 transition hover:border-white/25 aria-invalid:border-[#ff8fa3]'

function EnquiryForm() {
  const id = useId()
  const [values, setValues] = useState({ name: '', business: '', service: '', message: '' })
  const [errors, setErrors] = useState<{ name?: string; message?: string }>({})
  const [sentUrl, setSentUrl] = useState<string | null>(null)

  const update = (field: keyof typeof values) => (value: string) => setValues((v) => ({ ...v, [field]: value }))

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = {
      name: values.name.trim(),
      business: values.business.trim(),
      service: values.service,
      message: values.message.trim(),
    }
    const next: typeof errors = {}
    if (trimmed.name.length < 2) next.name = 'Please tell us your name.'
    if (trimmed.message.length < 10) next.message = 'Please describe what you need in a sentence or two.'
    setErrors(next)
    if (next.name || next.message) {
      document.getElementById(`${id}-${next.name ? 'name' : 'message'}`)?.focus()
      return
    }
    const message = enquiryMessage(trimmed)
    setSentUrl(whatsappUrl(message))
    openWhatsApp(message)
  }

  return (
    <form noValidate onSubmit={submit} aria-labelledby={`${id}-title`} className="card-glow self-start rounded-3xl p-6 sm:p-8">
      <h3 id={`${id}-title`} className="font-display text-xl font-bold text-white">
        Send a quick enquiry
      </h3>
      <p className="mt-1 text-sm text-mist-300">
        We’ll open WhatsApp with your message ready to send. Nothing is stored on this website.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-5">
        <div>
          <label htmlFor={`${id}-name`} className="mb-1.5 block text-sm font-medium text-mist-100">
            Your name
          </label>
          <input
            id={`${id}-name`}
            value={values.name}
            onChange={(e) => update('name')(e.target.value)}
            autoComplete="name"
            maxLength={80}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? `${id}-name-error` : undefined}
            className={cn(darkInput, 'h-12')}
          />
          {errors.name && (
            <p id={`${id}-name-error`} className="mt-1.5 text-sm text-[#ff8fa3]">
              {errors.name}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-business`} className="mb-1.5 block text-sm font-medium text-mist-100">
              Business name <span className="font-normal text-mist-400">(optional)</span>
            </label>
            <input
              id={`${id}-business`}
              value={values.business}
              onChange={(e) => update('business')(e.target.value)}
              autoComplete="organization"
              maxLength={100}
              className={cn(darkInput, 'h-12')}
            />
          </div>
          <div>
            <label htmlFor={`${id}-service`} className="mb-1.5 block text-sm font-medium text-mist-100">
              What do you need? <span className="font-normal text-mist-400">(optional)</span>
            </label>
            <select
              id={`${id}-service`}
              value={values.service}
              onChange={(e) => update('service')(e.target.value)}
              className={cn(darkInput, 'h-12 pr-8')}
            >
              <option value="">Choose a service</option>
              {SERVICES.map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
              <option value="Not sure yet">Not sure yet</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor={`${id}-message`} className="mb-1.5 block text-sm font-medium text-mist-100">
            How can we help?
          </label>
          <textarea
            id={`${id}-message`}
            value={values.message}
            onChange={(e) => update('message')(e.target.value)}
            rows={4}
            maxLength={600}
            placeholder="For example: we take orders by phone and want customers to order on WhatsApp instead."
            aria-invalid={errors.message ? true : undefined}
            aria-describedby={errors.message ? `${id}-message-error` : undefined}
            className={cn(darkInput, 'resize-y py-3 leading-relaxed')}
          />
          {errors.message && (
            <p id={`${id}-message-error`} className="mt-1.5 text-sm text-[#ff8fa3]">
              {errors.message}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full">
          <WhatsAppIcon className="size-5" />
          Send on WhatsApp
        </Button>

        {sentUrl && (
          <p role="status" className="rounded-xl border border-brand-cyan/30 bg-brand-cyan/5 px-4 py-3 text-sm text-mist-100">
            WhatsApp should now be open with your message. If it didn’t open,{' '}
            <a href={sentUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-cyan underline">
              open WhatsApp here
            </a>
            .
          </p>
        )}
      </div>
    </form>
  )
}
