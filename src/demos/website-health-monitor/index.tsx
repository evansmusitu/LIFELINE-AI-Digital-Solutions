import { Activity, BellRing, Binoculars, DatabaseBackup, LayoutDashboard, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useToast } from '../../components/toast-context'
import { cn } from '../../lib/cn'
import { clockTime, dayAndTime, hoursLabel, num, pct, shortDate } from '../../lib/format'
import { usePersistentState } from '../../lib/storage'
import { MINUTE, uid, useDemoClock, useTicker } from '../../lib/time'
import { useDemoMetrics } from '../metrics'
import { DemoAppShell, type DemoScreen } from '../shell'
import { AlertsScreen } from './AlertsScreen'
import { BackupsScreen } from './BackupsScreen'
import { LODGE, OUTAGE_SITE, PEOPLE, SECURITY_CHECKS, createInitialState } from './data'
import {
  OUTAGE_SECONDS,
  alertRecipients,
  formatSeconds,
  newBackup,
  outageRecord,
  outageTimeline,
  statusDuring,
  summarise,
  uptimePct,
} from './engine'
import { OverviewScreen } from './OverviewScreen'
import { SecurityScreen } from './SecurityScreen'
import type {
  Backup,
  Channel,
  CheckId,
  FixId,
  MonitorState,
  OutageRun,
  PersonId,
  RestoreTarget,
  RetentionDays,
  RuleId,
  ScreenId,
} from './types'
import { UptimeScreen } from './UptimeScreen'

const SLUG = 'website-health-monitor'
const ACCENT = { base: '#854d0e', strong: '#713f12', soft: '#fefce8', ink: '#713f12' }

