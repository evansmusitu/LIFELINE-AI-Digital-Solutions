import { clockTime } from '../../lib/format'
import { DAY, HOUR, seededRandom } from '../../lib/time'
import { PEOPLE, REGIONS, SECURITY_CHECKS, SITE_IDS, SITES, UPDATES_EARLIER } from './data'
import type {
  AlertEntry,
  Backup,
  BackupKind,
  Channel,
  Incident,
  MonitorState,
  PersonId,
  Region,
  RestoreTarget,
  RuleId,
  SecurityCheck,
  Severity,
  Site,
  SiteId,
  SiteStatus,
} from './types'

/* Pure logic for the website care dashboard. No React here, so it can be unit-tested in Node. */

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/* Scores */

/** No setup is risk-free, so a site with every check passing still scores 97, not 100. */
export const RESIDUAL_RISK = 3

export function securityScore(items: { weight: number; ok: boolean }[]): number {
  const total = items.reduce((sum, item) => sum + item.weight, 0)
  if (total <= 0) return 0
  const earned = items.reduce((sum, item) => sum + (item.ok ? item.weight : 0), 0)
  return clamp(Math.round((earned / total) * 100) - RESIDUAL_RISK, 0, 100)
}

export interface CheckState {
  check: SecurityCheck
  ok: boolean
  fixedAt?: number
}

const SEVERITY_ORDER: Record<Severity, number> = { High: 0, Medium: 1, Low: 2 }

/** Every check with its current result. Problems come first, most serious first. */
export function checkStates(fixes: MonitorState['fixes'], checks: SecurityCheck[] = SECURITY_CHECKS): CheckState[] {
  const states = checks.map((check) => {
    const fixedAt = check.fix ? fixes[check.id as keyof typeof fixes] : undefined
    return { check, ok: !check.issue || fixedAt !== undefined, fixedAt }
  })
  return states.sort(
    (a, b) => Number(a.ok) - Number(b.ok) || SEVERITY_ORDER[a.check.severity] - SEVERITY_ORDER[b.check.severity],
  )
}

/** Uptime over the last `days` days, from the minutes lost to incidents. `sites` spreads it over several sites. */
export function uptimePct(incidents: Incident[], days: number, now: number, sites = 1): number {
  if (days <= 0 || sites <= 0) return 100
  const from = now - days * DAY
  const downMinutes = incidents.filter((i) => i.startedAt >= from).reduce((sum, i) => sum + Math.max(0, i.durationSec) / 60, 0)
  return clamp(100 * (1 - downMinutes / (days * 1440 * sites)), 0, 100)
}

/** 99.98% scores about 99. Every 0.1% lost costs 4 points. A site that is down right now scores 0. */
export function uptimeScore(pct: number, downNow: boolean): number {
  if (downNow) return 0
  return clamp(Math.round(100 - (100 - pct) * 40), 0, 100)
}

/** Full marks up to 400 ms, then one point for every 11 ms slower. */
export function speedScore(averageMs: number): number {
  return clamp(Math.round(100 - Math.max(0, averageMs - 400) / 11), 0, 100)
}

/** A fresh backup is worth full marks. Recent failures and short retention cost points. */
export function backupScore(backups: Backup[], now: number, retentionDays: number): number {
  const fresh = backups.some((b) => b.at <= now && now - b.at <= 26 * HOUR)
  const failures = backups.filter((b) => b.status === 'retried' && now - b.at <= 14 * DAY).length
  const base = fresh ? 100 : 40
  return clamp(base - failures * 5 - (retentionDays < 30 ? 10 : 0), 0, 100)
}

export function healthScore(parts: { uptime: number; security: number; backups: number; speed: number }): number {
  return Math.round((parts.uptime + parts.security + parts.backups + parts.speed) / 4)
}

export type ScoreTone = 'green' | 'amber' | 'red'

