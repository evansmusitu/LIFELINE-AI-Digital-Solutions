import { ArrowRight } from 'lucide-react'
import { LinkButton, WhatsAppButton } from '../components/Button'
import { paths } from '../lib/router'
import { GENERAL_ENQUIRY } from '../lib/whatsapp'

export function NotFoundPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
      <h1 id="page-title" tabIndex={-1} className="heading-glow font-display text-3xl font-bold text-white outline-none sm:text-4xl">
        We couldn’t find that page
      </h1>
      <p className="mt-4 text-mist-200">The link may be out of date. All of our live demos are in the studio.</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <LinkButton href={paths.demos} size="lg">
          See all demos
          <ArrowRight className="size-4" aria-hidden="true" />
        </LinkButton>
        <WhatsAppButton variant="secondary" size="lg" message={GENERAL_ENQUIRY} label="Ask us on WhatsApp" />
      </div>
    </section>
  )
}
