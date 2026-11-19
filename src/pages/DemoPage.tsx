import { ArrowLeft, ArrowRight, Building2, CalendarClock, LayoutGrid, Lightbulb, RotateCcw } from 'lucide-react'
import { Suspense, useState } from 'react'
import { Button, LinkButton, WhatsAppButton } from '../components/Button'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { LogoMark } from '../components/Logo'
import { MobileCtaBar } from '../components/MobileCtaBar'
import { SampleDataBadge } from '../components/SampleDataBadge'
import { ShareDemo, ShareIconButton } from '../components/ShareDemo'
import { useToast } from '../components/toast-context'
import { MetricsContext, type DemoMetric } from '../demos/metrics'
import { DEMOS, type DemoMeta } from '../demos/registry'
import { paths, scrollToSection } from '../lib/router'
import { clearDemoStorage } from '../lib/storage'
import { demoQuoteMessage } from '../lib/whatsapp'
import { AskAiButton } from '../receptionist/launchers'
import { receptionistPage } from '../receptionist/protocol'

export function DemoPage({ demo }: { demo: DemoMeta }) {
  const [resetKey, setResetKey] = useState(0)
  const [metrics, setMetrics] = useState<DemoMetric[]>([])
  const toast = useToast()
  const quote = demoQuoteMessage(demo.title)
  // A demo with its own AI assistant doesn't also offer Tari's "Ask our AI" buttons: two AIs on one page confuse.
  const askTari = receptionistPage(demo.slug) === demo.slug

  const reset = () => {
    clearDemoStorage(demo.slug)
    setMetrics([])
    setResetKey((key) => key + 1)
    toast('The demo is back to its original sample data.', 'info')
  }

  return (
    <>
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(50rem_24rem_at_0%_0%,rgb(0_212_255/0.14),transparent_60%),radial-gradient(40rem_24rem_at_100%_0%,rgb(139_92_246/0.16),transparent_60%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 pt-6 pb-8 sm:px-6 lg:px-8 lg:pt-8">
          <nav aria-label="Breadcrumb" className="text-sm">
            <ol className="flex flex-wrap items-center gap-2 text-mist-300">
              <li>
                <a href={paths.demos} className="inline-flex items-center gap-1.5 font-medium text-mist-100 hover:text-white">
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  All demos
                </a>
              </li>
              <li aria-hidden="true">/</li>
              <li>{demo.category}</li>
            </ol>
          </nav>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1
                id="page-title"
                tabIndex={-1}
                className="heading-glow font-display text-3xl leading-tight font-extrabold text-white outline-none sm:text-4xl lg:text-5xl"
              >
                {demo.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base text-mist-200 sm:text-lg">{demo.intro}</p>
              <p className="mt-3 flex items-center gap-2 text-sm text-mist-300">
                <Building2 className="size-4 shrink-0 text-brand-cyan" aria-hidden="true" />
                <span>
                  Sample business: <span className="font-semibold text-white">{demo.business.name}</span>,{' '}
                  {demo.business.location}
                </span>
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <WhatsAppButton message={quote} label="Get a quote for this demo" size="lg" />
              <Button variant="secondary" size="lg" onClick={() => scrollToSection('build')}>
                How we’d build it
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="demo-frame-title" className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
        <h2 id="demo-frame-title" className="sr-only">
          Interactive demo: {demo.title}
        </h2>
        {/* overflow-clip (not hidden) keeps the rounded corners without breaking sticky bars inside demos */}
        <div className="card-glow overflow-clip rounded-3xl">
          {/* "Powered by" bar around the demo (brief, section 7) */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/10 px-4 py-3 sm:px-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-white">
              <LogoMark size={24} />
              Powered by LIFELINE AI CONCIERGE
            </p>
            <SampleDataBadge />
            <Button variant="ghost" size="sm" onClick={reset} className="ml-auto">
              <RotateCcw className="size-4" aria-hidden="true" />
              Reset demo
            </Button>
          </div>

          <div className="border-b border-white/10 px-4 py-3 sm:px-5">
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-mist-200">
              <span className="inline-flex items-center gap-1.5 font-semibold text-brand-cyan">
                <Lightbulb className="size-4" aria-hidden="true" />
                Try this:
              </span>
              {demo.tryThis.map((item, index) => (
                <span key={item}>
                  {item}
                  {index < demo.tryThis.length - 1 && (
                    <span aria-hidden="true" className="ml-2 text-mist-400">
                      ·
                    </span>
                  )}
                </span>
              ))}
            </p>
          </div>

          <MetricsStrip metrics={metrics} />

          <div className="min-h-[32rem] bg-slate-50">
            <ErrorBoundary resetKey={resetKey} fallback={(retry) => <DemoError onRetry={retry} onReset={reset} />}>
              <Suspense fallback={<DemoLoading />}>
                <MetricsContext.Provider value={setMetrics}>
                  <demo.Component key={resetKey} />
                </MetricsContext.Provider>
              </Suspense>
            </ErrorBoundary>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="flex items-center gap-2 text-sm text-mist-200">
              <LogoMark size={24} />
              <span>
                <span className="font-semibold text-white">Powered by LIFELINE AI CONCIERGE.</span> We can build this
                around your brand, products and team.
              </span>
            </p>
            <div className="flex shrink-0 gap-2 max-md:hidden">
              {askTari && <AskAiButton variant="secondary" size="sm" label="Ask our AI about it" />}
              <WhatsAppButton message={quote} label="Get a quote for this demo" size="sm" />
            </div>
          </div>
        </div>
      </section>

      {/* Right after the demo, when visitors have just seen what it does. */}
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <ShareDemo demo={demo} />
      </div>

      <BuildPlan demo={demo} quote={quote} askTari={askTari} />
      <MoreDemos current={demo.slug} />

      <MobileCtaBar>
        <LinkButton href={paths.demos} variant="secondary" className="size-11 shrink-0 px-0!" aria-label="All demos">
          <LayoutGrid className="size-5" aria-hidden="true" />
        </LinkButton>
        <ShareIconButton demo={demo} />
        {askTari && <AskAiButton variant="secondary" label="Ask our AI about this demo" iconOnly />}
        <WhatsAppButton
          message={quote}
          label="Get a quote for this demo"
          className="min-w-0 flex-1 px-4! text-center leading-tight whitespace-normal!"
        />
      </MobileCtaBar>
    </>
  )
}

function MetricsStrip({ metrics }: { metrics: DemoMetric[] }) {
  return (
    <div className="border-b border-white/10 px-4 py-4 sm:px-5">
      <p className="text-xs font-semibold tracking-[0.14em] text-mist-300 uppercase">
        Live results in this sample business
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(metrics.length ? metrics : Array.from({ length: 4 }, () => null)).map((metric, index) =>
          metric ? (
            <div key={metric.label} className="rounded-xl border border-white/10 bg-ink-850 px-3.5 py-3">
              <dt className="text-xs text-mist-300 sm:text-sm">{metric.label}</dt>
              <dd className="mt-1 font-display text-xl font-bold text-white tabular-nums sm:text-2xl">{metric.value}</dd>
              {metric.detail && <dd className="mt-0.5 hidden text-xs text-mist-400 sm:block">{metric.detail}</dd>}
            </div>
          ) : (
            <div key={index} aria-hidden="true" className="h-[4.6rem] animate-pulse rounded-xl bg-ink-850 sm:h-24" />
          ),
        )}
      </dl>
    </div>
  )
}

function DemoLoading() {
  return (
    <div role="status" className="grid min-h-[32rem] place-items-center p-8 text-sm text-slate-600">
      <div className="flex flex-col items-center gap-3">
        <span className="size-8 animate-spin rounded-full border-2 border-slate-300 border-t-sky-700" aria-hidden="true" />
        Loading the demo…
      </div>
    </div>
  )
}

function DemoError({ onRetry, onReset }: { onRetry: () => void; onReset: () => void }) {
  return (
    <div role="alert" className="grid min-h-[32rem] place-items-center p-8 text-center text-slate-800">
      <div className="max-w-md">
        <p className="text-lg font-semibold">This demo didn’t load properly</p>
        <p className="mt-2 text-sm text-slate-600">
          A weak connection can interrupt the download. Try again, or reset the demo to its sample data.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Reload the page
          </button>
          <button
            type="button"
            onClick={() => {
              onReset()
              onRetry()
            }}
            className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Reset demo
          </button>
        </div>
      </div>
    </div>
  )
}

function BuildPlan({ demo, quote, askTari }: { demo: DemoMeta; quote: string; askTari: boolean }) {
  return (
    <section id="build" aria-labelledby="build-title" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h2 id="build-title" className="heading-glow font-display text-3xl font-bold text-white sm:text-4xl">
            How we’d build this for you
          </h2>
          <p className="mt-4 text-mist-200 sm:text-lg">{demo.build.intro}</p>
          <p className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-900 px-4 py-3">
            <CalendarClock className="size-5 shrink-0 text-brand-cyan" aria-hidden="true" />
            <span className="text-sm text-mist-200">
              Estimated timeline: <span className="font-semibold text-white">{demo.build.timeline}</span>
            </span>
          </p>
          <h3 className="mt-8 text-sm font-semibold tracking-[0.14em] text-mist-300 uppercase">Services involved</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {demo.build.services.map((service) => (
              <li
                key={service}
                className="rounded-full border border-brand-cyan/30 bg-brand-cyan/5 px-3 py-1.5 text-sm font-medium text-mist-100"
              >
                {service}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <WhatsAppButton message={quote} label="Get a quote for this demo" size="lg" />
            {askTari && <AskAiButton variant="secondary" size="lg" label="Ask our AI about this build" />}
          </div>
        </div>

        <ol className="space-y-4">
          {demo.build.steps.map((step, index) => (
            <li key={step.title} className="card-glow flex gap-4 rounded-2xl p-5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-gradient font-display text-sm font-bold text-ink-950">
                {index + 1}
              </span>
              <div>
                <p className="text-xs font-semibold tracking-[0.14em] text-brand-cyan uppercase">{step.when}</p>
                <h3 className="mt-1 font-display text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-1 text-mist-200">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function MoreDemos({ current }: { current: string }) {
  const others = DEMOS.filter((d) => d.slug !== current)
  return (
    <section aria-labelledby="more-title" className="border-t border-white/5">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 id="more-title" className="font-display text-2xl font-bold text-white">
          More demos to try
        </h2>
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {others.map((demo) => {
            const Icon = demo.icon
            return (
              <li key={demo.slug}>
                <a
                  href={paths.demo(demo.slug)}
                  onPointerEnter={() => void demo.load()}
                  className="group flex h-full items-start gap-3 rounded-2xl border border-white/10 bg-ink-900 p-4 transition hover:border-brand-cyan/50"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ink-800 text-brand-cyan ring-1 ring-brand-cyan/30">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-white">{demo.title}</span>
                    <span className="mt-0.5 block text-sm text-mist-300">{demo.category}</span>
                  </span>
                  <ArrowRight
                    className="mt-1 ml-auto size-4 shrink-0 text-mist-400 transition group-hover:translate-x-0.5 group-hover:text-brand-cyan"
                    aria-hidden="true"
                  />
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