export function scoreLabel(score: number): { label: string; tone: ScoreTone } {
  if (score >= 90) return { label: 'Good', tone: 'green' }
  if (score >= 75) return { label: 'Fair', tone: 'amber' }
  if (score >= 50) return { label: 'Needs work', tone: 'amber' }
  return { label: 'At risk', tone: 'red' }
}

/* Formatting */

/** "2.1 GB", "640 MB". Uses 1 GB = 1,000,000,000 bytes, like storage providers do. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  if (bytes >= 1e6) return `${Math.round(bytes / 1e6)} MB`
  if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} KB`
  return `${Math.round(bytes)} B`
}

/** "3 min 40 s", "45 s", "2 min", "1 h 5 min" */
export function formatSeconds(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  if (total < 60) return `${total} s`
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return m ? `${h} h ${m} min` : `${h} h`
  return s ? `${m} min ${s} s` : `${m} min`
}

/** "Tendai", "Tendai and Rudo", "A, B and C" */
export function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/* Response times */

export interface HourPoint {
  hour: number
  label: string
  value: number
  current: boolean
}

/** Average response time for each of the last 24 hours, current hour last. Busier in the evening, when guests book. */
export function hourlySeries(site: Site, now: number): HourPoint[] {
  const hourNow = new Date(now).getHours()
  const seed = site.id === 'main' ? 7100 : 7200
  return Array.from({ length: 24 }, (_, i) => {
    const hour = (hourNow - 23 + i + 24) % 24
    const busy = hour >= 17 && hour <= 21 ? 70 : hour >= 8 && hour < 17 ? 35 : 0
    const value = clamp(Math.round(site.baseMs - 60 + busy + seededRandom(seed + hour)() * 110), 380, 650)
    return { hour, label: String(hour).padStart(2, '0'), value, current: i === 23 }
  })
}

export function averageMs(points: { value: number }[]): number {
  return points.length ? Math.round(points.reduce((sum, p) => sum + p.value, 0) / points.length) : 0
}

/** The latest check's response time. Changes every 30 seconds, the same way on every visit. */
export function responseNow(site: Site, now: number): number {
  const rand = seededRandom(Math.floor(now / 30_000) + (site.id === 'main' ? 1 : 2))
  return Math.round(site.baseMs - 40 + rand() * 80)
}

/* Alerts and the simulated outage */

export type Recipients = Record<Channel, PersonId[]>

/** Who gets an alert of this kind, given the rules and each person's channels. */
export function alertRecipients(
  rule: RuleId,
  rules: MonitorState['rules'],
  channels: MonitorState['channels'],
): Recipients {
  const result: Recipients = { whatsapp: [], email: [] }
  if (!rules[rule]) return result
  for (const person of PEOPLE) {
    if (person.whatsapp && channels[person.id]?.whatsapp) result.whatsapp.push(person.id)
    if (channels[person.id]?.email) result.email.push(person.id)
  }
  return result
}

const firstNames = (ids: PersonId[]) => ids.map((id) => PEOPLE.find((p) => p.id === id)?.name.split(' ')[0] ?? id)

export interface OutageStep {
  /** Demo-clock time shown in the timeline. */
  at: number
  /** When the step appears during playback, from the start. */
  delayMs: number
  text: string
  detail?: string
  status: SiteStatus
  regionsDown: Region[]
  /** WhatsApp message shown as a chat bubble. */
  message?: string
}

/** Real outage length the timeline describes. Playback is shortened to under 10 seconds. */
export const OUTAGE_SECONDS = 220

