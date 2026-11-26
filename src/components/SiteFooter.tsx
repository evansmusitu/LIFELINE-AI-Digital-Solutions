import { SITE } from '../config/site'
import { SOLUTIONS } from '../config/solutions'
import { DEMOS } from '../demos/registry'
import { paths } from '../lib/router'
import { EMAIL_ENQUIRY_URL } from '../lib/email'
import { GENERAL_ENQUIRY, whatsappUrl } from '../lib/whatsapp'
import { Wordmark } from './Logo'

const footerLink = 'text-sm text-mist-200 underline-offset-4 transition hover:text-white hover:underline'
const YEAR = new Date().getFullYear()

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-ink-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
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
              <li>
                <a href={SITE.earlierStudioUrl} target="_blank" rel="noopener noreferrer" className={footerLink}>
                  16 more demos in our earlier studio
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-sm font-semibold text-white">Solutions</h2>
            <ul className="mt-4 space-y-2.5">
              {SOLUTIONS.map((s) => (
                <li key={s.slug}>
                  <a href={paths.solution(s.slug)} className={footerLink}>
                    {s.title}
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
                <a href={EMAIL_ENQUIRY_URL} className={footerLink}>
                  Email {SITE.email}
                </a>
              </li>
              <li>
                <a href={paths.contact} className={footerLink}>
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

        <div className="mt-10 space-y-3 border-t border-white/10 pt-6 text-xs leading-relaxed text-mist-400">
          <p>
            <span className="font-semibold text-mist-300">Privacy.</span> This site uses no cookies and doesn’t track
            you. We count daily totals only, such as how many chats and video calls start and how many WhatsApp buttons
            are tapped, and which kind of link a visit came from, never who did what. To stop misuse, the chat, video calls and these counts are limited per
            network each day.
            Anything you type into a demo is saved only in your own browser, so the demo remembers it next
            time, and Reset demo clears it. Chat messages to our AI receptionist are processed by our AI provider to write
            each reply, and aren’t kept or used to train AI. On a video call, your voice is processed by our video call
            provider, which keeps a transcript of what was said. Your conversations with the receptionist are also saved
            in your browser, so the chat remembers them, and Start a new chat clears them. Voice typing uses your
            browser’s own speech service. WhatsApp buttons open a chat with a message ready for you to
            edit. It reaches LIFELINE only if you send it.
          </p>
          <p>
            © {YEAR} {SITE.brand}. These demos show what we can build. They use invented businesses and sample data,
            and they are not client projects. No real orders, payments, bookings or messages are processed on this
            site.
          </p>
        </div>
      </div>
    </footer>
  )
}
