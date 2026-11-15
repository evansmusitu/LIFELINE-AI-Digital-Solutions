import { clockTime, firstName, money } from '../../lib/format'
import { DAY, isSameDay, seededRandom } from '../../lib/time'
import { APPS, BUSINESS, FLOWS, MAPPINGS, OWNER_NOTICE_OVER, STAFF, TRANSFORMS } from './catalog'
import type {
  AppId,
  DataRecord,
  FieldKind,
  FieldValue,
  FlowId,
  Hop,
  HubState,
  Json,
  MappingId,
  MappingRow,
  Sample,
  SyncEvent,
  TargetField,
  TransformId,
} from './types'

/* The hub's logic, kept pure so it can be tested. Nothing is sent anywhere: every reply is simulated. */

const time = (at: number) => clockTime(at, 'en-US')
const pad = (n: number) => String(n).padStart(2, '0')

export function isoDate(at: number): string {
  const d = new Date(at)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function isoDateTime(at: number): string {
  const d = new Date(at)
  return `${isoDate(at)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function plural(count: number, noun: string): string {
  if (count === 1) return `1 ${noun}`
  return `${count} ${noun.endsWith('y') ? `${noun.slice(0, -1)}ies` : `${noun}s`}`
}

export function formatMs(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`
}

/** "Synced 12 min ago" for recent syncs, the clock time for older ones. */
export function syncLabel(at: number, now: number): string {
  const minutes = Math.round((now - at) / 60_000)
  if (minutes < 1) return 'Synced just now'
  if (minutes < 60) return `Synced ${minutes} min ago`
  return `Last sync ${time(at)}`
}

/* Transforms */

export function splitName(value: string): { first_name: string; last_name: string } {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  return { first_name: parts[0] ?? '', last_name: parts.slice(1).join(' ') }
}

/** US numbers like "(404) 555-0148" become "+14045550148". Anything else is left as it is. */
export function toInternationalPhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return value.trim()
}

/** "2026-12-01" or "2026-12-01T07:41" become "12/01/2026". */
export function toUsDate(value: string): string {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  return match ? `${match[2]}/${match[3]}/${match[1]}` : value.trim()
}

export function dollarsToCents(value: FieldValue): FieldValue {
  const amount = typeof value === 'number' ? value : Number.parseFloat(value.replace(/[^\d.-]/g, ''))
  return Number.isFinite(amount) ? Math.round(amount * 100) : value
}

export function applyTransform(id: TransformId, value: FieldValue): FieldValue | Record<string, string> {
  switch (id) {
    case 'split':
      return splitName(String(value))
    case 'phone':
      return toInternationalPhone(String(value))
    case 'date':
      return toUsDate(String(value))
    case 'upper':
      return String(value).trim().toUpperCase()
    case 'cents':
      return dollarsToCents(value)
    default:
      return value
  }
}

/** Transforms that make sense for a source field, given what the target app accepts. */
export function transformsFor(kind: FieldKind, targets: TargetField[]): TransformId[] {
  return (Object.keys(TRANSFORMS) as TransformId[]).filter((id) => {
    const t = TRANSFORMS[id]
    const kindOk = t.kinds === 'all' || t.kinds.includes(kind)
    return kindOk && (!t.writes || t.writes.every((key) => targets.some((f) => f.key === key)))
  })
}

/* Mapping */

export function keysWritten(row: MappingRow): string[] {
  if (!row.target) return []
  return TRANSFORMS[row.transform].writes ?? [row.target]
}

export function applyMapping(record: DataRecord, mapping: MappingRow[]): DataRecord {
  const out: DataRecord = {}
  for (const row of mapping) {
    if (!row.target) continue
    const value = record[row.source]
    if (value === undefined || value === '') continue
    const result = applyTransform(row.transform, value)
    if (typeof result === 'object') Object.assign(out, result)
    else out[row.target] = result
  }
  return out
}

export function missingRequired(mapping: MappingRow[], targets: TargetField[]): TargetField[] {
  const written = new Set(mapping.flatMap(keysWritten))
  return targets.filter((f) => f.required && !written.has(f.key))
}

/** Target fields that more than one source field would fill. */
export function duplicateTargets(mapping: MappingRow[], targets: TargetField[]): TargetField[] {
  const counts = new Map<string, number>()
  for (const key of mapping.flatMap(keysWritten)) counts.set(key, (counts.get(key) ?? 0) + 1)
  return targets.filter((f) => (counts.get(f.key) ?? 0) > 1)
}

