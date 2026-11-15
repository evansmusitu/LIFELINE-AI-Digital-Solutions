import { Check, CircleCheck, Info, LoaderCircle, Plug } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '../../lib/cn'
import { clockTime } from '../../lib/format'
import { AppButton, Badge, Modal, Panel } from '../ui'
import { APPS, BUSINESS, EXTRA_APPS, STAFF } from './catalog'
import { AppTile } from './parts'
import type { ExtraAppId, HubState } from './types'

const TEST_MS = 1200
const STEPS = ['Allow access', 'Choose data', 'Test']

export function ConnectScreen({ state, onConnect }: { state: HubState; onConnect: (app: ExtraAppId, syncs: string[]) => void }) {
  const [target, setTarget] = useState<ExtraAppId | null>(null)

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <Panel title="Connect another app" description="Each connection takes about a minute. You choose what the hub can see and what it syncs.">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {EXTRA_APPS.map((id) => {
            const def = APPS[id]
            const connected = state.apps.find((a) => a.id === id)
            return (
              <li key={id} className="flex flex-col rounded-xl border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <AppTile app={id} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{def.name}</p>
                    <p className="text-sm text-slate-700">{def.description}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-600">Can sync: {def.options?.join(', ')}</p>
                <div className="mt-3 flex flex-1 items-end">
                  {connected ? (
                    <p className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
                      <Badge tone="green" icon={CircleCheck}>
                        Connected
                      </Badge>
                      {connected.connectedAt && `at ${clockTime(connected.connectedAt, 'en-US')} · manage it on Hub`}
                    </p>
                  ) : (
                    <AppButton icon={Plug} onClick={() => setTarget(id)} aria-label={`Connect ${def.name}`}>
                      Connect
                    </AppButton>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </Panel>
      <p className="flex items-start gap-2 text-xs text-slate-600">
        <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        In this demo the sign-in and the test are simulated. A real build uses each app’s official sign-in and API.
      </p>

      {target && (
        <ConnectModal
          key={target}
          app={target}
          onClose={() => setTarget(null)}
          onFinish={(syncs) => {
            onConnect(target, syncs)
            setTarget(null)
          }}
        />
      )}
    </div>
  )
}

function ConnectModal({ app, onClose, onFinish }: { app: ExtraAppId; onClose: () => void; onFinish: (syncs: string[]) => void }) {
  const def = APPS[app]
  const options = def.options ?? []
  const [step, setStep] = useState(0)
  const [syncs, setSyncs] = useState<string[]>(options.slice(0, 2))
  const [error, setError] = useState('')
  const [test, setTest] = useState<'idle' | 'running' | 'passed'>('idle')

  useEffect(() => {
    if (test !== 'running') return
    const id = window.setTimeout(() => setTest('passed'), TEST_MS)
    return () => window.clearTimeout(id)
  }, [test])

  const next = () => {
    if (step === 0) setStep(1)
    else if (step === 1) {
      if (!syncs.length) {
        setError('Choose at least one thing to sync.')
        return
      }
      setStep(2)
      setTest('running')
    }
  }

  const back = () => {
    setStep((s) => Math.max(0, s - 1))
    setTest('idle')
  }

  const footer = (
    <>
      {step === 0 ? (
        <AppButton variant="secondary" onClick={onClose}>
          Cancel
        </AppButton>
      ) : (
        <AppButton variant="secondary" onClick={back} disabled={test === 'running'}>
          Back
        </AppButton>
      )}
      {step === 0 && <AppButton onClick={next}>Allow access</AppButton>}
      {step === 1 && <AppButton onClick={next}>Next: test it</AppButton>}
      {step === 2 && (
        <AppButton icon={CircleCheck} disabled={test !== 'passed'} onClick={() => onFinish(syncs)}>
          Finish
        </AppButton>
      )}
    </>
  )

  return (
    <Modal open onClose={onClose} title={`Connect ${def.name}`} description={def.description} footer={footer}>
      <ol className="mb-4 grid grid-cols-3 gap-2" aria-label="Steps">
        {STEPS.map((label, i) => (
          <li key={label} aria-current={i === step ? 'step' : undefined} className="flex min-w-0 flex-col items-center gap-1 text-center">
            <span
              className={cn(
                'grid size-7 place-items-center rounded-full text-xs font-bold',
                i < step ? 'bg-emerald-700 text-white' : i === step ? 'bg-(--accent) text-white' : 'bg-slate-100 text-slate-700',
              )}
            >
              {i < step ? <Check className="size-3.5" aria-label="Done" /> : i + 1}
            </span>
            <span className={cn('text-xs', i === step ? 'font-semibold text-slate-900' : 'text-slate-600')}>{label}</span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <AppTile app={app} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">Sign in to {def.name}</p>
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
      )}

      {step === 1 && (
        <fieldset aria-describedby={error ? `${app}-sync-error` : undefined}>
          <legend className="text-sm font-semibold text-slate-900">Choose what to sync</legend>
          <div className="mt-2 space-y-2">
            {options.map((option) => {
              const id = `${app}-sync-${option.replace(/\W+/g, '-')}`
              return (
                <label key={option} htmlFor={id} className="flex min-h-10 items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 hover:bg-slate-50">
                  <input
                    id={id}
                    type="checkbox"
                    className="size-4 accent-(--accent)"
                    checked={syncs.includes(option)}
                    onChange={(e) => {
                      setError('')
                      setSyncs(e.target.checked ? options.filter((o) => o === option || syncs.includes(o)) : syncs.filter((s) => s !== option))
                    }}
                  />
                  {option}
                </label>
              )
            })}
          </div>
          {error && (
            <p id={`${app}-sync-error`} role="alert" className="mt-2 text-xs font-medium text-red-700">
              {error}
            </p>
          )}
        </fieldset>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <p role="status" className={cn('flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium', test === 'passed' ? 'bg-emerald-50 text-emerald-900' : 'bg-slate-50 text-slate-800')}>
            {test === 'passed' ? (
              <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
            ) : (
              <LoaderCircle className="size-4 shrink-0 motion-safe:animate-spin" aria-hidden="true" />
            )}
            {test === 'passed' ? `Test passed: the app replied in ${def.testMs} ms` : 'Sending a test…'}
          </p>
          <p className="text-sm text-slate-700">Will sync: {syncs.join(', ')}.</p>
        </div>
      )}
    </Modal>
  )
}
