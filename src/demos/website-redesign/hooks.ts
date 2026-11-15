import { useLayoutEffect, useState, type RefObject } from 'react'

/** Content-box width of an element, kept up to date as it resizes. */
export function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return width
}

/** Smooth scrolling, unless the visitor prefers reduced motion. */
export function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

/** Scrolls a scroll container (not the page) so that `target` sits `offset` px below its top. */
export function scrollWithin(container: HTMLElement, target: Element, offset = 0) {
  const top = container.scrollTop + target.getBoundingClientRect().top - container.getBoundingClientRect().top - offset
  container.scrollTo({ top: Math.max(0, top), behavior: scrollBehavior() })
}
