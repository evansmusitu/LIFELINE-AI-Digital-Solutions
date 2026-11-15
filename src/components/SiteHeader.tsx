import { paths, sectionLinkHandler } from '../lib/router'
import { GENERAL_ENQUIRY } from '../lib/whatsapp'
import { WhatsAppButton } from './Button'
import { Wordmark } from './Logo'

const navLink =
  'hidden rounded-full px-3 py-2 text-sm font-medium text-mist-200 transition hover:bg-white/5 hover:text-white sm:inline-flex'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <a href={paths.home} className="rounded-lg" aria-label="LIFELINE AI CONCIERGE Demo Studio, home">
          <Wordmark />
        </a>
        <nav aria-label="Main" className="ml-auto flex items-center gap-1 sm:gap-2">
          <a href={paths.demos} onClick={sectionLinkHandler('demos')} className={navLink}>
            Demos
          </a>
          <a href={paths.contact} onClick={sectionLinkHandler('contact')} className={navLink}>
            Contact
          </a>
          <WhatsAppButton size="sm" message={GENERAL_ENQUIRY} label="WhatsApp us" iconOnlyOnMobile className="ml-1" />
        </nav>
      </div>
    </header>
  )
}
