import { useSyncExternalStore, type MouseEvent } from 'react'

/*
 * A small hash router. Hash URLs (#/demos/inventory-pos) work on any static host
 * without server rewrites, matching the existing studio on appdeploy.ai.
 */

export type HomeSection = 'demos' | 'contact'

export type Route =
  | { name: 'home'; section?: HomeSection }
  | { name: 'demo'; slug: string }
  | { name: 'not-found' }

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

function getHash() {
  return window.location.hash
}

export function useHash(): string {
  return useSyncExternalStore(subscribe, getHash, () => '')
}

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/\/+$/, '') || '/'
  if (path === '/') return { name: 'home' }
  if (path === '/demos') return { name: 'home', section: 'demos' }
  if (path === '/contact') return { name: 'home', section: 'contact' }
  const match = path.match(/^\/demos\/([a-z0-9-]+)$/)
  if (match) return { name: 'demo', slug: match[1] }
  return { name: 'not-found' }
}

export const paths = {
  home: '#/',
  demos: '#/demos',
  contact: '#/contact',
  demo: (slug: string) => `#/demos/${slug}`,
}

export function scrollToSection(id: string, behavior: ScrollBehavior = 'smooth') {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : behavior, block: 'start' })
}

/**
 * Click handler for links to home-page sections. If the URL already points at the
 * section, the hash does not change, so scroll manually.
 */
export function sectionLinkHandler(section: HomeSection) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (window.location.hash === paths[section]) {
      event.preventDefault()
      scrollToSection(section)
    }
  }
}
