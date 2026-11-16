import { SITE } from '../config/site'
import { EVENT_PATH, type PageEvent } from './count-events'

/*
 * Counts WhatsApp taps and demo shares as daily totals (src/lib/count-events.ts). Each count sends
 * the event's name and nothing else: no cookie, ID, page address or message text.
 */

/** Sends one count. It never delays the tap, and a failure is ignored. keepalive lets it finish as the page goes to WhatsApp. */
export function countEvent(event: PageEvent): void {
  try {
    void fetch(EVENT_PATH, {
      method: 'POST',
      keepalive: true,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event }),
      // The site's address only, not the page's. ("no-referrer" would also blank the Origin header the Worker checks.)
      referrerPolicy: 'origin',
    }).catch(() => undefined)
  } catch {
    // No fetch, or blocked: nothing to count.
  }
}

/**
 * What tapping a link counts as: a WhatsApp chat with LIFELINE (by where it was tapped: in the chat,
 * on a video call or on a page), a demo shared to WhatsApp, or nothing.
 */
export function linkEvent(href: string, source: string | null): PageEvent | null {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return null
  }
  if (url.hostname !== 'wa.me') return null
  if (url.pathname === `/${SITE.whatsappNumber}`) {
    return source === 'chat' ? 'whatsapp_chat' : source === 'video' ? 'whatsapp_video' : 'whatsapp_page'
  }
  // wa.me/?text=… lets the sender pick the chat. It's a share when it carries a link to this studio.
  // (Some demos make these links too, for their sample tickets and bookings. Those aren't counted.)
  if (url.pathname === '/' && (url.searchParams.get('text') ?? '').includes(`${SITE.url}/`)) return 'share_whatsapp'
  return null
}

/**
 * Counts taps on WhatsApp links anywhere on the site. Call once at startup. Where a link sits inside
 * an element with data-count-source="chat" or "video", that's where the tap is counted as coming from.
 */
export function startCounting(): void {
  document.addEventListener('click', (event) => {
    // A link whose own handler cancelled it, like the share icon when it opens the phone's share menu instead.
    if (event.defaultPrevented || !(event.target instanceof Element)) return
    const link = event.target.closest('a[href]')
    // data-count-skip: a tap already counted another way, such as the link shown when a pop-up was blocked.
    if (!(link instanceof HTMLAnchorElement) || link.hasAttribute('data-count-skip')) return
    const found = linkEvent(link.href, link.closest('[data-count-source]')?.getAttribute('data-count-source') ?? null)
    if (found) countEvent(found)
  })
}
