import { BellRing, CalendarDays, CreditCard, Inbox, MessageCircle, Send, Users } from 'lucide-react'
import { useState } from 'react'
import { relativeTime } from '../../lib/format'
import { AppButton, Badge, Notice, Panel, Segmented, Stat } from '../ui'
import { BUSINESS, type Mode } from './business'
import { addDays, dayLabel, dayWord, firstNameOf, hhmm, isOpenDay, messageLog, practiceDay, practiceMinute, serviceById, timeLabel } from './engine'
import { ModeBadge, SourceBadge } from './parts'
import type { Booking, Lead, LeadStatus } from './types'

type Filter = 'all' | Mode

interface Props {
  bookings: Booking[]
  leads: Lead[]
  remindedAt: Record<string, number>
  now: number
  onContacted: (leadId: string) => void
  onRemind: (bookingId: string) => void
}

const LEAD_TONE: Record<LeadStatus, 'amber' | 'violet' | 'blue' | 'green'> = { New: 'amber', 'Handed over': 'violet', Contacted: 'blue', Booked: 'green' }

export function OwnerScreen({ bookings, leads, remindedAt, now, onContacted, onRemind }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const today = practiceDay(now)
  const live = bookings.filter((b) => b.status !== 'Cancelled')
  const shown = live.filter((b) => filter === 'all' || b.mode === filter).sort((a, b) => a.start - b.start)
  const todays = shown.filter((b) => practiceDay(b.start) === today)
  const upcoming = shown.filter((b) => practiceDay(b.start) > today && practiceDay(b.start) <= addDays(today, 7))
  const upcomingDays = [...new Set(upcoming.map((b) => practiceDay(b.start)))]
  const week = live.filter((b) => practiceDay(b.start) >= today && practiceDay(b.start) <= addDays(today, 7))
  const log = messageLog(live, now, remindedAt)
  const sent = log.filter((m) => m.sent)
  const scheduled = log.filter((m) => !m.sent).sort((a, b) => a.at - b.at)
  const openLeads = leads.filter((l) => l.status === 'New' || l.status === 'Handed over').length
  const byId = new Map(bookings.map((b) => [b.id, b]))

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Bookings today" value={live.filter((b) => practiceDay(b.start) === today).length} icon={CalendarDays} tone="accent" detail="Both offices and online" />
        <Stat label="Next 7 days" value={week.length} icon={Users} detail={`${week.filter((b) => b.mode === 'online').length} online`} />
        <Stat label="Enquiries to answer" value={openLeads} icon={Inbox} tone="amber" detail={`${leads.length} in the list`} />
        <Stat label="WhatsApp messages sent" value={sent.length} icon={BellRing} tone="green" detail={`${scheduled.length} scheduled`} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented
          label="Show bookings for"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'harare', label: 'Harare' },
            { value: 'johannesburg', label: 'Johannesburg' },
            { value: 'online', label: 'Online' },
          ]}
        />
        <p className="text-xs text-slate-600">{BUSINESS.timeLabel}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-4">
          <Panel title={`Today, ${dayLabel(today)}`} description={`${todays.length} booking${todays.length === 1 ? '' : 's'}`} bodyClassName="p-0!">
            <BookingList
              bookings={todays}
              now={now}
              remindedAt={remindedAt}
              onRemind={onRemind}
              empty={isOpenDay(today) ? 'No bookings today for this filter.' : 'Closed today: both offices and online consultations are closed on Sundays.'}
            />
          </Panel>
          <Panel title="Coming up" description="The next 7 days" bodyClassName="p-0!">
            {upcomingDays.length === 0 ? (
              <p className="p-4 text-sm text-slate-600">Nothing booked yet for this filter.</p>
            ) : (
              upcomingDays.map((d) => (
                <div key={d}>
                  <p className="border-y border-slate-100 bg-slate-50 px-4 py-1.5 text-xs font-semibold text-slate-700 first:border-t-0">
                    {dayWord(d, now) === 'tomorrow' ? `Tomorrow, ${dayLabel(d)}` : dayLabel(d)}
                  </p>
                  <BookingList bookings={upcoming.filter((b) => practiceDay(b.start) === d)} now={now} remindedAt={remindedAt} onRemind={onRemind} />
                </div>
              ))
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Enquiries and leads" description="Website chat, WhatsApp, Facebook and LinkedIn in one list" bodyClassName="p-0!">
            <ul className="divide-y divide-slate-100">
              {[...leads].sort((a, b) => b.at - a.at).map((l) => (
                <li key={l.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="font-semibold text-slate-900">{l.name}</p>
                    {l.mine && <Badge tone="accent">You</Badge>}
                    <SourceBadge source={l.source} />
                    <Badge tone={LEAD_TONE[l.status]}>{l.status}</Badge>
                    <span className="ml-auto text-xs text-slate-600">{relativeTime(l.at, now)}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-800">{l.interest}</p>
                  <p className="text-xs text-slate-600">
                    {l.note} · {l.contact}
                  </p>
                  {(l.status === 'New' || l.status === 'Handed over') && (
                    <AppButton size="sm" variant="secondary" icon={MessageCircle} className="mt-2" onClick={() => onContacted(l.id)}>
                      Mark as contacted
                    </AppButton>
                  )}
                </li>
              ))}
            </ul>
            <p className="border-t border-slate-100 px-4 py-2 text-[0.7rem] text-slate-600">
              Facebook and LinkedIn enquiries arrive through the links on those pages to the website chat and booking page.
            </p>
          </Panel>

          <Panel title="WhatsApp confirmations and reminders" description="Sent automatically: a confirmation on booking, a reminder at 17:00 the day before" bodyClassName="p-0!">
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {[...scheduled.slice(0, 3), ...sent.slice(0, 8)].map((m) => {
                const b = byId.get(m.bookingId)
                if (!b) return null
                return (
                  <li key={`${m.bookingId}-${m.kind}-${m.at}`} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                    <Send className="mt-0.5 size-4 shrink-0 text-(--accent)" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-900">
                        {m.kind} to {b.client.name.split(' ')[0]} <span className="text-slate-600">· {b.client.phone}</span>
                      </p>
                      <p className="text-xs text-slate-600">
                        For {dayWord(practiceDay(b.start), now)} {timeLabel(b.start)} · {m.sent ? 'sent' : 'scheduled for'} {dayWord(practiceDay(m.at), now)} {timeLabel(m.at)}
                      </p>
                    </div>
                    <Badge tone={m.sent ? 'green' : 'neutral'}>{m.sent ? 'Sent' : 'Scheduled'}</Badge>
                  </li>
                )
              })}
            </ul>
          </Panel>

          <Notice tone="neutral" icon={CreditCard} title="Optional later: deposits">
            Not part of the first setup, and not working in this demo. Later, bookings could take a deposit by EcoCash or card in
            Zimbabwe, or by card or EFT in South Africa. Payment providers charge a fee per payment.
          </Notice>
        </div>
      </div>
    </div>
  )
}

function BookingList({
  bookings,
  now,
  remindedAt,
  onRemind,
  empty,
}: {
  bookings: Booking[]
  now: number
  remindedAt: Record<string, number>
  onRemind: (bookingId: string) => void
  empty?: string
}) {
  if (!bookings.length) return <p className="p-4 text-sm text-slate-600">{empty ?? 'No bookings.'}</p>
  return (
    <ul className="divide-y divide-slate-100">
      {bookings.map((b) => {
        const service = serviceById(b.serviceId)
        const from = practiceMinute(b.start)
        const done = b.status === 'Completed' || b.start + b.minutes * 60_000 <= now
        return (
          <li key={b.id} className="flex items-start gap-3 px-4 py-3">
            <p className="w-12 shrink-0 pt-0.5 text-sm font-semibold text-slate-900 tabular-nums">{hhmm(from)}</p>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="font-semibold text-slate-900">{b.client.name}</p>
                {b.mine && <Badge tone="accent">You</Badge>}
                <ModeBadge mode={b.mode} />
                {done && <Badge tone="neutral">Done</Badge>}
              </div>
              <p className="text-sm text-slate-700">
                {service.name} · {service.minutes} min · {firstNameOf(b.practitionerId)}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                Booked via <SourceBadge source={b.source} /> · {b.ref}
              </p>
              {/* Reminders go automatically; tomorrow's can also be sent by hand. */}
              {!done && practiceDay(b.start) === addDays(practiceDay(now), 1) && (
                <AppButton
                  size="sm"
                  variant="ghost"
                  icon={BellRing}
                  className="mt-1 -ml-3"
                  onClick={() => onRemind(b.id)}
                  disabled={!!remindedAt[b.id]}
                  aria-label={`Send a reminder to ${b.client.name} now`}
                >
                  {remindedAt[b.id] ? 'Reminder sent' : 'Send reminder now'}
                </AppButton>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
