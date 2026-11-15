import { Columns2, Droplets, Gauge, Globe, Inbox, ListChecks } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../../components/toast-context'
import { duration, firstName, num } from '../../lib/format'
import { usePersistentState } from '../../lib/storage'
import { useDemoClock, useTicker } from '../../lib/time'
import { useDemoMetrics } from '../metrics'
import { DemoAppShell, type DemoScreen } from '../shell'
import { ChangesScreen } from './ChangesScreen'
import { CompareScreen } from './CompareScreen'
import { BUSINESS, TOPICS, createInitialState } from './data'
import { MINUTES_PER_ENQUIRY, addEnquiry, advanceEnquiry, countByStatus, inLastDays, nextStatus, shouldLogCall, type NewEnquiry } from './engine'
import { EnquiriesScreen } from './EnquiriesScreen'
import { ResultsScreen } from './ResultsScreen'
import { SiteScreen } from './SiteScreen'
import type { RedesignState } from './types'

const SLUG = 'website-redesign'
const ACCENT = { base: '#0e7490', strong: '#155e75', soft: '#ecfeff', ink: '#164e63' }

type ScreenId = 'compare' | 'changes' | 'results' | 'site' | 'enquiries'

export default function WebsiteRedesignDemo() {
  const clock = useDemoClock(9, 0)
  const now = useTicker(clock)
  const toast = useToast()
  const [state, setState] = usePersistentState<RedesignState>(`${SLUG}.state`, createInitialState, { version: 1, freshDaily: true })
  const [screen, setScreen] = useState<ScreenId>('compare')
  const [focusChange, setFocusChange] = useState<number | null>(null)
  const { enquiries, style } = state

  const go = (id: ScreenId) => {
    setFocusChange(null)
    setScreen(id)
  }

  const log = (input: NewEnquiry) => {
    const result = addEnquiry(state, input, clock())
    setState(result.state)
    return result.enquiry.ref
  }

  const logCall = () => {
    if (!shouldLogCall(enquiries, clock())) return false
    log({ name: 'You', phone: 'Your number', area: 'Not given yet', source: 'Call button', need: 'Called from the website' })
    return true
  }

  const advance = (id: string) => {
    const enquiry = enquiries.find((e) => e.id === id)
    const next = enquiry && nextStatus(enquiry.status)
    if (!enquiry || !next) return
    setState((s) => ({ ...s, enquiries: advanceEnquiry(s.enquiries, id) }))
    toast(`${enquiry.mine ? 'Your enquiry' : firstName(enquiry.name)} moved to ${next}.`, 'info')
  }

  const total = enquiries.length
  const newCount = countByStatus(enquiries).New

  useDemoMetrics([
    { label: 'New-site enquiries', value: num(total), detail: `${inLastDays(enquiries, now, 7)} this week · from form, WhatsApp and call buttons` },
    { label: 'Home page size', value: '0.42 MB', detail: 'Down from 6.1 MB' },
    { label: 'Load time on slow mobile data', value: '2.1 s', detail: 'Was 11.4 s on the old site' },
    {
      label: 'Follow-up time saved (est.)',
      value: duration(total * MINUTES_PER_ENQUIRY),
      detail: `Enquiries arrive with name, phone and area (${MINUTES_PER_ENQUIRY} min each)`,
    },
  ])

  const screens: DemoScreen<ScreenId>[] = [
    { id: 'compare', label: 'Before & after', icon: Columns2, audience: 'customer' },
    { id: 'changes', label: 'What changed', icon: ListChecks, audience: 'customer' },
    { id: 'results', label: 'Results', icon: Gauge, audience: 'team' },
    { id: 'site', label: 'New site', icon: Globe, audience: 'customer' },
    { id: 'enquiries', label: 'Enquiries', icon: Inbox, audience: 'team', badge: newCount || undefined },
  ]

  return (
    <DemoAppShell
      slug={SLUG}
      business={{ name: BUSINESS.name, descriptor: 'Website redesign · Harare, Zimbabwe', icon: Droplets }}
      accent={ACCENT}
      screens={screens}
      active={screen}
      onChange={go}
      headerRight={
        <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 sm:inline-flex">{BUSINESS.domain}</span>
      }
    >
      {screen === 'compare' && <CompareScreen siteStyle={style} initialFocus={focusChange} />}
      {screen === 'changes' && (
        <ChangesScreen
          onShow={(id) => {
            setFocusChange(id)
            setScreen('compare')
          }}
        />
      )}
      {screen === 'results' && <ResultsScreen enquiries={enquiries} onOpenSite={() => go('site')} />}
      {screen === 'site' && (
        <SiteScreen
          siteStyle={style}
          now={now}
          onStyle={(next) => setState((s) => ({ ...s, style: next }))}
          onCall={logCall}
          onFormEnquiry={(enquiry) => {
            const ref = log({ ...enquiry, source: 'Form' })
            toast('Enquiry received. See it in Enquiries.', 'success')
            return ref
          }}
          onWhatsAppEnquiry={(topic, message) => {
            const need = TOPICS.find((t) => t.id === topic)?.need ?? TOPICS[0].need
            const ref = log({ name: 'You', phone: 'Your WhatsApp number', area: 'Not given yet', source: 'WhatsApp button', need, message })
            toast('Message received. See it in Enquiries.', 'success')
            return ref
          }}
          onOpenEnquiries={() => go('enquiries')}
        />
      )}
      {screen === 'enquiries' && (
        <EnquiriesScreen
          enquiries={enquiries}
          now={now}
          onAdvance={advance}
          onWhatsApp={() => toast('In your version this opens a WhatsApp chat with the customer.', 'info')}
          onOpenSite={() => go('site')}
        />
      )}
    </DemoAppShell>
  )
}
