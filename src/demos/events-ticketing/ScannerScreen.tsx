import { Camera, DoorOpen, History, Keyboard, QrCode, ScanLine, type LucideIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { cn } from '../../lib/cn'
import { clockTime } from '../../lib/format'
import { AppButton, Badge, Modal, Notice, Panel, Segmented, TextInput } from '../ui'
import { cameraScanAvailable } from './camera'
import { CameraScan } from './CameraScan'
import { FAKE_PAYLOAD, GATES, TYPE } from './data'
import { holderShort, payloadFor, walletOrder } from './engine'
import { SCAN_LOOK } from './looks'
import { ScanBadge } from './parts'
import type { GateId, ScanOutcome, ScanRecord, Ticket, VoidedTicket } from './types'

interface Props {
  gateNow: number
  tickets: Ticket[]
  voided: VoidedTicket[]
  scans: ScanRecord[]
  onScan: (input: string, gate: GateId) => { outcome: ScanOutcome; scanId: string; at: number }
  onLetIn: (scanId: string, outcome: ScanOutcome, gate: GateId) => void
}

interface Shown {
  outcome: ScanOutcome
  scanId: string
  gate: GateId
  at: number
}

interface ScanOption {
  key: string
  code: string
  note: string
  payload: string
}

/** Seeded tickets that show each gate result. Hints tell the visitor what to expect. */
function sampleOptions(tickets: Ticket[], voided: VoidedTicket[]): ScanOption[] {
  const hint: Record<string, string> = {
    'MSF-GEN-3907': 'valid',
    'MSF-VIP-0412': 'try it at Gate A',
    'MSF-EBD-0188': 'used at 11:24',
    'MSF-FAM-0073': 'either gate',
    'MSF-GEN-3311': 'new holder after a transfer',
    'MSF-GEN-2650': 'transferred, old code',
  }
  const fromTickets = tickets
    .filter((t) => !t.mine)
    .map((t) => ({ key: t.id, code: t.id, note: `${TYPE[t.type].name} · ${holderShort(t.holder)} · ${hint[t.id] ?? 'sample'}`, payload: payloadFor(t) }))
  const fromVoided = voided
    .filter((v) => !v.mine)
    .map((v) => ({ key: v.id, code: v.id, note: `${TYPE[v.type].name} · ${holderShort(v.holder)} · ${hint[v.id] ?? 'transferred'}`, payload: payloadFor(v) }))
  return [
    ...fromTickets,
    ...fromVoided,
    { key: 'fake', code: 'MSF-VIP-0999', note: 'Edited screenshot · fake', payload: FAKE_PAYLOAD },
  ]
}

const PANEL_STYLE = {
  green: { box: 'border-emerald-300 bg-emerald-50 text-emerald-950', dot: 'bg-emerald-700' },
  red: { box: 'border-red-300 bg-red-50 text-red-950', dot: 'bg-red-700' },
  amber: { box: 'border-amber-300 bg-amber-50 text-amber-950', dot: 'bg-amber-600' },
}

export function ScannerScreen({ gateNow, tickets, voided, scans, onScan, onLetIn }: Props) {
  const [gate, setGate] = useState<GateId>('A')
  const [shown, setShown] = useState<Shown | null>(null)
  const [entry, setEntry] = useState('')
  const [camera, setCamera] = useState(false)
  const [canUseCamera] = useState(cameraScanAvailable)

  const mine = walletOrder(tickets)
  const mineVoided = voided.filter((v) => v.mine)
  // The first ticket in My tickets, so "scan it again" hits the same one.
  const yours = mine[0]
  const options: ScanOption[] = [
    ...mine.map((t) => ({ key: t.id, code: t.id, note: `Your ticket · ${TYPE[t.type].name} · ${holderShort(t.holder)}`, payload: payloadFor(t) })),
    ...mineVoided.map((v) => ({ key: v.id, code: v.id, note: `Your old ticket · transferred to ${v.replacedBy}`, payload: payloadFor(v) })),
    ...sampleOptions(tickets, voided),
  ]
  const recent = scans.filter((s) => s.gate === gate).sort((a, b) => b.at - a.at).slice(0, 8)

  const run = (input: string) => {
    const { outcome, scanId, at } = onScan(input, gate)
    setShown({ outcome, scanId, gate, at })
  }

  const submitEntry = (event: FormEvent) => {
    event.preventDefault()
    if (!entry.trim()) return
    run(entry)
    setEntry('')
  }

  const letIn = () => {
    if (!shown) return
    onLetIn(shown.scanId, shown.outcome, shown.gate)
    setShown({ ...shown, outcome: { ...shown.outcome, override: true } })
  }

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<GateId>
          label="Gate"
          value={gate}
          onChange={(g) => {
            setGate(g)
            setShown(null)
          }}
          options={GATES.map((g) => ({ value: g.id, label: `${g.label} · ${g.detail}`, icon: DoorOpen }))}
          className="w-full sm:w-auto"
        />
        <Badge tone="blue">Festival day view (sample) · {clockTime(gateNow)}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-4">
          <ResultPanel shown={shown} gate={gate} onLetIn={letIn} />

          <Panel title="Scan a ticket" description="Each scan checks the ticket’s check digits on this device, so it works without signal.">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {yours && (
                  <AppButton icon={ScanLine} onClick={() => run(payloadFor(yours))} className="h-auto! min-h-10 py-2 whitespace-normal!">
                    Scan your ticket <span className="font-mono text-xs font-medium">{yours.id}</span>
                  </AppButton>
                )}
                {canUseCamera && (
                  <AppButton variant={yours ? 'secondary' : 'primary'} icon={Camera} onClick={() => setCamera(true)}>
                    Scan with camera
                  </AppButton>
                )}
              </div>
              {canUseCamera ? (
                <p className="text-xs text-slate-600">
                  The camera works on a phone too: open My tickets on one device and scan it with another. In this demo each device
                  keeps its own list of who is in. A live build syncs every gate.
                </p>
              ) : (
                <Notice icon={Camera}>
                  Camera scanning isn’t available in this browser (it needs Chrome on Android or a Mac). Pick a ticket below or
                  type its code.
                </Notice>
              )}

              <form onSubmit={submitEntry}>
                <label htmlFor="msf-entry" className="mb-1 block text-xs font-semibold text-slate-700">
                  Type a ticket code
                </label>
                <div className="flex gap-2">
                  <TextInput
                    id="msf-entry"
                    value={entry}
                    onChange={(e) => setEntry(e.target.value)}
                    placeholder="MSF-GEN-4821"
                    autoComplete="off"
                    className="font-mono uppercase"
                  />
                  <AppButton type="submit" variant="secondary" icon={Keyboard} disabled={!entry.trim()}>
                    Check code
                  </AppButton>
                </div>
              </form>

              <div>
                <p className="mb-2 text-xs font-semibold text-slate-700">Scan a ticket from My tickets, or a sample</p>
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {options.map((o) => (
                    <li key={o.key}>
                      <button
                        type="button"
                        onClick={() => run(o.payload)}
                        aria-label={`Scan ${o.code}, ${o.note}`}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50"
                      >
                        <QrCode className="size-5 shrink-0 text-slate-700" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-mono text-sm font-semibold text-slate-900">{o.code}</span>
                          <span className="block text-xs text-slate-600">{o.note}</span>
                        </span>
                        <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800">Scan</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Panel>
        </div>

        <Panel title={`Recent scans at Gate ${gate}`} className="self-start" bodyClassName="p-0!">
          <ul className="divide-y divide-slate-100">
            {recent.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2.5 text-sm">
                <span className="w-12 shrink-0 text-slate-600 tabular-nums">{clockTime(s.at)}</span>
                <ScanBadge kind={s.kind} override={s.override} />
                <span className="min-w-0 flex-1 basis-32 truncate text-slate-800">
                  <span className="font-mono text-xs">{s.code}</span>
                  {s.holder && <span className="text-slate-600"> · {s.holder}</span>}
                </span>
              </li>
            ))}
          </ul>
          {recent.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-600">No scans at this gate yet.</p>}
          <p className="flex items-center gap-1.5 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-600">
            <History className="size-3.5" aria-hidden="true" />
            The Check-in tab adds up every gate.
          </p>
        </Panel>
      </div>

      <Modal open={camera} onClose={() => setCamera(false)} title="Scan with camera" description={`Checking tickets at Gate ${gate}`} size="sm">
        <CameraScan
          onRead={(text) => {
            setCamera(false)
            run(text)
          }}
        />
      </Modal>
    </div>
  )
}

function ResultPanel({ shown, gate, onLetIn }: { shown: Shown | null; gate: GateId; onLetIn: () => void }) {
  if (!shown)
    return (
      <div role="status" className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-5 text-center">
        <ScanLine className="mx-auto size-8 text-slate-500" aria-hidden="true" />
        <p className="mt-2 font-semibold text-slate-900">Ready to scan at Gate {gate}</p>
        <p className="text-sm text-slate-600">The result shows here, big enough to read at arm’s length.</p>
      </div>
    )
  const { outcome } = shown
  const look = SCAN_LOOK[outcome.kind]
  const overridden = outcome.kind === 'wrong-gate' && outcome.override
  const tone = overridden ? 'green' : look.tone === 'amber' ? 'amber' : look.tone === 'green' ? 'green' : 'red'
  const Icon: LucideIcon = overridden ? SCAN_LOOK.valid.icon : look.icon
  const style = PANEL_STYLE[tone]
  return (
    <div role="status" className={cn('rounded-xl border-2 p-4 sm:p-5', style.box)}>
      <div className="flex items-start gap-3">
        <span className={cn('grid size-12 shrink-0 place-items-center rounded-full text-white', style.dot)}>
          <Icon className="size-7" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xl leading-tight font-bold sm:text-2xl">{overridden ? `Let in at Gate ${shown.gate}` : outcome.title}</p>
          <p className="mt-1 text-sm">
            {overridden ? `${outcome.holder} · override noted in the check-in report.` : outcome.detail}
          </p>
          <p className="mt-1.5 font-mono text-xs break-all">
            {outcome.code} · Gate {shown.gate} · {clockTime(shown.at)}
          </p>
        </div>
      </div>
      {outcome.kind === 'wrong-gate' && !overridden && (
        <AppButton variant="secondary" className="mt-3" onClick={onLetIn}>
          Let in anyway
        </AppButton>
      )}
    </div>
  )
}
