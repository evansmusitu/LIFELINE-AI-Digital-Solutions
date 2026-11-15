import { Activity, ArrowLeftRight, Building2, LayoutGrid, Plug, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useToast } from '../../components/toast-context'
import { duration, firstName, num } from '../../lib/format'
import { usePersistentState } from '../../lib/storage'
import { isSameDay, useDemoClock, useTicker } from '../../lib/time'
import { useDemoMetrics } from '../metrics'
import { DemoAppShell, type DemoScreen } from '../shell'
import { APPS, BUSINESS, CORE_APPS, EXTRA_APPS, FLOWS, MAPPINGS, STAFF } from './catalog'
import { ConnectScreen } from './ConnectScreen'
import { POOLS, createInitialState } from './data'
import {
  addPhoneAndResend,
  dueHops,
  eventOutcome,
  failedForMapping,
  formatMs,
  hopsSyncedToday,
  isUnresolved,
  maskPhone,
  nounFor,
  planEvent,
  plural,
  problems,
  resendQueued,
  retryMapping,
  sendByEmailInstead,
  totalMs,
  waitingHops,
} from './engine'
import { ErrorsScreen } from './ErrorsScreen'
import { HubScreen } from './HubScreen'
import { LiveScreen, type LiveRun } from './LiveScreen'
import { MappingScreen } from './MappingScreen'
import { ReconnectModal } from './ReconnectModal'
import type { AppId, FlowId, Hop, HubState, MappingId, SyncEvent } from './types'

const SLUG = 'api-integration-hub'
const ACCENT = { base: '#1d4ed8', strong: '#1e40af', soft: '#eff6ff', ink: '#1e3a8a' }
/** Gap between waiting items being resent after a reconnect. */
const REPLAY_MS = 800

type ScreenId = 'hub' | 'live' | 'mapping' | 'errors' | 'connect'

/** How long each hop takes on screen: 600 to 900 ms, longer when the app was busy. */
function playbackMs(hop: Hop): number {
  if (hop.status === 'retried') return 1600
  if (hop.status === 'skipped') return 400
  return 600 + (hop.ms % 301)
}

