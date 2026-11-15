export type AppId =
  | 'store'
  | 'forms'
  | 'inventory'
  | 'invoices'
  | 'email'
  | 'whatsapp'
  | 'sheets'
  | 'crm'
  | 'purchasing'
  | 'phone'
  | 'calendar'
  | 'delay'
  | 'filter'

export type TriggerId =
  | 'order.paid'
  | 'form.submitted'
  | 'stock.low'
  | 'cart.abandoned'
  | 'order.delivered'
  | 'invoice.overdue'
  | 'call.missed'
  | 'booking.created'

export type ActionId =
  | 'invoice.create'
  | 'email.send'
  | 'whatsapp.send'
  | 'inventory.update'
  | 'sheets.append'
  | 'crm.upsert'
  | 'po.create'
  | 'calendar.create'
  | 'delay.wait'
  | 'filter.only_if'

export interface Step {
  id: string
  action: ActionId
  config: Record<string, string>
}

export interface Workflow {
  id: string
  name: string
  trigger: TriggerId
  steps: Step[]
  active: boolean
  runsThisMonth: number
  /** Manual work each run replaces, used for the time-saved estimate. */
  minutesPerRun: number
  updatedAt: number
}

export type Output =
  | { kind: 'invoice'; number: string; customer: string; terms: string; lines: { label: string; amount: number }[]; total: number }
  | { kind: 'email'; to: string; subject: string; body: string; attachment?: string }
  | { kind: 'whatsapp'; to: string; body: string }
  | { kind: 'stock'; lines: { name: string; before: number; after: number; low: boolean }[] }
  | { kind: 'row'; sheet: string; values: string[] }
  | { kind: 'po'; number: string; supplier: string; product: string; quantity: string; cost?: string }

export type StepStatus = 'done' | 'skipped' | 'stopped' | 'failed' | 'retried' | 'not-run'

export interface StepResult {
  stepId: string
  action: ActionId
  status: StepStatus
  detail: string
  ms: number
  missing: string[]
  output?: Output
}

export type RunStatus = 'succeeded' | 'failed' | 'stopped'

export interface Run {
  id: string
  workflowId: string
  workflowName: string
  trigger: TriggerId
  at: number
  durationMs: number
  status: RunStatus
  summary: string
  steps: StepResult[]
  test?: boolean
  note?: string
}

export interface WorkflowState {
  workflows: Workflow[]
  runs: Run[]
  failedThisMonth: number
  nextInvoice: number
  nextPo: number
  nextOrder: number
}
