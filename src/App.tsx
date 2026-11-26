import { useEffect, useRef, useState } from 'react'
import { SiteFooter } from './components/SiteFooter'
import { SiteHeader } from './components/SiteHeader'
import { ToastProvider } from './components/ToastProvider'
import { findDemo } from './demos/registry'
import { parseRoute, scrollToSection, useLocation } from './lib/router'
import { DemoPage } from './pages/DemoPage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { nextReceptionistPage, receptionistPage } from './receptionist/protocol'
import { ReceptionistProvider } from './receptionist/ReceptionistProvider'

const STUDIO_TITLE = 'LIFELINE AI CONCIERGE | Demo Studio'

export default function App() {
  const here = useLocation()
  const route = parseRoute(here)
  const demo = route.name === 'demo' ? findDemo(route.slug) : undefined
  const firstLoad = useRef(true)
  // The page Tari is told about. Updated while rendering (React's pattern for state that follows a prop).
  const [tariPage, setTariPage] = useState(() => receptionistPage(demo?.slug))
  const nextTariPage = nextReceptionistPage(tariPage, demo?.slug)
  if (nextTariPage !== tariPage) setTariPage(nextTariPage)

  // Runs on every navigation, including a repeat click on the same link: page title, scroll position and focus.
  useEffect(() => {
    const current = parseRoute(here)
    const currentDemo = current.name === 'demo' ? findDemo(current.slug) : undefined
    document.title = currentDemo ? `${currentDemo.title} demo | LIFELINE AI CONCIERGE` : STUDIO_TITLE

    const initial = firstLoad.current
    firstLoad.current = false

    // Back or forward: return to where the visitor was, for example the demo card they opened.
    const { restoreY } = here
    if (restoreY !== undefined) {
      requestAnimationFrame(() => {
        window.scrollTo(0, restoreY)
        document.getElementById('page-title')?.focus({ preventScroll: true })
      })
      return
    }

    if (current.name === 'home' && current.section) {
      const section = current.section
      requestAnimationFrame(() => {
        scrollToSection(section, initial ? 'auto' : 'smooth')
        if (!initial) document.getElementById(`${section}-title`)?.focus({ preventScroll: true })
      })
      return
    }

    window.scrollTo(0, 0)
    // Move focus to the new page heading so screen readers announce the change.
    if (!initial) document.getElementById('page-title')?.focus({ preventScroll: true })
  }, [here])

  return (
    <ToastProvider>
      {/* The AI receptionist knows which demo is on screen (except a demo with its own assistant). */}
      <ReceptionistProvider page={tariPage}>
        <a
          href="#main"
          onClick={(event) => {
            event.preventDefault()
            document.getElementById('main')?.focus()
          }}
          className="sr-only z-50 rounded-full bg-white px-4 py-2 font-semibold text-ink-950 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <div className="flex min-h-dvh flex-col pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0">
          <SiteHeader />
          <main id="main" tabIndex={-1} className="flex-1 outline-none">
            {route.name === 'home' && <HomePage />}
            {route.name === 'demo' && (demo ? <DemoPage key={demo.slug} demo={demo} /> : <NotFoundPage />)}
            {route.name === 'not-found' && <NotFoundPage />}
          </main>
          <SiteFooter />
        </div>
      </ReceptionistProvider>
    </ToastProvider>
  )
}
