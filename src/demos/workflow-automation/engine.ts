import { money, round2 } from '../../lib/format'
import { uid } from '../../lib/time'
import { ACTIONS, TRIGGERS } from './catalog'
import type { Output, Run, StepResult, Workflow } from './types'

/* Runs a workflow against sample data. Nothing is sent anywhere: every result is simulated. */

const VARIABLE = /\{\{\s*([\w.]+)\s*\}\}/g

export function render(template: string, data: Record<string, string>): { text: string; missing: string[] } {
  const missing: string[] = []
  const text = template.replace(VARIABLE, (match, key: string) => {
    if (key in data) return data[key]
    missing.push(key)
    return match
  })
  return { text, missing }
}

/** Stock levels in the sample shop, used to show "before and after" on stock updates. */
const SAMPLE_STOCK: Record<string, number> = {
  'Herringbone wool throw, Slate': 15,
  'Washed linen cushion cover, Sage': 32,
  'Waffle cotton bath towel set, Ink': 21,
  'Stonewashed linen napkins, set of 4 (Oat)': 44,
}

interface Line {
  qty: number
  name: string
  amount: number
}

function parseItems(items: string): Line[] {
  return items
    .split(/;\s*/)
    .map((part) => {
      const match = part.match(/^(\d+)\s*[×x]\s*(.+?)\s*\(\$([\d.,]+)( each)?\)$/)
      if (!match) return null
      const qty = Number(match[1])
      const price = Number(match[3].replace(/,/g, ''))
      return { qty, name: match[2], amount: round2(match[4] ? qty * price : price) }
    })
    .filter((line): line is Line => line !== null)
}

function toNumber(value: string): number {
  return Number(value.replace(/[^\d.-]/g, ''))
}

function checkCondition(actual: string, operator: string, expected: string): boolean {
  switch (operator) {
    case 'is more than':
      return toNumber(actual) > toNumber(expected)
    case 'is less than':
      return toNumber(actual) < toNumber(expected)
    case 'contains':
      return actual.toLowerCase().includes(expected.toLowerCase())
    default:
      return actual.trim().toLowerCase() === expected.trim().toLowerCase()
  }
}

export interface Counters {
  nextInvoice: number
  nextPo: number
}

/** Pseudo-random but repeatable step durations, so runs look realistic. */
function stepMs(index: number, seed: number) {
  return 280 + ((index * 389 + seed * 97) % 620)
}

