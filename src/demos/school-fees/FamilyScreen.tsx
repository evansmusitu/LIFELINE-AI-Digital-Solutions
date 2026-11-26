import { CalendarClock, Globe2, HeartHandshake, Wallet } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { moneyWhole } from '../../lib/format'
import { PAYMENT } from '../school-admissions/business'
import { AppButton, Badge, Field, Notice, Panel, SelectInput, TextInput } from '../ui'
import { td, th } from '../styles'
import { RATES, SCHOOL, TERMS } from './data'
import { abroadMessage, balanceFor, invoiceLines, invoiceTotal, paidFor, personalised, zigAt } from './engine'
import type { FeesState } from './types'
import { PhoneFrame, WaBubble } from '../school-admissions/parts'

interface Props {
  business: string | null
  state: FeesState
  familyId: string
  onFamily: (id: string) => void
  onPay: (familyId: string, amount: number, method: string) => void
  onAbroad: (familyId: string, payer: string, country: string, amount: number) => void
  onPlan: (familyId: string, months: number) => void
}

const METHODS = ['EcoCash', 'InnBucks', 'Bank transfer (USD)', 'Bank transfer (ZiG)', 'Card at the bursary']
const COUNTRIES = ['South Africa', 'United Kingdom', 'Botswana', 'United States', 'Australia', 'Another country']

