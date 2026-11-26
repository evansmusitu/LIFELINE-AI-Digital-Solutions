import { CheckCircle2, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import { AppButton, Badge, Notice, Panel, SelectInput, Stat } from '../ui'
import { LEARNERS } from './data'
import { canSignOff, daysLabel, projectFlags } from './engine'
import type { ProjectRecord, Stage } from './types'

interface Props {
  projects: Record<string, ProjectRecord>
  onDiscussed: (learnerId: string, outcome: string) => void
  onSignOff: (learnerId: string) => void
}

const STAGES: { id: Stage; label: string }[] = [
  { id: 'proposal', label: 'Proposal' },
  { id: 'draft1', label: 'Draft 1' },
  { id: 'draft2', label: 'Draft 2' },
  { id: 'final', label: 'Final' },
]

const OUTCOMES = [
  'Showed their notes and data, and explained the work well',
  'Explained how they used an AI tool, and it is declared',
  'Signed the declaration today',
  'Will redo part of it before the deadline',
] as const

export function ProjectsScreen({ projects, onDiscussed, onSignOff }: Props) {
  const flagged = LEARNERS.filter((l) => {
    const f = projectFlags(projects[l.id])
    return f.length > 0 && !f.includes('Not handed in') && !projects[l.id]?.discussed
  })
  const signed = LEARNERS.filter((l) => projects[l.id]?.signedOff).length
  const inCount = LEARNERS.filter((l) => projects[l.id]?.stages.final !== undefined).length

  return (
    <div className="space-y-5 p-3 sm:p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Final reports in" value={`${inCount} of ${LEARNERS.length}`} icon={CheckCircle2} />
        <Stat label="To talk about first" value={String(flagged.length)} detail="Before signing off" icon={ShieldCheck} tone={flagged.length ? 'amber' : 'green'} />
        <Stat label="Signed off by the teacher" value={`${signed} of ${inCount}`} icon={CheckCircle2} tone="green" />
      </div>
      <Notice tone="neutral" icon={ShieldCheck}>
        Every stage of the fieldwork project is dated, so the teacher can show how the work grew. A flag is a reason for a conversation, never an accusation.
        Copied or undeclared AI work can cost a learner the whole subject, so it’s caught early.
      </Notice>
      <Panel title="Fieldwork project log" bodyClassName="p-0!">
        <ul className="divide-y divide-slate-100">
          {LEARNERS.map((l) => (
            <ProjectRow key={l.id} name={l.name} project={projects[l.id]} onDiscussed={(o) => onDiscussed(l.id, o)} onSignOff={() => onSignOff(l.id)} />
          ))}
        </ul>
      </Panel>
    </div>
  )
}

function ProjectRow({ name, project, onDiscussed, onSignOff }: { name: string; project?: ProjectRecord; onDiscussed: (outcome: string) => void; onSignOff: () => void }) {
  const [outcome, setOutcome] = useState<string>(OUTCOMES[0])
  const flags = projectFlags(project)
  const open = flags.length > 0 && !flags.includes('Not handed in') && !project?.discussed
  return (
    <li className="grid grid-cols-1 gap-2 px-4 py-3 md:grid-cols-[10rem_1fr_auto] md:items-center">
      <div>
        <p className="text-sm font-semibold text-slate-900">{name}</p>
        {project?.finalWords && (
          <p className="text-xs text-slate-600">
            {project.draftWords ? `${project.draftWords} words in the last draft, ` : ''}
            {project.finalWords} in the final
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <ol className="flex flex-wrap gap-1.5" aria-label="Stages">
          {STAGES.map((s) => {
            const at = project?.stages[s.id]
            return (
              <li
                key={s.id}
                className={cn('rounded-md px-2 py-0.5 text-[0.7rem] font-medium', at !== undefined ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-500')}
              >
                {s.label}
                {at !== undefined ? `: ${daysLabel(at)}` : ': none'}
              </li>
            )
          })}
        </ol>
        <div className="flex flex-wrap gap-1.5">
          {flags.map((f) => (
            <Badge key={f} tone={f === 'Not handed in' ? 'neutral' : project?.discussed ? 'neutral' : 'amber'}>
              {f}
            </Badge>
          ))}
          {project?.declared && <Badge tone="green">Own-work and AI declaration signed</Badge>}
          {project?.discussed && <span className="text-xs text-slate-600">Talked it through: {project.discussed.toLowerCase()}.</span>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
        {project?.signedOff ? (
          <Badge tone="green">Signed off</Badge>
        ) : flags.includes('Not handed in') ? (
          <span className="text-xs text-slate-600">Waiting for the final report</span>
        ) : open ? (
          <>
            <label className="sr-only" htmlFor={`outcome-${name}`}>
              What came out of the conversation
            </label>
            <SelectInput id={`outcome-${name}`} compact fullWidth={false} value={outcome} onChange={(e) => setOutcome(e.target.value)} className="max-w-[14rem]">
              {OUTCOMES.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </SelectInput>
            <AppButton size="sm" variant="secondary" onClick={() => onDiscussed(outcome)}>
              Record the talk
            </AppButton>
          </>
        ) : (
          <AppButton size="sm" onClick={onSignOff} disabled={!canSignOff(project)}>
            Sign off
          </AppButton>
        )}
      </div>
    </li>
  )
}