export function simulate(
  workflow: Workflow,
  data: Record<string, string>,
  counters: Counters,
  at: number,
  options: { test?: boolean; seed?: number } = {},
): { run: Run; counters: Counters } {
  const trigger = TRIGGERS[workflow.trigger]
  const seed = options.seed ?? workflow.steps.length
  let { nextInvoice, nextPo } = counters
  let stopped = false
  let failed = false

  const steps: StepResult[] = workflow.steps.map((step, index) => {
    const def = ACTIONS[step.action]
    const base = { stepId: step.id, action: step.action, ms: stepMs(index, seed) }
    if (stopped || failed) return { ...base, status: 'not-run', detail: 'Not run', ms: 0, missing: [] }

    const missing: string[] = []
    const field = (key: string) => {
      const value = render(step.config[key] ?? def.defaults[key] ?? '', data)
      missing.push(...value.missing)
      return value.text
    }

    let detail = ''
    let output: Output | undefined
    let status: StepResult['status'] = 'done'

    switch (step.action) {
      case 'invoice.create': {
        const number = `INV-2026-0${nextInvoice}`
        nextInvoice += 1
        const items = field('items')
        const parsed = parseItems(items)
        const lines = parsed.length ? parsed.map((l) => ({ label: `${l.qty} × ${l.name}`, amount: l.amount })) : [{ label: items, amount: toNumber(data['order.total'] ?? '0') }]
        const total = round2(lines.reduce((sum, l) => sum + l.amount, 0))
        const customer = field('customer')
        output = { kind: 'invoice', number, customer, terms: step.config.terms ?? 'Paid in full', lines, total }
        detail = `Invoice ${number} created for ${customer}, ${money(total)}`
        break
      }
      case 'email.send': {
        const to = field('to')
        const subject = field('subject')
        const body = field('body')
        const attach = step.config.attach && step.config.attach !== 'Nothing' ? step.config.attach : undefined
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) {
          status = 'failed'
          detail = `No valid email address in “To” (${to || 'empty'}).`
          failed = true
          break
        }
        output = { kind: 'email', to, subject, body, attachment: attach }
        detail = `Email sent to ${to}${attach ? ` with ${attach}` : ''}`
        break
      }
      case 'whatsapp.send': {
        const to = step.config.to ?? 'Sales team group'
        const recipient = to === 'Customer' ? (data['customer.phone'] ?? data['caller.number'] ?? `${data['customer.first_name'] ?? 'the customer'} on WhatsApp`) : to
        const body = field('message')
        output = { kind: 'whatsapp', to: recipient, body }
        detail = `WhatsApp message sent to ${recipient}`
        break
      }
      case 'inventory.update': {
        const lines = parseItems(data['order.items'] ?? '').map((l) => {
          const before = SAMPLE_STOCK[l.name] ?? 24
          const returning = (step.config.mode ?? '').startsWith('Add')
          const after = returning ? before + l.qty : Math.max(0, before - l.qty)
          return { name: l.name, before, after, low: after <= 12 }
        })
        if (!lines.length) {
          status = 'skipped'
          detail = 'No order items in this trigger, so stock was left as it is.'
          break
        }
        output = { kind: 'stock', lines }
        const low = lines.filter((l) => l.low)
        detail = `Stock updated for ${lines.length} ${lines.length === 1 ? 'product' : 'products'}`
        if (low.length && step.config.alert !== 'Don’t alert') detail += `. Warehouse alerted: ${low.map((l) => `${l.name} (${l.after} left)`).join(', ')}`
        break
      }
      case 'sheets.append': {
        const sheet = step.config.sheet || 'Sheet 1'
        const values = field('columns')
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
        output = { kind: 'row', sheet, values }
        detail = `Row added to “${sheet}”`
        break
      }
      case 'crm.upsert': {
        const name = data['lead.name'] ?? data['customer.name'] ?? data['caller.name'] ?? 'New contact'
        const company = data['lead.company']
        detail = `${name}${company ? ` (${company})` : ''} saved in the ${step.config.pipeline ?? 'Wholesale'} pipeline at “${step.config.stage ?? 'New lead'}”, owner ${step.config.owner ?? 'Ruth Akers'}`
        break
      }
      case 'po.create': {
        const number = `PO-0${nextPo}`
        nextPo += 1
        const supplier = field('supplier')
        const product = field('product')
        const quantity = field('quantity')
        const cost = data['product.cost'] ? money(toNumber(data['product.cost']) * toNumber(quantity)) : undefined
        output = { kind: 'po', number, supplier, product, quantity, cost }
        detail = `${number} raised with ${supplier} for ${quantity} × ${product}${cost ? `, ${cost}` : ''}`
        break
      }
      case 'calendar.create': {
        detail = `“${field('title')}” added to the ${step.config.calendar ?? 'Showroom'} calendar for ${data['booking.date'] ?? 'the visit date'}${data['booking.time'] ? ` at ${data['booking.time']}` : ''}`
        break
      }
      case 'delay.wait': {
        status = options.test ? 'skipped' : 'done'
        detail = options.test ? `Wait ${step.config.wait ?? '1 day'}: skipped in test runs` : `Waited ${step.config.wait ?? '1 day'}`
        break
      }
      case 'filter.only_if': {
        const key = step.config.field || trigger.variables[0]?.key
        const label = trigger.variables.find((v) => v.key === key)?.label ?? key
        const actual = data[key] ?? ''
        const passed = checkCondition(actual, step.config.operator ?? 'is', step.config.value ?? '')
        if (passed) {
          detail = `Condition met: ${label} (${actual}) ${step.config.operator} ${step.config.value}`
        } else {
          status = 'stopped'
          stopped = true
          detail = `${label} is ${actual || 'empty'}, which isn’t ${step.config.operator} ${step.config.value}. The workflow stopped here.`
        }
        break
      }
    }

    if (missing.length && status === 'done') {
      detail += `. Not available from this trigger: ${[...new Set(missing)].map((m) => `{{${m}}}`).join(', ')}`
    }
    return { ...base, status, detail, missing: [...new Set(missing)], output }
  })

  const durationMs = steps.reduce((sum, s) => sum + s.ms, 0) + 120
  const run: Run = {
    id: uid('run'),
    workflowId: workflow.id,
    workflowName: workflow.name,
    trigger: workflow.trigger,
    at,
    durationMs,
    status: failed ? 'failed' : stopped ? 'stopped' : 'succeeded',
    summary: trigger.summary(data),
    steps,
    test: options.test,
  }
  return { run, counters: { nextInvoice, nextPo } }
}

export function formatDuration(ms: number): string {
  if (ms >= 60_000) {
    const minutes = Math.floor(ms / 60_000)
    const seconds = Math.round((ms % 60_000) / 1000)
    return `${minutes} min ${seconds} s`
  }
  return `${(ms / 1000).toFixed(1)} s`
}
