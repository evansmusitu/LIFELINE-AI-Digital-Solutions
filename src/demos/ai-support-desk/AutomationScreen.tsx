import { Bot, PenLine, Tags, UserRound } from 'lucide-react'
import { Avatar, Field, Panel, SelectInput, Stat, Toggle } from '../ui'
import { AGENTS, AGENT_IDS, PRIORITIES, type DeskStats } from './engine'
import type { AgentId, Priority, Settings } from './types'

type Rule = Exclude<keyof Settings, 'targets'>

const RULES: { key: Rule; label: string; description: string; sub?: Rule }[] = [
  {
    key: 'autoAnswer',
    label: 'Answer order-status questions automatically',
    description: 'Sends the status, courier and latest tracking update straight away while an order is on its way. Delayed or delivered orders go to a person.',
    sub: 'autoClose',
  },
  { key: 'angryHigh', label: 'Flag angry customers as high priority', description: 'Raises the priority by one level when a message sounds upset.' },
  { key: 'safetyUrgent', label: 'Treat safety problems as urgent', description: 'Gas smells, leaks, burns, fire and injuries go straight to the top of the queue.' },
  { key: 'detectLanguage', label: 'Detect the customer’s language', description: 'Spots Afrikaans and writes order replies in Afrikaans.' },
  {
    key: 'returnsToAisha',
    label: 'Send refunds and returns to Aisha',
    description: 'Returns, refunds and warranty claims go to Aisha Daniels. When this is off, they’re shared across the team in turn.',
  },
]

const LABELS: Record<Rule, string> = {
  autoAnswer: 'Automatic order answers',
  autoClose: 'Closing on-time orders',
  angryHigh: 'Flagging angry customers',
  safetyUrgent: 'Urgent safety problems',
  detectLanguage: 'Language detection',
  returnsToAisha: 'Sending refunds and returns to Aisha',
}

const TARGETS = [30, 60, 120, 240, 480, 1440]
const targetLabel = (minutes: number) => (minutes < 60 ? `${minutes} min` : `${minutes / 60} h`)

interface Props {
  settings: Settings
  stats: DeskStats
  onChange: (patch: Partial<Settings>, message: string) => void
}

export function AutomationScreen({ settings, stats, onChange }: Props) {
  const setRule = (key: Rule, value: boolean) => {
    const patch: Partial<Settings> = {}
    patch[key] = value
    onChange(patch, `${LABELS[key]} ${value ? 'switched on' : 'switched off'}. New tickets follow this rule.`)
  }
  const routing: Record<AgentId, string> = {
    thandiwe: 'Team lead. Urgent tickets and complaints.',
    pieter: 'Order questions and delivery problems.',
    aisha: settings.returnsToAisha ? 'Returns, refunds and warranty claims.' : 'Shares returns and refunds with the team.',
  }
  const setTarget = (priority: Priority, minutes: number) =>
    onChange(
      { targets: { ...settings.targets, [priority]: minutes } },
      `${priority} tickets now need a first reply within ${targetLabel(minutes)}. Reply-due times are updated.`,
    )

  return (
    <div className="grid grid-cols-1 gap-4 p-3 sm:p-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <Panel title="What the assistant does" description="Changes apply to new messages and to the next triage run.">
          <ul className="divide-y divide-slate-100">
            {RULES.map((rule) => (
              <li key={rule.key} className="py-3 first:pt-0 last:pb-0">
                <Toggle label={rule.label} description={rule.description} checked={settings[rule.key]} onChange={(v) => setRule(rule.key, v)} />
                {rule.sub && settings[rule.key] && (
                  <Toggle
                    className="mt-3 ml-4 border-l-2 border-slate-200 pl-3"
                    label="Close the ticket if the order is on time"
                    description="Otherwise the ticket stays open so someone can follow up."
                    checked={settings[rule.sub]}
                    onChange={(v) => setRule(rule.sub!, v)}
                  />
                )}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Reply-time targets" description="How soon each ticket needs its first reply. Open tickets update straight away.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PRIORITIES.map((priority) => (
              <Field key={priority} label={priority} htmlFor={`target-${priority}`}>
                <SelectInput id={`target-${priority}`} value={settings.targets[priority]} onChange={(e) => setTarget(priority, Number(e.target.value))}>
                  {TARGETS.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {targetLabel(minutes)}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            ))}
          </div>
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel title="Assistant activity today">
          <div className="grid grid-cols-2 gap-3">
            <Stat icon={Tags} label="Tickets triaged" value={stats.triaged} tone="accent" />
            <Stat icon={Bot} label="Auto-replies sent" value={stats.auto} tone="green" />
            <Stat icon={PenLine} label="Suggested replies used" value={stats.suggestions} />
            <Stat icon={UserRound} label="Corrections by agents" value={stats.corrections} tone="amber" />
          </div>
        </Panel>
        <Panel title="Who gets what">
          <ul className="space-y-3">
            {AGENT_IDS.map((id) => (
              <li key={id} className="flex items-center gap-3">
                <Avatar name={AGENTS[id].name} />
                <p className="min-w-0 text-sm">
                  <span className="font-medium text-slate-900">{AGENTS[id].name}</span>
                  <span className="block text-xs text-slate-600">{routing[id]}</span>
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
