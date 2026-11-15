import { CircleAlert, CircleCheck, ClipboardCheck, Hourglass, MessageCircle, PackageCheck, PackagePlus, Pill, Search, Trash2, Truck } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import { clockTime, shortDate } from '../../lib/format'
import { DAY } from '../../lib/time'
import { td, th } from '../styles'
import { AppButton, Badge, Field, Modal, Notice, Panel, SelectInput, Stat, TextInput } from '../ui'
import { CLINICIANS, medicineFlags, stockOf } from './data'
import { readyMessage } from './messages'
import type { Medicine, Patient, Prescription, RxStatus } from './types'

/* Pharmacy stock */

interface StockProps {
  medicines: Medicine[]
  now: number
  onReceive: (medicineId: string, batchNo: string, months: number, qty: number) => void
  onRemoveExpired: (medicineId: string) => void
  onOrder: (medicineId: string) => void
}

export function StockScreen({ medicines, now, onReceive, onRemoveExpired, onOrder }: StockProps) {
  const [query, setQuery] = useState('')
  const [receiving, setReceiving] = useState<string | null>(null)
  const flags = medicines.map((m) => ({ medicine: m, ...medicineFlags(m, now) }))
  const low = flags.filter((f) => f.low)
  const expiring = flags.flatMap((f) => f.expiring.map((b) => ({ medicine: f.medicine, batch: b })))
  const expired = flags.filter((f) => f.expired.length)
  const q = query.trim().toLowerCase()
  const shown = flags.filter((f) => !q || f.medicine.name.toLowerCase().includes(q))
  const target = medicines.find((m) => m.id === receiving)

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Pill} label="Medicines stocked" value={medicines.length} tone="accent" />
        <Stat icon={CircleAlert} label="Low stock" value={low.length} detail="At or below reorder level" tone="amber" />
        <Stat icon={Hourglass} label="Batches expiring soon" value={expiring.length} detail="Within 60 days" tone="amber" />
        <Stat icon={Trash2} label="Expired batches" value={expired.length} detail="Remove from the shelf" tone="red" />
      </div>

      {(expired.length > 0 || low.length > 0 || expiring.length > 0) && (
        <Panel title="Needs attention" bodyClassName="space-y-2">
          {expired.map(({ medicine, expired: batches }) => (
            <div key={`x-${medicine.id}`} className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="min-w-0 flex-1 text-sm text-red-900">
                <span className="font-semibold">Expired:</span> {medicine.name}, batch {batches.map((b) => `${b.batchNo} (${b.qty} ${medicine.unit}, expired ${shortDate(b.expiry)})`).join(', ')}
              </p>
              <AppButton variant="danger" size="sm" icon={Trash2} onClick={() => onRemoveExpired(medicine.id)} aria-label={`Remove expired ${medicine.name} from the shelf`}>
                Remove from shelf
              </AppButton>
            </div>
          ))}
          {low.map(({ medicine, stock }) => (
            <div key={`l-${medicine.id}`} className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="min-w-0 flex-1 text-sm text-amber-900">
                <span className="font-semibold">Low:</span> {medicine.name}, {stock} {medicine.unit} left (reorder at {medicine.reorderLevel})
              </p>
              {medicine.onOrder ? (
                <Badge tone="blue" icon={Truck}>
                  On order
                </Badge>
              ) : (
                <AppButton variant="secondary" size="sm" icon={PackagePlus} onClick={() => onOrder(medicine.id)} aria-label={`Order ${medicine.name} from the supplier`}>
                  Order from supplier
                </AppButton>
              )}
            </div>
          ))}
          {expiring.map(({ medicine, batch }) => (
            <p key={`e-${medicine.id}-${batch.batchNo}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span className="font-semibold">Use first:</span> {medicine.name}, batch {batch.batchNo} expires {shortDate(batch.expiry)} ({batch.qty} {medicine.unit}). Dispensing already takes this batch first.
            </p>
          ))}
        </Panel>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-3">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <label htmlFor="med-search" className="sr-only">
              Search medicines
            </label>
            <TextInput id="med-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search medicines" className="pl-9" />
          </div>
        </div>
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[46rem]">
            <thead className="bg-slate-50">
              <tr>
                <th className={th}>Medicine</th>
                <th className={cn(th, 'text-right')}>In stock</th>
                <th className={cn(th, 'text-right')}>Reorder at</th>
                <th className={th}>Batches (expiry)</th>
                <th className={th}>Status</th>
                <th className={th}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map(({ medicine, stock, low: isLow, out, expired: exp, expiring: soon }) => (
                <tr key={medicine.id}>
                  <td className={cn(td, 'font-medium text-slate-900')}>{medicine.name}</td>
                  <td className={cn(td, 'text-right font-semibold tabular-nums')}>
                    {stock} <span className="text-xs font-normal text-slate-600">{medicine.unit}</span>
                  </td>
                  <td className={cn(td, 'text-right text-slate-600 tabular-nums')}>{medicine.reorderLevel}</td>
                  <td className={cn(td, 'text-xs text-slate-700')}>
                    {[...medicine.batches]
                      .sort((a, b) => a.expiry - b.expiry)
                      .map((b) => (
                        <span key={b.batchNo} className={cn('block', b.expiry <= now ? 'text-red-700' : b.expiry - now <= 60 * DAY ? 'text-amber-800' : '')}>
                          {b.batchNo}: {b.qty} ({shortDate(b.expiry)})
                        </span>
                      ))}
                  </td>
                  <td className={td}>
                    <div className="flex flex-wrap gap-1">
                      {out ? <Badge tone="red">Out</Badge> : isLow ? <Badge tone="amber">Low</Badge> : <Badge tone="green">OK</Badge>}
                      {soon.length > 0 && <Badge tone="amber">Expiring</Badge>}
                      {exp.length > 0 && <Badge tone="red">Expired batch</Badge>}
                      {medicine.onOrder && <Badge tone="blue">On order</Badge>}
                    </div>
                  </td>
                  <td className={td}>
                    <AppButton variant="secondary" size="sm" icon={Truck} onClick={() => setReceiving(medicine.id)} aria-label={`Receive stock of ${medicine.name}`}>
                      Receive
                    </AppButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {target && (
        <ReceiveModal
          key={target.id}
          medicine={target}
          onClose={() => setReceiving(null)}
          onSave={(batchNo, months, qty) => {
            onReceive(target.id, batchNo, months, qty)
            setReceiving(null)
          }}
        />
      )}
    </div>
  )
}

function ReceiveModal({ medicine, onClose, onSave }: { medicine: Medicine; onClose: () => void; onSave: (batchNo: string, months: number, qty: number) => void }) {
  const [batchNo, setBatchNo] = useState(`${medicine.batches[0]?.batchNo.slice(0, 2) ?? 'BT'}2611`)
  const [months, setMonths] = useState(18)
  const [qty, setQty] = useState(String(Math.max(medicine.reorderLevel, 10)))
  const n = Number(qty)
  const valid = batchNo.trim().length >= 3 && Number.isInteger(n) && n > 0 && n <= 10000
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Receive a delivery"
      description={medicine.name}
      footer={
        <>
          <AppButton variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton icon={PackageCheck} disabled={!valid} onClick={() => valid && onSave(batchNo.trim().toUpperCase(), months, n)}>
            Add to stock
          </AppButton>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Batch number" htmlFor="rcv-batch">
          <TextInput id="rcv-batch" value={batchNo} onChange={(e) => setBatchNo(e.target.value)} maxLength={12} className="font-mono uppercase" />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Expires in" htmlFor="rcv-expiry">
            <SelectInput id="rcv-expiry" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
              {[6, 12, 18, 24, 36].map((m) => (
                <option key={m} value={m}>
                  {m} months
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label={`Quantity (${medicine.unit})`} htmlFor="rcv-qty">
            <TextInput id="rcv-qty" type="number" inputMode="numeric" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
        </div>
      </div>
    </Modal>
  )
}

/* Dispensing */

interface DispenseProps {
  prescriptions: Prescription[]
  patients: Patient[]
  medicines: Medicine[]
  now: number
  onDispense: (id: string) => void
  onNotify: (id: string) => void
  onCollected: (id: string) => void
  onGoToStock: () => void
}

export function DispensingScreen({ prescriptions, patients, medicines, now, onDispense, onNotify, onCollected, onGoToStock }: DispenseProps) {
  const [tab, setTab] = useState<RxStatus>('Waiting')
  const count = (s: RxStatus) => prescriptions.filter((p) => p.status === s).length
  const shown = [...prescriptions].filter((p) => p.status === tab).sort((a, b) => (tab === 'Collected' ? (b.collectedAt ?? 0) - (a.collectedAt ?? 0) : a.at - b.at))
  const tabs: { id: RxStatus; label: string }[] = [
    { id: 'Waiting', label: 'To dispense' },
    { id: 'Ready', label: 'Ready to collect' },
    { id: 'Collected', label: 'Collected today' },
  ]

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Prescription queue">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-sm font-semibold transition',
              tab === t.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100',
            )}
          >
            {t.label} <span className="tabular-nums opacity-80">{count(t.id)}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <Notice tone="green" icon={CircleCheck}>
          {tab === 'Waiting' ? 'Nothing waiting. Complete a visit on the Today screen to send a prescription here.' : 'Nothing here right now.'}
        </Notice>
      )}

      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {shown.map((rx) => {
          const patient = patients.find((p) => p.id === rx.patientId)
          const doctor = CLINICIANS.find((c) => c.id === rx.clinicianId)
          const checks = rx.items.map((item) => {
            const medicine = medicines.find((m) => m.id === item.medicineId)!
            const stock = stockOf(medicine, now)
            return { item, medicine, stock, ok: stock >= item.qty }
          })
          const allOk = checks.every((c) => c.ok)
          return (
            <li key={rx.id} className="flex flex-col rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">
                    {rx.number} · {patient?.name}
                  </p>
                  <p className="text-xs text-slate-600">
                    {doctor?.name} · {clockTime(rx.at)}
                  </p>
                </div>
                <Badge tone={rx.source === 'Refill request' ? 'violet' : 'neutral'}>{rx.source}</Badge>
              </div>
              <ul className="mt-3 space-y-2">
                {checks.map(({ item, medicine, stock, ok }) => (
                  <li key={item.medicineId} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <p className="flex justify-between gap-3">
                      <span className="font-medium text-slate-900">{medicine.name}</span>
                      <span className="shrink-0 tabular-nums">× {item.qty}</span>
                    </p>
                    <p className="text-xs text-slate-600">{item.dose}</p>
                    {rx.status === 'Waiting' && (
                      <p className={cn('mt-1 text-xs font-medium', ok ? 'text-emerald-800' : 'text-red-700')}>
                        {ok ? `${stock} ${medicine.unit} in stock` : `Only ${stock} ${medicine.unit} in stock`}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              {rx.dispensed && rx.status !== 'Waiting' && (
                <p className="mt-2 text-xs text-slate-600">
                  Batches used: {rx.dispensed.map((d) => `${d.batchNo} × ${d.qty}`).join(', ')}
                </p>
              )}
              {rx.notifiedAt && rx.status !== 'Waiting' && (
                <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-green-50 px-2.5 py-1.5 text-xs text-green-900">
                  <MessageCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  {rx.status === 'Collected' && rx.collectedAt ? `Collected at ${clockTime(rx.collectedAt)}. ` : ''}Ready message sent {clockTime(rx.notifiedAt)}: “{readyMessage(rx, patient)}”
                </p>
              )}
              <div className="mt-auto flex flex-wrap justify-end gap-2 pt-3">
                {rx.status === 'Waiting' &&
                  (allOk ? (
                    <AppButton size="sm" icon={ClipboardCheck} onClick={() => onDispense(rx.id)} aria-label={`Dispense ${rx.number}`}>
                      Dispense
                    </AppButton>
                  ) : (
                    <AppButton size="sm" variant="secondary" icon={PackagePlus} onClick={onGoToStock}>
                      Check stock
                    </AppButton>
                  ))}
                {rx.status === 'Ready' && (
                  <>
                    {!rx.notifiedAt && (
                      <AppButton size="sm" variant="secondary" icon={MessageCircle} onClick={() => onNotify(rx.id)} aria-label={`Send the ready message for ${rx.number}`}>
                        Send “ready” message
                      </AppButton>
                    )}
                    <AppButton size="sm" icon={CircleCheck} onClick={() => onCollected(rx.id)} aria-label={`Mark ${rx.number} collected`}>
                      Mark collected
                    </AppButton>
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
