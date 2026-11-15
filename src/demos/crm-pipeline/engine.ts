import { firstName, moneyWhole, num, round2, shortDate } from '../../lib/format'
import { DAY, HOUR, uid } from '../../lib/time'
import type {
  Activity,
  ActivityKind,
  AddOn,
  AutoKind,
  CrmState,
  Deal,
  Enquiry,
  Facility,
  LostReason,
  Owner,
  OwnerId,
  PerWeek,
  ProposalInput,
  RuleId,
  Rules,
  Source,
  Stage,
  Task,
} from './types'

/* Pure pipeline logic for Copperline Commercial Cleaning. No React, so it can be unit-tested. */

export const BUSINESS = {
  name: 'Copperline Commercial Cleaning',
  email: 'hello@copperlineclean.com',
  site: 'copperlineclean.com',
}

export const OWNERS: Record<OwnerId, Owner> = {
  monique: { id: 'monique', name: 'Monique Harris', role: 'Sales manager', email: 'monique@copperlineclean.com' },
  diego: { id: 'diego', name: 'Diego Alvarez', role: 'Account executive', email: 'diego@copperlineclean.com' },
  grace: { id: 'grace', name: 'Grace Liu', role: 'Account executive', email: 'grace@copperlineclean.com' },
}
export const OWNER_IDS: OwnerId[] = ['monique', 'diego', 'grace']
/** Website leads take turns between the two account executives. */
export const ROTATION: OwnerId[] = ['diego', 'grace']

export const STAGES: { id: Stage; label: string; probability: number }[] = [
  { id: 'new', label: 'New lead', probability: 10 },
  { id: 'contacted', label: 'Contacted', probability: 20 },
  { id: 'visit', label: 'Site visit', probability: 40 },
  { id: 'proposal', label: 'Proposal sent', probability: 60 },
  { id: 'negotiation', label: 'Negotiation', probability: 80 },
  { id: 'won', label: 'Won', probability: 100 },
  { id: 'lost', label: 'Lost', probability: 0 },
]
export const OPEN_STAGES: Stage[] = ['new', 'contacted', 'visit', 'proposal', 'negotiation']
export const SOURCES: Source[] = ['Website form', 'Referral', 'Phone', 'Google search', 'Walk-in']
export const FACILITIES: Facility[] = ['Office', 'Medical', 'School', 'Gym']
export const PER_WEEK: PerWeek[] = [1, 2, 3, 5]
export const LOST_REASONS: LostReason[] = ['Price', 'Chose competitor', 'No response', 'Not a fit']
export const STUCK_DAYS = 7
export const BIG_DEAL = 2000
export const MINUTES_PER_TASK = 8

export const stageLabel = (stage: Stage) => STAGES.find((s) => s.id === stage)?.label ?? stage
export const probability = (stage: Stage) => STAGES.find((s) => s.id === stage)?.probability ?? 0
export const isOpen = (deal: Pick<Deal, 'stage'>) => deal.stage !== 'won' && deal.stage !== 'lost'
export const perWeekLabel = (n: PerWeek) => (n === 1 ? 'once a week' : n === 2 ? 'twice a week' : `${n} times a week`)
export const monthly = (value: number) => `${moneyWhole(value)}/mo`

/* Proposal pricing */

export const RATES: Record<Facility, { rate: number; minimum: number }> = {
  Office: { rate: 0.032, minimum: 85 },
  Medical: { rate: 0.052, minimum: 120 },
  School: { rate: 0.028, minimum: 150 },
  Gym: { rate: 0.04, minimum: 110 },
}
export const WEEKS_PER_MONTH = 4.33

export const ADD_ONS: { id: AddOn; label: string; perSqft: number; minimum: number }[] = [
  { id: 'windows', label: 'Window cleaning, monthly', perSqft: 0.02, minimum: 90 },
  { id: 'carpet', label: 'Carpet deep-clean, quarterly', perSqft: 0.05, minimum: 60 },
  { id: 'supplies', label: 'Restroom supplies', perSqft: 0.01, minimum: 40 },
]

