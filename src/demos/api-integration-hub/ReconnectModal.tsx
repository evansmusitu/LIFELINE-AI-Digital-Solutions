import { Check, LoaderCircle, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AppButton, Modal } from '../ui'
import { APPS, BUSINESS, STAFF } from './catalog'
import { AppTile } from './parts'
import type { AppId } from './types'

const CONNECT_MS = 1500

/** Imitates signing in to the app again and granting the hub access. */
export function ReconnectModal({
  app,
  waiting,
  onClose,
  onConnected,
}: {
  app: AppId
  /** e.g. "2 rent payments", or null when nothing is waiting */
  waiting: string | null
  onClose: () => void
  onConnected: () => void
}) {
  const [connecting, setConnecting] = useState(false)
  // Kept in a ref so parent re-renders (live playback, the clock) don't restart the timer.
  const done = useRef(onConnected)
  const def = APPS[app]

  useEffect(() => {
    done.current = onConnected
  }, [onConnected])

  useEffect(() => {
    if (!connecting) return
    const id = window.setTimeout(() => done.current(), CONNECT_MS)
    return () => window.clearTimeout(id)
  }, [connecting])

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={`Reconnect ${def.name}`}
      description="Sign in again so the hub can send what’s waiting."
      footer={
        <>
          <AppButton variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton icon={connecting ? LoaderCircle : ShieldCheck} disabled={connecting} onClick={() => setConnecting(true)} className={connecting ? '[&>svg]:motion-safe:animate-spin' : undefined}>
            {connecting ? 'Connecting…' : 'Allow access'}
          </AppButton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <AppTile app={app} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{def.name}</p>
              <p className="text-xs break-all text-slate-600">Signed in as {STAFF.ops.email}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-800">
            <span className="font-semibold">{BUSINESS.name}</span>’s hub would like to:
          </p>
          <ul className="mt-2 space-y-1.5">
            {def.permissions.map((p) => (
              <li key={p} className="flex items-center gap-2 text-sm text-slate-800">
                <Check className="size-4 shrink-0 text-emerald-700" aria-hidden="true" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-slate-700" role="status">
          {connecting
            ? `Connecting to ${def.name}…`
            : waiting
              ? `Once connected, the hub sends the ${waiting} waiting for ${def.name}, one by one.`
              : `Once connected, new items go straight to ${def.name}.`}
        </p>
        <p className="text-xs text-slate-600">In this demo the sign-in is simulated. A real build uses the app’s own secure sign-in page.</p>
      </div>
    </Modal>
  )
}
