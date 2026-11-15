import { ChevronDown, Download, Flame, MessageCircle, Search, Snowflake, Thermometer, Users } from 'lucide-react'
import { Fragment, useState } from 'react'
import { cn } from '../../lib/cn'
import { dayAndTime } from '../../lib/format'
import { td, th } from '../styles'
import { AppButton, Badge, SelectInput, Stat, TextInput } from '../ui'
import { TEMPERATURE_LABEL, optionLabel } from './engine'
import { LEAD_STATUSES, temperatureTone } from './helpers'
import type { Lead, LeadStatus, Temperature } from './types'

interface Props {
  leads: Lead[]
  now: number
  onLeadStatus: (leadId: string, status: LeadStatus) => void
  onOpenConversation: (conversationId: string) => void
}

function toCsv(leads: Lead[]): string {
  const header = ['Name', 'Company', 'Contact', 'Score', 'Temperature', 'Status', 'Owner', 'Project', 'Size', 'Start', 'Budget', 'Source', 'Captured']
  const rows = leads.map((l) => [
    l.name,
    l.company,
    l.contact,
    String(l.score),
    TEMPERATURE_LABEL[l.temperature],
    l.status,
    l.owner,
    optionLabel('projectType', l.answers.projectType) ?? '',
    optionLabel('size', l.answers.size) ?? '',
    optionLabel('timeline', l.answers.timeline) ?? '',
    optionLabel('budget', l.answers.budget) ?? '',
    l.source,
    new Date(l.capturedAt).toISOString(),
  ])
  return [header, ...rows].map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')
}