export function addOnPrice(id: AddOn, sqft: number): number {
  const addOn = ADD_ONS.find((a) => a.id === id)
  return addOn ? round2(Math.max(addOn.minimum, sqft * addOn.perSqft)) : 0
}

/** Monthly price with every step of the working, so the team can explain it to the client. */
export function priceProposal(input: ProposalInput) {
  const sqft = Number.isFinite(input.sqft) ? Math.max(0, Math.round(input.sqft)) : 0
  const { rate, minimum } = RATES[input.facility]
  const perVisitRaw = round2(sqft * rate)
  const perVisit = Math.max(minimum, perVisitRaw)
  const visits = round2(input.perWeek * WEEKS_PER_MONTH)
  const cleaning = round2(perVisit * visits)
  const addOns = ADD_ONS.filter((a) => input.addOns.includes(a.id)).map((a) => ({ id: a.id, label: a.label, amount: addOnPrice(a.id, sqft) }))
  const subtotal = round2(cleaning + addOns.reduce((sum, a) => sum + a.amount, 0))
  return {
    sqft,
    rate,
    minimum,
    perVisitRaw,
    perVisit,
    minimumApplied: perVisitRaw < minimum,
    visits,
    cleaning,
    addOns,
    subtotal,
    monthly: Math.round(subtotal / 5) * 5,
  }
}
export type Quote = ReturnType<typeof priceProposal>

export function proposalSummary(deal: Pick<Deal, 'contact' | 'sqft' | 'perWeek' | 'addOns'>, value: number): string {
  const extras = ADD_ONS.filter((a) => deal.addOns.includes(a.id)).map((a) => a.label.split(',')[0].toLowerCase())
  return `Proposal emailed to ${deal.contact.name}: ${monthly(value)} for ${num(deal.sqft)} sq ft, ${perWeekLabel(deal.perWeek)}${
    extras.length ? `, plus ${extras.join(' and ')}` : ''
  }.`
}

/* Forecasts */

export function weighted(deals: Deal[]): number {
  return Math.round(deals.filter(isOpen).reduce((sum, d) => sum + (d.value * probability(d.stage)) / 100, 0))
}

/** Weighted forecast, and the same figure if every deal with a proposal out signs. */
export function forecast(deals: Deal[]) {
  const open = deals.filter(isOpen)
  const best = open.reduce((sum, d) => sum + (d.stage === 'proposal' || d.stage === 'negotiation' ? d.value : (d.value * probability(d.stage)) / 100), 0)
  return { open: open.reduce((sum, d) => sum + d.value, 0), weighted: weighted(deals), ifProposalsClose: Math.round(best) }
}

export function stageTotals(deals: Deal[]) {
  return STAGES.map((s) => {
    const list = deals.filter((d) => d.stage === s.id)
    const value = list.reduce((sum, d) => sum + d.value, 0)
    return { stage: s.id, label: s.label, count: list.length, value, weighted: Math.round((value * s.probability) / 100) }
  })
}

/* Dates */

const pad = (n: number) => String(n).padStart(2, '0')

/** Calendar days from `b` to `a`. Noon on both days, so daylight saving can't shift the answer. */
export function dayDiff(a: number, b: number): number {
  const x = new Date(a)
  const y = new Date(b)
  x.setHours(12, 0, 0, 0)
  y.setHours(12, 0, 0, 0)
  return Math.round((x.getTime() - y.getTime()) / DAY)
}

export function addDays(at: number, days: number): number {
  const d = new Date(at)
  d.setDate(d.getDate() + days)
  return d.getTime()
}

export const daysSince = (at: number, now: number) => Math.max(0, Math.floor((now - at) / DAY))

