import { X } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { WhatsAppButton } from '../components/Button'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { GENERAL_ENQUIRY } from '../lib/whatsapp'
import { PANEL_FRAME } from './frame'
import { RECEPTIONIST_NAME } from './protocol'
import { ReceptionistContext, type OpenOptions } from './receptionist-context'

/* The chat code is a separate download, fetched the first time a visitor opens it (or hovers a button that does). */
const loadPanel = () => import('./ReceptionistPanel')
const ReceptionistPanel = lazy(loadPanel)

/** Phones, where the chat covers the whole screen (see PANEL_FRAME). Follows rotation and resizing. */
const PHONE = window.matchMedia('(max-width: 639px)')
const subscribePhone = (onChange: () => void) => {
  PHONE.addEventListener('change', onChange)
  return () => PHONE.removeEventListener('change', onChange)
}
const isPhone = () => PHONE.matches

/** Something focus can go back to: still on the page and shown. */
function focusable(element: HTMLElement | null): element is HTMLElement {
  return !!element && element.isConnected && element.getClientRects().length > 0
}

/**
 * Holds the receptionist for the whole studio. `page` is "home" or the slug of the demo on screen,
 * so the receptionist knows what the visitor is looking at. Once opened, the chat stays mounted
 * (hidden when closed), so a reply that is still arriving isn't lost.
 */
export function ReceptionistProvider({ page, children }: { page: string; children: ReactNode }) {
  const [isOpen, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const returnFocus = useRef<HTMLElement | null>(null)
  const restoreFocus = useRef(false)
  /** Goes up by one each time a button asks for the video screen, so the panel switches to it. */
  const [videoRequest, setVideoRequest] = useState(0)
  const phone = useSyncExternalStore(subscribePhone, isPhone)

  const open = useCallback((from?: HTMLElement | null, options?: OpenOptions) => {
    const active = document.activeElement
    returnFocus.current = from ?? (active instanceof HTMLElement ? active : null)
    if (options?.video) setVideoRequest((n) => n + 1)
    setMounted(true)
    setOpen(true)
  }, [])

  const close = useCallback(() => {
    restoreFocus.current = true
    setOpen(false)
  }, [])

  // After closing, once the page has re-rendered: the button that opened the chat may only now be
  // visible again (the floating one hides while the chat is open), or may be gone after a link
  // inside the chat changed the page. Then focus goes to the main content.
  useEffect(() => {
    if (isOpen || !restoreFocus.current) return
    restoreFocus.current = false
    const target = returnFocus.current
    if (focusable(target)) target.focus()
    else document.getElementById('main')?.focus({ preventScroll: true })
  }, [isOpen])

  const prefetch = useCallback(() => {
    loadPanel().catch(() => {
      // Retried when the chat is opened.
    })
  }, [])

  const value = useMemo(() => ({ open, prefetch, isOpen }), [open, prefetch, isOpen])

  return (
    <ReceptionistContext.Provider value={value}>
      {/* On phones the open chat covers the page, so the page behind can't be reached by Tab or a screen reader. */}
      <div className="contents" inert={isOpen && phone}>
        {children}
      </div>
      {mounted && (
        <ErrorBoundary fallback={() => (isOpen ? <PanelProblem onClose={close} /> : null)}>
          <Suspense fallback={isOpen ? <PanelLoading onClose={close} /> : null}>
            <ReceptionistPanel open={isOpen} page={page} fullScreen={phone} videoRequest={videoRequest} onClose={close} />
          </Suspense>
        </ErrorBoundary>
      )}
    </ReceptionistContext.Provider>
  )
}

function PanelShell({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const shell = useRef<HTMLElement>(null)
  useEffect(() => shell.current?.focus(), [])
  return (
    <section
      ref={shell}
      role="dialog"
      aria-label={`${RECEPTIONIST_NAME}, LIFELINE’s AI receptionist`}
      tabIndex={-1}
      onKeyDown={(event) => event.key === 'Escape' && onClose()}
      className={PANEL_FRAME}
    >
      <div className="flex justify-end border-b border-white/10 p-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="grid size-10 place-items-center rounded-full text-mist-200 hover:bg-white/10 hover:text-white"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="grid flex-1 place-items-center p-6 text-center">{children}</div>
    </section>
  )
}

function PanelLoading({ onClose }: { onClose: () => void }) {
  return (
    <PanelShell onClose={onClose}>
      <p role="status" className="flex flex-col items-center gap-3 text-sm text-mist-300">
        <span className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-brand-cyan" aria-hidden="true" />
        Opening the chat…
      </p>
    </PanelShell>
  )
}

function PanelProblem({ onClose }: { onClose: () => void }) {
  return (
    <PanelShell onClose={onClose}>
      <div role="alert" className="max-w-xs">
        <p className="font-semibold text-white">The chat didn’t load</p>
        <p className="mt-2 text-sm text-mist-300">
          A weak connection can interrupt the download. Reload the page to try again, or message the team on WhatsApp.
        </p>
        <WhatsAppButton message={GENERAL_ENQUIRY} label="Chat on WhatsApp" className="mt-5" />
      </div>
    </PanelShell>
  )
}
