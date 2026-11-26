import { ArrowLeft, ArrowRight, Check, CircleAlert } from 'lucide-react'
import { LinkButton, WhatsAppButton } from '../components/Button'
import type { Solution } from '../config/solutions'
import { findDemo, type DemoMeta } from '../demos/registry'
import { paths } from '../lib/router'

/** A solution page: the problem in the customer's words, what we build, the demos that show it and short answers. */
export function SolutionPage({ solution }: { solution: Solution }) {
  const demos = solution.demos.map(findDemo).filter((d): d is DemoMeta => d !== undefined && d.listed !== false)
  const message = `Hi LIFELINE AI CONCIERGE, I read about ${solution.title.charAt(0).toLowerCase()}${solution.title.slice(1)} on your website. I’d like to talk about it for my business.`

  return (
    <>
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(50rem_24rem_at_0%_0%,rgb(0_212_255/0.14),transparent_60%),radial-gradient(40rem_24rem_at_100%_0%,rgb(139_92_246/0.16),transparent_60%)]"
        />
        <div className="relative mx-auto max-w-5xl px-4 pt-6 pb-10 sm:px-6 lg:px-8 lg:pt-8">
          <nav aria-label="Breadcrumb" className="text-sm">
            <a href={paths.solutions} className="inline-flex items-center gap-1.5 font-medium text-mist-100 hover:text-white">
              <ArrowLeft className="size-4" aria-hidden="true" />
              All solutions
            </a>
          </nav>
          <h1 id="page-title" tabIndex={-1} className="heading-glow mt-6 font-display text-3xl leading-tight font-extrabold text-white outline-none sm:text-4xl lg:text-5xl">
            {solution.title}
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-mist-100">{solution.intro}</p>
          <p className="mt-3 text-sm text-mist-300">
            <span className="font-semibold text-mist-200">For: </span>
            {solution.audience}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {demos[0] && (
              <LinkButton href={paths.demo(demos[0].slug)} size="lg">
                Try the {demos[0].title} demo
                <ArrowRight className="size-4" aria-hidden="true" />
              </LinkButton>
            )}
            <WhatsAppButton variant="secondary" size="lg" message={message} label="Talk to us on WhatsApp" />
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 bg-ink-900">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 lg:px-8">
          <div>
            <h2 className="font-display text-xl font-bold text-white">Sound familiar?</h2>
            <ul className="mt-4 space-y-3 text-mist-200">
              {solution.problems.map((p) => (
                <li key={p} className="flex gap-2.5">
                  <CircleAlert className="mt-1 size-4 shrink-0 text-amber-300" aria-hidden="true" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-white">What we build</h2>
            <ul className="mt-4 space-y-3 text-mist-200">
              {solution.build.map((b) => (
                <li key={b} className="flex gap-2.5">
                  <Check className="mt-1 size-4 shrink-0 text-brand-cyan" aria-hidden="true" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 bg-ink-950">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="font-display text-xl font-bold text-white">See it working: live demos</h2>
          <p className="mt-2 text-sm text-mist-300">Sample businesses with invented data. Free, no sign-up, on your phone.</p>
          <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {demos.map((d) => (
              <li key={d.slug} className="card-glow flex flex-col rounded-2xl p-5">
                <h3 className="font-display text-lg font-bold text-white">{d.title}</h3>
                <p className="mt-2 text-sm text-mist-200">{d.summary}</p>
                <p className="mt-2 text-xs text-mist-400">Typical build: {d.build.timeline}</p>
                <a href={paths.demo(d.slug)} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-cyan hover:text-white">
                  Try the demo
                  <ArrowRight className="size-4" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-white/5 bg-ink-900">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="font-display text-xl font-bold text-white">Questions</h2>
          <dl className="mt-6 space-y-5">
            {solution.faqs.map(([q, a]) => (
              <div key={q}>
                <dt className="font-semibold text-white">{q}</dt>
                <dd className="mt-1 text-mist-200">{a}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-8">
            <WhatsAppButton size="lg" message={message} label="Ask us on WhatsApp" />
          </div>
        </div>
      </section>
    </>
  )
}