export function toDateInput(at: number): string {
  const d = new Date(at)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromDateInput(value: string, hours = 10): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), hours)
  return d.getMonth() === Number(m[2]) - 1 ? d.getTime() : null
}

export function quarterStart(now: number): number {
  const d = new Date(now)
  d.setMonth(Math.floor(d.getMonth() / 3) * 3, 1)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export type DueTone = 'red' | 'amber' | 'neutral'

export function dueLabel(due: number, now: number): { text: string; tone: DueTone } {
  const d = dayDiff(due, now)
  if (d < 0) return { text: `Overdue ${-d} ${d === -1 ? 'day' : 'days'}`, tone: 'red' }
  if (d === 0) return { text: 'Due today', tone: 'amber' }
  if (d === 1) return { text: 'Due tomorrow', tone: 'neutral' }
  return { text: `Due in ${d} days`, tone: 'neutral' }
}

export function isStuck(deal: Deal, now: number): boolean {
  return isOpen(deal) && now - deal.lastActivityAt >= STUCK_DAYS * DAY
}

/* Tasks */

export const openTasks = (tasks: Task[]) => tasks.filter((t) => !t.doneAt)

export function nextTask(tasks: Task[], dealId: string): Task | undefined {
  return openTasks(tasks)
    .filter((t) => t.dealId === dealId)
    .sort((a, b) => a.due - b.due)[0]
}

export function followUpCounts(tasks: Task[], now: number) {
  const open = openTasks(tasks)
  return {
    today: open.filter((t) => dayDiff(t.due, now) === 0).length,
    overdue: open.filter((t) => dayDiff(t.due, now) < 0).length,
  }
}

function newTask(dealId: string, owner: OwnerId, text: string, due: number, at: number, auto?: AutoKind): Task {
  return { id: uid('task'), dealId, text, due, owner, createdAt: at, auto }
}

function withActivity(deal: Deal, activity: Omit<Activity, 'id'>): Deal {
  return { ...deal, activities: [{ ...activity, id: uid('act') }, ...deal.activities], lastActivityAt: Math.max(deal.lastActivityAt, activity.at) }
}

function updateDeal(state: CrmState, id: string, fn: (deal: Deal) => Deal): CrmState {
  return { ...state, deals: state.deals.map((d) => (d.id === id ? fn(d) : d)) }
}

/** The proposal rule: one follow-up 3 days after sending. Sending again moves the open follow-up. */
export function proposalFollowUp(state: CrmState, dealId: string, at: number): CrmState {
  const deal = state.deals.find((d) => d.id === dealId)
  if (!state.rules.proposal || !deal || deal.stage !== 'proposal') return state
  const due = addDays(at, 3)
  const existing = state.tasks.find((t) => t.dealId === dealId && t.auto === 'proposal' && !t.doneAt)
  if (existing) return { ...state, tasks: state.tasks.map((t) => (t === existing ? { ...t, due } : t)) }
  return { ...state, tasks: [...state.tasks, newTask(dealId, deal.owner, 'Follow up on the proposal', due, at, 'proposal')] }
}

export interface MoveExtra {
  at: number
  lostReason?: LostReason
  startDate?: number
}

/** Moves a deal, logs it on the timeline and applies the rules for Won, Lost and Proposal sent. */
export function moveDeal(state: CrmState, id: string, stage: Stage, extra: MoveExtra): CrmState {
  const deal = state.deals.find((d) => d.id === id)
  if (!deal || deal.stage === stage) return state
  if ((stage === 'lost' && !extra.lostReason) || (stage === 'won' && !extra.startDate)) return state
  const { at, lostReason, startDate } = extra
  const closing = !isOpen({ stage })
  const text =
    stage === 'won'
      ? `Marked as won. Cleaning starts ${shortDate(startDate!, 'en-US')}.`
      : stage === 'lost'
        ? `Marked as lost. Reason: ${lostReason}.`
        : `Moved from ${stageLabel(deal.stage)} to ${stageLabel(stage)}.`
  const moved = withActivity(
    {
      ...deal,
      stage,
      stageSince: at,
      closedAt: closing ? at : undefined,
      lostReason: stage === 'lost' ? lostReason : undefined,
      startDate: stage === 'won' ? startDate : undefined,
    },
    { at, kind: 'stage', text, author: OWNERS[deal.owner].name },
  )
  // Closing a deal closes its follow-ups. Reopening a won deal drops its onboarding task.
  let tasks = state.tasks.map((t) => (t.dealId === id && !t.doneAt && (closing || t.auto === 'won') ? { ...t, doneAt: at, cancelled: true } : t))
  if (stage === 'won') {
    const text = `Onboarding: collect keys and alarm codes, agree the checklist before the ${shortDate(startDate!, 'en-US')} start`
    tasks = [...tasks, newTask(id, deal.owner, text, addDays(at, 1), at, 'won')]
  }
  const next = { ...state, tasks, deals: state.deals.map((d) => (d.id === id ? moved : d)) }
  return stage === 'proposal' ? proposalFollowUp(next, id, at) : next
}

/** Saves the quote on the deal, logs the email, moves it to Proposal sent and books the follow-up. */
export function sendProposal(state: CrmState, id: string, input: ProposalInput, at: number): CrmState {
  const deal = state.deals.find((d) => d.id === id)
  if (!deal || !isOpen(deal)) return state
  const value = priceProposal(input).monthly
  const updated = updateDeal(state, id, (d) => {
    const priced = { ...d, ...input, value }
    return withActivity(priced, { at, kind: 'proposal', text: proposalSummary(priced, value), author: OWNERS[d.owner].name })
  })
  // A "send the proposal" next step is done now. The proposal follow-up takes its place.
  const tasks = updated.tasks.map((t) => (t.dealId === id && !t.doneAt && !t.auto && /\bproposal\b/i.test(t.text) ? { ...t, doneAt: at } : t))
  return proposalFollowUp(moveDeal({ ...updated, tasks }, id, 'proposal', { at }), id, at)
}

export function logActivity(state: CrmState, id: string, entry: { kind: ActivityKind; text: string; outcome?: string }, at: number): CrmState {
  const text = entry.text.trim()
  if (!text) return state
  return updateDeal(state, id, (d) => withActivity(d, { ...entry, text, at, author: OWNERS[d.owner].name }))
}

export function completeTask(state: CrmState, taskId: string, at: number): CrmState {
  const task = state.tasks.find((t) => t.id === taskId)
  if (!task || task.doneAt) return state
  const done = { ...state, tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, doneAt: at } : t)) }
  return updateDeal(done, task.dealId, (d) => withActivity(d, { at, kind: 'task', text: `Follow-up done: ${task.text}`, author: OWNERS[task.owner].name }))
}

