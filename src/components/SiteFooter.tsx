import { SITE } from '../config/site'
import { DEMOS } from '../demos/registry'
import { paths, sectionLinkHandler } from '../lib/router'
import { GENERAL_ENQUIRY, whatsappUrl } from '../lib/whatsapp'
import { Wordmark } from './Logo'

const footerLink = 'text-sm text-mist-200 underline-offset-4 transition hover:text-white hover:underline'
const YEAR = new Date().getFullYear()

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-ink-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <Wordmark />
            <p className="mt-5 font-display text-sm font-semibold text-white">{SITE.tagline}</p>
            <p className="mt-2 text-sm text-mist-300">{SITE.base}</p>
          </div>

          <div>
            <h2 className="font-display text-sm font-semibold text-white">Live demos</h2>
            <ul className="mt-4 space-y-2.5">
              {DEMOS.map((demo) => (
                <li key={demo.slug}>
                  <a href={paths.demo(demo.slug)} className={footerLink}>
                    {demo.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-display text-sm font-semibold text-white">Talk to us</h2>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a href={whatsappUrl(GENERAL_ENQUIRY)} target="_blank" rel="noopener noreferrer" className={footerLink}>
                  WhatsApp {SITE.whatsappDisplay}
                </a>
              </li>
              <li>
                <a href={paths.contact} onClick={sectionLinkHandler('contact')} className={footerLink}>
                  Send an enquiry
                </a>
              </li>
              <li>
                <a href={SITE.whatsappChannelUrl} target="_blank" rel="noopener noreferrer" className={footerLink}>
                  Follow our WhatsApp channel
                </a>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-10 border-t border-white/10 pt-6 text-xs leading-relaxed text-mist-400">
          © {YEAR} {SITE.brand}. These demos show what we can build. They use invented businesses
          and sample data, and they are not client projects. No real orders, payments, bookings or messages are
          processed on this site.
        </p>
      </div>
    </footer>
  )
}
