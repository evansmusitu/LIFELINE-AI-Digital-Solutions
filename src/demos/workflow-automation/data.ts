import { MINUTE, daysAgoAt, todayAt } from '../../lib/time'
import { TRIGGERS } from './catalog'
import { simulate } from './engine'
import type { Run, Step, Workflow, WorkflowState } from './types'

/* Sample business: Hartwell Loom, an invented online homeware store in Leeds that sells worldwide. */

let stepSeq = 0
const step = (action: Step['action'], config: Record<string, string>): Step => {
  stepSeq += 1
  return { id: `s-sample-${stepSeq}`, action, config }
}

export function sampleWorkflows(now: number): Workflow[] {
  return [
    {
      id: 'wf-orders',
      name: 'New order → invoice → receipt email',
      trigger: 'order.paid',
      active: true,
      runsThisMonth: 412,
      minutesPerRun: 6,
      updatedAt: now - 9 * 86_400_000,
      steps: [
        step('invoice.create', { customer: '{{customer.name}}', items: '{{order.items}}', terms: 'Paid in full' }),
        step('email.send', {
          to: '{{customer.email}}',
          subject: 'Your Hartwell Loom order {{order.number}}',
          body: 'Hi {{customer.first_name}},\n\nThank you for your order. Your invoice is attached, and we’ll send tracking details as soon as your parcel leaves our Leeds studio.\n\nOrder: {{order.number}}\nTotal paid: {{order.total}}\n\nWarm wishes,\nThe Hartwell Loom team',
          attach: 'Invoice PDF',
        }),
        step('inventory.update', { mode: 'Reduce stock by the items ordered', alert: 'Alert the warehouse team' }),
        step('sheets.append', { sheet: 'Orders 2026', columns: '{{order.number}}, {{customer.name}}, {{customer.country}}, {{order.total}}' }),
      ],
    },
    {
      id: 'wf-wholesale',
      name: 'Wholesale enquiry → CRM → WhatsApp alert',
      trigger: 'form.submitted',
      active: true,
      runsThisMonth: 37,
      minutesPerRun: 10,
      updatedAt: now - 21 * 86_400_000,
      steps: [
        step('crm.upsert', { pipeline: 'Wholesale', stage: 'New lead', owner: 'Ruth Akers' }),
        step('whatsapp.send', {
          to: 'Sales team group',
          message: 'New wholesale enquiry from {{lead.name}} at {{lead.company}}. Budget: {{lead.budget}}.\n“{{lead.message}}”',
        }),
        step('email.send', {
          to: '{{lead.email}}',
          subject: 'Thanks for your enquiry, {{lead.first_name}}',
          body: 'Hi {{lead.first_name}},\n\nThanks for getting in touch about a wholesale order. Ruth from our trade team will call you within one working day with prices and lead times.\n\nBest wishes,\nHartwell Loom Trade',
          attach: 'Nothing',
        }),
      ],
    },
    {
      id: 'wf-stock',
      name: 'Low stock → purchase order → supplier email',
      trigger: 'stock.low',
      active: true,
      runsThisMonth: 19,
      minutesPerRun: 15,
      updatedAt: now - 34 * 86_400_000,
      steps: [
        step('po.create', { supplier: '{{supplier.name}}', product: '{{product.name}} ({{product.sku}})', quantity: '{{product.reorder_qty}}' }),
        step('email.send', {
          to: '{{supplier.email}}',
          subject: 'Purchase order for {{product.name}}',
          body: 'Hello,\n\nPlease find our purchase order attached for {{product.reorder_qty}} units of {{product.name}} ({{product.sku}}). Could you confirm the delivery date?\n\nThank you,\nHartwell Loom',
          attach: 'Purchase order PDF',
        }),
      ],
    },
    {
      id: 'wf-delivered',
      name: 'Delivered order → care guide email',
      trigger: 'order.delivered',
      active: true,
      runsThisMonth: 288,
      minutesPerRun: 2,
      updatedAt: now - 47 * 86_400_000,
      steps: [
        step('delay.wait', { wait: '3 days' }),
        step('email.send', {
          to: '{{customer.email}}',
          subject: 'Caring for your new {{order.items}}',
          body: 'Hi {{customer.first_name}},\n\nWe hope your new pieces are settling in. Natural fibres last for years with a little care: wash at 30°C, dry flat and keep out of strong sunlight.\n\nAny questions, just reply to this email.\n\nThe Hartwell Loom team',
          attach: 'Nothing',
        }),
      ],
    },
    {
      id: 'wf-overdue',
      name: 'Overdue invoice → polite reminders',
      trigger: 'invoice.overdue',
      active: true,
      runsThisMonth: 12,
      minutesPerRun: 8,
      updatedAt: now - 15 * 86_400_000,
      steps: [
        step('email.send', {
          to: '{{customer.email}}',
          subject: 'Reminder: invoice {{invoice.number}} is overdue',
          body: 'Hello,\n\nOur records show that invoice {{invoice.number}} for {{invoice.amount}} was due on {{invoice.due_date}}. If you have already paid, please ignore this message.\n\nThank you,\nHartwell Loom Accounts',
          attach: 'Invoice PDF',
        }),
        step('delay.wait', { wait: '3 days' }),
        step('whatsapp.send', {
          to: 'Customer',
          message: 'Hello from Hartwell Loom. A quick reminder that invoice {{invoice.number}} for {{invoice.amount}} is now {{invoice.days_overdue}} days overdue. Reply here if you need a copy.',
        }),
      ],
    },
    {
      id: 'wf-cart',
      name: 'Abandoned basket → reminder email',
      trigger: 'cart.abandoned',
      active: false,
      runsThisMonth: 0,
      minutesPerRun: 3,
      updatedAt: now - 13 * 86_400_000,
      steps: [
        step('filter.only_if', { field: 'cart.total', operator: 'is more than', value: '40' }),
        step('email.send', {
          to: '{{customer.email}}',
          subject: 'Still thinking it over, {{customer.first_name}}?',
          body: 'Hi {{customer.first_name}},\n\nYou left {{cart.items}} in your basket. We’ve saved it for 7 days: {{cart.link}}\n\nThe Hartwell Loom team',
          attach: 'Nothing',
        }),
      ],
    },
  ]
}

