import { X } from 'lucide-react'
import { lazy, Suspense, useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { WhatsAppButton } from '../components/Button'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { GENERAL_ENQUIRY } from '../lib/whatsapp'
import { PANEL_FRAME } from './frame'
import { RECEPTIONIST_NAME } from './protocol'
import { ReceptionistContext } from './receptionist-context'

/* The chat code is a separate download, fetched the first time a visitor opens it (or hovers a button that does). */
const loadPanel = () => import('./ReceptionistPanel')
const ReceptionistPanel = lazy(loadPanel)

/**
 * Holds the receptionist for the whole studio. `page` is "home" or the slug of the demo on screen,
 * so the receptionist knows what the visitor is looking at. Once opened, the chat stays mounted
 * (hidden when closed), so a reply that is still arriving isn't lost.
 */
export function ReceptionistProvider({ page, children }: { page: string; children: ReactNode }) {
  const [isOpen, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const returnFocus = useRef<HTMLElement | null>(null)

  const open = useCallback((from?: HTMLElement | null) => {
    const active = document.activeElement
    returnFocus.current = from ?? (active instanceof HTMLElement ? active : null)
    setMounted(true)
    setOpen(true)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    returnFocus.current?.focus()
  }, [])

  const prefetch = useCallback(() => {
    loadPanel().catch(() => {
      // Retried when the chat is opened.
    })
  }, [])

  const value = useMemo(() => ({ open, prefetch, isOpen }), [open, prefetch, isOpen])

  return (
    <ReceptionistContext.Provider value={value}>
      {children}
      {mounted && (
        <ErrorBoundary fallback={() => (isOpen ? <PanelProblem onClose={close} /> : null)}>
          <Suspense fallback={isOpen ? <PanelLoading onClose={close} /> : null}>
            <ReceptionistPanel open={isOpen} page={page} onClose={close} />
          </Suspense>
        </ErrorBoundary>
      )}
    </ReceptionistContext.Provider>
  )
}

function PanelShell({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <section
      role="dialog"
      aria-label={`${RECEPTIONIST_NAME}, LIFELINE’s AI receptionist`}
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