/* Masking: sample numbers and emails are fictional, but the UI still shows them the way a real hub would. */

export function maskPhone(value: string): string {
  const chars = [...value]
  const digits = chars.map((c, i) => (/\d/.test(c) ? i : -1)).filter((i) => i >= 0)
  if (digits.length < 4) return value
  const hide = new Set(digits.slice(-4, -2))
  return chars.map((c, i) => (hide.has(i) ? '•' : c)).join('')
}

export function maskEmail(value: string): string {
  const [user, domain] = value.split('@')
  if (!domain || domain === 'lindenhollowpm.com') return value
  return `${user.slice(0, 2)}•••@${domain}`
}

function maskString(key: string, value: string): string {
  if (/card/i.test(key)) return `•••• ${value.slice(-4)}`
  if (value.includes('@')) return maskEmail(value)
  if (/phone|mobile/i.test(key) || (key === 'to' && /^[+(]\d/.test(value))) return maskPhone(value)
  return value
}

export function maskDeep(value: Json, key = ''): Json {
  if (typeof value === 'string') return maskString(key, value)
  if (Array.isArray(value)) return value.map((v) => maskDeep(v, key))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, maskDeep(v, k)]))
  return value
}

/* Events */

/** What the source app sends the hub, in its own field names. */
export function recordFor(sample: Sample, at: number, number: number): DataRecord {
  const contact: DataRecord = sample.phone ? { phone: sample.phone } : {}
  const unit = sample.unit.toLowerCase()
  switch (sample.flow) {
    case 'rent':
      return {
        payer_name: sample.name,
        amount: sample.amount,
        paid_at: isoDateTime(at),
        unit,
        property: sample.property,
        payment_id: `pay_${number}`,
        card_last4: sample.card,
      }
    case 'enquiry':
      return {
        full_name: sample.name,
        email: sample.email,
        ...contact,
        unit,
        property: sample.property,
        bedrooms: sample.bedrooms,
        budget: sample.budget,
        move_in_date: isoDate(at + sample.moveInDays * DAY),
        message: sample.message,
      }
    case 'maintenance':
      return {
        tenant_name: sample.name,
        unit,
        property: sample.property,
        ...contact,
        category: sample.category,
        description: sample.issue,
        urgency: sample.urgency,
        entry_ok: sample.entryOk ? 'Yes' : 'No',
        submitted_at: isoDateTime(at),
      }
  }
}

export function summarize(sample: Sample): string {
  switch (sample.flow) {
    case 'rent':
      return `Rent ${money(sample.amount)} from ${sample.name}, unit ${sample.unit}, ${sample.property}`
    case 'enquiry':
      return `${sample.name} asked about a ${sample.bedrooms}-bed, unit ${sample.unit}, ${sample.property}`
    case 'maintenance':
      return `${sample.issue}, unit ${sample.unit}, ${sample.property} (${sample.name})`
  }
}

export function shortLabel(sample: Sample): string {
  switch (sample.flow) {
    case 'rent':
      return `Rent ${money(sample.amount)} from ${sample.name}`
    case 'enquiry':
      return `Enquiry from ${sample.name}`
    case 'maintenance':
      return `${sample.issue} (${sample.name})`
  }
}

/** "rent payment", "enquiry", "request" */
export function nounFor(flow: FlowId): string {
  return flow === 'rent' ? 'rent payment' : FLOWS[flow].noun
}

export function workOrder(number: number): string {
  return `WO-${3300 + number}`
}

function viewingSlot(at: number, number: number): { at: number; label: string } {
  const d = new Date(at)
  d.setDate(d.getDate() + 1 + (number % 2))
  d.setHours(number % 3 === 0 ? 12 : 17, 30, 0, 0)
  const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return { at: d.getTime(), label: `${day} at ${time(d.getTime())}` }
}

type PlanState = Pick<HubState, 'apps' | 'mappings'>

interface Draft {
  action: string
  detail: string
  request: Json
  response: Json
  /** Set when the step isn't needed for this event. */
  skip?: string
  needsPhone?: boolean
}

const MAPPED_PATHS: Record<MappingId, string> = {
  'enquiry-crm': '/prospects',
  'rent-accounting': '/payments',
  'maintenance-app': '/work-orders',
}

