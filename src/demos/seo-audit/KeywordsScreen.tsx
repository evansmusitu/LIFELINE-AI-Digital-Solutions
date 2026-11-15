import {
  ArrowDown,
  ArrowUp,
  Check,
  CircleCheck,
  Hash,
  LoaderCircle,
  Minus,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { cn } from '../../lib/cn'
import { num } from '../../lib/format'
import { td, th } from '../styles'
import { AppButton, Badge, Panel, Stat, TextInput } from '../ui'
import { cleanText, listingMismatches, positionChange, type ListingField } from './engine'
import { Sparkline } from './parts'
import type { Keyword, Listing, ListingId } from './types'

interface Props {
  keywords: Keyword[]
  listings: Listing[]
  /** Scroll to the listing check when the screen opens. */
  focusListings: boolean
  onAdd: (query: string) => string
  onRemove: (id: string) => void
  onUpdateListing: (id: ListingId) => void
}

const CHECK_MS = 1000
const MAX_TRACKED = 15
const FIELDS: [ListingField, string][] = [
  ['name', 'Name'],
  ['address', 'Address'],
  ['phone', 'Phone'],
]

function Change({ keyword }: { keyword: Keyword }) {
  const change = positionChange(keyword.history)
  const Icon = change.direction === 'up' ? ArrowUp : change.direction === 'down' ? ArrowDown : Minus
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-sm whitespace-nowrap',
        change.direction === 'up' ? 'text-emerald-800' : change.direction === 'down' ? 'text-red-700' : 'text-slate-600',
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {change.text}
    </span>
  )
}

function Position({ keyword, checking }: { keyword: Keyword; checking: boolean }) {
  if (checking)
    return (
      <span role="status" className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap text-slate-700">
        <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />
        Checking position…
      </span>
    )
  if (keyword.position === null) return <Badge>Not in top 50</Badge>
  return (
    <span className="text-lg font-bold text-slate-900 tabular-nums">
      <span className="sr-only">Position </span>
      {keyword.position}
    </span>
  )
}

