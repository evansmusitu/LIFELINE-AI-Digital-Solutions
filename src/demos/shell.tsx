import type { LucideIcon } from 'lucide-react'
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import { accentStyle, type Accent } from './styles'

export interface DemoScreen<T extends string> {
  id: T
  label: string
  icon: LucideIcon
  /** Whose view this screen shows. Helps visitors see both sides of the system. */
  audience: 'customer' | 'team'
  badge?: number
}

interface Props<T extends string> {
  slug: string
  business: { name: string; descriptor: string; icon: LucideIcon }
  accent: Accent
  screens: DemoScreen<T>[]
  active: T
  onChange: (id: T) => void
  headerRight?: ReactNode
  children: ReactNode
}

/** The sample business's own app: its name, its brand colour and a tab for each screen. */
export function DemoAppShell<T extends string>({
  slug,
  business,
  accent,
  screens,
  active,
  onChange,
  headerRight,
  children,
}: Props<T>) {
  const rootRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const previous = useRef(active)
  const BusinessIcon = business.icon

  // When a button inside a screen switches to another screen, bring the new screen into view.
  useEffect(() => {
    if (previous.current === active) return
    previous.current = active
    const root = rootRef.current
    if (root && root.getBoundingClientRect().top < 0) root.scrollIntoView({ block: 'start' })
    const tab = root?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
    const strip = tab?.parentElement
    if (tab && strip) strip.scrollLeft = Math.max(0, tab.offsetLeft - strip.clientWidth / 2 + tab.clientWidth / 2)
  }, [active])

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = -1
    if (event.key === 'ArrowRight') next = (index + 1) % screens.length
    if (event.key === 'ArrowLeft') next = (index - 1 + screens.length) % screens.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = screens.length - 1
    if (next < 0) return
    event.preventDefault()
    onChange(screens[next].id)
    tabRefs.current[next]?.focus()
  }

  return (
    <div ref={rootRef} className="scroll-mt-20 bg-slate-50 text-slate-900" style={accentStyle(accent)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-(--accent) text-white">
          <BusinessIcon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate leading-tight font-semibold text-slate-900">{business.name}</p>
          <p className="truncate text-xs text-slate-600">{business.descriptor}</p>
        </div>
        {headerRight && <div className="flex shrink-0 items-center gap-2">{headerRight}</div>}
      </div>

      <div
        role="tablist"
        aria-label={`${business.name} screens`}
        className="no-scrollbar relative flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 sm:px-3"
      >
        {screens.map((screen, index) => {
          const selected = screen.id === active
          const Icon = screen.icon
          return (
            <button
              key={screen.id}
              ref={(el) => {
                tabRefs.current[index] = el
              }}
              id={`${slug}-tab-${screen.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${slug}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(screen.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                'relative flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-medium transition',
                selected
                  ? 'text-(--accent-ink) after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-(--accent)'
                  : 'text-slate-600 hover:text-slate-900',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              <span>{screen.label}</span>
              <span
                className={cn(
                  'hidden rounded px-1.5 py-0.5 text-[0.62rem] font-semibold tracking-wide uppercase sm:inline',
                  screen.audience === 'customer' ? 'bg-sky-50 text-sky-800' : 'bg-slate-100 text-slate-600',
                )}
              >
                {screen.audience === 'customer' ? 'Customer' : 'Team'}
              </span>
              {screen.badge ? (
                <span className="min-w-5 rounded-full bg-(--accent) px-1.5 text-center text-xs leading-5 font-semibold text-white">
                  {screen.badge}
                  <span className="sr-only"> new</span>
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id={`${slug}-panel`} aria-labelledby={`${slug}-tab-${active}`}>
        {children}
      </div>
    </div>
  )
}