function draftHop(flowId: FlowId, index: number, sample: Sample, record: DataRecord, state: PlanState, number: number, at: number): Draft {
  const def = FLOWS[flowId].hops[index]
  const first = firstName(sample.name)
  const phone = sample.phone ? toInternationalPhone(sample.phone) : null
  const phoneShown = sample.phone ? maskPhone(sample.phone) : ''
  const base = { action: def.action }

  if (def.mapping) {
    const request: Json = { method: 'POST', path: MAPPED_PATHS[def.mapping], body: applyMapping(record, state.mappings[def.mapping]) }
    if (sample.flow === 'rent')
      return {
        ...base,
        detail: `Recorded ${money(sample.amount)} in the unit ${sample.unit} ledger`,
        request,
        response: { status: 201, body: { ledger_entry: `led_${number}`, unit: sample.unit, balance_cents: 0 } },
      }
    if (sample.flow === 'enquiry')
      return {
        ...base,
        detail: `${sample.name} added as a prospect for unit ${sample.unit}`,
        request,
        response: { status: 201, body: { prospect_id: `pr_${number}`, stage: 'New enquiry' } },
      }
    return {
      ...base,
      detail: `Work order ${workOrder(number)} created, estimate ${money(sample.estimate)}`,
      request,
      response: {
        status: 201,
        body: { work_order: workOrder(number), estimate_cents: sample.estimate * 100, assigned_to: STAFF.maintenance.name },
      },
    }
  }

  const message = (template: string, params: Json[]): Json => ({
    method: 'POST',
    path: '/messages',
    body: { to: phone, template, params },
  })
  const accepted = (prefix: string): Json => ({ status: 200, body: { message_id: `${prefix}_${number}`, status: 'accepted' } })

  if (sample.flow === 'rent') {
    if (def.app === 'crm')
      return {
        ...base,
        detail: `${sample.name}’s balance is now $0.00`,
        request: { method: 'PATCH', path: `/tenants/unit-${sample.unit}`, body: { rent_status: 'paid', paid_cents: sample.amount * 100, balance_cents: 0 } },
        response: { status: 200, body: { tenant: sample.name, balance_cents: 0 } },
      }
    if (def.app === 'email')
      return {
        ...base,
        detail: `Receipt sent to ${maskEmail(sample.email)}`,
        request: { method: 'POST', path: '/send', body: { to: sample.email, template: 'rent_receipt', amount: money(sample.amount), unit: sample.unit } },
        response: { status: 202, body: { id: `em_${number}` } },
      }
    return {
      ...base,
      needsPhone: true,
      detail: `Confirmation sent to ${phoneShown}`,
      request: message('rent_received', [first, money(sample.amount), `unit ${sample.unit}`]),
      response: accepted('wa'),
    }
  }

  if (sample.flow === 'enquiry') {
    const slot = viewingSlot(at, number)
    if (def.app === 'calendar')
      return {
        ...base,
        detail: `Viewing offered for ${slot.label}`,
        request: {
          method: 'POST',
          path: '/events',
          body: { title: `Viewing: unit ${sample.unit}, ${sample.property}`, start: isoDateTime(slot.at), minutes: 30, guest: sample.email },
        },
        response: { status: 201, body: { event_id: `cal_${number}`, status: 'tentative' } },
      }
    if (def.app === 'whatsapp')
      return {
        ...base,
        needsPhone: true,
        detail: `Viewing time sent to ${phoneShown}`,
        request: message('viewing_offer', [first, slot.label, `unit ${sample.unit}, ${sample.property}`]),
        response: accepted('wa'),
      }
    return {
      ...base,
      detail: `Alert sent to ${BUSINESS.leasingEmail}`,
      request: { method: 'POST', path: '/send', body: { to: BUSINESS.leasingEmail, subject: `New enquiry: ${sample.name}, unit ${sample.unit}` } },
      response: { status: 202, body: { id: `em_${number}` } },
    }
  }

  if (def.app === 'whatsapp')
    return {
      ...base,
      needsPhone: true,
      detail: `Reference ${workOrder(number)} sent to ${phoneShown}`,
      request: message('repair_update', [first, workOrder(number), sample.category]),
      response: accepted('wa'),
    }
  const over = sample.estimate > OWNER_NOTICE_OVER
  return {
    ...base,
    skip: over ? undefined : `Not needed: the ${money(sample.estimate)} estimate is under ${money(OWNER_NOTICE_OVER)}`,
    detail: `Owner emailed: the ${money(sample.estimate)} estimate is over ${money(OWNER_NOTICE_OVER)}`,
    request: over
      ? {
          method: 'POST',
          path: '/send',
          body: { to: 'owner_on_file', subject: `Repair estimate for unit ${sample.unit}, ${sample.property}`, estimate: money(sample.estimate), work_order: workOrder(number) },
        }
      : { rule: `Owner notice only when the estimate is over ${money(OWNER_NOTICE_OVER)}` },
    response: over ? { status: 202, body: { id: `em_${number}` } } : null,
  }
}