export function KeywordsScreen({ keywords, listings, focusListings, onAdd, onRemove, onUpdateListing }: Props) {
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  useEffect(() => {
    if (!focusListings) return
    const frame = window.requestAnimationFrame(() => document.getElementById('seo-listings')?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [focusListings])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const clean = cleanText(query).toLowerCase()
    if (!clean) return setError('Type a search people might use, for example “plumber bishopston”.')
    if (clean.length > 60) return setError('Keep it under 60 characters.')
    if (keywords.some((k) => k.query === clean)) return setError('You’re already tracking that search.')
    if (keywords.length >= MAX_TRACKED) return setError(`This demo tracks up to ${MAX_TRACKED} searches. Remove one first.`)
    setError('')
    setQuery('')
    setChecking(onAdd(clean))
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setChecking(null), CHECK_MS)
  }

  const settled = keywords.filter((k) => k.id !== checking)
  const ranked = settled.filter((k) => k.position !== null)
  const average = ranked.length ? Math.round(ranked.reduce((sum, k) => sum + (k.position ?? 0), 0) / ranked.length) : null
  const up = settled.filter((k) => positionChange(k.history).direction === 'up').length
  const mismatches = listingMismatches(listings)

  const remove = (keyword: Keyword) =>
    keyword.addedByVisitor && (
      <button
        type="button"
        onClick={() => onRemove(keyword.id)}
        aria-label={`Stop tracking ${keyword.query}`}
        className="grid size-10 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    )

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Search} label="Tracked searches" value={settled.length} tone="accent" />
        <Stat icon={Trophy} label="In the top 10" value={ranked.filter((k) => (k.position ?? 99) <= 10).length} tone="green" />
        <Stat icon={Hash} label="Average position" value={average ?? '–'} detail="Searches in the top 50" />
        <Stat icon={TrendingUp} label="Moved up" value={up} detail="Over the last 8 weeks" />
      </div>

      <Panel title="Local searches" description="Where avonmereplumbing.co.uk shows up for searches in and around Bristol.">
        <form onSubmit={submit} noValidate className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="seo-keyword" className="sr-only">
            Track a new search
          </label>
          <TextInput
            id="seo-keyword"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setError('')
            }}
            placeholder="Track a new search, e.g. plumber bishopston"
            maxLength={80}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'seo-keyword-error' : undefined}
            className="min-w-0 sm:flex-1"
          />
          <AppButton type="submit" icon={Plus} className="shrink-0">
            Track
          </AppButton>
        </form>
        {error && (
          <p id="seo-keyword-error" className="mt-1.5 text-xs font-medium text-red-700">
            {error}
          </p>
        )}

        <ul className="mt-4 divide-y divide-slate-100 md:hidden">
          {keywords.map((k) => (
            <li key={k.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium break-words text-slate-900">{k.query}</p>
                {k.id !== checking && (
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Change keyword={k} />
                    <span className="text-xs text-slate-600">{num(k.monthly)} searches a month</span>
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Position keyword={k} checking={k.id === checking} />
                {k.id !== checking && <Sparkline history={k.history} />}
              </div>
              {remove(k)}
            </li>
          ))}
        </ul>

        <div className="mt-4 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[36rem]">
            <thead className="bg-slate-50">
              <tr>
                <th className={th}>Search</th>
                <th className={th}>Position now</th>
                <th className={th}>Last 8 weeks</th>
                <th className={cn(th, 'text-right')}>Searches a month</th>
                <th className={th}>Trend</th>
                <th className={th}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {keywords.map((k) => (
                <tr key={k.id}>
                  <td className={cn(td, 'font-medium text-slate-900')}>{k.query}</td>
                  <td className={td}>
                    <Position keyword={k} checking={k.id === checking} />
                  </td>
                  <td className={td}>{k.id !== checking && <Change keyword={k} />}</td>
                  <td className={cn(td, 'text-right tabular-nums')}>{k.id !== checking && num(k.monthly)}</td>
                  <td className={td}>{k.id !== checking && <Sparkline history={k.history} />}</td>
                  <td className={cn(td, 'text-right')}>{remove(k)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-600">Positions and search volumes are sample figures for this demo.</p>
      </Panel>

      <div id="seo-listings" tabIndex={-1} className="scroll-mt-4 rounded-xl outline-none focus:ring-2 focus:ring-(--accent)/50">
        <Panel title="Local listing check" description="Are your business name, address and phone the same everywhere?">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {listings.map((listing) => {
              const fields = mismatches.find((m) => m.id === listing.id)?.fields ?? []
              return (
                <li key={listing.id} className={cn('rounded-lg border p-3', fields.length ? 'border-amber-300' : 'border-slate-200')}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{listing.label}</p>
                    {listing.id === 'website' ? (
                      <Badge tone="blue">Your reference</Badge>
                    ) : fields.length ? (
                      <Badge tone="amber" icon={TriangleAlert}>
                        Doesn’t match
                      </Badge>
                    ) : (
                      <Badge tone="green" icon={CircleCheck}>
                        Matches
                      </Badge>
                    )}
                  </div>
                  <dl className="mt-2 space-y-1 text-sm">
                    {FIELDS.map(([field, label]) => {
                      const differs = fields.includes(field)
                      return (
                        <div key={field} className="flex gap-2">
                          <dt className="w-16 shrink-0 pt-px text-xs text-slate-600">{label}</dt>
                          <dd
                            className={cn(
                              'flex min-w-0 items-start gap-1 break-words',
                              differs ? 'font-semibold text-amber-900' : 'text-slate-800',
                            )}
                          >
                            {differs && <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />}
                            <span className="min-w-0">
                              {listing[field]}
                              {differs && <span className="sr-only"> (different from your website)</span>}
                            </span>
                          </dd>
                        </div>
                      )
                    })}
                  </dl>
                  {fields.length > 0 && (
                    <AppButton
                      variant="secondary"
                      icon={Check}
                      onClick={() => onUpdateListing(listing.id)}
                      aria-label={`Mark as updated: ${listing.label}`}
                      className="mt-3 w-full sm:w-auto"
                    >
                      Mark as updated
                    </AppButton>
                  )}
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-xs text-slate-600">
            You change the details on each listing site. Marking it here records that it’s done, and the Local score changes after the
            next audit.
          </p>
        </Panel>
      </div>
    </div>
  )
}
