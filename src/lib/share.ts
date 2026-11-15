import { SITE } from '../config/site'
import { paths } from './router'

/*
 * Sharing a demo with someone else. Links always use the live address (SITE.url), so a link
 * shared from a preview or a copy of the site still points at the real studio, and its
 * WhatsApp preview shows that demo's own title and summary.
 */

export interface SharedDemo {
  slug: string
  title: string
}

export function demoShareUrl(demo: SharedDemo): string {
  return `${SITE.url}${paths.demo(demo.slug)}`
}

/** Text that goes with the link. The link goes last, so WhatsApp shows its preview card. */
export function demoShareText(demo: SharedDemo): string {
  return `Have a look at this live demo from ${SITE.brand}: ${demo.title}. You can try it on your phone, no sign-up needed.`
}

/** Opens WhatsApp so the visitor can pick any chat or group. No phone number, unlike the enquiry links. */
export function whatsappShareUrl(demo: SharedDemo): string {
  return `https://wa.me/?text=${encodeURIComponent(`${demoShareText(demo)}\n${demoShareUrl(demo)}`)}`
}

function shareData(demo: SharedDemo): ShareData {
  return { title: `${demo.title} demo | ${SITE.brand}`, text: demoShareText(demo), url: demoShareUrl(demo) }
}

/** True when the browser has its own share sheet (most phones). Check before opening it, inside the click. */
export function canUseShareSheet(demo: SharedDemo): boolean {
  if (typeof navigator.share !== 'function') return false
  return typeof navigator.canShare !== 'function' || navigator.canShare(shareData(demo))
}

/** Opens the phone's share sheet: WhatsApp chats and Status, Facebook, SMS and so on. */
export async function openShareSheet(demo: SharedDemo): Promise<'shared' | 'closed' | 'failed'> {
  try {
    await navigator.share(shareData(demo))
    return 'shared'
  } catch (error) {
    return error instanceof DOMException && error.name === 'AbortError' ? 'closed' : 'failed'
  }
}

/** Copies the demo link. Returns false where the browser blocks clipboard access. */
export async function copyDemoLink(demo: SharedDemo): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(demoShareUrl(demo))
    return true
  } catch {
    return false
  }
}