/** Works out one hop's outcome from the current state: skipped, waiting, failed or sent. */
export function decideHop(flowId: FlowId, index: number, sample: Sample, state: PlanState, number: number, at: number, ms: number): Hop {
  const def = FLOWS[flowId].hops[index]
  const app = APPS[def.app]
  const draft = draftHop(flowId, index, sample, recordFor(sample, at, number), state, number, at)
  const hop: Hop = { app: def.app, action: draft.action, status: 'sent', ms, detail: draft.detail, request: maskDeep(draft.request), response: maskDeep(draft.response) }

  if (draft.skip) return { ...hop, status: 'skipped', ms: 0, detail: draft.skip }

  if (state.apps.some((a) => a.id === def.app && a.status === 'expired'))
    return {
      ...hop,
      status: 'queued',
      code: 'app-expired',
      ms: Math.round(ms / 3),
      detail: `Waiting: ${app.name} access expired. Saved and will resend when reconnected`,
      response: { status: 401, error: 'access_expired', hub: 'Saved. Will resend when reconnected.' },
    }

  if (def.mapping) {
    const missing = missingRequired(state.mappings[def.mapping], MAPPINGS[def.mapping].targets)
    if (missing.length) {
      const names = missing.map((f) => `“${f.label}”`).join(' and ')
      return {
        ...hop,
        status: 'failed',
        code: 'missing-field',
        detail: `${app.name} needs ${names}, and nothing is mapped to ${missing.length === 1 ? 'it' : 'them'}. Fix it in Field mapping, then retry`,
        response: { status: 422, error: 'required_field_missing', fields: missing.map((f) => f.key) },
      }
    }
  }

  if (draft.needsPhone && !sample.phone)
    return {
      ...hop,
      status: 'failed',
      code: 'missing-phone',
      ms: 0,
      detail: 'No phone number to send the WhatsApp message to',
      response: { sent: false, reason: 'No mobile number on file' },
    }

  return hop
}

/** An app was busy on the first try, and the hub retried by itself. */
export function withRetry(hop: Hop, seconds: number): Hop {
  return {
    ...hop,
    status: 'retried',
    code: 'busy',
    retryAfterS: seconds,
    ms: hop.ms + seconds * 1000,
    detail: `${APPS[hop.app].name} was busy, retried after ${seconds} s, sent. ${hop.detail}`,
    response: { attempts: [{ status: 429, error: 'rate_limited', retry_after_s: seconds }, hop.response] },
  }
}

function msFor(number: number, index: number): number {
  return 140 + ((number * 97 + index * 389) % 640)
}

/** Plans every hop of an event up front. The same inputs always give the same plan. */
export function planEvent(
  flowId: FlowId,
  sample: Sample,
  state: PlanState,
  number: number,
  at: number,
  { busyRetries = true }: { busyRetries?: boolean } = {},
): SyncEvent {
  const rand = seededRandom(number)
  const retryRoll = rand()
  const retryPick = rand()
  const hops = FLOWS[flowId].hops.map((_, index) => decideHop(flowId, index, sample, state, number, at, 140 + Math.round(rand() * 640)))
  // Now and then an app is busy on the first try and the hub retries by itself.
  if (busyRetries && retryRoll < 0.22) {
    const candidates = hops.map((h, i) => (h.status === 'sent' && !FLOWS[flowId].hops[i].mapping ? i : -1)).filter((i) => i >= 0)
    if (candidates.length) {
      const pick = candidates[Math.floor(retryPick * candidates.length)]
      hops[pick] = withRetry(hops[pick], 2)
    }
  }
  return { id: `evt-${number}`, number, flow: flowId, at, sample, hops }
}

