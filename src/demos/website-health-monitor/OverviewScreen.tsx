import {
  ArrowRight,
  CircleCheck,
  CircleX,
  DatabaseBackup,
  Gauge,
  Globe,
  LockKeyhole,
  ShieldCheck,
  TriangleAlert,
  Activity,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { clockTime, dayAndTime, pct } from '../../lib/format'
import { AppButton, Panel } from '../ui'
import { LODGE, RENEWALS, SITES } from './data'
import { formatBytes, formatSeconds, scoreLabel, type Summary } from './engine'
import { ScoreRing, SeverityBadge } from './parts'
import type { CheckId, OutageRun, ScreenId, Severity, SiteStatus } from './types'

interface Props {
  summary: Summary
  status: SiteStatus
  /** The outage being played, if any. */
  outage: OutageRun | null
  now: number
  onGo: (screen: ScreenId, check?: CheckId) => void
}

type CardTone = 'green' | 'amber' | 'red' | 'neutral'

const ICON_TONE: Record<CardTone, string> = {
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  neutral: 'bg-(--accent-soft) text-(--accent-ink)',
}

export function OverviewScreen({ summary, status, outage, now, onGo }: Props) {
  const sslFixed = summary.checks.some((c) => c.check.id === 'booking-ssl' && c.ok)
  const latest = summary.latestBackup
  const open = summary.openIssues.length

  const needs: { key: string; title: string; detail: string; severity?: Severity; action: string; go: () => void }[] = []
  if (status !== 'up')
    needs.push({
      key: 'outage',
      title: `${SITES.booking.name} is down`,
      detail: 'An automatic restart is under way. Nothing for you to do.',
      action: 'Watch on Uptime',
      go: () => onGo('uptime'),
    })
  for (const { check } of summary.openIssues)
    needs.push({
      key: check.id,
      title: check.issue ?? check.ok,
      detail: check.why,
      severity: check.severity,
      action: 'Go to fix',
      go: () => onGo('security', check.id),
    })

  const securityTone = scoreLabel(summary.security).tone

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <StatusBanner status={status} outage={outage} now={now} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[17rem_1fr]">
        <Panel title="Health score" description="Uptime, security, backups and speed, averaged">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 lg:flex-col">
            <ScoreRing score={summary.health} label="Health score" />
            <dl className="grid w-full max-w-56 grid-cols-1 gap-2 text-sm">
              {(
                [
                  ['Uptime', summary.parts.uptime],
                  ['Security', summary.parts.security],
                  ['Backups', summary.parts.backups],
                  ['Speed', summary.parts.speed],
                ] as [string, number][]
              ).map(([label, value]) => (
                <div key={label} className="grid grid-cols-[4.5rem_1fr_2rem] items-center gap-2">
                  <dt className="text-slate-700">{label}</dt>
                  <dd className="h-1.5 rounded-full bg-slate-100" aria-hidden="true">
                    <span className="block h-full rounded-full bg-(--accent)" style={{ width: `${value}%` }} />
                  </dd>
                  <dd className="text-right font-semibold text-slate-900 tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Panel>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          <Card
            icon={Activity}
            tone={status === 'up' ? 'green' : 'red'}
            label="Uptime, last 30 days"
            value={pct(summary.uptimeAll, 2)}
            detail={`Both sites · ${summary.incidents30} ${summary.incidents30 === 1 ? 'incident' : 'incidents'}`}
            link="Uptime"
            onClick={() => onGo('uptime')}
          />
          <Card
            icon={Gauge}
            tone="neutral"
            label="Average response"
            value={`${summary.avgMs} ms`}
            detail="Last 24 hours, both sites"
            link="Uptime"
            onClick={() => onGo('uptime')}
          />
          <Card
            icon={LockKeyhole}
            tone={sslFixed ? 'green' : 'amber'}
            label="SSL certificates"
            value={sslFixed ? 'Valid' : `${RENEWALS.bookingCertDays} days left`}
            detail={
              sslFixed
                ? 'Both certificates renew themselves'
                : `Booking site certificate expires in ${RENEWALS.bookingCertDays} days`
            }
            link="Security"
            onClick={() => onGo('security', sslFixed ? undefined : 'booking-ssl')}
          />
          <Card
            icon={Globe}
            tone="green"
            label="Domain renewal"
            value={`${RENEWALS.domainDays} days`}
            detail={
              <>
                <span className="break-all">{LODGE.domain}</span> renews in {RENEWALS.domainDays} days · auto-renew on
              </>
            }
            link="Security"
            onClick={() => onGo('security')}
          />
          <Card
            icon={DatabaseBackup}
            tone="green"
            label="Last backup"
            value={latest ? dayAndTime(latest.at, now, LODGE.locale) : 'None'}
            detail={latest ? `${formatBytes(latest.sizeBytes)} · stored off-site` : 'Back up now from Backups'}
            link="Backups"
            onClick={() => onGo('backups')}
          />
          <Card
            icon={ShieldCheck}
            tone={securityTone}
            label="Security score"
            value={`${summary.security}/100`}
            detail={open ? `${open} ${open === 1 ? 'issue' : 'issues'} to fix` : 'Nothing to fix'}
            link="Security"
            onClick={() => onGo('security')}
          />
        </div>
      </div>

      <Panel title="What needs you" description="The most important items first">
        {needs.length ? (
          <ul className="divide-y divide-slate-100">
            {needs.slice(0, 3).map((item) => (
              <li key={item.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
                <TriangleAlert
                  className={cn('size-5 shrink-0', item.severity === 'Low' ? 'text-sky-700' : item.severity === 'Medium' ? 'text-amber-700' : 'text-red-700')}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1 basis-48">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-slate-900">
                    <span className="min-w-0">{item.title}</span>
                    {item.severity && <SeverityBadge severity={item.severity} />}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">{item.detail}</p>
                </div>
                <AppButton
                  variant="secondary"
                  onClick={item.go}
                  aria-label={`${item.action}: ${item.title}`}
                  className="w-full sm:w-auto"
                >
                  {item.action}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </AppButton>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 text-sm text-slate-700">
            <CircleCheck className="size-5 shrink-0 text-emerald-700" aria-hidden="true" />
            Nothing needs you right now. You’ll get an alert if anything changes.
          </p>
        )}
      </Panel>

      <p className="text-xs text-slate-600">
        In this demo the checks are simulated. Your version checks your real sites every minute.
      </p>
    </div>
  )
}

function StatusBanner({ status, outage, now }: { status: SiteStatus; outage: OutageRun | null; now: number }) {
  const step = outage ? outage.timeline[Math.max(0, outage.shown - 1)] : undefined
  const elapsed = step && outage ? (step.at - outage.timeline[0].at) / 1000 : 0
  const content = {
    up: {
      icon: CircleCheck,
      title: 'Both sites are up',
      detail: `Last checked at ${clockTime(now, LODGE.locale)} from Johannesburg, Harare, London and Frankfurt.`,
      box: 'border-emerald-200 bg-emerald-50 text-emerald-900',
      tile: 'bg-emerald-700',
    },
    checking: {
      icon: TriangleAlert,
      title: `${SITES.booking.name} isn’t responding`,
      detail: 'Johannesburg can’t reach it. Confirming from 3 more places…',
      box: 'border-amber-200 bg-amber-50 text-amber-900',
      tile: 'bg-amber-700',
    },
    down: {
      icon: CircleX,
      title: `${SITES.booking.name} is down`,
      detail: `Down for ${elapsed >= 60 ? formatSeconds(elapsed) : 'under a minute'} · ${step?.text ?? 'Restarting'}`,
      box: 'border-red-200 bg-red-50 text-red-900',
      tile: 'bg-red-700',
    },
  }[status]
  const Icon = content.icon
  return (
    <div className={cn('flex items-center gap-3 rounded-xl border p-3 sm:p-4', content.box)}>
      <span className={cn('grid size-10 shrink-0 place-items-center rounded-full text-white', content.tile)}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        {/* Only the headline is live, so the clock in the detail line isn't read out every 30 seconds. */}
        <p role="status" className="text-base font-semibold sm:text-lg">
          {content.title}
        </p>
        <p className="text-sm">{content.detail}</p>
      </div>
    </div>
  )
}

function Card({
  icon: Icon,
  tone,
  label,
  value,
  detail,
  link,
  onClick,
}: {
  icon: LucideIcon
  tone: CardTone
  label: string
  value: string
  detail: ReactNode
  link: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-full min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-(--accent)/50 hover:shadow sm:p-3.5"
    >
      <span className="flex items-center gap-2">
        <span className={cn('grid size-7 shrink-0 place-items-center rounded-lg', ICON_TONE[tone])}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 text-xs font-medium text-slate-600">{label}</span>
      </span>
      <span className="mt-2 text-base leading-tight font-bold tracking-tight text-slate-900 tabular-nums sm:text-lg">
        {value}
      </span>
      <span className="mt-1 text-xs text-slate-600">{detail}</span>
      <span className="mt-auto flex items-center gap-1 pt-2 text-xs font-semibold text-(--accent-ink)">
        {link}
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </span>
    </button>
  )
}