interface SampleRun {
  workflow: string
  at: number
  data?: Record<string, string>
  status?: Run['status']
  note?: string
  /** Mark one step as retried or failed after the simulation. */
  stepIndex?: number
  stepStatus?: 'retried' | 'failed'
  stepDetail?: string
}

function order(number: string, name: string, items: string, total: string, country: string) {
  return {
    'order.number': number,
    'order.total': total,
    'order.items': items,
    'customer.name': name,
    'customer.first_name': name.split(' ')[0],
    'customer.email': `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    'customer.country': country,
    'shipping.method': 'International tracked',
  }
}

export function createInitialState(now: number): WorkflowState {
  const workflows = sampleWorkflows(now)
  const byId = Object.fromEntries(workflows.map((w) => [w.id, w]))
  let counters = { nextInvoice: 401, nextPo: 763 }

  const samples: SampleRun[] = [
    {
      workflow: 'wf-orders',
      at: todayAt(10, 31),
      data: order('HL-10481', 'Jonah Reyes', '1 × Stonewashed linen napkins, set of 4 (Oat) ($52.00); 1 × Washed linen cushion cover, Sage ($44.00)', '$96.00', 'Canada'),
    },
    {
      workflow: 'wf-wholesale',
      at: todayAt(10, 6),
      data: {
        'lead.name': 'Sanne de Vries',
        'lead.first_name': 'Sanne',
        'lead.company': 'Tidewater Studio Rentals',
        'lead.email': 'sanne@tidewaterstudio.nl',
        'lead.budget': '$3,000–$5,000',
        'lead.message': 'Looking for throws for 18 holiday apartments. Do you offer trade prices?',
      },
    },
    {
      workflow: 'wf-orders',
      at: todayAt(9, 48),
      data: order('HL-10480', 'Freya Lindqvist', '2 × Washed linen cushion cover, Sage ($44.00 each)', '$88.00', 'Sweden'),
    },
    {
      workflow: 'wf-stock',
      at: todayAt(9, 12),
      note: 'The supplier’s mailbox was full. The email went through on the automatic retry 10 minutes later.',
      stepIndex: 1,
      stepStatus: 'retried',
      stepDetail: 'First attempt bounced (mailbox full). Sent on retry at 09:22.',
    },
    { workflow: 'wf-delivered', at: todayAt(9, 0) },
    {
      workflow: 'wf-orders',
      at: todayAt(8, 37),
      data: order('HL-10479', 'Ade Okafor', '1 × Herringbone wool throw, Slate ($98.00); 1 × Waffle cotton bath towel set, Ink ($64.00)', '$162.00', 'United Kingdom'),
    },
    { workflow: 'wf-overdue', at: todayAt(8, 0) },
    {
      workflow: 'wf-orders',
      at: daysAgoAt(1, 21, 14),
      data: order('HL-10478', 'Mei Tanaka', '1 × Herringbone wool throw, Slate ($98.00)', '$98.00', 'Japan'),
    },
    {
      workflow: 'wf-orders',
      at: daysAgoAt(1, 18, 40),
      data: order('HL-10477', 'Daniel Ruiz', '1 × Waffle cotton bath towel set, Ink ($64.00)', '$64.00', 'United States'),
      status: 'failed',
      note: 'The customer’s email address bounced. Ruth was alerted on WhatsApp and sent the receipt by hand.',
      stepIndex: 1,
      stepStatus: 'failed',
      stepDetail: 'Email to daniel.ruiz@example.com bounced: address not found. Alert sent to the Sales team group.',
    },
    {
      workflow: 'wf-orders',
      at: daysAgoAt(1, 15, 2),
      data: order('HL-10476', 'Grace Mensah', '2 × Stonewashed linen napkins, set of 4 (Oat) ($52.00 each)', '$104.00', 'Ghana'),
    },
  ]

  const runs: Run[] = samples.map((sample, index) => {
    const workflow = byId[sample.workflow]
    const data = sample.data ?? TRIGGERS[workflow.trigger].sample(now)
    const result = simulate(workflow, data, counters, sample.at, { seed: index + 3 })
    counters = result.counters
    const run = { ...result.run, id: `run-sample-${index}`, note: sample.note }
    if (sample.stepIndex !== undefined && run.steps[sample.stepIndex]) {
      const failed = sample.stepStatus === 'failed'
      run.steps = run.steps.map((s, i) => {
        if (i === sample.stepIndex) return { ...s, status: sample.stepStatus!, detail: sample.stepDetail ?? s.detail, ms: s.ms + (failed ? 0 : 10 * MINUTE) }
        if (failed && i > sample.stepIndex!) return { ...s, status: 'not-run', detail: 'Not run', ms: 0 }
        return s
      })
      if (failed) run.status = 'failed'
      run.durationMs = run.steps.reduce((sum, s) => sum + s.ms, 0) + 120
    }
    return run
  })

  return { workflows, runs, failedThisMonth: 3, nextInvoice: counters.nextInvoice, nextPo: counters.nextPo, nextOrder: 10483 }
}