export type EventStatus = 'delivered' | 'partial' | 'failed'

export const isDelivered = (hop: Hop) => hop.status === 'sent' || hop.status === 'retried'

export function eventStatus(event: SyncEvent): EventStatus {
  const needed = event.hops.filter((h) => h.status !== 'skipped')
  const delivered = needed.filter(isDelivered)
  if (delivered.length === needed.length) return 'delivered'
  if (!delivered.length && needed.some((h) => h.status === 'failed')) return 'failed'
  return 'partial'
}

export function totalMs(event: SyncEvent): number {
  return event.hops.reduce((sum, h) => sum + h.ms, 0) + 40
}

export function eventOutcome(event: SyncEvent) {
  const needed = event.hops.filter((h) => h.status !== 'skipped')
  return {
    needed: needed.length,
    delivered: needed.filter(isDelivered).length,
    waiting: needed.filter((h) => h.status === 'queued').map((h) => h.app),
    failed: needed.filter((h) => h.status === 'failed').map((h) => h.app),
  }
}

/* Fixing things */

function updateEvent(state: HubState, eventId: string, fn: (event: SyncEvent) => SyncEvent): HubState {
  return { ...state, events: state.events.map((e) => (e.id === eventId ? fn(e) : e)) }
}

function withHop(event: SyncEvent, index: number, hop: Hop): SyncEvent {
  return { ...event, hops: event.hops.map((h, i) => (i === index ? hop : h)) }
}

/** Waiting hops whose app is connected again, oldest first. */
export function dueHops(state: HubState): { eventId: string; index: number; key: string }[] {
  const connected = new Set(state.apps.filter((a) => a.status === 'connected').map((a) => a.id))
  return [...state.events]
    .sort((a, b) => a.at - b.at)
    .flatMap((e) => e.hops.map((h, index) => ({ e, h, index })))
    .filter(({ h }) => h.status === 'queued' && connected.has(h.app))
    .map(({ e, index }) => ({ eventId: e.id, index, key: `${e.id}:${index}` }))
}

export function resendQueued(state: HubState, eventId: string, index: number, at: number): HubState {
  return updateEvent(state, eventId, (event) => {
    const old = event.hops[index]
    if (old?.status !== 'queued') return event
    const next = decideHop(event.flow, index, event.sample, state, event.number, at, msFor(event.number, index))
    if (next.status !== 'sent') return withHop(event, index, next)
    const note = `Sent at ${time(at)} after ${APPS[old.app].name} was reconnected`
    return withHop(event, index, { ...next, code: old.code, resolved: { at, from: 'queued', note } })
  })
}

export function addPhoneAndResend(state: HubState, eventId: string, index: number, phone: string, at: number): HubState {
  return updateEvent(state, eventId, (event) => {
    const sample = { ...event.sample, phone }
    const next = decideHop(event.flow, index, sample, state, event.number, at, msFor(event.number, index))
    if (next.status !== 'sent') return event
    const note = `Resent at ${time(at)} to ${maskPhone(phone)} after a mobile number was added`
    return withHop({ ...event, sample }, index, { ...next, code: 'missing-phone', resolved: { at, from: 'failed', note } })
  })
}

export function sendByEmailInstead(state: HubState, eventId: string, index: number, at: number): HubState {
  return updateEvent(state, eventId, (event) => {
    const old = event.hops[index]
    if (old?.status !== 'failed') return event
    return withHop(event, index, {
      ...old,
      app: 'email',
      action: 'Update sent by email instead',
      status: 'sent',
      ms: msFor(event.number, index),
      detail: `Sent by email to ${maskEmail(event.sample.email)} instead of WhatsApp`,
      request: maskDeep({ method: 'POST', path: '/send', body: { to: event.sample.email, template: 'whatsapp_fallback', about: shortLabel(event.sample) } }),
      response: { status: 202, body: { id: `em_${event.number}w` } },
      resolved: { at, from: 'failed', note: `Sent by email instead at ${time(at)}` },
    })
  })
}

