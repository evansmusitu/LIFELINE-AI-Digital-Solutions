import { daysAgoAt, seededRandom } from '../../lib/time'
import type {
  AlertEntry,
  AlertKind,
  Backup,
  Channel,
  Incident,
  MonitorState,
  Person,
  PersonId,
  Region,
  RuleId,
  SecurityCheck,
  Site,
  SiteId,
} from './types'

/* Sample business: Hornbill Spray Lodge, an invented safari lodge in Victoria Falls, Zimbabwe. */

export const LODGE = {
  name: 'Hornbill Spray Lodge',
  domain: 'hornbillspraylodge.com',
  staging: 'staging.hornbillspraylodge.com',
  locale: 'en-GB',
}

export const SITES: Record<SiteId, Site> = {
  main: { id: 'main', name: 'Main website', url: 'hornbillspraylodge.com', baseMs: 410 },
  booking: { id: 'booking', name: 'Booking site', url: 'book.hornbillspraylodge.com', baseMs: 520 },
}

export const SITE_IDS: SiteId[] = ['main', 'booking']

export const REGIONS: Region[] = ['Johannesburg', 'Harare', 'London', 'Frankfurt']

export const PEOPLE: Person[] = [
  {
    id: 'tendai',
    name: 'Tendai Moyo',
    role: 'General manager',
    email: 'tendai@hornbillspraylodge.com',
    whatsapp: '+263 77 ••• 3021',
  },
  { id: 'rudo', name: 'Rudo Chikwanha', role: 'Reservations', email: 'rudo@hornbillspraylodge.com' },
]

export const RULES: { id: RuleId; label: string; description: string }[] = [
  { id: 'down', label: 'A site is down for 2 minutes', description: 'Short blips under 2 minutes are logged, not sent.' },
  { id: 'certificate', label: 'A certificate expires within 14 days', description: 'Checked every morning at 09:00.' },
  { id: 'backup', label: 'A backup fails', description: 'Sent straight away, then again when the retry finishes.' },
  { id: 'security', label: 'A security problem is found', description: 'Updates waiting, malware, weak logins.' },
  { id: 'speed', label: 'Weekly speed report', description: 'Every Monday at 08:00, with the slowest pages.' },
]

/** Renewal dates shown on Overview and Security. */
export const RENEWALS = { mainCertDays: 58, bookingCertDays: 9, renewedCertDays: 90, domainDays: 41 }

export const BLOCKED_LOGINS_TODAY = 214
export const SCAN_FILES = 18_240
export const OUTAGE_SITE: SiteId = 'booking'

export const SECURITY_CHECKS: SecurityCheck[] = [
  {
    id: 'booking-ssl',
    weight: 9,
    severity: 'High',
    issue: `Booking site certificate expires in ${RENEWALS.bookingCertDays} days`,
    ok: `Booking site certificate renewed · valid for ${RENEWALS.renewedCertDays} days, auto-renew on`,
    why: 'When it expires, browsers warn guests away from the payment page and most of them leave.',
    fix: {
      label: 'Renew now',
      phases: ['Renewing the certificate…'],
      durationMs: 1500,
      toast: 'Booking site certificate renewed. It now renews itself.',
    },
  },
  {
    id: 'updates',
    weight: 9,
    severity: 'High',
    issue: '2 software updates waiting (website system 6.4.2 and booking plugin 3.1)',
    ok: 'Website system and booking plugin are up to date',
    why: 'Updates close security holes that attackers already know about.',
    fix: {
      label: 'Update safely',
      phases: ['Backing up first…', 'Updating…', 'Checking pages still load…'],
      durationMs: 4200,
      toast: '2 updates installed. Every page still loads.',
    },
  },
  {
    id: 'two-step',
    weight: 6,
    severity: 'Medium',
    issue: '2 admin accounts don’t use two-step login',
    ok: 'Two-step login is required for every admin account',
    why: 'A stolen password on its own is no longer enough to get into the site.',
    fix: {
      label: 'Require two-step login',
      phases: ['Turning on two-step login…'],
      durationMs: 1200,
      toast: 'Two-step login is now required for admin accounts.',
      note: 'Staff set it up the next time they sign in.',
    },
  },
  {
    id: 'malware',
    weight: 5,
    severity: 'Medium',
    issue: 'Last malware scan was 4 days ago',
    ok: `Malware scan finished · no malware found in ${SCAN_FILES.toLocaleString('en-GB')} files`,
    why: 'Finds harmful code early, before search engines flag the site or guests’ devices are put at risk.',
    fix: {
      label: 'Run a scan now',
      phases: ['Scanning files…'],
      durationMs: 4000,
      toast: `Scan finished. No malware found in ${SCAN_FILES.toLocaleString('en-GB')} files.`,
    },
  },
  {
    id: 'headers',
    weight: 3,
    severity: 'Low',
    issue: 'Security headers missing on the main site',
    ok: 'Security headers are on for the main site',
    why: 'They tell browsers to block common tricks, such as showing your pages inside someone else’s site.',
    fix: {
      label: 'Add headers',
      phases: ['Adding security headers…'],
      durationMs: 1200,
      toast: 'Security headers added to the main site.',
    },
  },
  {
    id: 'main-ssl',
    weight: 22,
    severity: 'High',
    ok: 'Main site certificate is valid',
    why: 'Guests see the padlock, and browsers don’t warn them away from your site.',
  },
  {
    id: 'firewall',
    weight: 26,
    severity: 'High',
    ok: 'Firewall is on',
    why: 'It blocks password-guessing bots and known attacks before they reach the site.',
  },
  {
    id: 'backups',
    weight: 20,
    severity: 'Medium',
    ok: 'Daily backups are working',
    why: 'If anything breaks, the site can be put back exactly as it was last night.',
  },
]