function download(leads: Lead[]) {
  const blob = new Blob([toCsv(leads)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'dunebridge-sample-leads.csv'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function LeadsScreen({ leads, now, onLeadStatus, onOpenConversation }: Props) {
  const [filter, setFilter] = useState<Temperature | 'all'>('all')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  const sorted = [...leads].sort((a, b) => b.capturedAt - a.capturedAt)
  const q = query.trim().toLowerCase()
  const shown = sorted.filter(
    (l) => (filter === 'all' || l.temperature === filter) && (!q || `${l.name} ${l.company}`.toLowerCase().includes(q)),
  )
  const count = (t: Temperature) => leads.filter((l) => l.temperature === t).length

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Users} label="Leads this week" value={leads.length} tone="accent" />
        <Stat icon={Flame} label="Hot" value={count('hot')} detail="Passed to a designer" tone="red" />
        <Stat icon={Thermometer} label="Warm" value={count('warm')} detail="Offered a call" tone="amber" />
        <Stat icon={Snowflake} label="Cold" value={count('cold')} detail="Sent the cost guide" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by lead temperature">
            {(['all', 'hot', 'warm', 'cold'] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={filter === t}
                onClick={() => setFilter(t)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                  filter === t ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                )}
              >
                {t === 'all' ? `All ${leads.length}` : `${TEMPERATURE_LABEL[t]} ${count(t)}`}
              </button>
            ))}
          </div>
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <label htmlFor="lead-search" className="sr-only">
              Search leads
            </label>
            <TextInput
              id="lead-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or company"
              className="pl-9"
            />
          </div>
          <AppButton variant="secondary" icon={Download} onClick={() => download(shown)}>
            Export CSV
          </AppButton>
        </div>

        {/* Table on larger screens */}
        <div className="hidden relative overflow-x-auto md:block">
          <table className="w-full min-w-[56rem]">
            <thead className="bg-slate-50">
              <tr>
                <th className={th}>Lead</th>
                <th className={th}>Project</th>
                <th className={th}>Budget</th>
                <th className={th}>Score</th>
                <th className={th}>Status</th>
                <th className={th}>Owner</th>
                <th className={th}>Captured</th>
                <th className={th}>
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((lead) => (
                <Fragment key={lead.id}>
                  <tr className={cn(open === lead.id && 'bg-slate-50')}>
                    <td className={td}>
                      <p className="font-semibold text-slate-900">{lead.name}</p>
                      <p className="text-xs text-slate-600">{lead.company}</p>
                    </td>
                    <td className={td}>
                      <p>{optionLabel('projectType', lead.answers.projectType)}</p>
                      <p className="text-xs text-slate-600">{optionLabel('size', lead.answers.size)}</p>
                    </td>
                    <td className={cn(td, 'whitespace-nowrap')}>{optionLabel('budget', lead.answers.budget)}</td>
                    <td className={td}>
                      <Badge tone={temperatureTone[lead.temperature]}>
                        {TEMPERATURE_LABEL[lead.temperature]} {lead.score}
                      </Badge>
                    </td>
                    <td className={td}>
                      <label htmlFor={`status-${lead.id}`} className="sr-only">
                        Status for {lead.name}
                      </label>
                      <SelectInput
                        id={`status-${lead.id}`}
                        value={lead.status}
                        onChange={(e) => onLeadStatus(lead.id, e.target.value as LeadStatus)}
                        compact
                        fullWidth={false}
                        className="w-40"
                      >
                        {LEAD_STATUSES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </SelectInput>
                    </td>
                    <td className={cn(td, 'whitespace-nowrap')}>{lead.owner}</td>
                    <td className={cn(td, 'whitespace-nowrap text-slate-600')}>{dayAndTime(lead.capturedAt, now)}</td>
                    <td className={td}>
                      <button
                        type="button"
                        aria-expanded={open === lead.id}
                        aria-label={`${open === lead.id ? 'Hide' : 'Show'} summary for ${lead.name}`}
                        onClick={() => setOpen(open === lead.id ? null : lead.id)}
                        className="grid size-8 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
                      >
                        <ChevronDown className={cn('size-4 transition', open === lead.id && 'rotate-180')} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                  {open === lead.id && (
                    <tr className="bg-slate-50">
                      <td colSpan={8} className="px-3 pb-4">
                        <LeadSummary lead={lead} onOpenConversation={onOpenConversation} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cards on phones */}
        <ul className="divide-y divide-slate-100 md:hidden">
          {shown.map((lead) => (
            <li key={lead.id} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{lead.name}</p>
                  <p className="text-xs text-slate-600">
                    {lead.company} · {dayAndTime(lead.capturedAt, now)}
                  </p>
                </div>
                <Badge tone={temperatureTone[lead.temperature]}>
                  {TEMPERATURE_LABEL[lead.temperature]} {lead.score}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-slate-700">{lead.summary}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label htmlFor={`m-status-${lead.id}`} className="sr-only">
                  Status for {lead.name}
                </label>
                <SelectInput
                  id={`m-status-${lead.id}`}
                  value={lead.status}
                  onChange={(e) => onLeadStatus(lead.id, e.target.value as LeadStatus)}
                  fullWidth={false}
                  className="min-w-0 flex-1"
                >
                  {LEAD_STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </SelectInput>
                {lead.conversationId && (
                  <AppButton
                    variant="secondary"
                    size="sm"
                    icon={MessageCircle}
                    onClick={() => onOpenConversation(lead.conversationId!)}
                    aria-label={`Open the chat with ${lead.name}`}
                  >
                    Open chat
                  </AppButton>
                )}
              </div>
            </li>
          ))}
        </ul>

        {shown.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-600">No leads match that search.</p>}
      </div>
    </div>
  )
}

function LeadSummary({ lead, onOpenConversation }: { lead: Lead; onOpenConversation: (id: string) => void }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold text-slate-600">Assistant summary</p>
        <p className="mt-1 text-sm text-slate-800">{lead.summary}</p>
        <p className="mt-2 text-xs text-slate-600">
          Contact: <span className="font-medium text-slate-800">{lead.contact}</span> · Source: {lead.source}
        </p>
      </div>
      {lead.conversationId && (
        <AppButton
          variant="secondary"
          size="sm"
          icon={MessageCircle}
          onClick={() => onOpenConversation(lead.conversationId!)}
          aria-label={`Open the chat with ${lead.name}`}
        >
          Open chat
        </AppButton>
      )}
    </div>
  )
}
