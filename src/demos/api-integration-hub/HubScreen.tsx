import { CircleCheck, Info, LoaderCircle, Play, Plug, TriangleAlert, Unplug } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import { isSameDay } from '../../lib/time'
import { AppButton, Badge, Modal, Panel } from '../ui'
import { APPS, CORE_APPS, EXTRA_APPS, FLOWS, FLOW_ORDER } from './catalog'
import { appActivity, appHealth, plural, syncLabel, type AppHealth } from './engine'
import { AppTile, FlowChain } from './parts'
import type { AppId, FlowId, HubState } from './types'

interface Props {
  state: HubState
  now: number
  running: boolean
  onSimulate: (flow: FlowId) => void
  onReconnect: (app: AppId) => void
  onDisconnect: (app: AppId) => void
  onConnectMore: () => void
}

const HEALTH: Record<AppHealth, { label: string; dot: string; text: string }> = {
  connected: { label: 'Connected', dot: 'bg-emerald-500', text: 'text-emerald-800' },
  expired: { label: 'Access expired', dot: 'bg-amber-500', text: 'text-amber-800' },
  'catching-up': { label: 'Sending waiting items', dot: 'bg-sky-500 motion-safe:animate-pulse', text: 'text-sky-800' },
}

/** Status dot plus a text label, so colour is never the only signal. Wraps on narrow cards. */
function HealthLabel({ health }: { health: AppHealth }) {
  const h = HEALTH[health]
  return (
    <p className={cn('flex items-center gap-1.5 text-xs font-semibold', h.text)}>
      <span className={cn('size-2 shrink-0 rounded-full', h.dot)} aria-hidden="true" />
      {h.label}
    </p>
  )
}

export function HubScreen({ state, now, running, onSimulate, onReconnect, onDisconnect, onConnectMore }: Props) {
  const [confirm, setConfirm] = useState<AppId | null>(null)
  const order = [...CORE_APPS, ...EXTRA_APPS]
  const apps = [...state.apps].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
  const attention = apps.filter((a) => a.status === 'expired').length
  const available = EXTRA_APPS.filter((id) => !state.apps.some((a) => a.id === id)).length

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <p
        className={cn(
          'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium',
          attention ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900',
        )}
      >
        {attention ? <TriangleAlert className="size-4 shrink-0" aria-hidden="true" /> : <CircleCheck className="size-4 shrink-0" aria-hidden="true" />}
        <span>
          {plural(apps.length, 'app')} connected · {attention ? `${attention} needs attention` : 'all working'}
        </span>
      </p>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Connected apps">
        {apps.map((app) => {
          const health = appHealth(state, app.id) ?? 'connected'
          const activity = appActivity(state, app.id, now)
          const def = APPS[app.id]
          const extra = EXTRA_APPS.includes(app.id as (typeof EXTRA_APPS)[number])
          return (
            <li
              key={app.id}
              className={cn(
                'flex min-w-0 flex-col rounded-xl border bg-white p-3 shadow-sm',
                health === 'expired' ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200',
              )}
            >
              <div className="flex items-start gap-2.5">
                <AppTile app={app.id} size="sm" />
                <p className="min-w-0 pt-0.5 text-sm leading-tight font-semibold text-slate-900">{def.name}</p>
              </div>
              <div className="mt-2">
                <HealthLabel health={health} />
              </div>
              <p className="mt-2 text-xs text-slate-600">
                {syncLabel(activity.lastSync, now)}
                <span className="block">{plural(activity.events, 'event')} today</span>
              </p>
              <p className="mt-1.5 flex-1 text-xs text-slate-700">{extra ? app.syncs?.join(', ') : def.syncs}</p>
              {health === 'expired' && (
                <AppButton size="sm" icon={Plug} className="mt-3 w-full" onClick={() => onReconnect(app.id)}>
                  Reconnect
                </AppButton>
              )}
              {extra && (
                <AppButton variant="ghost" size="sm" icon={Unplug} className="mt-3 w-full" onClick={() => setConfirm(app.id)} aria-label={`Disconnect ${def.name}`}>
                  Disconnect
                </AppButton>
              )}
            </li>
          )
        })}
      </ul>
      {available > 0 && (
        <AppButton variant="secondary" size="sm" icon={Plug} onClick={onConnectMore}>
          Connect another app ({available} available)
        </AppButton>
      )}

      <Panel title="Flows" description="What happens by itself when something comes in. Try one to watch it travel between apps.">
        <ul className="divide-y divide-slate-100">
          {FLOW_ORDER.map((id) => {
            const flow = FLOWS[id]
            const today = state.events.filter((e) => e.flow === id && isSameDay(e.at, now)).length
            return (
              <li key={id} className="space-y-2.5 py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {flow.name}
                    <span className="font-normal text-slate-600"> · {flow.trigger}</span>
                  </p>
                  <Badge>{plural(today, 'event')} today</Badge>
                </div>
                <FlowChain flow={id} />
                <AppButton icon={running ? LoaderCircle : Play} disabled={running} onClick={() => onSimulate(id)} className={cn('w-full sm:w-auto', running && '[&>svg]:motion-safe:animate-spin')}>
                  {flow.button}
                </AppButton>
              </li>
            )
          })}
        </ul>
        {running && (
          <p className="mt-3 text-xs text-slate-700" role="status">
            An event is playing in Live events. You can start another when it finishes.
          </p>
        )}
      </Panel>

      <p className="flex items-start gap-2 text-xs text-slate-600">
        <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        In this demo the apps and their replies are simulated. A real build connects your own tools through their official APIs.
      </p>

      {confirm && (
        <Modal
          open
          onClose={() => setConfirm(null)}
          size="sm"
          title={`Disconnect ${APPS[confirm].name}?`}
          description="The hub stops syncing with it. You can connect it again at any time."
          footer={
            <>
              <AppButton variant="secondary" onClick={() => setConfirm(null)}>
                Keep it
              </AppButton>
              <AppButton
                variant="danger"
                icon={Unplug}
                onClick={() => {
                  onDisconnect(confirm)
                  setConfirm(null)
                }}
              >
                Disconnect
              </AppButton>
            </>
          }
        >
          <p className="text-sm text-slate-700">Nothing already synced is deleted from either app.</p>
        </Modal>
      )}
    </div>
  )
}