function sampleIncidents(): Incident[] {
  return [
    {
      id: 'inc-sample-2',
      siteId: 'booking',
      startedAt: daysAgoAt(5, 21, 40),
      durationSec: 180,
      cause: 'Slow database',
      resolution: 'Restarted automatically',
    },
    {
      id: 'inc-sample-1',
      siteId: 'main',
      startedAt: daysAgoAt(17, 14, 5),
      durationSec: 18 * 60,
      cause: 'Hosting provider network fault',
      resolution: 'Fixed by the hosting provider',
    },
  ]
}

/** Nightly backups for the last 30 nights, newest first. Sizes grow slowly as bookings are added. */
function sampleBackups(): Backup[] {
  const rand = seededRandom(5021)
  return Array.from({ length: 30 }, (_, d) => {
    const sizeBytes = Math.round(2.0e9 + (29 - d) * 4e6 + rand() * 3e7)
    const backup: Backup = { id: `bk-sample-${d}`, at: daysAgoAt(d, 2, 0), sizeBytes, kind: 'nightly', status: 'ok' }
    if (d === 6) return { ...backup, status: 'retried', note: 'Storage was full · fixed automatically, backed up again at 02:40' }
    return backup
  })
}

type AlertRow = [days: number, h: number, m: number, channel: Channel, to: PersonId[], kind: AlertKind, text: string]

function sampleAlerts(): AlertEntry[] {
  const booking = SITES.booking.url
  const main = SITES.main.url
  const rows: AlertRow[] = [
    [1, 9, 0, 'email', ['tendai'], 'security', '2 software updates are waiting: website system 6.4.2 and booking plugin 3.1.'],
    [5, 21, 43, 'whatsapp', ['tendai'], 'up', `${booking} is back up. Down for 3 min, restarted automatically.`],
    [5, 21, 42, 'whatsapp', ['tendai'], 'down', `${booking} is down since 21:40. We’re restarting it now.`],
    [5, 21, 42, 'email', ['tendai', 'rudo'], 'down', `${booking} is down since 21:40. We’re restarting it now.`],
    [5, 9, 0, 'email', ['tendai'], 'certificate', 'The booking site certificate expires in 14 days.'],
    [6, 2, 41, 'email', ['rudo'], 'backup', 'Backup finished on the second try, at 02:40.'],
    [6, 2, 5, 'email', ['rudo'], 'backup', 'Last night’s backup failed: storage was full. Making space and trying again.'],
    [17, 14, 23, 'whatsapp', ['tendai'], 'up', `${main} is back up. Down for 18 min.`],
    [17, 14, 7, 'whatsapp', ['tendai'], 'down', `${main} is down since 14:05. The hosting provider is fixing a network fault.`],
  ]
  return rows.map(([days, h, m, channel, to, kind, text], i) => ({
    id: `al-sample-${i}`,
    at: daysAgoAt(days, h, m),
    channel,
    to,
    kind,
    text,
  }))
}

/** Updates installed earlier this month, before the visitor arrives. */
export const UPDATES_EARLIER = 3

export function createInitialState(): MonitorState {
  return {
    incidents: sampleIncidents(),
    backups: sampleBackups(),
    restores: [],
    alerts: sampleAlerts(),
    fixes: {},
    channels: { tendai: { whatsapp: true, email: true }, rudo: { email: true } },
    rules: { down: true, certificate: true, backup: true, security: true, speed: false },
    retentionDays: 30,
    emailOnBackupFail: true,
  }
}
