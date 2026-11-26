import { BadgeCheck, FileWarning, History, Plus, Receipt } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { moneyWhole, relativeTime } from '../../lib/format'
import { AppButton, Badge, Field, Notice, Panel, SelectInput, TextInput } from '../ui'
import { td, th } from '../styles'
import { SCHOOL, SHOP_SALES } from './data'
import { canBill, checkSpend, levyLedger, parseLevyAmount, validApprovalRef } from './engine'
import type { FeesState, LevyEntry } from './types'

interface Props {
  now: number
  state: FeesState
  onApprove: (levyId: string, ref: string) => void
  onAddLevy: (name: string, amount: number, purpose: string) => void
  onSpend: (levyId: string, item: string, amount: number, receipt: string) => string | null
}

export function LeviesScreen({ now, state, onApprove, onAddLevy, onSpend }: Props) {
  const ledger = levyLedger(state)
  return (
    <div className="space-y-5 p-3 sm:p-5">
      <Panel
        title="Fees and levies register"
        description="A fee or levy needs the Permanent Secretary’s approval before it is charged. Here it can’t go on an invoice until the approval is recorded."
        bodyClassName="p-0!"
      >
        <ul className="divide-y divide-slate-100">
          {state.levies.map((l) => (
            <LevyRow key={l.id} levy={l} onApprove={(ref) => onApprove(l.id, ref)} />
          ))}
        </ul>
        <AddLevy onAdd={onAddLevy} />
      </Panel>

      <Panel title="Levy ledger" description={`Raised from the whole school (sample), and every dollar spent, with its receipt and both approvals: ${SCHOOL.approvers.join(' and ')}.`} bodyClassName="p-0!">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem]">
            <thead className="bg-slate-50">
              <tr>
                <th className={th}>Levy</th>
                <th className={`${th} text-right`}>Raised</th>
                <th className={`${th} text-right`}>Spent</th>
                <th className={`${th} text-right`}>Left</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledger.map((r) => (
                <tr key={r.levy.id}>
                  <td className={td}>
                    <p className="font-semibold text-slate-900">{r.levy.name}</p>
                    <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                      {state.spending
                        .filter((s) => s.levyId === r.levy.id)
                        .map((s) => (
                          <li key={s.id}>
                            {s.item}: {moneyWhole(s.amount)} · {s.receipt} · {relativeTime(s.at, now)}
                          </li>
                        ))}
                    </ul>
                  </td>
                  <td className={`${td} text-right align-top tabular-nums`}>{moneyWhole(r.raised)}</td>
                  <td className={`${td} text-right align-top tabular-nums`}>{moneyWhole(r.spent)}</td>
                  <td className={`${td} text-right align-top font-semibold tabular-nums`}>{moneyWhole(r.left)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <SpendForm ledger={ledger} onSpend={onSpend} />
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title={<span className="flex items-center gap-2"><Receipt className="size-4 text-(--accent)" aria-hidden="true" />Sales that need a fiscal receipt</span>} description="For a VAT-registered school business: the tuck shop, the uniform shop and hall hire. VAT is 15.5% from 1 January 2026.">
          <ul className="space-y-2">
            {SHOP_SALES.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <span>
                  {s.source}
                  <span className="block text-xs text-slate-600">{moneyWhole(s.amount)}</span>
                </span>
                {s.fiscalised ? <Badge tone="green">Fiscal receipt issued</Badge> : <Badge tone="red" icon={FileWarning}>No fiscal receipt yet</Badge>}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={<span className="flex items-center gap-2"><History className="size-4 text-(--accent)" aria-hidden="true" />Audit trail</span>} description="Every change, who made it and when. Nothing can be deleted.">
          <ol className="max-h-72 space-y-2 overflow-y-auto text-sm">
            {[...state.audit].sort((a, b) => b.at - a.at).map((a) => (
              <li key={a.id} className="border-l-2 border-(--accent)/40 pl-3">
                <p className="text-slate-800">{a.action}</p>
                <p className="text-xs text-slate-500">
                  {a.who} · {relativeTime(a.at, now)}
                </p>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  )
}

function LevyRow({ levy, onApprove }: { levy: LevyEntry; onApprove: (ref: string) => void }) {
  const id = useId()
  const [ref, setRef] = useState('')
  const billable = canBill(levy)
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">
          {levy.name}: {moneyWhole(levy.amount)} a term
        </p>
        <p className="text-xs text-slate-600">{levy.purpose}</p>
        {billable && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-emerald-800">
            <BadgeCheck className="size-3.5" aria-hidden="true" />
            {levy.approvalRef} · approved {levy.approvedDaysAgo === 0 ? 'today' : `${levy.approvedDaysAgo} days ago`}
          </p>
        )}
      </div>
      {billable ? (
        <Badge tone="green">On invoices</Badge>
      ) : (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (validApprovalRef(ref)) onApprove(ref.trim())
          }}
        >
          <Badge tone="amber">Awaiting approval: can’t be billed</Badge>
          <div>
            <label htmlFor={`${id}-ref`} className="sr-only">
              Approval reference
            </label>
            <TextInput id={`${id}-ref`} compact fullWidth={false} className="w-44" placeholder="Approval reference" value={ref} onChange={(e) => setRef(e.target.value)} maxLength={40} />
          </div>
          <AppButton size="sm" type="submit" disabled={!validApprovalRef(ref)}>
            Record the approval
          </AppButton>
        </form>
      )}
    </li>
  )
}

function AddLevy({ onAdd }: { onAdd: (name: string, amount: number, purpose: string) => void }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [purpose, setPurpose] = useState('')
  const value = parseLevyAmount(amount)
  const valid = name.trim().length >= 3 && value !== null && purpose.trim().length >= 5
  if (!open)
    return (
      <div className="border-t border-slate-100 px-4 py-3">
        <AppButton size="sm" variant="secondary" icon={Plus} onClick={() => setOpen(true)}>
          Propose a new levy
        </AppButton>
      </div>
    )
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid || value === null) return
    onAdd(name.trim(), value, purpose.trim())
    setOpen(false)
    setName('')
    setAmount('')
    setPurpose('')
  }
  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-3 border-t border-slate-100 px-4 py-3 sm:grid-cols-[1fr_8rem_1.4fr_auto] sm:items-end">
      <Field label="Name" htmlFor={`${id}-name`}>
        <TextInput id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
      </Field>
      <Field label="USD a term" htmlFor={`${id}-amount`}>
        <TextInput id={`${id}-amount`} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={amount !== '' && value === null} />
      </Field>
      <Field label="What it pays for" htmlFor={`${id}-purpose`}>
        <TextInput id={`${id}-purpose`} value={purpose} onChange={(e) => setPurpose(e.target.value)} maxLength={80} />
      </Field>
      <AppButton type="submit" disabled={!valid}>
        Add, awaiting approval
      </AppButton>
    </form>
  )
}

