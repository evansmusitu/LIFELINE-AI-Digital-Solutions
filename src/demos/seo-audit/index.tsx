import { Gauge, Globe, ListChecks, Search, TrendingUp, Wrench } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useToast } from '../../components/toast-context'
import { hoursLabel, num } from '../../lib/format'
import { usePersistentState } from '../../lib/storage'
import { uid, useDemoClock, useTicker } from '../../lib/time'
import { useDemoMetrics } from '../metrics'
import { DemoAppShell, type DemoScreen } from '../shell'
import { AuditScreen } from './AuditScreen'
import { auditRecord, BUSINESS, createInitialState, ISSUE_TEXT, type PreviewPageId } from './data'
import { DESCRIPTION_LIMIT, expectedScore, issueBoard, runAudit, sampleKeyword, signedChange, TITLE_LIMIT } from './engine'
import { FixListScreen } from './FixListScreen'
import { KeywordsScreen } from './KeywordsScreen'
import { PreviewScreen } from './PreviewScreen'
import type { AuditProgress, IssueId, ListingId, SeoState } from './types'

const SLUG = 'seo-audit'
const ACCENT = { base: '#a21caf', strong: '#86198f', soft: '#fdf4ff', ink: '#701a75' }
const MAX_AUDITS = 12
/** Minutes to review one page by hand, and to write one title, description or alt text. */
const MANUAL_PAGE_MINUTES = 10
const MANUAL_DRAFT_MINUTES = 5

type ScreenId = 'audit' | 'fixes' | 'preview' | 'keywords'

/** When each audit step starts, in ms. About 5.7 s in total. */
const CRAWL_STEP_MS = 350
const STAGE_AT: [AuditProgress['stage'], number][] = [
  ['titles', 2400],
  ['speed', 3500],
  ['local', 4700],
]
const AUDIT_DONE_MS = 5700

