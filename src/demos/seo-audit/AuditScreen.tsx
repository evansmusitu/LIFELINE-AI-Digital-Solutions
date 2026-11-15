import { ChevronRight, CircleCheck, Globe, ListChecks, LoaderCircle, Play } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { WhatsAppIcon } from '../../components/WhatsAppIcon'
import { cn } from '../../lib/cn'
import { clockTime, dayAndTime, shortDate } from '../../lib/format'
import { DAY, isSameDay } from '../../lib/time'
import { whatsappUrl } from '../../lib/whatsapp'
import { appButton } from '../styles'
import { AppButton, Badge, Notice, Panel, TextInput } from '../ui'
import { affectedLabel, ISSUE_TEXT } from './data'
import {
  CATEGORIES,
  CATEGORY_LABEL,
  normaliseUrl,
  pointsLabel,
  RULE_BY_ID,
  signedChange,
  topFixes,
  type BoardItem,
} from './engine'
import { ScoreBadge, ScoreRing } from './parts'
import type { AuditProgress, AuditRecord, IssueId, Site } from './types'

interface Props {
  site: Site
  audits: AuditRecord[]
  board: BoardItem[]
  expected: number
  progress: AuditProgress | null
  now: number
  onRun: () => void
  onOpenIssue: (id: IssueId | null) => void
}

const STAGES: { id: AuditProgress['stage']; label: string; share: number }[] = [
  { id: 'crawl', label: 'Crawl pages', share: 0 },
  { id: 'titles', label: 'Titles and descriptions', share: 0.6 },
  { id: 'speed', label: 'Mobile speed', share: 0.76 },
  { id: 'local', label: 'Local details', share: 0.9 },
]

function stageText(progress: AuditProgress, pages: number): string {
  switch (progress.stage) {
    case 'crawl':
      return `Crawling pages… ${progress.crawled} of ${pages}`
    case 'titles':
      return 'Checking titles and descriptions…'
    case 'speed':
      return 'Testing mobile speed…'
    default:
      return 'Checking local details…'
  }
}