/** Pushes a task back. Overdue tasks are counted from now, so a snooze never leaves them overdue. */
export function snoozeTask(state: CrmState, taskId: string, days: number, now: number): CrmState {
  return { ...state, tasks: state.tasks.map((t) => (t.id === taskId && !t.doneAt ? { ...t, due: addDays(Math.max(t.due, now), days) } : t)) }
}

export function logCall(state: CrmState, taskId: string, at: number): CrmState {
  const task = state.tasks.find((t) => t.id === taskId)
  const deal = state.deals.find((d) => d.id === task?.dealId)
  if (!task || !deal) return state
  return logActivity(state, deal.id, { kind: 'call', text: `Called ${deal.contact.name} on ${deal.contact.phone} from the follow-up list.` }, at)
}

/** Updates the given task, or adds a new one when there's no task to update. */
export function setNextStep(state: CrmState, dealId: string, step: { text: string; due: number; taskId?: string }, at: number): CrmState {
  const text = step.text.trim()
  const deal = state.deals.find((d) => d.id === dealId)
  if (!text || !deal) return state
  if (step.taskId && state.tasks.some((t) => t.id === step.taskId && !t.doneAt)) {
    return { ...state, tasks: state.tasks.map((t) => (t.id === step.taskId ? { ...t, text, due: step.due } : t)) }
  }
  return { ...state, tasks: [...state.tasks, newTask(dealId, deal.owner, text, step.due, at)] }
}