/** Resends hops that failed because the mapping was missing a required field. */
export function retryMapping(state: HubState, mappingId: MappingId, at: number): { state: HubState; sent: number; missing: TargetField[] } {
  const missing = missingRequired(state.mappings[mappingId], MAPPINGS[mappingId].targets)
  if (missing.length) return { state, sent: 0, missing }
  let sent = 0
  const events = state.events.map((event) => {
    const hops = event.hops.map((hop, index) => {
      if (hop.status !== 'failed' || hop.code !== 'missing-field' || FLOWS[event.flow].hops[index].mapping !== mappingId) return hop
      const next = decideHop(event.flow, index, event.sample, state, event.number, at, msFor(event.number, index))
      if (next.status !== 'sent') return hop
      sent += 1
      return { ...next, code: hop.code, resolved: { at, from: 'failed' as const, note: `Resent at ${time(at)} after the mapping was fixed` } }
    })
    return { ...event, hops }
  })
  return { state: { ...state, events }, sent, missing }
}

export function failedForMapping(state: HubState, mappingId: MappingId): number {
  return state.events.reduce(
    (n, e) => n + e.hops.filter((h, i) => h.status === 'failed' && h.code === 'missing-field' && FLOWS[e.flow].hops[i].mapping === mappingId).length,
    0,
  )
}

/* Problems, derived from state so they can't drift out of sync */

export interface ProblemItem {
  eventId: string
  index: number
  at: number
  label: string
  done: boolean
}

export interface Problem {
  id: string
  kind: 'app' | 'missing-phone' | 'missing-field' | 'busy'
  app: AppId
  at: number
  title: string
  happened: string
  hubDid: string
  todo?: string
  status: 'open' | 'sending' | 'resolved' | 'dismissed'
  note?: string
  items: ProblemItem[]
  mapping?: MappingId
}

export function problems(state: HubState): Problem[] {
  const list: Problem[] = []
  const flat = state.events.flatMap((event) => event.hops.map((hop, index) => ({ event, hop, index })))
  const item = (x: (typeof flat)[number]): ProblemItem => ({
    eventId: x.event.id,
    index: x.index,
    at: x.event.at,
    label: shortLabel(x.event.sample),
    done: isDelivered(x.hop),
  })

  for (const app of state.apps) {
    if (!app.expiredAt) continue
    const name = APPS[app.id].name
    const related = flat.filter((x) => x.hop.app === app.id && (x.hop.status === 'queued' || x.hop.resolved?.from === 'queued'))
    const items = related.map(item).sort((a, b) => a.at - b.at)
    const waiting = items.filter((i) => !i.done).length
    const noun = related[0] ? nounFor(related[0].event.flow) : 'item'
    const sentAfter = items.filter((i) => i.done).length
    list.push({
      id: `app:${app.id}`,
      kind: 'app',
      app: app.id,
      at: app.expiredAt,
      title: `${name} access expired`,
      happened: `At ${time(app.expiredAt)} the hub’s access to ${name} expired. This happens when a password changes or a sign-in gets too old.`,
      hubDid: items.length
        ? `Saved ${plural(items.length, noun)} for ${name} and kept everything else flowing. Emailed ${firstName(STAFF.ops.name)} at ${time(app.expiredAt)}.`
        : `Nothing is waiting yet. Anything for ${name} is saved until you reconnect.`,
      todo: `Reconnect ${name}. It takes about a minute.`,
      status: app.status === 'expired' ? 'open' : waiting ? 'sending' : 'resolved',
      note: app.reconnectedAt
        ? `Reconnected at ${time(app.reconnectedAt)}.${sentAfter ? ` ${plural(sentAfter, `waiting ${noun}`)} sent.` : ''}`
        : undefined,
      items,
    })
  }

  for (const x of flat) {
    if (x.hop.code === 'missing-phone') {
      const s = x.event.sample
      list.push({
        id: `hop:${x.event.id}:${x.index}`,
        kind: 'missing-phone',
        app: 'whatsapp',
        at: x.event.at,
        title: `WhatsApp message not sent: no mobile number for ${s.name} (unit ${s.unit})`,
        happened: `${FLOWS[x.event.flow].name} at ${time(x.event.at)}: ${firstName(s.name)}’s tenant record has no mobile number.`,
        hubDid: `Sent everything else for this ${FLOWS[x.event.flow].noun} and kept the WhatsApp message ready to resend.`,
        todo: 'Add a mobile number and resend, or send the update by email instead.',
        status: x.hop.status === 'failed' ? 'open' : 'resolved',
        note: x.hop.resolved?.note,
        items: [item(x)],
      })
    }
    if (x.hop.code === 'busy') {
      const name = APPS[x.hop.app].name
      list.push({
        id: `hop:${x.event.id}:${x.index}`,
        kind: 'busy',
        app: x.hop.app,
        at: x.event.at,
        title: `${name} was busy (rate limit)`,
        happened: `At ${time(x.event.at)}, ${name} asked the hub to slow down. ${shortLabel(x.event.sample)}.`,
        hubDid: `Waited ${x.hop.retryAfterS ?? 2} s and sent it again. It went through.`,
        status: 'resolved',
        note: `Fixed automatically: retried after ${x.hop.retryAfterS ?? 2} s`,
        items: [item(x)],
      })
    }
  }

  const byMapping = new Map<MappingId, typeof flat>()
  for (const x of flat) {
    const mapping = FLOWS[x.event.flow].hops[x.index].mapping
    if (x.hop.code === 'missing-field' && mapping) byMapping.set(mapping, [...(byMapping.get(mapping) ?? []), x])
  }
  for (const [mappingId, group] of byMapping) {
    const def = MAPPINGS[mappingId]
    const name = APPS[def.app].name
    const noun = FLOWS[def.flow].noun
    const failed = group.filter((x) => x.hop.status === 'failed')
    const missing = missingRequired(state.mappings[mappingId], def.targets)
    const fields = missing.map((f) => `“${f.label}”`).join(' and ')
    const resolved = group.filter((x) => x.hop.resolved).sort((a, b) => (b.hop.resolved?.at ?? 0) - (a.hop.resolved?.at ?? 0))
    list.push({
      id: `mapping:${mappingId}`,
      kind: 'missing-field',
      app: def.app,
      at: Math.max(...group.map((x) => x.event.at)),
      title: `${name} didn’t accept ${plural(failed.length || group.length, `new ${noun}`)}`,
      happened: missing.length
        ? `${name} needs ${fields}, but nothing from the ${def.sourceName.toLowerCase()} is mapped to it.`
        : `The mapping is fixed now, so ${failed.length === 1 ? 'it' : 'they'} can be sent again.`,
      hubDid: `Sent the rest of each ${noun} and kept this step to retry. Nothing is lost.`,
      todo: missing.length ? `Map a field to ${fields} in Field mapping, then press Retry now.` : 'Press Retry now.',
      status: failed.length ? 'open' : 'resolved',
      note: resolved[0]?.hop.resolved?.note,
      items: group.map(item),
      mapping: mappingId,
    })
  }

  return list
    .map((p) => {
      const dismissedAt = state.dismissed[p.id]
      if (!dismissedAt || p.status !== 'open' || p.items.some((i) => !i.done && i.at > dismissedAt)) return p
      return { ...p, status: 'dismissed' as const, note: `Dismissed at ${time(dismissedAt)}` }
    })
    .sort((a, b) => b.at - a.at)
}

