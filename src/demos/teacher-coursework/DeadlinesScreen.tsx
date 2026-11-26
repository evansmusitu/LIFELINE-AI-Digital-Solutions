import { CalendarClock, Download, FileSpreadsheet, Upload } from 'lucide-react'
import { useState } from 'react'
import { num } from '../../lib/format'
import { AppButton, Badge, Notice, Panel, Segmented, Stat, type Tone } from '../ui'
import { th, td } from '../styles'
import { BOARDS, ENTRY_DEADLINE_DAYS, SCHOOL, TASKS, type BoardId } from './data'
import { daysLabel, exportCsv, readiness, taskStatus, type Readiness } from './engine'
import type { Marks, ProjectRecord } from './types'

interface Props {
  marks: Marks
  projects: Record<string, ProjectRecord>
  entered: Record<string, boolean>
  onEntered: (taskId: string) => void
  onExported: (taskName: string) => void
}

const TONE: Record<Readiness, Tone> = { Done: 'green', 'On track': 'blue', Behind: 'amber', Overdue: 'red' }

function download(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function DeadlinesScreen({ marks, projects, entered, onEntered, onExported }: Props) {
  const [board, setBoard] = useState<BoardId>('zimsec')
  const boardTasks = TASKS.filter((t) => t.board)
  const fieldwork = TASKS.find((t) => t.id === 'fieldwork')!
  const fw = taskStatus(fieldwork, marks, projects)
  const enteredCount = boardTasks.filter((t) => entered[t.id]).length

  return (
    <div className="space-y-5 p-3 sm:p-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Next board deadline" value={daysLabel(ENTRY_DEADLINE_DAYS)} detail={`Enter ${SCHOOL.className} marks (sample date)`} icon={CalendarClock} tone="accent" />
        <Stat label="Fieldwork reports in" value={`${fw.handedIn} of ${fw.learners}`} detail={`Due ${daysLabel(fieldwork.dueInDays)}`} icon={Upload} tone={fw.handedIn < fw.learners ? 'amber' : 'green'} />
        <Stat label="Fieldwork reports marked" value={`${fw.marked} of ${fw.handedIn}`} detail="Marked so far" icon={FileSpreadsheet} />
        <Stat label="Board tasks entered" value={`${enteredCount} of ${boardTasks.length}`} detail="On the ZIMSEC portal" icon={Download} tone={enteredCount < boardTasks.length ? 'amber' : 'green'} />
      </div>

      <Panel
        title={`${SCHOOL.className}: coursework that counts for the board`}
        description="Mark it, check the authenticity log, export it in the upload layout, then tick it once it is entered on the portal."
        bodyClassName="p-0!"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem]">
            <thead className="bg-slate-50">
              <tr>
                <th className={th}>Task</th>
                <th className={th}>Due</th>
                <th className={`${th} text-right`}>Handed in</th>
                <th className={`${th} text-right`}>Marked</th>
                <th className={th}>Missing</th>
                <th className={th}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {boardTasks.map((t) => {
                const s = taskStatus(t, marks, projects)
                return (
                  <tr key={t.id}>
                    <td className={td}>
                      <p className="font-semibold text-slate-900">{t.name}</p>
                      <p className="text-xs text-slate-600">
                        {t.topic} · out of {t.outOf}
                      </p>
                    </td>
                    <td className={`${td} whitespace-nowrap`}>{daysLabel(t.dueInDays)}</td>
                    <td className={`${td} text-right tabular-nums`}>
                      {s.handedIn}/{s.learners}
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{s.marked}</td>
                    <td className={`${td} max-w-[14rem] text-xs`}>{s.missing.length ? s.missing.join(', ') : <span className="text-slate-500">None</span>}</td>
                    <td className={td}>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <AppButton
                          size="sm"
                          variant="secondary"
                          icon={Download}
                          onClick={() => {
                            download(`${SCHOOL.centre}-${t.id}.csv`, exportCsv(t, marks))
                            onExported(t.name)
                          }}
                        >
                          Export
                        </AppButton>
                        {entered[t.id] ? (
                          <Badge tone="green">Entered</Badge>
                        ) : (
                          <AppButton size="sm" variant="ghost" onClick={() => onEntered(t.id)} disabled={s.marked < s.handedIn || s.marked === 0} title={s.marked < s.handedIn ? 'Mark every report that is in first' : undefined}>
                            Mark as entered
                          </AppButton>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-600">
          The export has the centre number, candidate number, task and mark, with ABSENT where there is no mark. No names. Sample layout: the build uses
          the board’s current template.
        </p>
      </Panel>

      <Panel
        title="Every class’s deadlines in one place"
        description="For the head of department. The same tracker works for any exam board’s school-based assessment."
        action={
          <Segmented<BoardId>
            label="Exam board"
            value={board}
            onChange={setBoard}
            options={[
              { value: 'zimsec', label: BOARDS.zimsec.label },
              { value: 'knec', label: BOARDS.knec.label },
            ]}
          />
        }
        bodyClassName="p-0!"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem]">
            <thead className="bg-slate-50">
              <tr>
                <th className={th}>Class and task</th>
                <th className={th}>Deadline</th>
                <th className={`${th} text-right`}>In</th>
                <th className={`${th} text-right`}>Marked</th>
                <th className={`${th} text-right`}>Entered</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {BOARDS[board].rows.map((r) => {
                const status = readiness(r)
                return (
                  <tr key={r.className + r.task}>
                    <td className={td}>
                      <p className="font-semibold text-slate-900">{r.className}</p>
                      <p className="text-xs text-slate-600">
                        {r.task} · {r.portal}
                      </p>
                    </td>
                    <td className={`${td} whitespace-nowrap`}>{daysLabel(r.dueInDays)}</td>
                    <td className={`${td} text-right tabular-nums`}>
                      {num(r.handedIn)}/{num(r.learners)}
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{num(r.marked)}</td>
                    <td className={`${td} text-right tabular-nums`}>{r.portal === 'School mark book' ? '–' : num(r.entered)}</td>
                    <td className={td}>
                      <Badge tone={TONE[status]}>{status}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-600">
          {BOARDS[board].school}. {BOARDS[board].note}
        </p>
      </Panel>
      <Notice tone="neutral">
        Reminders go to each teacher on WhatsApp a week before and two days before a deadline (simulated in this demo).
      </Notice>
    </div>
  )
}
