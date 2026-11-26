import { BookOpenCheck, TrendingDown } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import { Badge, Notice, Panel } from '../ui'
import { th } from '../styles'
import { LEARNERS, SCHOOL, TASKS } from './data'
import { WEAK_BELOW, handedIn, learnerAverage, parseMark, revisionPlan, taskAverage, weakTopics } from './engine'
import type { Marks, ProjectRecord } from './types'

interface Props {
  marks: Marks
  projects: Record<string, ProjectRecord>
  onMark: (taskId: string, learnerId: string, mark: number | null) => void
}

export function MarkbookScreen({ marks, projects, onMark }: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const weak = weakTopics(marks)
  const plan = revisionPlan(weak)

  return (
    <div className="space-y-5 p-3 sm:p-5">
      <Panel
        title={`${SCHOOL.className} mark book`}
        description="Type a mark and it saves. Averages, weak topics and the revision plan update as you go."
        bodyClassName="p-0!"
      >
        <div className="max-h-[34rem] overflow-auto">
          <table className="w-full min-w-[44rem] border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr>
                <th className={cn(th, 'sticky left-0 bg-slate-50')}>Learner</th>
                {TASKS.map((t) => (
                  <th key={t.id} className={cn(th, 'text-center')}>
                    <span className="block max-w-[7rem] truncate" title={t.name}>
                      {t.topic}
                    </span>
                    <span className="font-normal text-slate-500">/{t.outOf}</span>
                  </th>
                ))}
                <th className={cn(th, 'text-right')}>Average</th>
              </tr>
            </thead>
            <tbody>
              {LEARNERS.map((l) => {
                const avg = learnerAverage(marks, l.id)
                return (
                  <tr key={l.id} className="odd:bg-white even:bg-slate-50/60">
                    <th scope="row" className="sticky left-0 border-b border-slate-100 bg-inherit px-3 py-1.5 text-left text-sm font-medium whitespace-nowrap text-slate-900">
                      {l.name}
                    </th>
                    {TASKS.map((t) => {
                      const key = `${t.id}:${l.id}`
                      const notIn = t.id === 'fieldwork' && !handedIn(projects, l.id)
                      const value = drafts[key] ?? (marks[t.id]?.[l.id] ?? '').toString()
                      const invalid = parseMark(value, t.outOf) === 'invalid'
                      return (
                        <td key={t.id} className="border-b border-slate-100 px-2 py-1 text-center">
                          {notIn ? (
                            <span className="text-xs text-amber-700">Not in</span>
                          ) : (
                            <input
                              aria-label={`${l.name}, ${t.name}, out of ${t.outOf}`}
                              inputMode="numeric"
                              value={value}
                              aria-invalid={invalid}
                              onChange={(e) => {
                                const raw = e.target.value
                                setDrafts((d) => ({ ...d, [key]: raw }))
                                const parsed = parseMark(raw, t.outOf)
                                if (parsed !== 'invalid') onMark(t.id, l.id, parsed)
                              }}
                              onBlur={() => setDrafts((d) => Object.fromEntries(Object.entries(d).filter(([k]) => k !== key)))}
                              className="h-8 w-14 rounded-md border border-slate-300 bg-white text-center text-sm text-slate-900 tabular-nums aria-invalid:border-red-500"
                              placeholder="–"
                            />
                          )}
                        </td>
                      )
                    })}
                    <td className="border-b border-slate-100 px-3 py-1.5 text-right text-sm font-semibold text-slate-900 tabular-nums">{avg === null ? '–' : `${avg}%`}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="sticky bottom-0 bg-slate-100">
              <tr>
                <th scope="row" className="sticky left-0 bg-slate-100 px-3 py-2 text-left text-xs font-semibold text-slate-700">
                  Class average
                </th>
                {TASKS.map((t) => {
                  const avg = taskAverage(marks, t)
                  return (
                    <td key={t.id} className={cn('px-2 py-2 text-center text-xs font-semibold tabular-nums', avg !== null && avg < WEAK_BELOW ? 'text-red-700' : 'text-slate-800')}>
                      {avg === null ? '–' : `${avg}%`}
                    </td>
                  )
                })}
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel
          title={
            <span className="flex items-center gap-2">
              <TrendingDown className="size-4 text-red-700" aria-hidden="true" />
              Weak topics across the class
            </span>
          }
          description={`Topics with a class average under ${WEAK_BELOW}%.`}
        >
          {weak.length === 0 ? (
            <p className="text-sm text-slate-600">No weak topics at the moment.</p>
          ) : (
            <ul className="space-y-3">
              {weak.map((w) => (
                <li key={w.topic}>
                  <p className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-900">
                    {w.topic} <Badge tone="red">{w.average}% class average</Badge>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {w.learners.length ? `Under 50%: ${w.learners.join(', ')}` : 'Nobody under 50%'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel
          title={
            <span className="flex items-center gap-2">
              <BookOpenCheck className="size-4 text-(--accent)" aria-hidden="true" />
              Revision plan, in school time
            </span>
          }
          description="Built from the weak topics. Free for learners."
        >
          {plan.length === 0 ? (
            <p className="text-sm text-slate-600">Nothing to plan yet.</p>
          ) : (
            <ol className="space-y-2">
              {plan.map((s, i) => (
                <li key={s.topic} className="flex gap-3 rounded-lg border border-slate-200 p-2.5">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-(--accent-soft) text-xs font-bold text-(--accent-ink)">{i + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {s.topic}: {s.slot}
                    </p>
                    <p className="text-xs text-slate-600">{s.group}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <Notice tone="accent" className="mt-3">
            Sessions run in lesson time or the free homework club. Charging learners for extra lessons with their own teacher isn’t allowed, so the plan never
            suggests it.
          </Notice>
        </Panel>
      </div>
    </div>
  )
}