/** The compressed incident on the booking site, step by step. */
export function outageTimeline(start: number, recipients: Recipients, site: Site = SITES.booking): OutageStep[] {
  const [first, ...others] = REGIONS
  const down = formatSeconds(OUTAGE_SECONDS)
  const whatsapp = firstNames(recipients.whatsapp)
  const email = firstNames(recipients.email)
  let alert: Pick<OutageStep, 'text' | 'detail' | 'message'>
  if (whatsapp.length) {
    alert = {
      text: `WhatsApp alert sent to ${listNames(whatsapp)}`,
      detail: email.length ? `Email sent to ${listNames(email)}` : undefined,
      message: `⚠️ ${site.url} is down since ${clockTime(start)}. We’re restarting it now. — Website monitor`,
    }
  } else if (email.length) {
    alert = { text: `Email alert sent to ${listNames(email)}` }
  } else {
    alert = { text: 'No alert sent', detail: 'Down alerts are switched off on the Alerts screen.' }
  }
  return [
    {
      at: start,
      delayMs: 0,
      text: `${site.name} stopped responding (checked from ${first})`,
      detail: 'Confirming from the other places before anyone is woken up.',
      status: 'checking',
      regionsDown: [first],
    },
    {
      at: start + 60_000,
      delayMs: 1800,
      text: `Confirmed from ${listNames(others)}`,
      detail: 'It’s a real outage, not a local network blip.',
      status: 'down',
      regionsDown: [...REGIONS],
    },
    { at: start + 120_000, delayMs: 3800, ...alert, status: 'down', regionsDown: [...REGIONS] },
    {
      at: start + 130_000,
      delayMs: 5800,
      text: 'Automatic restart started',
      detail: 'The booking system restarts on the same server. No bookings are lost.',
      status: 'down',
      regionsDown: [...REGIONS],
    },
    {
      at: start + OUTAGE_SECONDS * 1000,
      delayMs: 8600,
      text: `${site.name} is back up · down for ${down}`,
      detail: 'Incident logged and uptime updated.',
      status: 'up',
      regionsDown: [],
      message: whatsapp.length
        ? `✅ ${site.url} is back up. It was down for ${down}. No action needed. — Website monitor`
        : undefined,
    },
  ]
}

/** The incident and alert log entries written once the outage is over. */
export function outageRecord(
  timeline: OutageStep[],
  recipients: Recipients,
  siteId: SiteId,
  makeId: (prefix: string) => string,
): { incident: Incident; alerts: AlertEntry[] } {
  const site = SITES[siteId]
  const start = timeline[0].at
  const alertAt = timeline[2]?.at ?? start
  const upAt = timeline[timeline.length - 1].at
  const alerts: AlertEntry[] = []
  for (const channel of ['whatsapp', 'email'] as Channel[]) {
    const to = recipients[channel]
    if (!to.length) continue
    alerts.push({
      id: makeId('al'),
      at: alertAt,
      channel,
      to,
      kind: 'down',
      text: `${site.url} is down since ${clockTime(start)}. We’re restarting it now.`,
    })
    alerts.push({
      id: makeId('al'),
      at: upAt,
      channel,
      to,
      kind: 'up',
      text: `${site.url} is back up. Down for ${formatSeconds(OUTAGE_SECONDS)}, restarted automatically.`,
    })
  }
  return {
    incident: {
      id: makeId('inc'),
      siteId,
      startedAt: start,
      durationSec: OUTAGE_SECONDS,
      cause: 'Booking system stopped responding',
      resolution: 'Restarted automatically',
    },
    alerts,
  }
}

/** Status of a site during playback. `shown` is how many timeline steps are visible. */
export function statusDuring(timeline: OutageStep[] | null, shown: number): { status: SiteStatus; regionsDown: Region[] } {
  const step = timeline && shown > 0 ? timeline[Math.min(shown, timeline.length) - 1] : undefined
  return step ? { status: step.status, regionsDown: step.regionsDown } : { status: 'up', regionsDown: [] }
}

/* Backups and restores */

export const BACKUP_STEPS = ['Copying website files', 'Exporting booking database', 'Uploading off-site', 'Checking the backup opens']