export default function SeoAuditDemo() {
  const clock = useDemoClock(11, 0)
  const now = useTicker(clock)
  const toast = useToast()
  const [state, setState] = usePersistentState<SeoState>(`${SLUG}.state`, createInitialState, { version: 1, freshDaily: true })
  const [screen, setScreen] = useState<ScreenId>('audit')
  const [previewPage, setPreviewPage] = useState<PreviewPageId>('home')
  const [focusIssue, setFocusIssue] = useState<IssueId | null>(null)
  const [focusListings, setFocusListings] = useState(false)
  const [progress, setProgress] = useState<AuditProgress | null>(null)
  const timers = useRef<number[]>([])

  // The audit runs here, not in a screen, so it keeps going when the visitor switches tabs.
  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((t) => window.clearTimeout(t))
  }, [])

  const { site, fixes, audits, keywords } = state
  const latest = audits[audits.length - 1]
  const previous = audits[audits.length - 2]
  const board = issueBoard(audits, site, fixes)
  const expected = expectedScore(site, fixes)

  const go = (id: ScreenId) => {
    setFocusIssue(null)
    setFocusListings(false)
    setScreen(id)
  }

  const runNewAudit = () => {
    if (progress) return
    go('audit')
    // The crawl reads the site as it is now. Changes made while it runs count in the next audit.
    const result = runAudit(site, fixes)
    const pages = site.pages.length
    const before = latest.score
    const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms))
    setProgress({ stage: 'crawl', crawled: 0 })
    for (let crawled = 6, step = 1; ; crawled += 6, step++) {
      const value = Math.min(crawled, pages)
      later(step * CRAWL_STEP_MS, () => setProgress({ stage: 'crawl', crawled: value }))
      if (value === pages) break
    }
    for (const [stage, at] of STAGE_AT) later(at, () => setProgress({ stage, crawled: pages }))
    later(AUDIT_DONE_MS, () => {
      timers.current.splice(0)
      setProgress(null)
      setState((s) => ({ ...s, audits: [...s.audits, auditRecord(uid('audit'), clock(), result, s.site)].slice(-MAX_AUDITS) }))
      const diff = result.score - before
      toast(
        `Audit finished: ${result.score}/100, ${diff ? `${signedChange(diff)} since the last audit` : 'no change since the last audit'}.`,
        diff > 0 ? 'success' : 'info',
      )
    })
  }

  const markFixed = (id: IssueId) => {
    setState((s) => (s.fixes.includes(id) ? s : { ...s, fixes: [...s.fixes, id] }))
    toast('Marked as fixed. Run a new audit to confirm it.', 'success')
  }

  const undoFix = (id: IssueId) => {
    setState((s) => ({ ...s, fixes: s.fixes.filter((f) => f !== id) }))
    toast(`Back on the to-do list: ${ISSUE_TEXT[id].title(board.find((b) => b.id === id)?.found.count ?? 1)}.`, 'info')
  }

  const saveSnippet = (pageId: string, title: string, description: string) => {
    const page = site.pages.find((p) => p.id === pageId)
    setState((s) => ({
      ...s,
      drafted: s.drafted + 1,
      site: { ...s.site, pages: s.site.pages.map((p) => (p.id === pageId ? { ...p, title, description } : p)) },
    }))
    if (title.length > TITLE_LIMIT) toast(`Saved. The title is still over ${TITLE_LIMIT} characters, so the audit will flag it.`, 'warning')
    else if (description.length > DESCRIPTION_LIMIT)
      toast(`Saved. The description is over ${DESCRIPTION_LIMIT} characters, so search results will cut it off.`, 'warning')
    else toast(`Saved the ${page?.name.toLowerCase() ?? ''} page. The next audit will check the new title and description.`, 'success')
  }

  const saveDescriptions = (values: Record<string, string>) => {
    const count = Object.keys(values).length
    setState((s) => ({
      ...s,
      drafted: s.drafted + count,
      site: { ...s.site, pages: s.site.pages.map((p) => (values[p.id] ? { ...p, description: values[p.id] } : p)) },
    }))
    toast(`${count} ${count === 1 ? 'description' : 'descriptions'} saved. The next audit will confirm them.`, 'success')
  }

  const acceptAltText = (count: number) => {
    setState((s) => ({
      ...s,
      drafted: s.drafted + count,
      site: { ...s.site, pages: s.site.pages.map((p) => (p.imagesNoAlt ? { ...p, imagesNoAlt: 0 } : p)) },
    }))
    toast(`Alt text added to ${count} images. The next audit will confirm it.`, 'success')
  }

  const updateListing = (id: ListingId) => {
    const listing = site.listings.find((l) => l.id === id)
    setState((s) => {
      const ref = s.site.listings.find((l) => l.id === 'website')
      if (!ref) return s
      const listings = s.site.listings.map((l) => (l.id === id ? { ...l, name: ref.name, address: ref.address, phone: ref.phone } : l))
      return { ...s, site: { ...s.site, listings } }
    })
    toast(`${listing?.label ?? 'Listing'} marked as updated. The Local score changes after the next audit.`, 'success')
  }

  const addKeyword = (query: string) => {
    const id = uid('kw')
    setState((s) => ({ ...s, keywords: [{ id, query, ...sampleKeyword(query), addedByVisitor: true }, ...s.keywords] }))
    return id
  }

  const removeKeyword = (id: string) => setState((s) => ({ ...s, keywords: s.keywords.filter((k) => k.id !== id) }))

  const highLeft = board.filter((i) => i.impact === 'high' && i.status === 'todo').length
  const highPending = board.filter((i) => i.impact === 'high' && i.status === 'pending').length
  const change = previous ? latest.score - previous.score : 0
  const minutesSaved = latest.pages * MANUAL_PAGE_MINUTES * audits.length + state.drafted * MANUAL_DRAFT_MINUTES

  useDemoMetrics([
    {
      label: 'SEO score',
      value: `${latest.score}/100`,
      detail: change ? `${signedChange(change)} since the previous audit` : 'No change since the previous audit',
    },
    { label: 'High-impact issues', value: num(highLeft), detail: `${highPending} fixed, waiting for the next audit` },
    { label: 'Pages checked', value: num(latest.pages), detail: 'Titles, speed, links, images and local details' },
    { label: 'Audit time saved (est.)', value: hoursLabel(minutesSaved), detail: 'Checking every page by hand' },
  ])

  const screens: DemoScreen<ScreenId>[] = [
    { id: 'audit', label: 'Audit', icon: Gauge, audience: 'team' },
    { id: 'fixes', label: 'Fix list', icon: ListChecks, audience: 'team', badge: highLeft || undefined },
    { id: 'preview', label: 'Search preview', icon: Search, audience: 'team' },
    { id: 'keywords', label: 'Keywords', icon: TrendingUp, audience: 'team' },
  ]

  return (
    <DemoAppShell
      slug={SLUG}
      business={{ name: BUSINESS.name, descriptor: 'SEO dashboard · Bristol, UK', icon: Wrench }}
      accent={ACCENT}
      screens={screens}
      active={screen}
      onChange={go}
      headerRight={
        <span className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 sm:inline-flex">
          <Globe className="size-3.5" aria-hidden="true" />
          {site.domain}
        </span>
      }
    >
      {screen === 'audit' && (
        <AuditScreen
          site={site}
          audits={audits}
          board={board}
          expected={expected}
          progress={progress}
          now={now}
          onRun={runNewAudit}
          onOpenIssue={(id) => {
            go('fixes')
            setFocusIssue(id)
          }}
        />
      )}
      {screen === 'fixes' && (
        <FixListScreen
          site={site}
          board={board}
          fixes={fixes}
          latestScore={latest.score}
          expected={expected}
          running={Boolean(progress)}
          focus={focusIssue}
          onMark={markFixed}
          onUndo={undoFix}
          onRun={runNewAudit}
          onPreview={() => {
            setPreviewPage('home')
            go('preview')
          }}
          onListings={() => {
            go('keywords')
            setFocusListings(true)
          }}
          onSaveDescriptions={saveDescriptions}
          onAcceptAlt={acceptAltText}
        />
      )}
      {screen === 'preview' && <PreviewScreen site={site} pageId={previewPage} onPage={setPreviewPage} onSave={saveSnippet} />}
      {screen === 'keywords' && (
        <KeywordsScreen
          keywords={keywords}
          listings={site.listings}
          focusListings={focusListings}
          onAdd={addKeyword}
          onRemove={removeKeyword}
          onUpdateListing={updateListing}
        />
      )}
    </DemoAppShell>
  )
}
