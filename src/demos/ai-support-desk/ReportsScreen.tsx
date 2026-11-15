import { Bot, Clock, Inbox, ThumbsUp, Timer } from 'lucide-react'
import { duration } from '../../lib/format'
import { DAY, isSameDay } from '../../lib/time'
import { BarChart, Panel, Stat } from '../ui'
import { TOPICS, deskStats } from './engine'
import type { Channel, Ticket } from './types'

const CHANNELS: Channel[] = ['Email', 'WhatsApp', 'Web chat']
const HOURS = Array.from({ length: 12 }, (_, i) => 6 + i)

export function ReportsScreen({ tickets, now }: { tickets: Ticket[]; now: number }) {
  const s = deskStats(tickets, now)
  const today = tickets.filter((t) => isSameDay(t.createdAt, now))
  const yesterday = tickets.filter((t) => isSameDay(t.createdAt, now - DAY))
  const hourNow = new Date(now).getHours()

  const topics = [...TOPICS, 'Not triaged yet' as const]
    .map((topic) => {
      const match = (t: Ticket) => (t.triage?.topic ?? 'Not triaged yet') === topic
      return { topic, today: today.filter(match).length, yesterday: yesterday.filter(match).length }
    })
    .filter((row) => row.today + row.yesterday > 0)
  const maxTopic = Math.max(1, ...topics.map((r) => r.today + r.yesterday))

  const channels = CHANNELS.map((channel) => ({ channel, count: today.filter((t) => t.channel === channel).length }))
  const byHour = HOURS.map((h) => ({
    label: String(h).padStart(2, '0'),
    value: today.filter((t) => new Date(t.createdAt).getHours() === h).length,
    muted: h > hourNow,
  }))

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Inbox} label="Open tickets" value={s.open} detail={`${s.urgent} urgent · ${s.overdue} overdue`} tone="accent" />
        <Stat
          icon={Timer}
          label="Average first reply"
          value={s.avgFirstReply === null ? 'None yet' : duration(s.avgFirstReply)}
          detail="Today’s tickets, all channels"
        />
        <Stat icon={Bot} label="Answered automatically" value={s.auto} detail={`${s.autoPct}% of today’s ${s.today} tickets`} tone="green" />
        <Stat
          icon={Clock}
          label="Replies on time"
          value={s.onTimePct === null ? 'None yet' : `${s.onTimePct}%`}
          detail="First reply within the target"
          tone={s.onTimePct !== null && s.onTimePct < 80 ? 'amber' : 'neutral'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Panel title="Tickets by topic" description="Today and yesterday">
          <ul className="space-y-3">
            {topics.map((row) => (
              <li key={row.topic}>
                <div className="flex flex-wrap justify-between gap-x-3 text-sm">
                  <span className="text-slate-800">{row.topic}</span>
                  <span className="text-slate-600 tabular-nums">
                    {row.today} today · {row.yesterday} yesterday
                  </span>
                </div>
                <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                  <div className="h-full bg-(--accent)" style={{ width: `${(row.today / maxTopic) * 100}%` }} />
                  <div className="h-full bg-slate-400" style={{ width: `${(row.yesterday / maxTopic) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600" aria-hidden="true">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-(--accent)" />
              Today
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-slate-400" />
              Yesterday
            </span>
          </p>
        </Panel>

        <div className="space-y-4">
          <Panel title="Tickets by channel" description="Today">
            <ul className="space-y-3">
              {channels.map((c) => (
                <li key={c.channel}>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-700">{c.channel}</span>
                    <span className="font-semibold tabular-nums">
                      {c.count} <span className="font-normal text-slate-600">({s.today ? Math.round((c.count / s.today) * 100) : 0}%)</span>
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100" aria-hidden="true">
                    <div className="h-full rounded-full bg-(--accent)" style={{ width: `${s.today ? (c.count / s.today) * 100 : 0}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Customer satisfaction" description="Sample ratings from customers after a ticket is solved">
            <p className="flex items-center gap-2 text-2xl font-bold text-slate-900 tabular-nums">
              <ThumbsUp className="size-5 text-emerald-700" aria-hidden="true" />
              {s.positivePct === null ? 'No ratings yet' : `${s.positivePct}% positive`}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Sample ratings on {s.rated} solved {s.rated === 1 ? 'ticket' : 'tickets'}
            </p>
          </Panel>
        </div>
      </div>

      <Panel title="Tickets per hour" description="Today. Later hours are greyed out.">
        <BarChart data={byHour} format={(v) => `${v} ${v === 1 ? 'ticket' : 'tickets'}`} label="Tickets received per hour today" />
      </Panel>
    </div>
  )
}