export default function ApiIntegrationHubDemo() {
  const clock = useDemoClock(9, 40)
  const now = useTicker(clock)
  const toast = useToast()
  const [state, setState] = usePersistentState<HubState>(`${SLUG}.state`, createInitialState, { version: 1, freshDaily: true })
  const [screen, setScreen] = useState<ScreenId>('hub')
  // The playing simulation is never persisted: a reload mid-run simply drops it.
  const [live, setLive] = useState<LiveRun | null>(null)
  const [reconnecting, setReconnecting] = useState<AppId | null>(null)
  const [mappingId, setMappingId] = useState<MappingId>('enquiry-crm')
  const replayed = useRef<{ app: AppId; flow: FlowId }[]>([])

  const finish = (event: SyncEvent) => {
    setState((s) => ({ ...s, events: [event, ...s.events], nextNumber: Math.max(s.nextNumber, event.number + 1) }))
    setLive(null)
    const o = eventOutcome(event)
    const names = (apps: AppId[]) => apps.map((a) => APPS[a].name).join(' and ')
    let message = `${FLOWS[event.flow].name} from ${event.sample.name} reached ${o.delivered === o.needed ? 'every app' : `${o.delivered} of ${o.needed} apps`} in ${formatMs(totalMs(event))}.`
    if (o.waiting.length) {
      message += ` ${names(o.waiting)} is waiting and will get it once reconnected.`
      if (event.flow === 'rent' && state.alerts.whatsapp) message += ` ${firstName(STAFF.ops.name)} got a WhatsApp alert.`
    }
    if (o.failed.length) message += ` ${names(o.failed)} didn’t get it. See Errors.`
    toast(message, o.failed.length ? 'warning' : o.waiting.length ? 'info' : 'success')
  }

  const replayNext = () => {
    const item = dueHops(state)[0]
    const event = state.events.find((e) => e.id === item?.eventId)
    if (!item || !event) return
    replayed.current.push({ app: event.hops[item.index].app, flow: event.flow })
    setState((s) => resendQueued(s, item.eventId, item.index, clock()))
  }

  const replayDone = () => {
    const batch = replayed.current
    if (!batch.length) return
    replayed.current = []
    const noun = batch.every((b) => b.flow === batch[0].flow) ? FLOWS[batch[0].flow].noun : 'item'
    toast(`${plural(batch.length, `waiting ${noun}`)} sent to ${APPS[batch[0].app].name}`, 'success')
  }

  // Timers call the latest handlers through this ref, so clock ticks and unrelated state changes don't restart them.
  const handlers = useRef({ finish, replayNext, replayDone })
  useEffect(() => {
    handlers.current = { finish, replayNext, replayDone }
  })

  // Plays the running event hop by hop. Timers are cleared on unmount and on every step.
  useEffect(() => {
    if (!live) return
    const { event, step } = live
    if (step >= event.hops.length) {
      const id = window.setTimeout(() => handlers.current.finish(event), 300)
      return () => window.clearTimeout(id)
    }
    const id = window.setTimeout(() => setLive((l) => (l && l.event.id === event.id ? { ...l, step: l.step + 1 } : l)), playbackMs(event.hops[step]))
    return () => window.clearTimeout(id)
  }, [live])

  // Sends waiting items one by one once their app is connected. Each sent item is saved, so a reload carries on.
  const nextKey = dueHops(state)[0]?.key
  useEffect(() => {
    if (!nextKey) {
      handlers.current.replayDone()
      return
    }
    const id = window.setTimeout(() => handlers.current.replayNext(), REPLAY_MS)
    return () => window.clearTimeout(id)
  }, [nextKey])

  const simulate = (flow: FlowId) => {
    if (live) return
    const pool = POOLS[flow]
    const sample = pool[state.events.filter((e) => e.simulated && e.flow === flow).length % pool.length]
    setLive({ event: { ...planEvent(flow, sample, state, state.nextNumber, clock()), simulated: true }, step: 0 })
    setScreen('live')
  }

  const waitingFor = (app: AppId) => state.events.flatMap((e) => e.hops.filter((h) => h.app === app && h.status === 'queued').map(() => e.flow))

  const reconnected = (app: AppId) => {
    const at = clock()
    setState((s) => ({ ...s, apps: s.apps.map((a) => (a.id === app ? { ...a, status: 'connected', reconnectedAt: at, lastSyncAt: at } : a)) }))
    setReconnecting(null)
    if (!waitingFor(app).length) toast(`${APPS[app].name} is connected again.`, 'success')
  }

  const saveMapping = (id: MappingId, rows: HubState['mappings'][MappingId]) => {
    setState((s) => ({ ...s, mappings: { ...s.mappings, [id]: rows } }))
    const noun = FLOWS[MAPPINGS[id].flow].noun
    const failed = failedForMapping(state, id)
    toast(`Mapping saved. New events use it from now on.${failed ? ` Press Retry now on the Errors screen to resend the ${plural(failed, `failed ${noun}`)}.` : ''}`, 'success')
  }

  const retry = (id: MappingId) => {
    const app = APPS[MAPPINGS[id].app].name
    const result = retryMapping(state, id, clock())
    if (result.missing.length) {
      toast(`${app} still needs ${result.missing.map((f) => `“${f.label}”`).join(' and ')}. Fix it in Field mapping first.`, 'warning')
      return
    }
    setState((s) => retryMapping(s, id, clock()).state)
    toast(`${plural(result.sent, FLOWS[MAPPINGS[id].flow].noun)} sent to ${app}.`, 'success')
  }

  const eventById = (id: string) => state.events.find((e) => e.id === id)

  const list = problems(state)
  const open = list.filter(isUnresolved).length
  const attention = state.apps.filter((a) => a.status === 'expired').length
  const eventsToday = state.events.filter((e) => isSameDay(e.at, now)).length
  const waiting = reconnecting ? waitingFor(reconnecting) : []

  useDemoMetrics([
    { label: 'Events synced today', value: num(hopsSyncedToday(state, now)), detail: `Between ${state.apps.length} apps` },
    {
      label: 'Apps connected',
      value: `${state.apps.length} of ${CORE_APPS.length + EXTRA_APPS.length}`,
      detail: attention ? `${attention} ${attention === 1 ? 'needs' : 'need'} attention` : 'All working',
    },
    { label: 'Waiting to send', value: num(waitingHops(state)), detail: 'Saved, nothing lost' },
    { label: 'Data entry saved today (est.)', value: duration(eventsToday * 4), detail: 'No retyping between systems' },
  ])

  const screens: DemoScreen<ScreenId>[] = [
    { id: 'hub', label: 'Hub', icon: LayoutGrid, audience: 'team' },
    { id: 'live', label: 'Live events', icon: Activity, audience: 'team' },
    { id: 'mapping', label: 'Field mapping', icon: ArrowLeftRight, audience: 'team' },
    { id: 'errors', label: 'Errors', icon: TriangleAlert, audience: 'team', badge: open || undefined },
    { id: 'connect', label: 'Connect app', icon: Plug, audience: 'team' },
  ]

  return (
    <DemoAppShell
      slug={SLUG}
      business={{ name: BUSINESS.name, descriptor: BUSINESS.descriptor, icon: Building2 }}
      accent={ACCENT}
      screens={screens}
      active={screen}
      onChange={setScreen}
      headerRight={
        <span className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 sm:inline-flex">
          <span className={attention ? 'size-2 rounded-full bg-amber-500' : 'size-2 rounded-full bg-emerald-500'} aria-hidden="true" />
          {attention ? `${attention} app needs attention` : 'All apps working'} ·{' '}
          {new Date(now).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </span>
      }
    >
      {screen === 'hub' && (
        <HubScreen
          state={state}
          now={now}
          running={Boolean(live)}
          onSimulate={simulate}
          onReconnect={setReconnecting}
          onDisconnect={(app) => {
            setState((s) => ({ ...s, apps: s.apps.filter((a) => a.id !== app) }))
            toast(`${APPS[app].name} disconnected.`, 'info')
          }}
          onConnectMore={() => setScreen('connect')}
        />
      )}
      {screen === 'live' && <LiveScreen events={state.events} live={live} />}
      {screen === 'mapping' && <MappingScreen mappings={state.mappings} selected={mappingId} now={now} onSelect={setMappingId} onSave={saveMapping} />}
      {screen === 'errors' && (
        <ErrorsScreen
          state={state}
          problems={list}
          onReconnect={setReconnecting}
          onAddPhone={(eventId, index, phone) => {
            setState((s) => addPhoneAndResend(s, eventId, index, phone, clock()))
            toast(`WhatsApp message resent to ${eventById(eventId)?.sample.name ?? 'the tenant'} at ${maskPhone(phone)}.`, 'success')
          }}
          onEmailInstead={(eventId, index) => {
            setState((s) => sendByEmailInstead(s, eventId, index, clock()))
            toast(`Update emailed to ${eventById(eventId)?.sample.name ?? 'the tenant'} instead.`, 'success')
          }}
          onRetryMapping={retry}
          onOpenMapping={(id) => {
            setMappingId(id)
            setScreen('mapping')
          }}
          onDismiss={(id) => {
            setState((s) => ({ ...s, dismissed: { ...s.dismissed, [id]: clock() } }))
            toast('Dismissed. You’ll find it under Resolved today.', 'info')
          }}
          onAlerts={(alerts) => setState((s) => ({ ...s, alerts }))}
        />
      )}
      {screen === 'connect' && (
        <ConnectScreen
          state={state}
          onConnect={(app, syncs) => {
            const at = clock()
            setState((s) => ({ ...s, apps: [...s.apps.filter((a) => a.id !== app), { id: app, status: 'connected', lastSyncAt: at, connectedAt: at, syncs }] }))
            toast(`${APPS[app].name} is connected. It’s on your Hub now.`, 'success')
          }}
        />
      )}

      {reconnecting && (
        <ReconnectModal
          key={reconnecting}
          app={reconnecting}
          waiting={waiting.length ? plural(waiting.length, nounFor(waiting[0])) : null}
          onClose={() => setReconnecting(null)}
          onConnected={() => reconnected(reconnecting)}
        />
      )}
    </DemoAppShell>
  )
}
