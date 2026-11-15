import { useSyncExternalStore } from 'react'

/*
 * A small History API router with clean URLs:
 *   /                  studio home
 *   /#demos, /#about, /#contact  home page sections
 *   /demos/<slug>      a demo
 * The build writes one HTML file per demo (see vite.config.ts), so each demo link has its
 * own title and description in WhatsApp link previews and search results. Cloudflare
 * serves dist/demos/<slug>.html at /demos/<slug>, and unknown paths fall back to the studio.
 */

export type HomeSection = 'demos' | 'about' | 'contact'

const SECTIONS: readonly HomeSection[] = ['demos', 'about', 'contact']

export type Route =
  | { name: 'home'; section?: HomeSection }
  | { name: 'demo'; slug: string }
  | { name: 'not-found' }

export interface RouterLocation {
  path: string
  hash: string
  /** Changes on every navigation, even to the same URL, so a repeated click still scrolls. */
  key: number
  /** Back and forward: where the visitor had scrolled to on this page, if known. */
  restoreY?: number
}

export const paths = {
  home: '/',
  demos: '/#demos',
  about: '/#about',
  contact: '/#contact',
  demo: (slug: string) => `/demos/${slug}`,
}

const listeners = new Set<() => void>()
let current: RouterLocation = { path: window.location.pathname, hash: window.location.hash, key: 0 }

function update(restoreY?: number) {
  current = { path: window.location.pathname, hash: window.location.hash, key: current.key + 1, restoreY }
  for (const listener of listeners) listener()
}

function savedScrollY(): number | undefined {
  const state: unknown = window.history.state
  if (state && typeof state === 'object' && 'scrollY' in state && typeof state.scrollY === 'number') return state.scrollY
  return undefined
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

export function useLocation(): RouterLocation {
  return useSyncExternalStore(subscribe, () => current)
}

function isSectionHash(hash: string): boolean {
  return SECTIONS.some((section) => hash === `#${section}`)
}

export function parseRoute({ path, hash }: Pick<RouterLocation, 'path' | 'hash'>): Route {
  const clean = path.replace(/\/+$/, '') || '/'
  if (clean === '/') {
    return isSectionHash(hash) ? { name: 'home', section: hash.slice(1) as HomeSection } : { name: 'home' }
  }
  if (clean === '/demos') return { name: 'home', section: 'demos' }
  const match = clean.match(/^\/demos\/([a-z0-9-]+)$/)
  if (match) return { name: 'demo', slug: match[1] }
  return { name: 'not-found' }
}

function navigate(url: URL) {
  const target = url.pathname + url.search + url.hash
  if (target !== window.location.pathname + window.location.search + window.location.hash) {
    // Remember the scroll position of the page being left, for the Back button.
    window.history.replaceState({ scrollY: window.scrollY }, '')
    window.history.pushState(null, '', target)
  }
  update()
}

function handlePopState() {
  redirectLegacyHash()
  update(savedScrollY())
}

/** Old hash links (#/demos/<slug>, #/contact) from before the switch to clean URLs. */
function redirectLegacyHash() {
  const legacy = window.location.hash.match(/^#\/(.*)$/)
  if (!legacy) return
  const path = legacy[1].replace(/\/+$/, '')
  const target = isSectionHash(`#${path}`) ? `/#${path}` : `/${path}`
  window.history.replaceState(null, '', target)
  current = { path: window.location.pathname, hash: window.location.hash, key: current.key }
}

/** Plain left clicks on same-site page links navigate without reloading the page. */
function handleLinkClick(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return
  }
  const link = event.target instanceof Element ? event.target.closest('a[href]') : null
  if (!(link instanceof HTMLAnchorElement)) return
  if ((link.target && link.target !== '_self') || link.hasAttribute('download')) return
  const url = new URL(link.href)
  // Leave other sites and files (logo.png, sitemap.xml) to the browser.
  if (url.origin !== window.location.origin || /\.[a-z0-9]+$/i.test(url.pathname)) return
  // Other in-page anchors on the current page keep the browser's normal jump.
  const samePage = url.pathname === window.location.pathname && url.search === window.location.search
  if (samePage && url.hash && !(url.pathname === '/' && isSectionHash(url.hash))) return
  event.preventDefault()
  navigate(url)
}

/** Call once before the first render. */
export function startRouter() {
  redirectLegacyHash()
  // The app restores scroll positions itself, after the page for that history entry has rendered.
  window.history.scrollRestoration = 'manual'
  window.addEventListener('popstate', handlePopState)
  document.addEventListener('click', handleLinkClick)
}

export function scrollToSection(id: string, behavior: ScrollBehavior = 'smooth') {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : behavior, block: 'start' })
}
