import { Check, Globe, Inbox } from 'lucide-react'
import { cn } from '../../lib/cn'
import { AppButton, Badge, Notice, Panel } from '../ui'
import { RESULTS } from './data'
import { countBySource } from './engine'
import { SourceLabel } from './parts'
import type { Enquiry, EnquirySource, ResultRow } from './types'

const SOURCES: EnquirySource[] = ['Form', 'WhatsApp button', 'Call button']

function MeasureBar({ label, value, max, text, better }: { label: string; value: number; max: number; text: string; better: boolean }) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-2 text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="flex items-center gap-1.5">
          {better && (
            <Badge tone="green" icon={Check}>
              Better
            </Badge>
          )}
          <span className="font-semibold text-slate-900 tabular-nums">{text}</span>
        </span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-slate-100" aria-hidden="true">
        <div className={cn('h-full rounded-full', better ? 'bg-(--accent)' : 'bg-slate-400')} style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </div>
    </div>
  )
}

function Row({ row }: { row: ResultRow }) {
  const max = Math.max(row.before, row.after)
  const afterBetter = row.better === 'lower' ? row.after < row.before : row.after > row.before
  return (
    <li className="grid grid-cols-1 gap-x-6 gap-y-2 py-3.5 md:grid-cols-[15rem_minmax(0,1fr)]">
      <div>
        <p className="text-sm font-semibold text-slate-900">{row.label}</p>
        <p className="text-xs text-slate-600">{row.hint}</p>
      </div>
      <div className="space-y-2">
        <MeasureBar label="Old site" value={row.before} max={max} text={row.beforeLabel} better={!afterBetter} />
        <MeasureBar label="New site" value={row.after} max={max} text={row.afterLabel} better={afterBetter} />
      </div>
    </li>
  )
}

export function ResultsScreen({ enquiries, onOpenSite }: { enquiries: Enquiry[]; onOpenSite: () => void }) {
  const bySource = countBySource(enquiries)
  const mine = enquiries.filter((e) => e.mine).length
  const most = Math.max(1, ...SOURCES.map((s) => bySource[s]))

  return (
    <div className="grid grid-cols-1 gap-4 p-3 sm:p-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <Panel title="Old site and new site, measured" description="Measurements of the sample sites in this demo.">
        <ul className="-my-3.5 divide-y divide-slate-100">
          {RESULTS.map((row) => (
            <Row key={row.label} row={row} />
          ))}
        </ul>
      </Panel>

      <div className="space-y-4">
        <Panel title="Enquiries through the new site in this demo" description="By the button or form they came from.">
          <p className="text-3xl font-bold text-slate-900 tabular-nums">{enquiries.length}</p>
          <p className="text-sm text-slate-600">{mine ? `${mine} sent by you in this visit` : 'None from you yet'}</p>
          <ul className="mt-4 space-y-3">
            {SOURCES.map((source) => (
              <li key={source}>
                <div className="flex justify-between text-sm text-slate-800">
                  <SourceLabel source={source} />
                  <span className="font-semibold tabular-nums">{bySource[source]}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-slate-100" aria-hidden="true">
                  <div className="h-full rounded-full bg-(--accent) motion-safe:transition-[width]" style={{ width: `${(bySource[source] / most) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          {mine === 0 && (
            <AppButton variant="secondary" icon={Globe} onClick={onOpenSite} className="mt-4 w-full">
              Try the new site
            </AppButton>
          )}
        </Panel>
        <Notice icon={Inbox} tone="accent">
          Every enquiry lands in one inbox with a name, phone number and area, whichever button the customer used.
        </Notice>
      </div>
    </div>
  )
}
