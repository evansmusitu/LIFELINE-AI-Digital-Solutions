import { ChevronLeft, ChevronRight, ChevronsLeftRight, Monitor, Smartphone, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react'
import { cn } from '../../lib/cn'
import { AppButton, Segmented, Toggle } from '../ui'
import { BUSINESS, CHANGES } from './data'
import { compareLayout, isMarkerHidden, revealDivider, type CompareMode } from './engine'
import { scrollBehavior, useElementWidth } from './hooks'
import { NewSite } from './NewSite'
import { OldSite } from './OldSite'
import type { SiteStyle } from './types'

interface Props {
  siteStyle: SiteStyle
  /** A change picked on "What changed": show the markers and bring this one into view. */
  initialFocus: number | null
}

interface Spot {
  id: number
  left: number
  top: number
}

const MARKER = 28

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max))

function scrollToSpot(screen: HTMLElement, spot: Spot) {
  screen.scrollTo({ top: Math.max(0, spot.top - screen.clientHeight * 0.3), behavior: scrollBehavior() })
}

export function CompareScreen({ siteStyle, initialFocus }: Props) {
  const [mode, setMode] = useState<CompareMode>('phone')
  const [divider, setDivider] = useState(50)
  const [showMarkers, setShowMarkers] = useState(initialFocus !== null)
  const [active, setActive] = useState<number | null>(initialFocus)
  const [spots, setSpots] = useState<Spot[]>([])
  const [newHeight, setNewHeight] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const screenRef = useRef<HTMLDivElement>(null)
  const newLayerRef = useRef<HTMLDivElement>(null)
  const pending = useRef<number | null>(initialFocus)
  const available = useElementWidth(wrapRef)
  const layout = compareLayout(mode, available)

  // Where each numbered change sits on the new site, in on-screen pixels inside the frame. Markers sit at the
  // right-hand end of their element: the new site shows on the right, so they stay visible as the divider moves.
  useLayoutEffect(() => {
    const layer = newLayerRef.current
    if (!layer || !showMarkers) return
    const base = layer.getBoundingClientRect()
    const found: Spot[] = []
    for (const change of CHANGES) {
      const el = [...layer.querySelectorAll<HTMLElement>(`[data-change="${change.id}"]`)].find((node) => node.offsetWidth > 0)
      if (!el) continue
      const rect = el.getBoundingClientRect()
      const left = clamp(rect.right - base.left - MARKER + 6, 2, layout.frame - MARKER - 2)
      found.push({ id: change.id, left, top: Math.max(2, rect.top - base.top - 10) })
    }
    setSpots(found)

    // A change picked on "What changed" waits until the site has its full height, so the frame can scroll to it.
    const spot = found.find((s) => s.id === pending.current)
    if (spot && newHeight > 0 && screenRef.current) {
      pending.current = null
      setActive(spot.id)
      setDivider((d) => revealDivider(spot.left + MARKER / 2, layout.frame, d))
      scrollToSpot(screenRef.current, spot)
    }
  }, [showMarkers, layout.frame, layout.newScale, newHeight, siteStyle.font, mode])

  const reveal = (id: number) => {
    setActive(id)
    const spot = spots.find((s) => s.id === id)
    if (!spot || !screenRef.current) return
    setDivider((d) => revealDivider(spot.left + MARKER / 2, layout.frame, d))
    scrollToSpot(screenRef.current, spot)
  }

  const toggleMarkers = (on: boolean) => {
    setShowMarkers(on)
    if (!on) setActive(null)
  }

  const index = CHANGES.findIndex((c) => c.id === active)
  const change = index >= 0 ? CHANGES[index] : null
  const step = (delta: number) => reveal(CHANGES[(index + delta + CHANGES.length) % CHANGES.length].id)

  const markers = showMarkers && (
    <div className="absolute inset-0">
      {spots.map((spot) => {
        const hidden = isMarkerHidden(spot.left + MARKER / 2, layout.frame, divider)
        const current = spot.id === active
        const title = CHANGES.find((c) => c.id === spot.id)?.title
        return (
          <button
            key={spot.id}
            type="button"
            aria-pressed={current}
            aria-label={`Change ${spot.id}: ${title}`}
            onClick={() => setActive(current ? null : spot.id)}
            style={{ left: spot.left, top: spot.top, width: MARKER, height: MARKER }}
            className={cn(
              'absolute z-10 grid place-items-center rounded-full bg-amber-400 text-xs font-bold text-slate-900 shadow-md ring-2 ring-white transition',
              current ? 'scale-110 ring-slate-900 motion-safe:animate-pulse-ring' : 'hover:scale-110',
              hidden && 'invisible',
            )}
          >
            {spot.id}
          </button>
        )
      })}
    </div>
  )

  const screen = (
    <div
      ref={screenRef}
      tabIndex={0}
      role="region"
      aria-label="Old and new home page in one frame. Scroll to see more."
      onScroll={(e) => {
        // Nothing should ever slide the frame sideways, even focus.
        if (e.currentTarget.scrollLeft) e.currentTarget.scrollLeft = 0
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && active !== null) setActive(null)
      }}
      className="no-scrollbar relative h-(--frame-h) overflow-x-hidden overflow-y-auto focus-visible:outline-offset-[-3px]"
      style={{ width: layout.frame }}
    >
      <div className="pointer-events-none sticky top-0 z-20 h-0">
        <div className="absolute inset-x-0 top-0 h-(--frame-h)">
          <span aria-hidden="true" className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgb(15_23_42/0.3)]" style={{ left: `${divider}%` }} />
          <span
            aria-hidden="true"
            className={cn('absolute bottom-3 left-3 rounded-full bg-slate-900/85 px-2.5 py-1 text-xs font-semibold text-white transition-opacity', divider < 24 && 'opacity-0')}
          >
            Before
          </span>
          <span
            aria-hidden="true"
            className={cn('absolute right-3 bottom-3 rounded-full bg-(--accent) px-2.5 py-1 text-xs font-semibold text-white transition-opacity', divider > 76 && 'opacity-0')}
          >
            After
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={divider}
            onChange={(e) => setDivider(Number(e.target.value))}
            aria-label="Compare old and new site"
            aria-valuetext={`Old site on the left ${divider}%, new site on the right ${100 - divider}%`}
            className={cn(
              'peer pointer-events-none absolute inset-y-0 -left-5 m-0 h-full w-[calc(100%+2.5rem)] touch-pan-y appearance-none bg-transparent focus-visible:outline-none',
              '[&::-webkit-slider-runnable-track]:h-(--frame-h) [&::-webkit-slider-runnable-track]:bg-transparent',
              // Only the tall, invisible thumb takes the pointer, so the rest of the frame still scrolls by touch.
              '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-(--frame-h) [&::-webkit-slider-thumb]:w-10 [&::-webkit-slider-thumb]:cursor-ew-resize [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-transparent',
              '[&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-(--frame-h) [&::-moz-range-thumb]:w-10 [&::-moz-range-thumb]:cursor-ew-resize [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent',
            )}
          />
          <span
            aria-hidden="true"
            className="absolute top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-slate-900 shadow-lg ring-1 ring-slate-300 peer-focus-visible:ring-4 peer-focus-visible:ring-sky-600"
            style={{ left: `${divider}%` }}
          >
            <ChevronsLeftRight className="size-5" />
          </span>
          {change && (
            <div className="pointer-events-auto absolute inset-x-2 bottom-2 rounded-xl bg-white p-3 text-sm shadow-xl ring-1 ring-slate-200 sm:right-3 sm:left-auto sm:w-80">
              <div className="flex items-start gap-2">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-amber-400 text-xs font-bold text-slate-900">{change.id}</span>
                <p className="min-w-0 flex-1 pt-0.5 font-semibold text-slate-900">{change.title}</p>
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  aria-label="Close"
                  className="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
              <p className="mt-1.5 text-slate-800">{change.after}</p>
              <p className="mt-1 text-slate-600">{change.why}</p>
              {change.metric && (
                <p className="mt-2 inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  {change.metric.label}: {change.metric.before} → {change.metric.after}
                </p>
              )}
              <div className="mt-2 flex justify-between">
                <AppButton variant="ghost" size="sm" icon={ChevronLeft} onClick={() => step(-1)}>
                  Previous
                </AppButton>
                <AppButton variant="ghost" size="sm" onClick={() => step(1)}>
                  Next
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                </AppButton>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid" style={{ width: layout.frame }}>
        <ScaledLayer width={layout.oldWidth} scale={layout.oldScale} className="bg-[repeating-linear-gradient(45deg,#d4d4d4_0_2px,#dedede_2px_7px)]">
          <OldSite />
        </ScaledLayer>
        <ScaledLayer
          width={layout.newWidth}
          scale={layout.newScale}
          layerRef={newLayerRef}
          onHeight={setNewHeight}
          className="bg-slate-900"
          style={{ clipPath: `inset(0 0 0 ${divider}%)` }}
          overlay={markers}
        >
          <NewSite siteStyle={siteStyle} preview highlight={showMarkers ? active : null} />
        </ScaledLayer>
      </div>
    </div>
  )

  return (
    <div className="space-y-4 p-3 [--frame-h:min(35rem,75dvh)] sm:p-5 sm:[--frame-h:38.75rem]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Screen size"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'phone', label: 'Phone', icon: Smartphone },
            { value: 'desktop', label: 'Desktop', icon: Monitor },
          ]}
        />
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <Toggle checked={showMarkers} onChange={toggleMarkers} label="Show what changed" />
        </div>
      </div>
      <p className="text-sm text-slate-700">
        Drag the handle to compare the old home page (left) with the new one (right).
        {showMarkers && ' Tap a number to see what changed there.'}
      </p>

      <div ref={wrapRef} className="min-w-0">
        {layout.frame > 0 &&
          (mode === 'phone' ? (
            <div className="mx-auto w-fit rounded-[2.25rem] bg-slate-900 p-2.5 shadow-xl">
              <div className="overflow-hidden rounded-[1.6rem] bg-white">{screen}</div>
            </div>
          ) : (
            <div className="mx-auto w-fit overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-300">
              <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-100 px-3 py-2">
                <span className="flex shrink-0 gap-1" aria-hidden="true">
                  <span className="size-2.5 rounded-full bg-slate-300" />
                  <span className="size-2.5 rounded-full bg-slate-300" />
                  <span className="size-2.5 rounded-full bg-slate-300" />
                </span>
                <span className="min-w-0 flex-1 truncate rounded-md bg-white px-2.5 py-0.5 text-xs text-slate-700">{BUSINESS.domain}</span>
              </div>
              {screen}
            </div>
          ))}
      </div>
      <p className="text-center text-xs text-slate-600">
        Scroll inside the frame to see the whole page. On a keyboard, focus the handle and use the arrow keys.
      </p>
      <p className="sr-only">
        The old site has small grey text, a nine-item menu and a long contact form, and its phone number is only in the footer. The
        new site has large dark text, a four-item menu, Call and WhatsApp buttons at the top, prices and a three-field form.
      </p>
      <p className="sr-only" aria-live="polite">
        {change ? `Change ${change.id}: ${change.title}. ${change.after}` : ''}
      </p>
    </div>
  )
}

/** Lays a site out at `width` px and shrinks it to fit. The site is a picture here: nothing in it can be focused. */
function ScaledLayer({
  width,
  scale,
  className,
  style,
  layerRef,
  onHeight,
  overlay,
  children,
}: {
  width: number
  scale: number
  className?: string
  style?: CSSProperties
  layerRef?: Ref<HTMLDivElement>
  onHeight?: (height: number) => void
  overlay?: ReactNode
  children: ReactNode
}) {
  const innerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useLayoutEffect(() => {
    const el = innerRef.current
    if (!el) return
    const update = () => setHeight(el.offsetHeight)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    onHeight?.(height)
  }, [height, onHeight])

  return (
    <div ref={layerRef} className={cn('relative overflow-hidden [grid-area:1/1]', className)} style={{ minHeight: height * scale, ...style }}>
      <div ref={innerRef} inert aria-hidden="true" className="absolute top-0 left-0 origin-top-left" style={{ width, transform: `scale(${scale})` }}>
        {children}
      </div>
      {overlay}
    </div>
  )
}
