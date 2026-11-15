import { FileText, Mail, Send } from 'lucide-react'
import { useState } from 'react'
import { WhatsAppIcon } from '../../components/WhatsAppIcon'
import { cn } from '../../lib/cn'
import { dayAndTime, pct } from '../../lib/format'
import { AppButton, Avatar, Badge, Panel, Toggle, type Tone } from '../ui'
import { LODGE, PEOPLE, RULES } from './data'
import { listNames, type Summary } from './engine'
import { wrapButton } from './parts'
import type { AlertEntry, AlertKind, Channel, MonitorState, PersonId, RuleId } from './types'

interface Props {
  state: MonitorState
  summary: Summary
  /** Alerts from an outage that is still playing. */
  pending: AlertEntry[]
  now: number
  onChannel: (person: PersonId, channel: Channel, on: boolean) => void
  onRule: (rule: RuleId, on: boolean, label: string) => void
  onSendReport: (month: string) => void
}

const KIND: Record<AlertKind, { label: string; tone: Tone }> = {
  down: { label: 'Site down', tone: 'red' },
  up: { label: 'Back up', tone: 'green' },
  backup: { label: 'Backup', tone: 'amber' },
  certificate: { label: 'Certificate', tone: 'amber' },
  security: { label: 'Security', tone: 'violet' },
  report: { label: 'Report', tone: 'blue' },
}

const firstName = (id: PersonId) => PEOPLE.find((p) => p.id === id)?.name.split(' ')[0] ?? id

export function AlertsScreen({ state, summary, pending, now, onChannel, onRule, onSendReport }: Props) {
  const [showAll, setShowAll] = useState(false)
  const log = [...pending, ...state.alerts].sort((a, b) => b.at - a.at)
  const shown = showAll ? log : log.slice(0, 8)
  const month = new Date(now).toLocaleDateString(LODGE.locale, { month: 'long', year: 'numeric' })
  const tendai = PEOPLE[0]

  const figures: [string, string][] = [
    ['Uptime, both sites', pct(summary.uptimeAll, 2)],
    ['Incidents', String(summary.incidents30)],
    ['Backups completed', String(summary.backupsMade)],
    ['Updates installed', String(summary.updatesInstalled)],
    ['Security score', `${summary.security}/100`],
    ['Average response', `${summary.avgMs} ms`],
  ]

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Who gets alerts" description="Each person chooses how they hear about problems">
          <ul className="divide-y divide-slate-100">
            {PEOPLE.map((person) => (
              <li key={person.id} className="space-y-3 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <Avatar name={person.name} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{person.name}</p>
                    <p className="text-xs text-slate-600">{person.role}</p>
                  </div>
                </div>
                {person.whatsapp && (
                  <Toggle
                    label="WhatsApp"
                    description={person.whatsapp}
                    ariaLabel={`WhatsApp alerts for ${person.name}`}
                    checked={Boolean(state.channels[person.id]?.whatsapp)}
                    onChange={(on) => onChannel(person.id, 'whatsapp', on)}
                  />
                )}
                <Toggle
                  label="Email"
                  description={person.email}
                  ariaLabel={`Email alerts for ${person.name}`}
                  checked={Boolean(state.channels[person.id]?.email)}
                  onChange={(on) => onChannel(person.id, 'email', on)}
                  className="[&_p]:break-all"
                />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Send an alert when…" description="Rules apply to both sites">
          <ul className="space-y-4">
            {RULES.map((rule) => (
              <li key={rule.id}>
                <Toggle
                  label={rule.label}
                  description={rule.description}
                  checked={state.rules[rule.id]}
                  onChange={(on) => onRule(rule.id, on, rule.label)}
                />
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel title="Alert log" description="Recent alerts sent, newest first" bodyClassName="p-0!">
          <ul className="divide-y divide-slate-100">
            {shown.map((alert) => (
              <li key={alert.id} className="flex gap-3 px-4 py-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700">
                  {alert.channel === 'whatsapp' ? (
                    <WhatsAppIcon className="size-4 text-[#128c4b]" />
                  ) : (
                    <Mail className="size-4" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm break-words text-slate-900">{alert.text}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                    <Badge tone={KIND[alert.kind].tone}>{KIND[alert.kind].label}</Badge>
                    <span>
                      {alert.channel === 'whatsapp' ? 'WhatsApp' : 'Email'} to {listNames(alert.to.map(firstName))} ·{' '}
                      {dayAndTime(alert.at, now, LODGE.locale)}
                    </span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {log.length > shown.length && (
            <div className="border-t border-slate-100 p-3">
              <AppButton variant="ghost" onClick={() => setShowAll(true)} className="w-full">
                Show all {log.length} alerts
              </AppButton>
            </div>
          )}
        </Panel>

        <Panel title="Monthly report" description="Sent on the 1st of every month" className="self-start">
          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm ring-4 ring-slate-50">
            <header className="flex items-start gap-3 border-b border-slate-100 pb-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-(--accent) text-white">
                <FileText className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">{LODGE.name}</p>
                <p className="text-xs text-slate-600">Website report · {month} · last 30 days</p>
              </div>
            </header>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3">
              {figures.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-slate-600">{label}</dt>
                  <dd className="text-base font-bold text-slate-900 tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-700">
              {summary.openIssues.length
                ? `Still to do: ${summary.openIssues.length} security ${summary.openIssues.length === 1 ? 'fix' : 'fixes'}. Each takes one tap.`
                : 'Nothing left to do this month.'}
            </p>
          </article>
          <AppButton icon={Send} onClick={() => onSendReport(month)} className={cn('mt-4 w-full', wrapButton)}>
            Send report to {tendai.name.split(' ')[0]} now
          </AppButton>
          <p className="mt-2 text-xs break-all text-slate-600">Goes to {tendai.email}</p>
        </Panel>
      </div>
    </div>
  )
}