function SpendForm({ ledger, onSpend }: { ledger: ReturnType<typeof levyLedger>; onSpend: Props['onSpend'] }) {
  const id = useId()
  const [levyId, setLevyId] = useState(ledger[0]?.levy.id ?? '')
  const [item, setItem] = useState('')
  const [amount, setAmount] = useState('')
  const [receipt, setReceipt] = useState('')
  const [approvals, setApprovals] = useState<boolean[]>([false, false])
  const [error, setError] = useState<string | null>(null)
  const left = ledger.find((l) => l.levy.id === levyId)?.left ?? 0
  const value = /^\d{1,6}$/.test(amount.trim()) ? Number(amount) : null

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const problem = checkSpend({ item, amount: value, receipt, approvals: approvals.filter(Boolean).length }, left)
    if (problem) return setError(problem)
    const result = onSpend(levyId, item.trim(), value ?? 0, receipt.trim())
    setError(result)
    if (!result) {
      setItem('')
      setAmount('')
      setReceipt('')
      setApprovals([false, false])
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3 border-t border-slate-100 px-4 py-3">
      <p className="text-sm font-semibold text-slate-900">Record spending from a levy</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Field label="Levy" htmlFor={`${id}-levy`}>
          <SelectInput id={`${id}-levy`} value={levyId} onChange={(e) => setLevyId(e.target.value)}>
            {ledger.map((l) => (
              <option key={l.levy.id} value={l.levy.id}>
                {l.levy.name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="What for" htmlFor={`${id}-item`}>
          <TextInput id={`${id}-item`} value={item} onChange={(e) => setItem(e.target.value)} maxLength={60} />
        </Field>
        <Field label="USD" htmlFor={`${id}-amount`} hint={`${moneyWhole(left)} left`}>
          <TextInput id={`${id}-amount`} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Receipt or invoice number" htmlFor={`${id}-receipt`}>
          <TextInput id={`${id}-receipt`} value={receipt} onChange={(e) => setReceipt(e.target.value)} maxLength={40} />
        </Field>
      </div>
      <fieldset className="flex flex-wrap gap-4 text-sm text-slate-800">
        <legend className="sr-only">Approvals</legend>
        {SCHOOL.approvers.map((a, i) => (
          <label key={a} className="flex items-center gap-2">
            <input type="checkbox" checked={approvals[i]} onChange={(e) => setApprovals((x) => x.map((v, j) => (j === i ? e.target.checked : v)))} className="size-4 accent-(--accent)" />
            Approved by {a}
          </label>
        ))}
      </fieldset>
      {error && <Notice tone="red">{error}</Notice>}
      <AppButton type="submit">Record the spending</AppButton>
    </form>
  )
}