export function FamilyScreen({ business, state, familyId, onFamily, onPay, onAbroad, onPlan }: Props) {
  const id = useId()
  const family = state.families.find((f) => f.id === familyId) ?? state.families[0]
  const lines = invoiceLines(family)
  const total = invoiceTotal(family)
  const paid = paidFor(state, family.id, 'next')
  const balance = balanceFor(state, family, 'next')
  const arrears = family.bursary === 1 ? 0 : balanceFor(state, family, 'last')
  const plan = state.plans[family.id]
  const link = [...state.abroadLinks].reverse().find((l) => l.familyId === family.id)
  const name = business ?? SCHOOL.name

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Viewing as (sample families)" htmlFor={`${id}-family`} className="w-full max-w-xs">
          <SelectInput id={`${id}-family`} value={family.id} onChange={(e) => onFamily(e.target.value)}>
            {state.families.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <p className="pb-2 text-xs text-slate-600">What a parent sees from the link in their WhatsApp statement.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <Panel
            title={`${TERMS.next.name} statement: ${family.name}`}
            description={`Issued ${TERMS.next.issuedDaysAgo} days ago at ZiG ${RATES.thisTerm} to the US dollar. That rate stays on this invoice, even though today’s sample rate is ${RATES.today}.`}
            bodyClassName="p-0!"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[30rem]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={th}>Item</th>
                    <th className={`${th} text-right`}>USD</th>
                    <th className={`${th} text-right`}>ZiG (fixed)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((l, i) => (
                    <tr key={i}>
                      <td className={td}>
                        <span className="font-medium text-slate-900">{l.item}</span>
                        <span className="block text-xs text-slate-600">
                          {l.child}
                          {l.note ? ` · ${l.note}` : ''}
                        </span>
                      </td>
                      <td className={`${td} text-right tabular-nums`}>
                        {l.due !== l.amount && <span className="mr-1.5 text-xs text-slate-400 line-through">{moneyWhole(l.amount)}</span>}
                        {moneyWhole(l.due)}
                      </td>
                      <td className={`${td} text-right text-slate-700 tabular-nums`}>{zigAt(l.due, TERMS.next.rate)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 text-sm">
                  <tr>
                    <th scope="row" className="px-3 py-2 text-left font-semibold">Total</th>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{moneyWhole(total)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{zigAt(total, TERMS.next.rate)}</td>
                  </tr>
                  <tr>
                    <th scope="row" className="px-3 py-1 text-left font-normal text-slate-600">Paid</th>
                    <td className="px-3 py-1 text-right text-slate-700 tabular-nums">{moneyWhole(paid)}</td>
                    <td />
                  </tr>
                  <tr>
                    <th scope="row" className="px-3 py-2 text-left font-bold text-slate-900">Balance, due in {TERMS.next.dueInDays} days</th>
                    <td className="px-3 py-2 text-right font-bold text-slate-900 tabular-nums">{moneyWhole(balance)}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{zigAt(balance, TERMS.next.rate)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-600">Every levy on this statement was approved by the Ministry before it was charged. See the reference on the school’s fee list.</p>
          </Panel>

          {arrears > 0 && (
            <Notice tone="amber" icon={HeartHandshake} title={`${moneyWhole(arrears)} still open from ${TERMS.last.name}`}>
              {PAYMENT.neverExclude}
            </Notice>
          )}
          {plan && (
            <Notice tone="green" icon={CalendarClock} title="Your monthly plan is agreed">
              {plan.instalments.map((i) => `${moneyWhole(i.amount)} in ${i.dueInDays} days`).join(', ')}. No extra charge.
            </Notice>
          )}
        </div>

        <div className="space-y-4">
          {family.bursary === 1 ? (
            <Notice tone="green" title="Nothing to pay">
              The bursary covers tuition and levies. Covered items are never invoiced.
            </Notice>
          ) : (
            <>
              <PayPanel key={`pay-${family.id}`} balance={balance} onPay={(amount, method) => onPay(family.id, amount, method)} />
              <AbroadPanel key={`abroad-${family.id}`} balance={balance} onSend={(payer, country) => onAbroad(family.id, payer, country, balance)} />
              {!plan && (balance > 0 || arrears > 0) && (
                <Panel title="Pay monthly instead" description="Three equal payments over the term, at no extra cost.">
                  <AppButton variant="secondary" icon={CalendarClock} onClick={() => onPlan(family.id, 3)} className="w-full">
                    Ask for a 3-month plan
                  </AppButton>
                </Panel>
              )}
            </>
          )}
          {link && (
            <PhoneFrame title={link.payer} subtitle={`WhatsApp · ${link.country}`} initials={link.payer.slice(0, 2).toUpperCase()} label="The message the relative abroad receives">
              <div className="space-y-2 p-3">
                <WaBubble text={personalised(abroadMessage(link.payer, family, link.amount), business)} author={name} time="now" />
              </div>
            </PhoneFrame>
          )}
        </div>
      </div>
    </div>
  )
}

function PayPanel({ balance, onPay }: { balance: number; onPay: (amount: number, method: string) => void }) {
  const id = useId()
  const [method, setMethod] = useState(METHODS[0])
  const [amount, setAmount] = useState(String(balance || ''))
  const value = Number(amount)
  const valid = /^\d{1,5}$/.test(amount.trim()) && value > 0 && value <= Math.max(balance, 0)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (valid) onPay(value, method)
  }
  return (
    <Panel title={<span className="flex items-center gap-2"><Wallet className="size-4 text-(--accent)" aria-hidden="true" />Pay now</span>} description="Simulated: no money moves.">
      {balance === 0 ? (
        <Badge tone="green">This term is paid in full</Badge>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <Field label="Pay with" htmlFor={`${id}-method`}>
            <SelectInput id={`${id}-method`} value={method} onChange={(e) => setMethod(e.target.value)}>
              {METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Amount (USD)" htmlFor={`${id}-amount`} hint={valid ? `${zigAt(value, TERMS.next.rate)} at the invoice rate` : `Up to ${moneyWhole(balance)}`}>
            <TextInput id={`${id}-amount`} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={!valid && amount !== ''} />
          </Field>
          <AppButton type="submit" disabled={!valid} className="w-full">
            Pay {valid ? moneyWhole(value) : ''}
          </AppButton>
        </form>
      )}
    </Panel>
  )
}

function AbroadPanel({ balance, onSend }: { balance: number; onSend: (payer: string, country: string) => void }) {
  const id = useId()
  const [payer, setPayer] = useState('')
  const [country, setCountry] = useState(COUNTRIES[0])
  const valid = payer.trim().length >= 2 && /^[\p{L}\p{M} '’.-]+$/u.test(payer.trim())
  if (balance === 0) return null
  return (
    <Panel title={<span className="flex items-center gap-2"><Globe2 className="size-4 text-(--accent)" aria-hidden="true" />Family abroad paying?</span>} description="The bursary sends them a secure link to pay by card.">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) onSend(payer.trim().replace(/\s+/g, ' '), country)
        }}
        className="space-y-3"
      >
        <Field label="Their name" htmlFor={`${id}-payer`}>
          <TextInput id={`${id}-payer`} value={payer} onChange={(e) => setPayer(e.target.value)} maxLength={40} placeholder="For example Uncle Tendai" />
        </Field>
        <Field label="Where they are" htmlFor={`${id}-country`}>
          <SelectInput id={`${id}-country`} value={country} onChange={(e) => setCountry(e.target.value)}>
            {COUNTRIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </SelectInput>
        </Field>
        <AppButton type="submit" variant="secondary" disabled={!valid} className="w-full">
          Send them a payment link
        </AppButton>
      </form>
    </Panel>
  )
}

