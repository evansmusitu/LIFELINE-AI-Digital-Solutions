import { ArrowRightLeft, CalendarPlus, CircleCheck, Ticket as TicketIcon, UserRoundPen } from 'lucide-react'
import { useState } from 'react'
import { WhatsAppIcon } from '../../components/WhatsAppIcon'
import { clockTime, money } from '../../lib/format'
import { appButton } from '../styles'
import { AppButton, Badge, Field, Modal, Notice, Panel, TextInput } from '../ui'
import { FESTIVAL, SAMPLE_TICKET_ID, TYPE } from './data'
import { holderShort, longDate, payLabel, payloadFor, walletOrder, whatsAppLink } from './engine'
import { QrSvg } from './parts'
import type { CheckIn, Order, Ticket, VoidedTicket } from './types'

interface Props {
  festival: number
  tickets: Ticket[]
  voided: VoidedTicket[]
  checkins: CheckIn[]
  justBought: Order | null
  onBuy: () => void
  onShared: (id: string) => void
  onCalendar: (ticket: Ticket) => void
  onTransfer: (id: string, name: string) => void
}

export function WalletScreen({ festival, tickets, voided, checkins, justBought, onBuy, onShared, onCalendar, onTransfer }: Props) {
  const [transferId, setTransferId] = useState<string | null>(null)
  const mine = walletOrder(tickets)
  const sample = tickets.find((t) => t.id === SAMPLE_TICKET_ID)
  const shown = mine.length ? mine : sample ? [sample] : []
  const moved = voided.filter((v) => v.mine)
  const target = tickets.find((t) => t.id === transferId)

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">My tickets</h2>
          <p className="text-sm text-slate-600">
            {mine.length
              ? `${mine.length} ${mine.length === 1 ? 'ticket' : 'tickets'} for ${longDate(festival)}`
              : 'Tickets you buy show up here. Until then, here’s what one looks like.'}
          </p>
        </div>
        {mine.length > 0 && (
          <AppButton variant="secondary" icon={TicketIcon} onClick={onBuy}>
            Buy more tickets
          </AppButton>
        )}
      </div>

      {justBought && (
        <Notice tone="green" icon={CircleCheck} title="Payment confirmed">
          Order #{justBought.number}: {justBought.ticketIds.length} {justBought.ticketIds.length === 1 ? 'ticket' : 'tickets'},{' '}
          {money(justBought.total)} by {payLabel(justBought.payment).toLowerCase()} (simulated). A live build also sends them to{' '}
          {justBought.buyer.email} and by SMS to {justBought.buyer.mobile}.
        </Notice>
      )}

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((ticket) => (
          <li key={ticket.id}>
            <TicketCard
              ticket={ticket}
              festival={festival}
              checkin={checkins.find((c) => c.ticketId === ticket.id)}
              isSample={!ticket.mine}
              onBuy={onBuy}
              onShared={onShared}
              onCalendar={onCalendar}
              onTransfer={() => setTransferId(ticket.id)}
            />
          </li>
        ))}
      </ul>

      {moved.length > 0 && (
        <Panel title="Transferred tickets" description="These codes no longer get anyone in. The gate shows “Transferred, not valid”.">
          <ul className="divide-y divide-slate-100 text-sm">
            {moved.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-2">
                <span className="font-mono text-slate-600 line-through">{v.id}</span>
                <span className="text-slate-700">
                  {TYPE[v.type].name} · was {v.holder}, now <span className="font-mono">{v.replacedBy}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {target && (
        <TransferModal
          key={target.id}
          ticket={target}
          onClose={() => setTransferId(null)}
          onSave={(name) => {
            onTransfer(target.id, name)
            setTransferId(null)
          }}
        />
      )}
    </div>
  )
}

function TicketCard({
  ticket,
  festival,
  checkin,
  isSample,
  onBuy,
  onShared,
  onCalendar,
  onTransfer,
}: {
  ticket: Ticket
  festival: number
  checkin?: CheckIn
  isSample: boolean
  onBuy: () => void
  onShared: (id: string) => void
  onCalendar: (ticket: Ticket) => void
  onTransfer: () => void
}) {
  const type = TYPE[ticket.type]
  const day = new Date(festival).toLocaleDateString(FESTIVAL.locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const wa = whatsAppLink(ticket, festival)
  return (
    <article aria-label={`${type.name} ticket ${ticket.id}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-start justify-between gap-3 bg-(--accent-ink) px-4 py-3 text-white">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide uppercase">{FESTIVAL.name}</p>
          <p className="text-sm">
            {day} · Gates {FESTIVAL.gatesOpen}
          </p>
        </div>
        {isSample && <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-(--accent-ink)">Sample ticket</span>}
      </header>
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-lg leading-tight font-bold text-slate-900">{type.name}</p>
            <p className="text-sm break-words text-slate-700">{ticket.holder}</p>
          </div>
          {checkin ? (
            <Badge tone="neutral" icon={CircleCheck}>
              Checked in at {clockTime(checkin.at)} Gate {checkin.gate}
            </Badge>
          ) : (
            <Badge tone="green" icon={CircleCheck}>
              Valid
            </Badge>
          )}
        </div>
        <div className="mt-3 grid place-items-center rounded-xl border border-slate-200 bg-white p-2">
          <QrSvg value={payloadFor(ticket)} label={`QR code for ticket ${ticket.id}`} />
        </div>
        <p className="mt-2 text-center font-mono text-base font-semibold tracking-wider text-slate-900">{ticket.id}</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <dt className="text-slate-600">Entry</dt>
          <dd className="text-right text-slate-900">{type.entry}</dd>
          <dt className="text-slate-600">Place</dt>
          <dd className="text-right text-slate-900">Borrowdale, {FESTIVAL.city}</dd>
          {ticket.transferredFrom && (
            <>
              <dt className="text-slate-600">Transferred from</dt>
              <dd className="text-right font-mono text-slate-900">{ticket.transferredFrom}</dd>
            </>
          )}
        </dl>
        {ticket.sharedAt && !isSample && (
          <p className="mt-2 text-xs text-slate-600">Sent to WhatsApp at {clockTime(ticket.sharedAt)}.</p>
        )}
      </div>
      <footer className="flex flex-wrap gap-2 border-t border-dashed border-slate-300 bg-slate-50 p-3">
        {isSample ? (
          <AppButton size="sm" icon={TicketIcon} onClick={onBuy}>
            Buy tickets
          </AppButton>
        ) : (
          <a href={wa} target="_blank" rel="noopener noreferrer" onClick={() => onShared(ticket.id)} className={appButton('success', 'sm')}>
            <WhatsAppIcon className="size-3.5" />
            Send to WhatsApp
          </a>
        )}
        <AppButton size="sm" variant="secondary" icon={CalendarPlus} onClick={() => onCalendar(ticket)}>
          Add to calendar
        </AppButton>
        {!isSample && !checkin && (
          <AppButton size="sm" variant="ghost" icon={ArrowRightLeft} onClick={onTransfer} aria-label={`Transfer ticket ${ticket.id}`}>
            Transfer
          </AppButton>
        )}
      </footer>
    </article>
  )
}

function TransferModal({ ticket, onClose, onSave }: { ticket: Ticket; onClose: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState('')
  const valid = name.trim().length >= 2 && name.trim().toLowerCase() !== ticket.holder.toLowerCase()
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Transfer this ticket"
      description={`${TYPE[ticket.type].name} · ${ticket.id}`}
      footer={
        <>
          <AppButton variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton icon={UserRoundPen} disabled={!valid} onClick={() => valid && onSave(name)}>
            Transfer ticket
          </AppButton>
        </>
      }
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) onSave(name)
        }}
      >
        <p className="text-sm text-slate-700">
          The ticket gets a new code and QR code with the new holder’s name. The old QR code stops working at the gate.
        </p>
        <Field label="New holder’s name" htmlFor="msf-transfer-name" hint={`Now held by ${holderShort(ticket.holder)}.`}>
          <TextInput id="msf-transfer-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </Field>
      </form>
    </Modal>
  )
}
