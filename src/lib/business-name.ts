/*
 * Personalised demo links: /demos/whatsapp-ordering?for=Mama%27s+Kitchen shows the visitor's own
 * business name in place of the sample one. The name stays in this browser: it is read from the
 * address, kept in sessionStorage (this tab only, gone when the tab closes) and drawn as React text.
 * It is never sent to the Worker, the stats, the AI prompt or the WhatsApp summary, and never put in
 * localStorage or a cookie.
 */

const KEY = 'lifeline.for'
export const MAX_BUSINESS_NAME = 40

// Letters (any language, with accents), digits, spaces and a few common name marks.
const ALLOWED = /^[\p{L}\p{M}\p{N} '’&.,!()-]+$/u
const HAS_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u

/** A clean business name, or null when the value is empty, too long, or has anything unexpected in it. */
export function parseBusinessName(raw: string | null | undefined): string | null {
  if (!raw) return null
  const name = raw.replace(/\s+/g, ' ').trim()
  if (!name || name.length > MAX_BUSINESS_NAME) return null
  if (!ALLOWED.test(name) || !HAS_LETTER_OR_DIGIT.test(name)) return null
  return name
}

function readSession(): string | null {
  try {
    return window.sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

function writeSession(name: string | null) {
  try {
    if (name) window.sessionStorage.setItem(KEY, name)
    else window.sessionStorage.removeItem(KEY)
  } catch {
    // Storage can be blocked. The name then lasts until the page is reloaded without the link.
  }
}

let current: string | null = null
let loaded = false

/** The name for this tab: from ?for= if the address has one, otherwise the one kept earlier in the tab. */
export function getBusinessName(): string | null {
  if (typeof window === 'undefined') return null
  if (!loaded) {
    loaded = true
    const params = new URLSearchParams(window.location.search)
    if (params.has('for')) {
      current = parseBusinessName(params.get('for'))
      writeSession(current)
    } else {
      current = parseBusinessName(readSession())
    }
  }
  return current
}

/** The visitor's business name from a personalised link, or the fallback (the sample name). The name is fixed for the tab's page load. */
export function useBusinessName(): string | null
export function useBusinessName(fallback: string): string
export function useBusinessName(fallback?: string): string | null {
  return getBusinessName() ?? fallback ?? null
}
