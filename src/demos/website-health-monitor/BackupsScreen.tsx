import { ArchiveRestore, CalendarClock, CircleCheck, CloudUpload, DatabaseBackup, HardDrive, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import { clockTime, dayAndTime, shortDate } from '../../lib/format'
import { DAY, isSameDay } from '../../lib/time'
import { td, th } from '../styles'
import { AppButton, Badge, Field, Modal, Notice, Panel, SelectInput, Stat, TextInput, Toggle } from '../ui'
import { LODGE, PEOPLE } from './data'
import { BACKUP_STEPS, formatBytes, keptBackups, restoreConfirmed, restoreSteps } from './engine'
import { JobProgress } from './parts'
import type { Backup, MonitorState, RestoreTarget, RetentionDays } from './types'
import { useJob } from './useJob'

interface Props {
  state: MonitorState
  now: number
  onBackUp: (silent: boolean) => Backup
  onRestore: (backup: Backup, target: RestoreTarget, silent: boolean) => void
  onRetention: (days: RetentionDays) => void
  onEmailOnFail: (on: boolean) => void
}

const INCLUDED = 'Website files + booking database'
const WHERE = 'Off-site storage'
const RETENTION: RetentionDays[] = [14, 30, 90]

const label = (b: Backup) => `${shortDate(b.at, LODGE.locale)} ${clockTime(b.at, LODGE.locale)}`

function BackupStatus({ backup, lastNight }: { backup: Backup; lastNight: boolean }) {
  return (
    <span className="flex flex-wrap gap-1">
      {lastNight && <Badge tone="accent">Last night</Badge>}
      {backup.status === 'retried' ? (
        <Badge tone="amber" icon={TriangleAlert}>
          Failed, then fixed
        </Badge>
      ) : (
        <Badge tone="green" icon={CircleCheck}>
          Complete
        </Badge>
      )}
      {backup.kind === 'manual' && <Badge tone="accent">Manual</Badge>}
      {backup.kind === 'safety' && <Badge tone="blue">Safety copy</Badge>}
    </span>
  )
}

export function BackupsScreen({ state, now, onBackUp, onRestore, onRetention, onEmailOnFail }: Props) {
  const job = useJob()
  const [showAll, setShowAll] = useState(false)
  const [restoreOf, setRestoreOf] = useState<Backup | null>(null)
  const [backupResult, setBackupResult] = useState<string | null>(null)
  const [doneFor, setDoneFor] = useState<string | null>(null)

  const kept = keptBackups(state.backups, now, state.retentionDays)
  const shown = showAll ? kept : kept.filter((b) => now - b.at <= 14 * DAY)
  const latest = kept[0]
  const lastNightId = kept.find((b) => b.kind === 'nightly' && isSameDay(b.at, now))?.id
  const lastRestore = state.restores[0]
  const rudo = PEOPLE.find((p) => p.id === 'rudo')

  const backUp = () =>
    job.start({ key: 'backup', phases: BACKUP_STEPS, durationMs: 5000 }, (silent) => {
      const backup = onBackUp(silent)
      setBackupResult(`Backup finished at ${clockTime(backup.at, LODGE.locale)} · ${formatBytes(backup.sizeBytes)} stored off-site and checked.`)
    })

  // A restore can finish after its dialog was closed, so clear any old result when a dialog opens.
  const openRestore = (backup: Backup) => {
    setDoneFor(null)
    setRestoreOf(backup)
  }

  const startRestore = (backup: Backup, target: RestoreTarget) =>
    job.start(
      { key: `restore-${target}`, phases: restoreSteps(target), durationMs: target === 'test' ? 4000 : 5000 },
      (silent) => {
        onRestore(backup, target, silent)
        setDoneFor(backup.id)
      },
    )

  const restoreText = (target: RestoreTarget, backupAt: number) =>
    target === 'test'
      ? `Test copy ready at ${LODGE.staging}, restored from ${shortDate(backupAt, LODGE.locale)} ${clockTime(backupAt, LODGE.locale)}.`
      : `Live site restored to ${shortDate(backupAt, LODGE.locale)} ${clockTime(backupAt, LODGE.locale)}. A fresh safety backup was taken first.`

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={DatabaseBackup}
          tone="green"
          label="Last backup"
          value={latest ? clockTime(latest.at, LODGE.locale) : 'None'}
          detail={
            latest
              ? `${isSameDay(latest.at, now) ? 'Today' : shortDate(latest.at, LODGE.locale)} · ${formatBytes(latest.sizeBytes)}`
              : undefined
          }
        />
        <Stat icon={CalendarClock} tone="accent" label="Next backup" value="02:00" detail="Every night" />
        <Stat icon={HardDrive} label="Backups kept" value={kept.length} detail={`For ${state.retentionDays} days`} />
        <Stat icon={CloudUpload} label="Stored" value="Off-site" detail="Away from the web server" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel
          title="Back up now"
          description="Takes about a minute on the real site. Your nightly backups carry on as normal."
          className="self-start lg:col-start-2 lg:row-start-1"
        >
          <AppButton icon={DatabaseBackup} onClick={backUp} disabled={job.busy} className="w-full">
            Back up now
          </AppButton>
          {job.job && (
            <JobProgress
              className="mt-4"
              label={job.job.key === 'backup' ? 'Backup progress' : 'Restore progress'}
              phase={job.phase}
              progress={job.progress}
            />
          )}
          {!job.busy && backupResult && (
            <Notice tone="green" icon={CircleCheck} className="mt-4">
              {backupResult}
            </Notice>
          )}
          {!job.busy && lastRestore && (
            <Notice tone="accent" icon={ArchiveRestore} className="mt-4">
              <span className="break-words">{restoreText(lastRestore.target, lastRestore.backupAt)}</span>
            </Notice>
          )}
          <p className="mt-3 text-xs text-slate-600">In this demo backups and restores are simulated. Nothing is copied.</p>
        </Panel>

        <Panel
          title="Backup history"
          description={`Every night at 02:00 · kept for ${state.retentionDays} days, then deleted`}
          className="lg:col-start-1 lg:row-span-2 lg:row-start-1"
          bodyClassName="p-0!"
        >
          <ul className="divide-y divide-slate-100 md:hidden">
            {shown.map((backup) => (
              <li key={backup.id} className="space-y-2 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{dayAndTime(backup.at, now, LODGE.locale)}</p>
                    <p className="text-xs text-slate-600">
                      {formatBytes(backup.sizeBytes)} · {INCLUDED} · {WHERE}
                    </p>
                  </div>
                  <BackupStatus backup={backup} lastNight={backup.id === lastNightId} />
                </div>
                {backup.note && <p className="text-xs text-slate-700">{backup.note}</p>}
                <AppButton
                  variant="secondary"
                  icon={ArchiveRestore}
                  onClick={() => openRestore(backup)}
                  disabled={job.busy}
                  aria-label={`Restore the backup from ${label(backup)}`}
                  className="w-full"
                >
                  Restore
                </AppButton>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[40rem]">
              <thead className="bg-slate-50">
                <tr>
                  <th className={th}>Date</th>
                  <th className={cn(th, 'text-right')}>Size</th>
                  <th className={th}>Included</th>
                  <th className={th}>Status</th>
                  <th className={th}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((backup) => (
                  <tr key={backup.id}>
                    <td className={td}>
                      <p className="font-medium whitespace-nowrap text-slate-900">{dayAndTime(backup.at, now, LODGE.locale)}</p>
                      {backup.note && <p className="max-w-64 text-xs text-slate-600">{backup.note}</p>}
                    </td>
                    <td className={cn(td, 'text-right whitespace-nowrap tabular-nums')}>{formatBytes(backup.sizeBytes)}</td>
                    <td className={td}>
                      <p>{INCLUDED}</p>
                      <p className="text-xs text-slate-600">{WHERE}</p>
                    </td>
                    <td className={td}>
                      <BackupStatus backup={backup} lastNight={backup.id === lastNightId} />
                    </td>
                    <td className={cn(td, 'text-right')}>
                      <AppButton
                        variant="secondary"
                        size="sm"
                        icon={ArchiveRestore}
                        onClick={() => openRestore(backup)}
                        disabled={job.busy}
                        aria-label={`Restore the backup from ${label(backup)}`}
                      >
                        Restore
                      </AppButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {kept.length > shown.length && (
            <div className="border-t border-slate-100 p-3">
              <AppButton variant="ghost" onClick={() => setShowAll(true)} className="w-full">
                Show all {kept.length} kept backups
              </AppButton>
            </div>
          )}
        </Panel>

        <Panel title="Settings" className="self-start lg:col-start-2 lg:row-start-2">
          <div className="space-y-4">
            <Field label="Keep backups for" htmlFor="backup-retention" hint="Longer gives you more dates to go back to.">
              <SelectInput
                id="backup-retention"
                value={state.retentionDays}
                onChange={(e) => onRetention(Number(e.target.value) as RetentionDays)}
              >
                {RETENTION.map((days) => (
                  <option key={days} value={days}>
                    {days} days
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Toggle
              checked={state.emailOnBackupFail}
              onChange={onEmailOnFail}
              label="Email Rudo if a backup fails"
              description={rudo?.email}
            />
          </div>
        </Panel>
      </div>

      {restoreOf && (
        <RestoreDialog
          key={restoreOf.id}
          backup={restoreOf}
          now={now}
          running={job.job?.key.startsWith('restore') ? job : null}
          done={doneFor === restoreOf.id && lastRestore ? restoreText(lastRestore.target, lastRestore.backupAt) : null}
          onStart={(target) => startRestore(restoreOf, target)}
          onClose={() => {
            setRestoreOf(null)
            setDoneFor(null)
          }}
        />
      )}
    </div>
  )
}

function RestoreDialog({
  backup,
  now,
  running,
  done,
  onStart,
  onClose,
}: {
  backup: Backup
  now: number
  running: { phase: string; progress: number } | null
  done: string | null
  onStart: (target: RestoreTarget) => void
  onClose: () => void
}) {
  const [target, setTarget] = useState<RestoreTarget>('test')
  const [confirm, setConfirm] = useState('')
  const [started, setStarted] = useState(false)
  const ready = target === 'test' || restoreConfirmed(confirm)
  const when = label(backup)

  const options: { value: RestoreTarget; title: string; detail: string }[] = [
    { value: 'test', title: 'Restore to a test copy', detail: 'Safe. The live site isn’t touched.' },
    { value: 'live', title: 'Restore the live site', detail: 'Replaces the live website and booking database.' },
  ]

  return (
    <Modal
      open
      onClose={onClose}
      title="Restore a backup"
      description={`${dayAndTime(backup.at, now, LODGE.locale)} · ${formatBytes(backup.sizeBytes)}`}
      footer={
        done ? (
          <AppButton onClick={onClose}>Done</AppButton>
        ) : (
          <>
            <AppButton variant="secondary" onClick={onClose}>
              {started ? 'Close' : 'Cancel'}
            </AppButton>
            <AppButton
              variant={target === 'live' ? 'danger' : 'primary'}
              icon={ArchiveRestore}
              disabled={!ready || started}
              onClick={() => {
                setStarted(true)
                onStart(target)
              }}
            >
              {target === 'test' ? 'Restore to a test copy' : 'Restore the live site'}
            </AppButton>
          </>
        )
      }
    >
      {done ? (
        <Notice tone="green" icon={CircleCheck} title="Restore finished">
          <span className="break-words">{done}</span>
        </Notice>
      ) : started && running ? (
        <JobProgress label="Restore progress" phase={running.phase} progress={running.progress} />
      ) : (
        <div className="space-y-4">
          <fieldset disabled={started}>
            <legend className="mb-2 text-xs font-semibold text-slate-700">Where to restore it</legend>
            <div className="space-y-2">
              {options.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    'flex cursor-pointer gap-3 rounded-lg border p-3 transition',
                    target === option.value ? 'border-(--accent) bg-(--accent-soft)' : 'border-slate-200 hover:bg-slate-50',
                  )}
                >
                  <input
                    type="radio"
                    name="restore-target"
                    value={option.value}
                    checked={target === option.value}
                    onChange={() => setTarget(option.value)}
                    className="mt-1 size-4 accent-(--accent)"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">{option.title}</span>
                    <span className="block text-xs text-slate-700">
                      {option.value === 'test' ? (
                        <>
                          {option.detail} Opens at <span className="break-all">{LODGE.staging}</span>.
                        </>
                      ) : (
                        option.detail
                      )}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {target === 'live' && (
            <>
              <Notice tone="red" icon={TriangleAlert} title="Today’s bookings could be lost">
                Bookings and changes made since {when} will be removed from the live site. We take a safety backup first, so
                they can still be recovered.
              </Notice>
              <Field label="Type RESTORE to confirm" htmlFor="restore-confirm">
                <TextInput
                  id="restore-confirm"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                />
              </Field>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}
