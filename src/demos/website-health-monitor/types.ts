import type { OutageStep, Recipients } from './engine'

export type SiteId = 'main' | 'booking'

export type Region = 'Johannesburg' | 'Harare' | 'London' | 'Frankfurt'

/** What the monitor sees for a site right now. "checking" means one place failed and the others are confirming. */
export type SiteStatus = 'up' | 'checking' | 'down'

export interface Site {
  id: SiteId
  name: string
  url: string
  /** Typical response time, used to generate the sample series. */
  baseMs: number
}

export interface Incident {
  id: string
  siteId: SiteId
  startedAt: number
  durationSec: number
  cause: string
  resolution: string
}

export type BackupKind = 'nightly' | 'manual' | 'safety'

export interface Backup {
  id: string
  at: number
  sizeBytes: number
  kind: BackupKind
  /** "retried": the first attempt failed and a second attempt worked. */
  status: 'ok' | 'retried'
  note?: string
}

export type RestoreTarget = 'test' | 'live'

export interface Restore {
  id: string
  at: number
  backupAt: number
  target: RestoreTarget
}

export type PersonId = 'tendai' | 'rudo'

export type Channel = 'whatsapp' | 'email'

export interface Person {
  id: PersonId
  name: string
  role: string
  email: string
  whatsapp?: string
}

export type AlertKind = 'down' | 'up' | 'backup' | 'certificate' | 'security' | 'report'

export interface AlertEntry {
  id: string
  at: number
  channel: Channel
  to: PersonId[]
  kind: AlertKind
  text: string
}

export type RuleId = 'down' | 'certificate' | 'backup' | 'security' | 'speed'

export type FixId = 'booking-ssl' | 'updates' | 'two-step' | 'headers' | 'malware'

export type CheckId = 'main-ssl' | 'firewall' | 'backups' | FixId

export type Severity = 'High' | 'Medium' | 'Low'

export interface SecurityCheck {
  id: CheckId
  /** Points this check is worth when it passes. */
  weight: number
  severity: Severity
  /** Text while there's a problem. Checks without it pass from the start. */
  issue?: string
  /** Text once the check passes. */
  ok: string
  why: string
  fix?: {
    label: string
    phases: string[]
    durationMs: number
    toast: string
    note?: string
  }
}

export type RetentionDays = 14 | 30 | 90

export type ScreenId = 'overview' | 'uptime' | 'backups' | 'security' | 'alerts'

/** The outage playback. Never stored, so a reload mid-outage simply shows both sites up again. */
export interface OutageRun {
  timeline: OutageStep[]
  recipients: Recipients
  /** How many timeline steps are visible. */
  shown: number
  done: boolean
}

export interface MonitorState {
  incidents: Incident[]
  backups: Backup[]
  restores: Restore[]
  alerts: AlertEntry[]
  /** When each security problem was fixed. */
  fixes: Partial<Record<FixId, number>>
  channels: Record<PersonId, Partial<Record<Channel, boolean>>>
  rules: Record<RuleId, boolean>
  retentionDays: RetentionDays
  emailOnBackupFail: boolean
}