/** Hands a deal and its follow-ups to someone else. Monique's own alerts stay with her. */
export function assignOwner(state: CrmState, dealId: string, owner: OwnerId, at: number): CrmState {
  const deal = state.deals.find((d) => d.id === dealId)
  if (!deal || deal.owner === owner) return state
  const text = `Owner changed from ${OWNERS[deal.owner].name} to ${OWNERS[owner].name}.`
  const moved = updateDeal(state, dealId, (d) => withActivity({ ...d, owner }, { at, kind: 'note', text, author: OWNERS[deal.owner].name }))
  return { ...moved, tasks: moved.tasks.map((t) => (t.dealId === dealId && !t.doneAt && t.auto !== 'manager' ? { ...t, owner } : t)) }
}

/** The next person in turn after whoever got the latest website lead. */
export function roundRobin(owners: OwnerId[], deals: Deal[]): OwnerId {
  const last = deals
    .filter((d) => d.source === 'Website form' && owners.includes(d.owner))
    .sort((a, b) => b.createdAt - a.createdAt)[0]
  if (!last) return owners[0] ?? 'monique'
  return owners[(owners.indexOf(last.owner) + 1) % owners.length]
}

/**
 * Creates the reminders the rules call for. Idempotent: a reminder is only created when there isn't one for the same
 * reason since the deal last changed, so running it twice (or on every tick) never duplicates tasks.
 */
export function autoTasks(state: CrmState, now: number, rules: Rules = state.rules): CrmState {
  const has = (dealId: string, kind: AutoKind, since: number) => state.tasks.some((t) => t.dealId === dealId && t.auto === kind && t.createdAt >= since)
  const added: Task[] = []
  for (const deal of state.deals) {
    if (!isOpen(deal)) continue
    if (isStuck(deal, now)) {
      const days = daysSince(deal.lastActivityAt, now)
      if (rules.stuck && !has(deal.id, 'stuck', deal.lastActivityAt)) {
        added.push(newTask(deal.id, deal.owner, `No activity for ${days} days. Check in with ${firstName(deal.contact.name)}.`, now, now, 'stuck'))
      }
      if (rules.manager && deal.value > BIG_DEAL && deal.owner !== 'monique' && !has(deal.id, 'manager', deal.lastActivityAt)) {
        const text = `Stuck for ${days} days at ${monthly(deal.value)}. Ask ${firstName(OWNERS[deal.owner].name)} what’s holding it up.`
        added.push(newTask(deal.id, 'monique', text, now, now, 'manager'))
      }
    }
    if (rules.proposal && deal.stage === 'proposal' && !has(deal.id, 'proposal', deal.stageSince)) {
      added.push(newTask(deal.id, deal.owner, 'Follow up on the proposal', addDays(deal.stageSince, 3), now, 'proposal'))
    }
  }
  return added.length ? { ...state, tasks: [...state.tasks, ...added] } : state
}

/** Switching a rule off removes its open reminders. Switching it on creates any that are due. */
export function setRule(state: CrmState, rule: RuleId, on: boolean, now: number): CrmState {
  const tasks = on ? state.tasks : state.tasks.filter((t) => !(t.auto === rule && !t.doneAt))
  return autoTasks({ ...state, tasks, rules: { ...state.rules, [rule]: on } }, now)
}

/* Website form */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const phoneDigits = (phone: string) => phone.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '')
export const parseSqft = (value: string) => Number(value.replace(/[,\s]/g, ''))