export const isUnresolved = (p: Problem) => p.status === 'open' || p.status === 'sending'

/* Figures for the Hub and the metrics strip */

export type AppHealth = 'connected' | 'expired' | 'catching-up'

export function appHealth(state: HubState, id: AppId): AppHealth | null {
  const app = state.apps.find((a) => a.id === id)
  if (!app) return null
  if (app.status === 'expired') return 'expired'
  return state.events.some((e) => e.hops.some((h) => h.app === id && h.status === 'queued')) ? 'catching-up' : 'connected'
}

export function appActivity(state: HubState, id: AppId, now: number): { events: number; lastSync: number } {
  const app = state.apps.find((a) => a.id === id)
  let events = 0
  let lastSync = app?.lastSyncAt ?? 0
  for (const e of state.events) {
    if (!isSameDay(e.at, now)) continue
    if (FLOWS[e.flow].source === id) {
      events += 1
      lastSync = Math.max(lastSync, e.at)
    }
    for (const h of e.hops)
      if (h.app === id && isDelivered(h)) {
        events += 1
        lastSync = Math.max(lastSync, h.resolved?.at ?? e.at)
      }
  }
  return { events, lastSync }
}

export function hopsSyncedToday(state: HubState, now: number): number {
  return state.events.filter((e) => isSameDay(e.at, now)).reduce((n, e) => n + e.hops.filter(isDelivered).length, 0)
}

export function waitingHops(state: HubState): number {
  return state.events.reduce((n, e) => n + e.hops.filter((h) => h.status === 'queued' || h.status === 'failed').length, 0)
}