export function AuditScreen({ site, audits, board, expected, progress, now, onRun, onOpenIssue }: Props) {
  const latest = audits[audits.length - 1]
  const previous = audits[audits.length - 2]
  const pages = site.pages.length
  const running = Boolean(progress)
  const top = topFixes(board)
  const todo = board.filter((i) => i.status === 'todo').length
  const pending = board.filter((i) => i.status === 'pending').length
  const since = !previous
    ? ''
    : isSameDay(previous.at, now)
      ? `the audit at ${clockTime(previous.at)}`
      : isSameDay(previous.at, now - DAY)
        ? 'yesterday'
        : shortDate(previous.at)
  const stageIndex = progress ? STAGES.findIndex((s) => s.id === progress.stage) : -1
  const share = progress
    ? progress.stage === 'crawl'
      ? (progress.crawled / pages) * STAGES[1].share
      : STAGES[stageIndex].share
    : 0

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <Panel title="Website audit" description="Checks every page for what decides where you show up in local searches.">
        <label htmlFor="seo-url" className="mb-1 block text-xs font-semibold text-slate-700">
          Website address
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Globe className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-600" aria-hidden="true" />
            <TextInput id="seo-url" value={site.domain} readOnly aria-describedby="seo-url-note" className="bg-slate-50 pl-9" />
          </div>
          <AppButton onClick={onRun} disabled={running} className="w-full sm:w-auto">
            {running ? (
              <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />
            ) : (
              <Play className="size-4" aria-hidden="true" />
            )}
            {running ? 'Auditing…' : 'Run a new audit'}
          </AppButton>
        </div>
        <p id="seo-url-note" className="mt-1.5 text-xs text-slate-600">
          This demo audits a sample site. It can’t check other websites.
        </p>

        {/* Always mounted, so screen readers announce the first step too. */}
        <p role="status" className="sr-only">
          {progress ? stageText(progress, pages) : ''}
        </p>
        {progress && (
          <div className="mt-4 rounded-lg border border-(--accent)/30 bg-(--accent-soft) p-3" aria-hidden="true">
            <p className="flex items-center gap-2 text-sm font-semibold text-(--accent-ink)">
              <LoaderCircle className="size-4 shrink-0 motion-safe:animate-spin" aria-hidden="true" />
              {stageText(progress, pages)}
            </p>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-(--accent) motion-safe:transition-[width] motion-safe:duration-300"
                style={{ width: `${Math.round(share * 100)}%` }}
              />
            </div>
            <ol className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-4">
              {STAGES.map((stage, index) => (
                <li
                  key={stage.id}
                  className={cn('flex items-center gap-1.5', index <= stageIndex ? 'text-(--accent-ink)' : 'text-slate-600')}
                >
                  {index < stageIndex ? (
                    <CircleCheck className="size-3.5 shrink-0" />
                  ) : (
                    <span className={cn('size-2 shrink-0 rounded-full', index === stageIndex ? 'bg-(--accent)' : 'bg-slate-300')} />
                  )}
                  {stage.label}
                </li>
              ))}
            </ol>
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Panel
          title="Latest audit"
          description={`${dayAndTime(latest.at, now)} · ${latest.pages} pages checked`}
        >
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <ScoreRing key={latest.id} score={latest.score} />
            <div className="min-w-0 text-center sm:text-left">
              <p className="flex flex-wrap items-center justify-center gap-2 text-sm font-semibold text-slate-900 sm:justify-start">
                SEO score <ScoreBadge score={latest.score} />
              </p>
              {previous && (
                <p className="mt-1 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">{signedChange(latest.score - previous.score)}</span> since {since}
                </p>
              )}
              <p className="mt-1 text-sm text-slate-700">
                {todo} {todo === 1 ? 'issue' : 'issues'} to fix
                {pending > 0 && ` · ${pending} fixed, waiting for the next audit`}
              </p>
              {pending > 0 && (
                <p className="mt-1 text-sm text-slate-700">
                  Expected after the next audit: <span className="font-semibold text-(--accent-ink)">{expected}</span>
                </p>
              )}
            </div>
          </div>

          <h4 className="mt-5 text-xs font-semibold tracking-wide text-slate-600 uppercase">Scores by area</h4>
          <ul className="mt-2 space-y-3">
            {CATEGORIES.map((cat) => {
              const score = latest.categories[cat.id]
              const found = latest.issues.filter((i) => RULE_BY_ID[i.id].category === cat.id).length
              const note = cat.id === 'speed' ? `Home page loads in ${latest.homeLoad.toFixed(1)} s on phones` : cat.about
              return (
                <li key={cat.id}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium text-slate-800">{cat.label}</span>
                    <span className="font-semibold text-slate-900 tabular-nums">{score}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                    <div
                      className="h-full rounded-full bg-(--accent) motion-safe:transition-[width] motion-safe:duration-700"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    {note} · {found ? `${found} ${found === 1 ? 'issue' : 'issues'} found` : 'no issues found'}
                  </p>
                </li>
              )
            })}
          </ul>
        </Panel>

        <div className="space-y-4">
          <Panel
            title="Top 5 fixes by impact"
            description="The changes that should lift your score the most."
            action={
              <AppButton variant="secondary" size="sm" icon={ListChecks} onClick={() => onOpenIssue(null)}>
                Fix list
              </AppButton>
            }
          >
            {top.length === 0 ? (
              <Notice tone="green" icon={CircleCheck} title="Nothing left to fix">
                {pending ? 'Run a new audit to confirm your fixes.' : 'Every issue from the latest audit is fixed.'}
              </Notice>
            ) : (
              <ol className="space-y-2">
                {top.map((item, index) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onOpenIssue(item.id)}
                      className="flex w-full items-start gap-3 rounded-lg border border-slate-200 p-3 text-left transition hover:border-(--accent)/50 hover:bg-(--accent-soft)"
                    >
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-(--accent-soft) text-xs font-bold text-(--accent-ink)">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-900">{ISSUE_TEXT[item.id].title(item.found.count)}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                          <Badge tone="accent">{pointsLabel(item.gain)}</Badge>
                          <span>
                            {CATEGORY_LABEL[item.category]} · {affectedLabel(site, item.found)}
                          </span>
                        </span>
                      </span>
                      <ChevronRight className="mt-0.5 size-4 shrink-0 text-slate-600" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel title="Audit history">
            <ul className="divide-y divide-slate-100">
              {audits
                .map((audit, index) => ({ audit, change: index ? audit.score - audits[index - 1].score : null }))
                .reverse()
                .slice(0, 5)
                .map(({ audit, change }) => (
                  <li key={audit.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 text-slate-700">{dayAndTime(audit.at, now)}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      {change !== null && <span className="text-xs text-slate-600">{signedChange(change)}</span>}
                      <span className="w-8 text-right font-semibold text-slate-900 tabular-nums">{audit.score}</span>
                    </span>
                  </li>
                ))}
            </ul>
          </Panel>
        </div>
      </div>

      <RealAuditCta />
    </div>
  )
}

/** LIFELINE's own offer, kept visually apart from the sample business's app. */
function RealAuditCta() {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const link = useRef<HTMLAnchorElement>(null)
  const url = normaliseUrl(value)
  const message = url
    ? `Hi LIFELINE AI CONCIERGE, I tried your SEO audit demo. Could you check my website: ${url}?`
    : 'Hi LIFELINE AI CONCIERGE, I tried your SEO audit demo. Could you check my website?'

  const validate = () => {
    if (url) return true
    setError(
      value.trim()
        ? 'That doesn’t look like a website address. Try something like yourbusiness.com.'
        : 'Enter your website address, for example yourbusiness.com.',
    )
    return false
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (validate()) link.current?.click()
  }

  return (
    <section aria-labelledby="seo-cta-title" className="rounded-xl bg-slate-900 p-4 text-white shadow-sm sm:p-5">
      <p className="text-xs font-semibold tracking-wide text-slate-300 uppercase">From LIFELINE AI CONCIERGE</p>
      <h3 id="seo-cta-title" className="mt-1 text-base font-semibold">
        Want a real audit of your own website?
      </h3>
      <p className="mt-1 text-sm text-slate-300">Send us your address on WhatsApp and we’ll check it for you.</p>
      <form onSubmit={submit} noValidate className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="seo-cta-url" className="sr-only">
          Your website address
        </label>
        <TextInput
          id="seo-cta-url"
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder="yourbusiness.com"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError('')
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'seo-cta-url-error' : undefined}
          className="min-w-0 sm:flex-1"
        />
        <a
          ref={link}
          href={whatsappUrl(message)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => {
            if (!validate()) event.preventDefault()
          }}
          className={appButton('success', 'md', 'shrink-0')}
        >
          <WhatsAppIcon className="size-4 shrink-0" />
          Ask LIFELINE on WhatsApp
          <span className="sr-only"> (opens WhatsApp)</span>
        </a>
      </form>
      {error && (
        <p id="seo-cta-url-error" className="mt-2 text-sm font-medium text-red-300">
          {error}
        </p>
      )}
    </section>
  )
}
