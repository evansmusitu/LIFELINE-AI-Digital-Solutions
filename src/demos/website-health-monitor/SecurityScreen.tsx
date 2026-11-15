import { CircleCheck, Globe, LockKeyhole, ShieldBan, TriangleAlert, Wrench } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { cn } from '../../lib/cn'
import { dayAndTime, num } from '../../lib/format'
import { AppButton, Badge, Notice, Panel } from '../ui'
import { BLOCKED_LOGINS_TODAY, LODGE, RENEWALS, SCAN_FILES, SECURITY_CHECKS } from './data'
import { RESIDUAL_RISK, type CheckState, type Summary } from './engine'
import { JobProgress, ScoreRing, SeverityBadge, wrapButton } from './parts'
import type { CheckId, FixId, MonitorState } from './types'
import { useJob } from './useJob'

interface Props {
  summary: Summary
  /** A check to scroll to, when the visitor came from "What needs you". */
  focus: CheckId | null
  fixes: MonitorState['fixes']
  now: number
  onFix: (id: FixId, silent: boolean) => void
}

export function SecurityScreen({ summary, focus, fixes, now, onFix }: Props) {
  // Keep the list order fixed, so an item doesn't jump away from the visitor's finger when it's fixed.
  const rows = [...summary.checks].sort((a, b) => SECURITY_CHECKS.indexOf(a.check) - SECURITY_CHECKS.indexOf(b.check))
  const open = summary.openIssues.length
  const bookingRenewed = fixes['booking-ssl'] !== undefined

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Security score" description="Updated as soon as something changes">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            <ScoreRing score={summary.security} label="Security score" />
            <div className="min-w-0 flex-1 basis-40 space-y-3">
              <p className="text-sm font-semibold text-slate-900">
                {open ? `${open} ${open === 1 ? 'issue' : 'issues'} to fix` : 'Nothing to fix'}
              </p>
              <div className="flex items-start gap-2">
                <ShieldBan className="mt-0.5 size-4 shrink-0 text-(--accent-ink)" aria-hidden="true" />
                <p className="text-sm text-slate-700">
                  Login attempts blocked today: <span className="font-semibold text-slate-900 tabular-nums">{BLOCKED_LOGINS_TODAY}</span>
                  <span className="block text-xs text-slate-600">Mostly password-guessing bots</span>
                </p>
              </div>
            </div>
          </div>
          {summary.security > 90 ? (
            <Notice tone="green" icon={CircleCheck} className="mt-4">
              Score is above 90. The sites are in good shape.
              {open === 0 && ` ${100 - RESIDUAL_RISK} is the top score: no site is ever completely risk-free, so we keep watching.`}
            </Notice>
          ) : (
            <p className="mt-4 text-xs text-slate-600">Each fix below adds points. A score above 90 means the sites are in good shape.</p>
          )}
        </Panel>

        <Panel title="Renewals" description="Certificates and the domain name">
          <ul className="space-y-3 text-sm">
            <Renewal icon={LockKeyhole} name="Main site certificate" detail={`Renews itself in ${RENEWALS.mainCertDays} days`} ok />
            <Renewal
              icon={LockKeyhole}
              name="Booking site certificate"
              detail={
                bookingRenewed
                  ? `Renewed · valid for ${RENEWALS.renewedCertDays} days, auto-renew on`
                  : `Expires in ${RENEWALS.bookingCertDays} days · auto-renew off`
              }
              ok={bookingRenewed}
            />
            <Renewal
              icon={Globe}
              name={`Domain ${LODGE.domain}`}
              detail={`Renews in ${RENEWALS.domainDays} days · auto-renew on`}
              ok
            />
          </ul>
        </Panel>
      </div>

      <Panel title="Checklist" description="What we check every day, in plain words">
        <ul className="space-y-3">
          {rows.map((row) => (
            <CheckRow key={row.check.id} row={row} focus={focus === row.check.id} now={now} onFix={onFix} />
          ))}
        </ul>
        <p className="mt-4 text-xs text-slate-600">
          In this demo the fixes are simulated. On your site each one is a real change, made with a backup first.
        </p>
      </Panel>
    </div>
  )
}

function Renewal({ icon: Icon, name, detail, ok }: { icon: typeof Globe; name: string; detail: string; ok: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium break-all text-slate-900">{name}</p>
        <p className="text-xs text-slate-600">{detail}</p>
      </div>
      <Badge tone={ok ? 'green' : 'amber'}>{ok ? 'OK' : 'Soon'}</Badge>
    </li>
  )
}

function CheckRow({
  row,
  focus,
  now,
  onFix,
}: {
  row: CheckState
  focus: boolean
  now: number
  onFix: (id: FixId, silent: boolean) => void
}) {
  const { check, ok, fixedAt } = row
  const job = useJob()
  const ref = useRef<HTMLLIElement>(null)

  // Wait a frame so this runs after the app shell has scrolled the new screen into view.
  useEffect(() => {
    if (!focus) return
    const frame = window.requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ block: 'center' })
      ref.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [focus])

  const fix = check.fix
  const start = () => {
    if (!fix) return
    // The button is replaced by progress, so keep keyboard focus on the item.
    ref.current?.focus({ preventScroll: true })
    job.start({ key: check.id, phases: fix.phases, durationMs: fix.durationMs }, (silent) => onFix(check.id as FixId, silent))
  }

  const iconTone = ok ? 'text-emerald-700' : check.severity === 'High' ? 'text-red-700' : check.severity === 'Medium' ? 'text-amber-700' : 'text-sky-700'
  const Icon = ok ? CircleCheck : TriangleAlert

  return (
    <li
      ref={ref}
      tabIndex={-1}
      className={cn(
        'scroll-mt-24 rounded-lg border p-3 sm:p-4',
        ok ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50',
        focus && !ok && 'ring-2 ring-(--accent)',
      )}
    >
      <div className="flex gap-2.5">
        <Icon className={cn('mt-0.5 size-5 shrink-0', iconTone)} aria-hidden="true" />
        <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="min-w-0 text-sm font-semibold text-slate-900">{ok ? check.ok : check.issue}</span>
          {ok ? <Badge tone="green">{fixedAt ? 'Fixed' : 'OK'}</Badge> : <SeverityBadge severity={check.severity} />}
        </p>
      </div>
      {/* Full width below the title, so long fix buttons fit on a 320 px phone. */}
      <div className="sm:pl-7.5">
        <p className="mt-1.5 text-xs text-slate-700">
          <span className="font-semibold">Why it matters: </span>
          {check.why}
        </p>
        {ok && fixedAt !== undefined && (
          <p className="mt-1 text-xs text-slate-600">
            {check.id === 'malware' ? 'Scanned' : 'Fixed'} {dayAndTime(fixedAt, now, LODGE.locale).replace(/^Today/, 'today')}
            {fix?.note && ` · ${fix.note}`}
          </p>
        )}
        {!ok && fix && (
          <div className="mt-3">
            {job.job ? (
              <JobProgress
                label={`${fix.label} progress`}
                phase={job.phase}
                progress={job.progress}
                detail={
                  check.id === 'malware'
                    ? `${num(Math.round(job.progress * SCAN_FILES))} of ${num(SCAN_FILES)} files scanned`
                    : undefined
                }
              />
            ) : (
              <AppButton icon={Wrench} onClick={start} className={cn('w-full sm:w-auto', wrapButton)}>
                {fix.label}
              </AppButton>
            )}
          </div>
        )}
      </div>
    </li>
  )
}
