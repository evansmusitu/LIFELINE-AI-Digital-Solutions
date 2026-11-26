import { Check, EyeOff, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import { AppButton, Badge, Notice, Panel, TextArea } from '../ui'
import { LEARNERS, TASKS } from './data'
import { commentFacts, learnerAverage, taskAverage, taskPercent, withName } from './engine'
import type { Comment, Marks, ProjectRecord } from './types'

interface Props {
  marks: Marks
  projects: Record<string, ProjectRecord>
  comments: Record<string, Comment>
  pending: { learnerId: string; text: string } | null
  onDraft: (learnerId: string) => void
  onEdit: (learnerId: string, text: string) => void
  onApprove: (learnerId: string) => void
  note: string | null
}

export function ReportsScreen({ marks, projects, comments, pending, onDraft, onEdit, onApprove, note }: Props) {
  const [selected, setSelected] = useState(LEARNERS[0].id)
  const learner = LEARNERS.find((l) => l.id === selected) ?? LEARNERS[0]
  const comment = comments[learner.id]
  const busy = pending !== null
  const streaming = pending?.learnerId === learner.id
  const approved = LEARNERS.filter((l) => comments[l.id]?.approved).length

  return (
    <div className="grid grid-cols-1 gap-5 p-3 sm:p-5 lg:grid-cols-[16rem_1fr]">
      <Panel title="Learners" description={`${approved} of ${LEARNERS.length} comments approved`} bodyClassName="p-0!">
        <ul className="max-h-[32rem] divide-y divide-slate-100 overflow-y-auto">
          {LEARNERS.map((l) => {
            const c = comments[l.id]
            return (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => setSelected(l.id)}
                  aria-current={l.id === selected}
                  className={cn('flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm hover:bg-slate-50', l.id === selected && 'bg-(--accent-soft) font-semibold')}
                >
                  <span>{l.name}</span>
                  {c?.approved ? <Badge tone="green">Approved</Badge> : c ? <Badge tone="amber">Draft</Badge> : <span className="text-xs text-slate-500">To do</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </Panel>

      <div className="space-y-4">
        <Panel title={`${learner.name}: Geography this term`} description={`Average ${learnerAverage(marks, learner.id) ?? '–'}%`}>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {TASKS.map((t) => {
              const p = taskPercent(marks, t, learner.id)
              return (
                <li key={t.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
                  <span className="text-slate-700">{t.topic}</span>
                  <span className="tabular-nums">
                    <span className="font-semibold text-slate-900">{p === null ? '–' : `${p}%`}</span>
                    <span className="text-xs text-slate-500"> (class {taskAverage(marks, t) ?? '–'}%)</span>
                  </span>
                </li>
              )
            })}
          </ul>
          <details className="mt-3 text-xs text-slate-600">
            <summary className="cursor-pointer font-semibold text-slate-700">Exactly what the assistant is sent</summary>
            <p className="mt-1 rounded-md bg-slate-50 p-2 font-mono text-[0.7rem]">{commentFacts(marks, learner.id, projects)}</p>
          </details>
        </Panel>

        <Panel title="Report comment" description="The assistant drafts. You edit and approve. Nothing goes on a report without your approval.">
          {streaming ? (
            <p className="min-h-24 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm whitespace-pre-line text-slate-800" aria-live="polite">
              {withName(pending.text, learner.name) || 'Drafting…'}
            </p>
          ) : comment ? (
            <>
              <label htmlFor="comment-text" className="sr-only">
                Comment for {learner.name}
              </label>
              <TextArea id="comment-text" rows={5} value={withName(comment.text, learner.name)} onChange={(e) => onEdit(learner.id, e.target.value)} disabled={comment.approved} />
              <p className="mt-1 text-xs text-slate-600">
                {comment.source === 'ai' ? 'Drafted by the AI assistant' : comment.source === 'saved' ? 'Saved draft, written from the marks' : 'Edited by the teacher'} ·{' '}
                {withName(comment.text, learner.name).split(/\s+/).filter(Boolean).length} words
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-600">No comment yet. Tap “Draft with AI”.</p>
          )}
          {note && !streaming && comment?.source === 'saved' && <Notice className="mt-2">{note}</Notice>}
          <div className="mt-3 flex flex-wrap gap-2">
            <AppButton icon={Sparkles} onClick={() => onDraft(learner.id)} disabled={busy || comment?.approved}>
              {comment ? 'Draft again' : 'Draft with AI'}
            </AppButton>
            <AppButton variant="success" icon={Check} onClick={() => onApprove(learner.id)} disabled={!comment || comment.approved || streaming}>
              {comment?.approved ? 'Approved' : 'Approve'}
            </AppButton>
          </div>
        </Panel>
        <Notice tone="accent" icon={EyeOff}>
          The assistant gets the subject and the marks by topic only. Never the learner’s name, candidate number, attendance or anything personal: the name is
          added on this screen after the draft comes back.
        </Notice>
      </div>
    </div>
  )
}
