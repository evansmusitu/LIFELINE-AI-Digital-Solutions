import { ArrowRight, CircleCheck, Globe, MapPin, Phone } from 'lucide-react'
import { useState } from 'react'
import { WhatsAppIcon } from '../../components/WhatsAppIcon'
import { cn } from '../../lib/cn'
import { relativeTime } from '../../lib/format'
import { AppButton, Avatar, Badge, Notice } from '../ui'
import { STATUS_ACTION, STATUS_FLOW, countByStatus } from './engine'
import { SourceLabel, StatusBadge } from './parts'
import type { Enquiry, EnquiryStatus } from './types'

type Filter = EnquiryStatus | 'All'

interface Props {
  enquiries: Enquiry[]
  now: number
  onAdvance: (id: string) => void
  onWhatsApp: (enquiry: Enquiry) => void
  onOpenSite: () => void
}

export function EnquiriesScreen({ enquiries, now, onAdvance, onWhatsApp, onOpenSite }: Props) {
  const [filter, setFilter] = useState<Filter>('All')
  const counts = countByStatus(enquiries)
  const shown = [...enquiries].filter((e) => filter === 'All' || e.status === filter).sort((a, b) => b.at - a.at)
  const mine = enquiries.some((e) => e.mine)

  return (
    <div className="space-y-4 p-3 sm:p-5">
      {!mine && (
        <Notice tone="accent" icon={Globe}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="min-w-0 flex-1 basis-56">Send an enquiry from the new site and watch it arrive here, with a name, phone number and area.</p>
            <AppButton size="sm" onClick={onOpenSite}>
              Open the New site
            </AppButton>
          </div>
        </Notice>
      )}

      <section aria-labelledby="enq-title" className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 id="enq-title" className="text-sm font-semibold text-slate-900">
            Enquiries from the new site
          </h3>
          <p className="mt-0.5 text-xs text-slate-600">Newest first. Move each one forward as you follow it up.</p>
        </div>
        <div className="no-scrollbar relative flex gap-1.5 overflow-x-auto border-b border-slate-100 p-3" role="group" aria-label="Filter by status">
          {(['All', ...STATUS_FLOW] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition',
                filter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
              )}
            >
              {f} <span className="tabular-nums opacity-80">{counts[f]}</span>
            </button>
          ))}
        </div>

        <ul className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-2">
          {shown.map((e) => {
            const action = STATUS_ACTION[e.status]
            return (
              <li key={e.id} className={cn('flex flex-col rounded-xl border p-4', e.mine ? 'border-(--accent)/50 bg-(--accent-soft)/40' : 'border-slate-200')}>
                <div className="flex items-start gap-3">
                  <Avatar name={e.name} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold break-words text-slate-900">{e.name}</span>
                      <StatusBadge status={e.status} />
                      {e.mine && <Badge tone="accent">From you</Badge>}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      {e.ref} · {relativeTime(e.at, now)}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm font-medium text-slate-900">{e.need}</p>
                {e.message && <p className="mt-1 line-clamp-3 text-sm text-slate-700">“{e.message}”</p>}
                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                  <li className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" aria-hidden="true" />
                    {e.area}
                  </li>
                  <li className="inline-flex items-center gap-1 whitespace-nowrap">
                    <Phone className="size-3.5" aria-hidden="true" />
                    {e.phone}
                  </li>
                  <li>
                    <SourceLabel source={e.source} />
                  </li>
                </ul>
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                  {action ? (
                    <AppButton icon={ArrowRight} onClick={() => onAdvance(e.id)} aria-label={`${action}: ${e.name}`}>
                      {action}
                    </AppButton>
                  ) : (
                    <span className="inline-flex h-10 items-center gap-1.5 text-sm font-medium text-emerald-800">
                      <CircleCheck className="size-4" aria-hidden="true" />
                      Quote sent
                    </span>
                  )}
                  <AppButton variant="secondary" onClick={() => onWhatsApp(e)} aria-label={`WhatsApp them: ${e.name}`}>
                    <WhatsAppIcon className="size-4" />
                    WhatsApp them
                  </AppButton>
                </div>
              </li>
            )
          })}
        </ul>
        {shown.length === 0 && <p className="px-4 pb-8 text-center text-sm text-slate-600">No enquiries with this status right now.</p>}
      </section>
    </div>
  )
}
