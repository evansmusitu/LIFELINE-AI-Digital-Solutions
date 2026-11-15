import { BellRing, CircleCheck, CircleX, History, LoaderCircle, RotateCw, TriangleAlert, Zap, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import { clockTime, dayAndTime, pct } from '../../lib/format'
import { AppButton, Badge, Panel, Segmented } from '../ui'
import { LODGE, OUTAGE_SITE, PEOPLE, SITE_IDS, SITES } from './data'
import { OUTAGE_SECONDS, averageMs, formatSeconds, responseNow, type Summary } from './engine'
import { HourlyChart, RegionPills, StatusBadge, WhatsAppBubble } from './parts'
import type { Incident, OutageRun, Region, SiteId, SiteStatus } from './types'

interface Props {
  summary: Summary
  incidents: Incident[]
  /** Booking site status during the outage playback. */
  live: { status: SiteStatus; regionsDown: Region[] }
  outage: OutageRun | null
  now: number
  onSimulate: () => void
}

/** Icon for each outage step, in timeline order. */
const STEP_ICONS: { icon: LucideIcon; className: string }[] = [
  { icon: TriangleAlert, className: 'text-amber-700' },
  { icon: CircleX, className: 'text-red-700' },
  { icon: BellRing, className: 'text-(--accent-ink)' },
  { icon: RotateCw, className: 'text-(--accent-ink)' },
  { icon: CircleCheck, className: 'text-emerald-700' },
]

export function UptimeScreen({ summary, incidents, live, outage, now, onSimulate }: Props) {
  const [chartSite, setChartSite] = useState<SiteId>('booking')
  const running = outage !== null && !outage.done
  const points = summary.series[chartSite]
  const slowest = points.reduce((a, b) => (b.value > a.value ? b : a), points[0])
  const history = [...incidents].sort((a, b) => b.startedAt - a.startedAt)

  const statusOf = (id: SiteId): SiteStatus => (id === OUTAGE_SITE ? live.status : 'up')
  const whatsappTo = outage?.recipients.whatsapp
    .map((id) => PEOPLE.find((p) => p.id === id))
    .map((p) => (p ? `${p.name}${p.whatsapp ? ` · ${p.whatsapp}` : ''}` : ''))
    .join(', ')

  return (
    <div className="grid grid-cols-1 gap-4 p-3 sm:p-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Panel title="Your sites" description="Checked every minute from 4 places" className="lg:col-start-1">
        <ul className="divide-y divide-slate-100">
          {SITE_IDS.map((id) => {
            const site = SITES[id]
            const status = statusOf(id)
            return (
              <li key={id} className="space-y-2 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="font-semibold text-slate-900">{site.name}</p>
                  <StatusBadge status={status} />
                </div>
                <p className="text-sm break-all text-slate-700">{site.url}</p>
                <dl className="grid grid-cols-2 gap-3 text-sm sm:max-w-sm">
                  <div>
                    <dt className="text-xs text-slate-600">Response now</dt>
                    <dd className="font-semibold text-slate-900 tabular-nums">
                      {status === 'up' ? `${responseNow(site, now)} ms` : 'No reply'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-600">Uptime, 30 days</dt>
                    <dd className="font-semibold text-slate-900 tabular-nums">{pct(summary.uptimeBySite[id], 2)}</dd>
                  </div>
                </dl>
                <RegionPills down={id === OUTAGE_SITE ? live.regionsDown : []} />
              </li>
            )
          })}
        </ul>
      </Panel>

      <Panel
        title="Test the alerts"
        description="Plays a short outage on the booking site: detection, alert, automatic restart and recovery."
        className="self-start lg:col-start-2 lg:row-span-3 lg:row-start-1"
      >
        <AppButton icon={running ? LoaderCircle : Zap} onClick={onSimulate} disabled={running} className="w-full">
          {running ? 'Outage in progress…' : 'Simulate an outage'}
        </AppButton>
        <p className="mt-2 text-xs text-slate-600">Simulated outage. Times are shortened for the demo.</p>

        {outage && (
          <ol className="mt-4 space-y-3" aria-live="polite">
            {outage.timeline.slice(0, outage.shown).map((step, i) => {
              const current = running && i === outage.shown - 1
              const { icon: Icon, className } = STEP_ICONS[i] ?? STEP_ICONS[0]
              return (
                <li key={i} className="motion-safe:animate-fade-up">
                  <div className="flex gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100">
                      {current && i > 0 ? (
                        <LoaderCircle className="size-4 text-(--accent-ink) motion-safe:animate-spin" aria-hidden="true" />
                      ) : (
                        <Icon className={cn('size-4', className)} aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-600 tabular-nums">{clockTime(step.at, LODGE.locale)}</p>
                      <p className="text-sm font-medium text-slate-900">{step.text}</p>
                      {step.detail && <p className="text-xs text-slate-600">{step.detail}</p>}
                    </div>
                  </div>
                  {step.message && whatsappTo && (
                    <div className="mt-2 sm:ml-11">
                      <WhatsAppBubble to={whatsappTo} text={step.message} time={clockTime(step.at, LODGE.locale)} />
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        )}
        {outage?.done && (
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
            Added to the incident history. Uptime figures now include the {formatSeconds(OUTAGE_SECONDS)} of downtime.
          </p>
        )}
      </Panel>

      <Panel
        title="Response time, last 24 hours"
        description={`Hourly average · ${averageMs(points)} ms overall, slowest ${slowest.value} ms at ${slowest.label}:00`}
        className="lg:col-start-1"
        action={
          <Segmented
            label="Site to show"
            value={chartSite}
            onChange={setChartSite}
            options={[
              { value: 'main', label: 'Main site' },
              { value: 'booking', label: 'Booking site' },
            ]}
          />
        }
      >
        <HourlyChart points={points} label={`${SITES[chartSite].name} response time for each of the last 24 hours`} />
      </Panel>

      <Panel title="Incident history" description="This month, newest first" className="lg:col-start-1">
        <ul className="divide-y divide-slate-100">
          {history.map((incident) => {
            const site = SITES[incident.siteId]
            return (
              <li key={incident.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700">
                  <History className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-slate-900">
                    <span>
                      {site.name}: {incident.cause.toLowerCase()}, {incident.resolution.toLowerCase()}
                    </span>
                    <Badge tone="green">Resolved</Badge>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {dayAndTime(incident.startedAt, now, LODGE.locale)} · down for {formatSeconds(incident.durationSec)}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </Panel>
    </div>
  )
}
