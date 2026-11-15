import { MessageCircle, Search, StickyNote } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import { clockTime, money, num, shortDate } from '../../lib/format'
import { td, th } from '../styles'
import { AppButton, Avatar, Badge, Modal, Notice, TextInput } from '../ui'
import { clientSummary, dayLabel, dueBack, dueBackLabel, rebookMessage, sameDay, serviceById, staffFirst, type DueBack } from './engine'
import { Chip, Rows, TierBadge, WhatsAppBubble } from './parts'
import type { Appointment, Client } from './types'

type Filter = 'all' | 'due' | 'booked'

const ORDER: Record<DueBack['kind'], number> = { overdue: 0, soon: 1, booked: 2, later: 3, none: 4 }
const isDue = (due: DueBack) => due.kind === 'overdue' || due.kind === 'soon'

interface Props {
  clients: Client[]
  appointments: Appointment[]
  now: number
  onRebook: (clientId: string) => void
}

export function ClientsScreen({ clients, appointments, now, onRebook }: Props) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const rows = clients
    .map((c) => ({ c, s: clientSummary(c), due: dueBack(c, appointments, now) }))
    .sort((a, b) => ORDER[a.due.kind] - ORDER[b.due.kind] || a.c.name.localeCompare(b.c.name))
  const q = query.trim().toLowerCase()
  const shown = rows.filter(
    (r) =>
      (filter === 'all' || (filter === 'due' ? isDue(r.due) : r.due.kind === 'booked')) &&
      (!q || `${r.c.name} ${r.c.phone} ${r.c.email ?? ''} ${r.c.notes ?? ''}`.toLowerCase().includes(q)),
  )
  const dueCount = rows.filter((r) => isDue(r.due)).length
  const bookedCount = rows.filter((r) => r.due.kind === 'booked').length
  const open = rows.find((r) => r.c.id === openId)

  const dueCell = (r: (typeof rows)[number]) => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={r.due.kind === 'overdue' ? 'amber' : r.due.kind === 'booked' ? 'green' : r.due.kind === 'soon' ? 'blue' : 'neutral'}>
        {dueBackLabel(r.due, now)}
      </Badge>
      {isDue(r.due) &&
        (r.c.contactedAt && sameDay(r.c.contactedAt, now) ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-800">
            <MessageCircle className="size-3.5" aria-hidden="true" />
            Messaged {clockTime(r.c.contactedAt)}
          </span>
        ) : (
          <AppButton size="sm" variant="secondary" icon={MessageCircle} onClick={() => onRebook(r.c.id)} aria-label={`Send rebooking message to ${r.c.name}`}>
            Send rebooking message
          </AppButton>
        ))}
    </div>
  )

  return (
    <div className="space-y-3 p-3 sm:p-5">
      <p className="text-sm text-slate-700">
        “Due back” uses how often each treatment is usually repeated, for example a root touch-up every 6 weeks. Clients with a booking drop off the list.
      </p>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3">
          <div className="relative min-w-0 flex-1 basis-56">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <label htmlFor="cl-search" className="sr-only">
              Search clients
            </label>
            <TextInput id="cl-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, number or note" className="pl-9" />
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter clients">
            <Chip pressed={filter === 'all'} onClick={() => setFilter('all')}>
              All ({clients.length})
            </Chip>
            <Chip pressed={filter === 'due'} onClick={() => setFilter('due')}>
              Due back ({dueCount})
            </Chip>
            <Chip pressed={filter === 'booked'} onClick={() => setFilter('booked')}>
              Booked ({bookedCount})
            </Chip>
          </div>
        </div>

        <div className="relative hidden overflow-x-auto md:block">
          <table className="w-full min-w-[56rem]">
            <thead className="bg-slate-50">
              <tr>
                <th className={th}>Client</th>
                <th className={th}>Tier</th>
                <th className={cn(th, 'text-right')}>Visits</th>
                <th className={th}>Last visit</th>
                <th className={cn(th, 'text-right')}>Spent</th>
                <th className={cn(th, 'text-right')}>Points</th>
                <th className={th}>Due back</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((r) => (
                <tr key={r.c.id}>
                  <td className={td}>
                    <button type="button" onClick={() => setOpenId(r.c.id)} className="flex items-center gap-2.5 text-left hover:underline">
                      <Avatar name={r.c.name} className="size-8" />
                      <span>
                        <span className="block font-medium text-slate-900">
                          {r.c.name} {r.c.isVisitor && <Badge tone="accent">You</Badge>}
                        </span>
                        <span className="block text-xs text-slate-600">
                          {r.c.phone}
                          {r.c.preferredStaff && ` · usually ${staffFirst(r.c.preferredStaff)}`}
                        </span>
                        {r.c.notes && <span className="block max-w-64 truncate text-xs text-slate-600">{r.c.notes}</span>}
                      </span>
                    </button>
                  </td>
                  <td className={td}>
                    <TierBadge tier={r.s.tier} />
                  </td>
                  <td className={cn(td, 'text-right tabular-nums')}>{r.s.visits}</td>
                  <td className={cn(td, 'text-slate-700')}>{r.s.last ? shortDate(r.s.last) : 'None yet'}</td>
                  <td className={cn(td, 'text-right tabular-nums')}>{money(r.s.spent)}</td>
                  <td className={cn(td, 'text-right font-semibold tabular-nums')}>{num(r.s.balance)}</td>
                  <td className={td}>{dueCell(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-slate-100 md:hidden">
          {shown.map((r) => (
            <li key={r.c.id} className="space-y-2 p-3">
              <button type="button" onClick={() => setOpenId(r.c.id)} className="flex w-full items-start gap-3 text-left">
                <Avatar name={r.c.name} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5 font-medium break-words text-slate-900">
                    {r.c.name}
                    <TierBadge tier={r.s.tier} />
                    {r.c.isVisitor && <Badge tone="accent">You</Badge>}
                  </span>
                  <span className="block text-xs text-slate-600">
                    {r.s.visits} visits · last {r.s.last ? shortDate(r.s.last) : 'none yet'} · {money(r.s.spent)} · {num(r.s.balance)} pts
                    {r.c.preferredStaff && ` · usually ${staffFirst(r.c.preferredStaff)}`}
                  </span>
                  {r.c.notes && <span className="block text-xs text-slate-600">Note: {r.c.notes}</span>}
                </span>
              </button>
              {dueCell(r)}
            </li>
          ))}
        </ul>
        {shown.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-600">No clients match. Try another name or filter.</p>}
      </div>

      {open && <ClientModal key={open.c.id} client={open.c} due={open.due} appointments={appointments} now={now} onClose={() => setOpenId(null)} onRebook={onRebook} />}
    </div>
  )
}

function ClientModal({
  client,
  due,
  appointments,
  now,
  onClose,
  onRebook,
}: {
  client: Client
  due: DueBack
  appointments: Appointment[]
  now: number
  onClose: () => void
  onRebook: (clientId: string) => void
}) {
  const s = clientSummary(client)
  const upcoming = appointments
    .filter((a) => a.clientId === client.id && (a.status === 'Booked' || a.status === 'Checked in'))
    .sort((a, b) => a.start - b.start)
  const contacted = client.contactedAt && sameDay(client.contactedAt, now)
  const canRebook = isDue(due) && !contacted

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={client.name}
      description={`${s.tier} · ${s.visits} ${s.visits === 1 ? 'visit' : 'visits'} · ${dueBackLabel(due, now)}`}
      footer={
        canRebook ? (
          <AppButton icon={MessageCircle} onClick={() => onRebook(client.id)}>
            Send rebooking message
          </AppButton>
        ) : (
          <AppButton variant="secondary" onClick={onClose}>
            Close
          </AppButton>
        )
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-3">
          <Rows
            rows={[
              ['Mobile', client.phone],
              ['Email', client.email ? <span key="email" className="break-all">{client.email}</span> : 'Not given'],
              ['Usually sees', client.preferredStaff ? staffFirst(client.preferredStaff) : 'Anyone'],
              ['Total spent', money(s.spent)],
              ['Points balance', `${num(s.balance)} (${num(s.earned)} earned)`],
              ['Referral code', <span key="code" className="font-mono break-all">{client.referralCode}</span>],
            ]}
          />
          {client.notes && (
            <Notice tone="amber" icon={StickyNote} title="Notes">
              {client.notes}
            </Notice>
          )}
          {isDue(due) && (
            <div>
              <p className="mb-1 text-xs font-semibold text-slate-700">{contacted ? 'Rebooking message sent' : 'Rebooking message preview'}</p>
              <WhatsAppBubble text={rebookMessage(client, now)} meta={contacted && client.contactedAt ? `Sent ${clockTime(client.contactedAt)}` : 'Not sent yet'} />
            </div>
          )}
        </div>
        <div className="space-y-4">
          <section>
            <h4 className="text-xs font-semibold tracking-wide text-slate-600 uppercase">Upcoming</h4>
            {upcoming.length ? (
              <ul className="mt-1 space-y-1 text-sm">
                {upcoming.map((a) => (
                  <li key={a.id} className="text-slate-800">
                    {dayLabel(a.start)}, {clockTime(a.start)} · {serviceById(a.serviceId).label} with {staffFirst(a.staffId)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-slate-600">Nothing booked.</p>
            )}
          </section>
          <section>
            <h4 className="text-xs font-semibold tracking-wide text-slate-600 uppercase">Visit history</h4>
            {client.visits.length ? (
              <ul className="mt-1 divide-y divide-slate-100 text-sm">
                {client.visits.slice(0, 6).map((v, i) => (
                  <li key={`${v.at}-${i}`} className="flex justify-between gap-3 py-1.5">
                    <span className="min-w-0 text-slate-800">
                      {shortDate(v.at)} · {serviceById(v.serviceId).label} <span className="text-slate-600">with {staffFirst(v.staffId)}</span>
                    </span>
                    <span className="shrink-0 tabular-nums">{money(v.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-slate-600">No visits yet.</p>
            )}
            {client.visits.length > 6 && <p className="mt-1 text-xs text-slate-600">And {client.visits.length - 6} earlier visits.</p>}
          </section>
          <section>
            <h4 className="text-xs font-semibold tracking-wide text-slate-600 uppercase">Points history</h4>
            <ul className="mt-1 divide-y divide-slate-100 text-sm">
              {client.points.slice(0, 5).map((p, i) => (
                <li key={`${p.at}-${i}`} className="flex justify-between gap-3 py-1.5">
                  <span className="min-w-0 text-slate-800">
                    {shortDate(p.at)} · {p.label}
                  </span>
                  <span className={cn('shrink-0 font-semibold tabular-nums', p.points < 0 ? 'text-red-700' : 'text-emerald-800')}>
                    {p.points > 0 ? '+' : '−'}
                    {num(Math.abs(p.points))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </Modal>
  )
}