export function restoreSteps(target: RestoreTarget): string[] {
  return target === 'test'
    ? ['Making a test copy', 'Copying website files', 'Loading the booking database', 'Checking pages load']
    : ['Taking a safety backup first', 'Copying website files', 'Restoring the booking database', 'Checking pages load']
}

/** Which step a job is on, from its progress between 0 and 1. */
export function phaseAt(progress: number, count: number): number {
  if (count <= 0) return 0
  return clamp(Math.floor(progress * count), 0, count - 1)
}

/** A new backup is a few megabytes bigger than the last one. */
export function nextBackupSize(previous: number, seed: number): number {
  return Math.round(previous + 2e6 + seededRandom(seed)() * 3e6)
}

export function newBackup(backups: Backup[], kind: BackupKind, at: number, id: string, note?: string): Backup {
  const latest = backups.reduce<Backup | undefined>((a, b) => (!a || b.at > a.at ? b : a), undefined)
  const sizeBytes = nextBackupSize(latest?.sizeBytes ?? 2.1e9, backups.length)
  return { id, at, kind, status: 'ok', sizeBytes, note }
}

/** Live restores need the word RESTORE typed in. Phone keyboards capitalise, so case doesn't matter. */
export function restoreConfirmed(text: string): boolean {
  return text.trim().toUpperCase() === 'RESTORE'
}

/** Backups that are still kept, newest first. */
export function keptBackups(backups: Backup[], now: number, retentionDays: number): Backup[] {
  return backups.filter((b) => now - b.at <= retentionDays * DAY).sort((a, b) => b.at - a.at)
}

/* Totals for the dashboard, the metrics strip and the monthly report */

/** 10 minutes of manual checks a day, 15 minutes per backup, 20 minutes per fix. */
export function timeSavedMinutes(backups: number, fixes: number, days = 30): number {
  return days * 10 + backups * 15 + fixes * 20
}

export function summarise(state: MonitorState, now: number, bookingStatus: SiteStatus = 'up') {
  const checks = checkStates(state.fixes)
  const security = securityScore(checks.map((c) => ({ weight: c.check.weight, ok: c.ok })))
  const openIssues = checks.filter((c) => !c.ok)
  const recent = state.incidents.filter((i) => now - i.startedAt <= 30 * DAY)
  const uptimeAll = uptimePct(state.incidents, 30, now, SITE_IDS.length)
  const uptimeBySite = Object.fromEntries(
    SITE_IDS.map((id) => [id, uptimePct(state.incidents.filter((i) => i.siteId === id), 30, now)]),
  ) as Record<SiteId, number>
  const series = Object.fromEntries(SITE_IDS.map((id) => [id, hourlySeries(SITES[id], now)])) as Record<SiteId, HourPoint[]>
  const avgMs = averageMs([...series.main, ...series.booking])
  const backups = backupScore(state.backups, now, state.retentionDays)
  const speed = speedScore(avgMs)
  const uptime = uptimeScore(uptimeAll, bookingStatus === 'down')
  const sorted = [...state.backups].sort((a, b) => b.at - a.at)
  const backupsMade = state.backups.filter((b) => b.at <= now + HOUR && now - b.at <= 30 * DAY).length
  const restarts = recent.filter((i) => i.resolution === 'Restarted automatically').length
  const fixesApplied = Object.keys(state.fixes).length + restarts
  return {
    checks,
    openIssues,
    security,
    uptimeAll,
    uptimeBySite,
    series,
    avgMs,
    parts: { uptime, security, backups, speed },
    health: healthScore({ uptime, security, backups, speed }),
    latestBackup: sorted[0] as Backup | undefined,
    backupsMade,
    incidents30: recent.length,
    updatesInstalled: UPDATES_EARLIER + (state.fixes.updates ? 2 : 0),
    fixesApplied,
    minutesSaved: timeSavedMinutes(backupsMade, fixesApplied),
  }
}

export type Summary = ReturnType<typeof summarise>
