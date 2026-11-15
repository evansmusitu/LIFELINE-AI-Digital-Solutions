import { Braces, ChevronDown, CircleDashed, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import { clockTime } from '../../lib/format'
import { AppButton } from '../ui'
import { APPS, FLOWS } from './catalog'
import { eventStatus, formatMs, maskDeep, recordFor, summarize, totalMs } from './engine'
import { AppTile, EventStatusBadge, HopBadge, JsonBlock } from './parts'
import type { SyncEvent } from './types'

export interface LiveRun {
  event: SyncEvent
  /** Hops finished so far. */
  step: number
}

export function LiveScreen({ events, live }: { events: SyncEvent[]; live: LiveRun | null }) {
  const [openId, setOpenId] = useState<string | null>(live?.event.id ?? null)
  const sorted = [...events].sort((a, b) => b.at - a.at)
  const hops = events.flatMap((e) => e.hops)
  const failed = hops.filter((h) => h.status === 'failed').length
  const waiting = hops.filter((h) => h.status === 'queued').length

  return (
    <div className="space-y-3 p-3 sm:p-5">
      <p className="text-sm text-slate-700">
        {events.length + (live ? 1 : 0)} events today · {waiting} waiting · {failed} failed · newest first
      </p>
      <ul className="space-y-2">
        {live && (
          <li>
            <EventCard event={live.event} step={live.step} open onToggle={() => {}} />
          </li>
        )}
        {sorted.map((event) => (
          <li key={event.id}>
            <EventCard event={event} open={openId === event.id} onToggle={() => setOpenId(openId === event.id ? null : event.id)} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function EventCard({ event, step, open, onToggle }: { event: SyncEvent; step?: number; open: boolean; onToggle: () => void }) {
  const [technical, setTechnical] = useState(false)
  const running = step !== undefined
  const flow = FLOWS[event.flow]
  const status = running ? 'running' : eventStatus(event)
  const current = running ? event.hops[step] : undefined

  const header = (
    <span className="min-w-0 flex-1">
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-sm font-semibold text-slate-900">{flow.name}</span>
        <EventStatusBadge status={status} />
      </span>
      <span className="mt-0.5 block text-xs break-words text-slate-700">{summarize(event.sample)}</span>
      <span className="mt-0.5 block text-xs text-slate-600 tabular-nums">
        {clockTime(event.at, 'en-US')}
        {!running && ` · ${formatMs(totalMs(event))} in total`}
      </span>
    </span>
  )

  return (
    <article className={cn('overflow-hidden rounded-xl border bg-white shadow-sm', running ? 'border-(--accent)/40 ring-1 ring-(--accent)/20' : 'border-slate-200')}>
      {running ? (
        <div className="flex items-start gap-3 px-4 py-3">{header}</div>
      ) : (
        <button type="button" aria-expanded={open} onClick={onToggle} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50">
          {header}
          <ChevronDown className={cn('mt-1 size-4 shrink-0 text-slate-500 transition', open && 'rotate-180')} aria-hidden="true" />
        </button>
      )}

      {open && (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50 px-3 py-3 sm:px-4">
          {running && (
            <p role="status" className="text-sm font-medium text-(--accent-ink)">
              {current ? `Sending to ${APPS[current.app].name} (${step + 1} of ${event.hops.length})…` : 'Finishing…'}
            </p>
          )}
          <p className="flex items-center gap-2 text-xs text-slate-700">
            <AppTile app={flow.source} size="sm" />
            Received from {APPS[flow.source].name}: {flow.trigger.toLowerCase()}
          </p>
          <ol className="space-y-2">
            {event.hops.map((hop, i) => {
              const done = !running || i < step
              const active = running && i === step
              return (
                <li key={i} className={cn('rounded-lg bg-white px-3 py-2.5 ring-1', active ? 'ring-(--accent)/50' : 'ring-slate-200')}>
                  <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                    <AppTile app={hop.app} size="sm" />
                    <div className="min-w-0 flex-1 basis-40">
                      <p className="text-sm font-medium text-slate-900">
                        {APPS[hop.app].name}: {hop.action}
                      </p>
                      <p className={cn('text-xs', done && hop.status === 'failed' && !hop.resolved ? 'text-red-700' : 'text-slate-700')}>
                        {done ? hop.detail : active ? (hop.status === 'retried' ? 'Busy, retrying…' : 'Sending…') : 'Not sent yet'}
                      </p>
                      {done && hop.resolved && <p className="mt-0.5 text-xs font-medium text-emerald-800">{hop.resolved.note}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {done ? (
                        <>
                          <HopBadge hop={hop} />
                          {hop.status !== 'skipped' && <span className="text-xs text-slate-600 tabular-nums">{formatMs(hop.ms)}</span>}
                        </>
                      ) : active ? (
                        <LoaderCircle className="size-4 text-(--accent) motion-safe:animate-spin" aria-hidden="true" />
                      ) : (
                        <CircleDashed className="size-4 text-slate-500" aria-hidden="true" />
                      )}
                    </div>
                  </div>
                  {technical && done && (
                    <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
                      <JsonBlock label="Request" value={hop.request} />
                      <JsonBlock label="Response" value={hop.response} />
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
          {!running && (
            <>
              <AppButton variant="ghost" size="sm" icon={Braces} aria-expanded={technical} onClick={() => setTechnical(!technical)}>
                {technical ? 'Hide technical details' : 'Show technical details'}
              </AppButton>
              {technical && (
                <JsonBlock label={`What ${APPS[flow.source].name} sent the hub (sensitive values masked)`} value={maskDeep(recordFor(event.sample, event.at, event.number))} />
              )}
            </>
          )}
        </div>
      )}
    </article>
  )
}