export default function WebsiteHealthMonitorDemo() {
  const clock = useDemoClock(8, 15)
  const now = useTicker(clock)
  const toast = useToast()
  const [state, setState] = usePersistentState<MonitorState>(`${SLUG}.state`, createInitialState, {
    version: 1,
    freshDaily: true,
  })
  const [screen, setScreen] = useState<ScreenId>('overview')
  const [focusCheck, setFocusCheck] = useState<CheckId | null>(null)
  const [outage, setOutage] = useState<OutageRun | null>(null)
  const timers = useRef<number[]>([])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((t) => window.clearTimeout(t))
  }, [])

  const running = outage !== null && !outage.done
  const live = statusDuring(running ? outage.timeline : null, outage?.shown ?? 0)
  const summary = summarise(state, now, live.status)

  const go = (target: ScreenId, check?: CheckId) => {
    setFocusCheck(check ?? null)
    setScreen(target)
  }

  const simulateOutage = () => {
    if (running) return
    // Playback is compressed, so start after the last incident ends to keep the history in order.
    const lastEnd = Math.max(0, ...state.incidents.map((i) => i.startedAt + i.durationSec * 1000))
    const start = Math.max(clock(), lastEnd + MINUTE)
    const recipients = alertRecipients('down', state.rules, state.channels)
    const timeline = outageTimeline(start, recipients)
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current.length = 0
    setOutage({ timeline, recipients, shown: 1, done: false })
    timeline.slice(1, -1).forEach((step, i) => {
      timers.current.push(window.setTimeout(() => setOutage((o) => (o ? { ...o, shown: i + 2 } : o)), step.delayMs))
    })
    const last = timeline[timeline.length - 1]
    timers.current.push(
      window.setTimeout(() => {
        const record = outageRecord(timeline, recipients, OUTAGE_SITE, uid)
        const bookingIncidents = [record.incident, ...state.incidents].filter((i) => i.siteId === OUTAGE_SITE)
        setState((s) => ({ ...s, incidents: [record.incident, ...s.incidents], alerts: [...record.alerts, ...s.alerts] }))
        setOutage((o) => (o ? { ...o, shown: timeline.length, done: true } : o))
        toast(
          `Booking site is back up after ${formatSeconds(OUTAGE_SECONDS)}. Its 30-day uptime is now ${pct(uptimePct(bookingIncidents, 30, clock()), 2)}.`,
          'success',
        )
      }, last.delayMs),
    )
  }

  const applyFix = (id: FixId, silent: boolean) => {
    const at = clock()
    setState((s) => {
      if (s.fixes[id] !== undefined) return s
      // "Update safely" backs the site up before it installs anything.
      const backups =
        id === 'updates' ? [newBackup(s.backups, 'safety', at, uid('bk'), 'Taken before installing 2 updates'), ...s.backups] : s.backups
      return { ...s, backups, fixes: { ...s.fixes, [id]: at } }
    })
    const check = SECURITY_CHECKS.find((c) => c.id === id)
    if (!silent && check?.fix) toast(check.fix.toast, 'success')
  }

  const backUpNow = (silent: boolean): Backup => {
    const backup = newBackup(state.backups, 'manual', clock(), uid('bk'))
    setState((s) => ({ ...s, backups: [backup, ...s.backups] }))
    if (!silent) toast('Backup finished, checked and stored off-site.', 'success')
    return backup
  }

  const restore = (backup: Backup, target: RestoreTarget, silent: boolean) => {
    const at = clock()
    const label = `${shortDate(backup.at, LODGE.locale)} ${clockTime(backup.at, LODGE.locale)}`
    setState((s) => ({
      ...s,
      backups:
        target === 'live'
          ? [newBackup(s.backups, 'safety', at, uid('bk'), `Taken before restoring the live site to ${label}`), ...s.backups]
          : s.backups,
      restores: [{ id: uid('rs'), at, backupAt: backup.at, target }, ...s.restores],
    }))
    if (!silent)
      toast(
        target === 'test' ? `Test copy ready at ${LODGE.staging}.` : `Live site restored to ${label}. A safety backup was taken first.`,
        'success',
      )
  }

  const setRetention = (days: RetentionDays) => {
    setState((s) => ({ ...s, retentionDays: days }))
    toast(`Backups are now kept for ${days} days.`, 'info')
  }

  const setEmailOnFail = (on: boolean) => {
    setState((s) => ({ ...s, emailOnBackupFail: on }))
    toast(on ? 'Rudo will get an email if a backup fails.' : 'Rudo won’t get backup failure emails.', 'info')
  }

  const toggleChannel = (person: PersonId, channel: Channel, on: boolean) => {
    setState((s) => ({ ...s, channels: { ...s.channels, [person]: { ...s.channels[person], [channel]: on } } }))
    const name = PEOPLE.find((p) => p.id === person)?.name.split(' ')[0] ?? person
    toast(`${channel === 'whatsapp' ? 'WhatsApp' : 'Email'} alerts for ${name} switched ${on ? 'on' : 'off'}.`, 'info')
  }

  const toggleRule = (rule: RuleId, on: boolean, label: string) => {
    setState((s) => ({ ...s, rules: { ...s.rules, [rule]: on } }))
    toast(`Alert “${label}” switched ${on ? 'on' : 'off'}.`, 'info')
  }

  const sendReport = (month: string) => {
    const tendai = PEOPLE[0]
    setState((s) => ({
      ...s,
      alerts: [
        { id: uid('al'), at: clock(), channel: 'email', to: [tendai.id], kind: 'report', text: `Monthly website report for ${month}.` },
        ...s.alerts,
      ],
    }))
    toast(`Report sent to ${tendai.email} (simulated).`, 'success')
  }

  // While the outage plays, show its down alert in the log before it is stored.
  const pendingAlerts =
    running && outage.shown >= 3
      ? outageRecord(outage.timeline, outage.recipients, OUTAGE_SITE, (p) => p)
          .alerts.filter((a) => a.kind === 'down')
          .map((a, i) => ({ ...a, id: `al-pending-${i}` }))
      : []

  const open = summary.openIssues.length
  const latest = summary.latestBackup
  useDemoMetrics([
    { label: 'Uptime, last 30 days', value: pct(summary.uptimeAll, 2), detail: 'Both sites, checked every minute' },
    {
      label: 'Security score',
      value: `${summary.security}/100`,
      detail: open ? `${open} ${open === 1 ? 'issue' : 'issues'} to fix` : 'Nothing to fix',
    },
    {
      label: 'Backups this month',
      value: num(summary.backupsMade),
      detail: latest ? `Last: ${dayAndTime(latest.at, now, LODGE.locale).replace(/^Today/, 'today')}` : 'None yet',
    },
    {
      label: 'Admin time saved this month (est.)',
      value: hoursLabel(summary.minutesSaved),
      detail: 'Manual checks, backups and updates',
    },
  ])

  const screens: DemoScreen<ScreenId>[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, audience: 'team' },
    { id: 'uptime', label: 'Uptime', icon: Activity, audience: 'team' },
    { id: 'backups', label: 'Backups', icon: DatabaseBackup, audience: 'team' },
    { id: 'security', label: 'Security', icon: ShieldCheck, audience: 'team', badge: open || undefined },
    { id: 'alerts', label: 'Alerts', icon: BellRing, audience: 'team' },
  ]

  const down = live.status !== 'up'

  return (
    <DemoAppShell
      slug={SLUG}
      business={{ name: LODGE.name, descriptor: 'Website care dashboard · Victoria Falls, Zimbabwe', icon: Binoculars }}
      accent={ACCENT}
      screens={screens}
      active={screen}
      onChange={(id) => go(id)}
      headerRight={
        <span className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 sm:inline-flex">
          <span className={cn('size-2 rounded-full', down ? 'bg-red-600' : 'bg-emerald-500')} aria-hidden="true" />
          {down ? 'Booking site not responding' : 'Both sites up'} · {clockTime(now, LODGE.locale)}
        </span>
      }
    >
      {screen === 'overview' && (
        <OverviewScreen summary={summary} status={live.status} outage={running ? outage : null} now={now} onGo={go} />
      )}
      {screen === 'uptime' && (
        <UptimeScreen
          summary={summary}
          incidents={state.incidents}
          live={live}
          outage={outage}
          now={now}
          onSimulate={simulateOutage}
        />
      )}
      {screen === 'backups' && (
        <BackupsScreen
          state={state}
          now={now}
          onBackUp={backUpNow}
          onRestore={restore}
          onRetention={setRetention}
          onEmailOnFail={setEmailOnFail}
        />
      )}
      {screen === 'security' && (
        <SecurityScreen summary={summary} focus={focusCheck} fixes={state.fixes} now={now} onFix={applyFix} />
      )}
      {screen === 'alerts' && (
        <AlertsScreen
          state={state}
          summary={summary}
          pending={pendingAlerts}
          now={now}
          onChannel={toggleChannel}
          onRule={toggleRule}
          onSendReport={sendReport}
        />
      )}
    </DemoAppShell>
  )
}
