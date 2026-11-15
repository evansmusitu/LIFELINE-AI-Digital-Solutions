import { ArrowRight, Check, CircleCheck, FileText, ImagePlus, MapPin, Play, Type, Undo2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '../../lib/cn'
import { shortDate } from '../../lib/format'
import { AppButton, Badge, Notice } from '../ui'
import { affectedDetails, affectedLabel, ISSUE_TEXT } from './data'
import { CATEGORY_LABEL, IMPACT_ORDER, pointsLabel, type BoardItem } from './engine'
import { AltTextModal, DescriptionsModal } from './FixModals'
import { ImpactBadge } from './parts'
import type { Impact, IssueId, Site } from './types'

interface Props {
  site: Site
  board: BoardItem[]
  fixes: IssueId[]
  latestScore: number
  expected: number
  running: boolean
  /** Issue to scroll to when the screen opens. */
  focus: IssueId | null
  onMark: (id: IssueId) => void
  onUndo: (id: IssueId) => void
  onRun: () => void
  onPreview: () => void
  onListings: () => void
  onSaveDescriptions: (values: Record<string, string>) => void
  onAcceptAlt: (count: number) => void
}

type Filter = 'all' | 'todo' | 'fixed'

const GROUP_TITLE: Record<Impact, string> = { high: 'High impact', medium: 'Medium impact', low: 'Low impact' }

export function FixListScreen(props: Props) {
  const { site, board, latestScore, expected, running, focus, onRun } = props
  const [filter, setFilter] = useState<Filter>('all')
  const [modal, setModal] = useState<'descriptions' | 'alt' | null>(null)

  // Runs after the app shell's own scroll, so the chosen issue ends up in view.
  useEffect(() => {
    if (!focus) return
    const frame = window.requestAnimationFrame(() => document.getElementById(`seo-issue-${focus}`)?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [focus])

  const todo = board.filter((i) => i.status === 'todo')
  const done = board.filter((i) => i.status !== 'todo')
  const pending = board.filter((i) => i.status === 'pending').length
  const shown = filter === 'all' ? board : filter === 'todo' ? todo : done
  const filters: [Filter, string, number][] = [
    ['all', 'All', board.length],
    ['todo', 'To do', todo.length],
    ['fixed', 'Fixed', done.length],
  ]

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs font-medium text-slate-600">Latest audit</p>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{latestScore}</p>
            </div>
            <ArrowRight className="size-5 shrink-0 text-slate-600" aria-hidden="true" />
            <div aria-live="polite" aria-atomic="true">
              <p className="text-xs font-medium text-slate-600">Expected score after the next audit</p>
              <p className="text-2xl font-bold text-(--accent-ink) tabular-nums">{expected}</p>
            </div>
          </div>
          <p className="min-w-0 flex-1 text-sm text-slate-700">
            {pending
              ? `${pending} ${pending === 1 ? 'fix is' : 'fixes are'} waiting. Run a new audit to confirm and update your score.`
              : 'Fix the issues below and watch the expected score go up. A new audit confirms each fix.'}
          </p>
          <AppButton icon={Play} onClick={onRun} disabled={running} className="w-full sm:w-auto">
            {running ? 'Auditing…' : 'Run a new audit'}
          </AppButton>
        </div>
      </section>

      <div role="group" aria-label="Show issues" className="flex flex-wrap gap-1.5">
        {filters.map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
            className={cn(
              'h-10 rounded-full px-4 text-sm font-semibold transition',
              filter === id ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100',
            )}
          >
            {label} <span className="tabular-nums">({count})</span>
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <Notice tone={filter === 'todo' ? 'green' : 'neutral'} icon={filter === 'todo' ? CircleCheck : undefined}>
          {filter === 'todo'
            ? `Nothing left to do.${pending ? ' Run a new audit to confirm your fixes.' : ''}`
            : 'No fixes yet. Start with the high-impact issues.'}
        </Notice>
      )}

      {IMPACT_ORDER.map((impact) => {
        const items = shown.filter((i) => i.impact === impact)
        if (!items.length) return null
        return (
          <section key={impact} aria-labelledby={`seo-group-${impact}`}>
            <h3 id={`seo-group-${impact}`} className="mb-2 text-sm font-semibold text-slate-900">
              {GROUP_TITLE[impact]} <span className="font-normal text-slate-600">({items.length})</span>
            </h3>
            <ul className="space-y-3">
              {items.map((item) => (
                <IssueCard key={item.id} item={item} {...props} onDescriptions={() => setModal('descriptions')} onAlt={() => setModal('alt')} />
              ))}
            </ul>
          </section>
        )
      })}

      {modal === 'descriptions' && (
        <DescriptionsModal
          site={site}
          onClose={() => setModal(null)}
          onSave={(values) => {
            props.onSaveDescriptions(values)
            setModal(null)
          }}
        />
      )}
      {modal === 'alt' && (
        <AltTextModal
          site={site}
          onClose={() => setModal(null)}
          onAccept={(count) => {
            props.onAcceptAlt(count)
            setModal(null)
          }}
        />
      )}
    </div>
  )
}

function IssueCard({
  item,
  site,
  fixes,
  onMark,
  onUndo,
  onPreview,
  onListings,
  onDescriptions,
  onAlt,
}: Props & { item: BoardItem; onDescriptions: () => void; onAlt: () => void }) {
  const text = ISSUE_TEXT[item.id]
  const details = item.status === 'todo' ? affectedDetails(site, item.found) : []
  const partial = item.status === 'todo' && item.left < item.found.count

  const action = () => {
    switch (text.action) {
      case 'preview':
        return (
          <AppButton icon={Type} onClick={onPreview}>
            {item.found.pages.includes('/') ? 'Fix the home page title' : 'Open Search preview'}
          </AppButton>
        )
      case 'descriptions':
        return (
          <AppButton icon={FileText} onClick={onDescriptions}>
            Write missing descriptions
          </AppButton>
        )
      case 'alt':
        return (
          <AppButton icon={ImagePlus} onClick={onAlt}>
            Add alt text
          </AppButton>
        )
      case 'listings':
        return (
          <AppButton icon={MapPin} onClick={onListings}>
            Check listings
          </AppButton>
        )
      default:
        return (
          <AppButton
            variant="secondary"
            icon={Check}
            onClick={() => onMark(item.id)}
            aria-label={`Mark as fixed: ${text.title(item.found.count)}`}
          >
            Mark as fixed
          </AppButton>
        )
    }
  }

  return (
    <li
      id={`seo-issue-${item.id}`}
      tabIndex={-1}
      className={cn(
        'scroll-mt-4 rounded-xl border bg-white p-4 shadow-sm outline-none focus:ring-2 focus:ring-(--accent)/50',
        item.status === 'todo' ? 'border-slate-200' : 'border-emerald-200',
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <ImpactBadge impact={item.impact} />
        <Badge>{CATEGORY_LABEL[item.category]}</Badge>
        {item.status === 'todo' && <Badge tone="accent">{pointsLabel(item.gain)}</Badge>}
      </div>
      <h4 className="mt-2 text-sm font-semibold text-slate-900">{text.title(item.found.count)}</h4>
      <p className="mt-0.5 text-xs text-slate-600">
        Affected: {affectedLabel(site, item.found)}
        {partial && ` · ${item.left} still to fix`}
      </p>

      {item.status === 'todo' && (
        <>
          <p className="mt-2.5 text-sm text-slate-700">
            <span className="font-semibold text-slate-900">Why it matters: </span>
            {text.why}
          </p>
          <div className="mt-2.5 text-sm">
            <p className="font-semibold text-slate-900">How to fix</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-slate-700">
              {text.how.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
          {details.length > 0 && (
            <details className="mt-2.5 text-sm">
              <summary className="cursor-pointer text-xs font-semibold text-(--accent-ink)">Show the details ({details.length})</summary>
              <ul className="mt-1.5 space-y-0.5 pl-1 text-xs break-words text-slate-700">
                {details.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {item.status === 'todo' && action()}
        {item.status === 'pending' && (
          <>
            <Badge tone="green" icon={CircleCheck}>
              Fixed · confirm with a new audit
            </Badge>
            {fixes.includes(item.id) && (
              <AppButton
                variant="ghost"
                icon={Undo2}
                onClick={() => onUndo(item.id)}
                aria-label={`Undo: ${text.title(item.found.count)}`}
              >
                Undo
              </AppButton>
            )}
          </>
        )}
        {item.status === 'fixed' && (
          <Badge tone="green" icon={CircleCheck}>
            Fixed{item.confirmedAt ? ` · confirmed ${shortDate(item.confirmedAt)}` : ''}
          </Badge>
        )}
      </div>
    </li>
  )
}