export function maskPhone(phone: string): string {
  const d = phoneDigits(phone)
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-••${d.slice(8)}` : 'Not given'
}

export function validateEnquiry(e: Enquiry, now: number): Partial<Record<keyof Enquiry, string>> {
  const errors: Partial<Record<keyof Enquiry, string>> = {}
  const sqft = parseSqft(e.sqft)
  if (!e.company.trim()) errors.company = 'Enter your company or building name.'
  if (!e.name.trim()) errors.name = 'Enter your name.'
  if (!EMAIL.test(e.email.trim())) errors.email = 'Enter an email address like name@example.com.'
  if (phoneDigits(e.phone).length !== 10) errors.phone = 'Enter a 10-digit phone number.'
  if (!Number.isInteger(sqft) || sqft < 300 || sqft > 200_000) errors.sqft = 'Enter the size in square feet, between 300 and 200,000.'
  if (e.start) {
    const start = fromDateInput(e.start)
    if (start === null || dayDiff(start, now) < 0) errors.start = 'Choose today or a later date.'
  }
  return errors
}

/** A website enquiry becomes a new lead with an owner, an estimate and a call-back task. */
export function captureLead(state: CrmState, e: Enquiry, at: number) {
  const input: ProposalInput = { facility: e.facility, sqft: parseSqft(e.sqft), perWeek: e.perWeek, addOns: [] }
  const quote = priceProposal(input)
  const owner = roundRobin(ROTATION, state.deals)
  const start = e.start ? fromDateInput(e.start) : null
  const message = e.message.trim()
  const text = `Website enquiry: ${message ? `“${message}”` : 'no message.'}${start ? ` Would like to start ${shortDate(start, 'en-US')}.` : ''}`
  const deal: Deal = {
    id: uid('deal'),
    company: e.company.trim(),
    contact: { name: e.name.trim(), role: 'Website enquiry', phone: maskPhone(e.phone), email: e.email.trim() },
    owner,
    stage: 'new',
    value: quote.monthly,
    source: 'Website form',
    ...input,
    sqft: quote.sqft,
    createdAt: at,
    stageSince: at,
    lastActivityAt: at,
    activities: [{ id: uid('act'), at, kind: 'form', text, author: e.name.trim() }],
  }
  const task = newTask(deal.id, owner, 'Call within 1 business hour', at + HOUR, at, 'form')
  return { state: { ...state, deals: [deal, ...state.deals], tasks: [...state.tasks, task] }, deal, task, quote }
}

/* Reports */

export function winRate(deals: Deal[], since: number) {
  const closed = deals.filter((d) => d.closedAt !== undefined && d.closedAt >= since)
  const won = closed.filter((d) => d.stage === 'won').length
  const lost = closed.filter((d) => d.stage === 'lost').length
  return { won, lost, rate: won + lost ? Math.round((won / (won + lost)) * 100) : null }
}

export function avgDaysToClose(deals: Deal[], since: number): number | null {
  const won = deals.filter((d) => d.stage === 'won' && d.closedAt !== undefined && d.closedAt >= since)
  if (!won.length) return null
  return Math.round(won.reduce((sum, d) => sum + (d.closedAt! - d.createdAt) / DAY, 0) / won.length)
}

/** What the CRM did by itself in the last 7 days, for the time-saved estimate. */
export function weeklyAutomation(state: CrmState, now: number) {
  const since = now - 7 * DAY
  const autoCount = state.tasks.filter((t) => t.auto && t.createdAt > since).length
  const proposals = state.deals.reduce((n, d) => n + d.activities.filter((a) => a.kind === 'proposal' && a.at > since).length, 0)
  const leads = state.deals.filter((d) => d.source === 'Website form' && d.createdAt > since).length
  return { autoCount, proposals, leads, minutes: (autoCount + proposals + leads) * MINUTES_PER_TASK }
}
