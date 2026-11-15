import { CircleCheck, CircleHelp, MessageCircle, MessagesSquare, Plus, RotateCcw, ThumbsUp, UserRound, BookCheck } from 'lucide-react'
import { useState } from 'react'
import { dayAndTime, num } from '../../lib/format'
import { AppButton, Badge, BarChart, Field, Modal, Panel, SelectInput, Stat, TextArea, TextInput } from '../ui'
import { FAQ_ID } from './docs'
import { insightStats } from './data'
import type { Doc, Gap, Handoff, LogEntry, Topic } from './types'

const TOPICS: Topic[] = ['Prices', 'Delivery', 'Returns', 'Accounts', 'Stock']

interface Props {
  log: LogEntry[]
  gaps: Gap[]
  handoffs: Handoff[]
  docs: Doc[]
  now: number
  initialGapId: string | null
  onAddAnswer: (gapId: string, question: string, text: string, docId: string) => void
  onAskAgain: (question: string) => void
}

interface Draft {
  gapId: string
  question: string
  text: string
  docId: string
  error?: string
}

export function InsightsScreen({ log, gaps, handoffs, docs, now, initialGapId, onAddAnswer, onAskAgain }: Props) {
  const draftFor = (id: string | null): Draft | null => {
    const gap = gaps.find((g) => g.id === id)
    return gap ? { gapId: gap.id, question: gap.question, text: '', docId: FAQ_ID } : null
  }
  const [draft, setDraft] = useState<Draft | null>(() => draftFor(initialGapId))
  const s = insightStats(log, handoffs)
  const open = gaps.filter((g) => g.status === 'open').sort((a, b) => b.lastAt - a.lastAt)
  const answered = gaps.filter((g) => g.status === 'answered').sort((a, b) => (b.answeredAt ?? 0) - (a.answeredAt ?? 0))
  const other = log.filter((e) => e.topic === 'Other').length
  const topics = [...TOPICS, ...(other ? (['Other'] as Topic[]) : [])].map((t) => ({ label: t, value: log.filter((e) => e.topic === t).length }))
  const faq = docs.find((d) => d.id === FAQ_ID)
  const targets = [
    { id: FAQ_ID, title: faq ? faq.title : 'Frequently asked questions (new document)' },
    ...docs.filter((d) => d.sections && d.id !== FAQ_ID).map((d) => ({ id: d.id, title: d.title })),
  ]

  const save = () => {
    if (!draft) return
    if (!draft.question.trim()) return setDraft({ ...draft, error: 'question' })
    if (draft.text.trim().length < 5) return setDraft({ ...draft, error: 'text' })
    onAddAnswer(draft.gapId, draft.question.trim(), draft.text.trim(), draft.docId)
    setDraft(null)
  }

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={MessagesSquare} label="Questions today" value={num(s.total)} detail="Counter and WhatsApp" tone="accent" />
        <Stat icon={BookCheck} label="Answered from documents" value={`${s.answeredPct}%`} detail={`${num(s.answered)} with sources`} tone="green" />
        <Stat
          icon={ThumbsUp}
          label="Marked helpful"
          value={s.helpfulPct === null ? 'No ratings' : `${s.helpfulPct}%`}
          detail={`${num(s.up)} of ${num(s.rated)} ratings`}
        />
        <Stat icon={UserRound} label="Passed to the team" value={num(s.handoffs)} detail="From WhatsApp" tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel title="Questions the documents didn’t answer" description="Add an answer once and the assistant uses it from then on">
          {open.length === 0 ? (
            <p className="text-sm text-slate-600">Nothing waiting. Every question so far has an answer in the documents.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {open.map((g) => (
                <li key={g.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0">
                  <CircleHelp className="size-5 shrink-0 text-amber-700" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium break-words text-slate-900">{g.question}</p>
                    <p className="text-xs text-slate-600">
                      Asked {g.count === 1 ? 'once' : `${g.count} times`} · last {dayAndTime(g.lastAt, now)}
                    </p>
                  </div>
                  <AppButton size="sm" icon={Plus} onClick={() => setDraft(draftFor(g.id))} aria-label={`Add an answer for: ${g.question}`}>
                    Add an answer
                  </AppButton>
                </li>
              ))}
            </ul>
          )}
          {answered.length > 0 && (
            <>
              <h4 className="mt-4 border-t border-slate-100 pt-3 text-xs font-semibold tracking-wide text-slate-600 uppercase">Answered</h4>
              <ul className="mt-2 space-y-3">
                {answered.map((g) => (
                  <li key={g.id} className="flex flex-wrap items-center gap-3">
                    <CircleCheck className="size-5 shrink-0 text-emerald-700" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium break-words text-slate-900">{g.question}</p>
                      <p className="text-xs text-slate-600">
                        Added to {docs.find((d) => d.id === g.docId)?.title ?? 'the documents'}
                        {g.answeredAt ? ` · ${dayAndTime(g.answeredAt, now)}` : ''}
                      </p>
                    </div>
                    <AppButton size="sm" variant="secondary" icon={RotateCcw} onClick={() => onAskAgain(g.question)} aria-label={`Ask again: ${g.question}`}>
                      Ask again
                    </AppButton>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>

        <Panel title="Top topics today" description="What people asked about">
          <BarChart data={topics} format={(v) => `${v} ${v === 1 ? 'question' : 'questions'}`} label="Questions by topic today" />
        </Panel>
      </div>

      <Panel title="Passed to the counter team" description="From WhatsApp, out of hours. The team replies when the counter opens.">
        {handoffs.length === 0 ? (
          <p className="text-sm text-slate-600">No handoffs yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {[...handoffs].sort((a, b) => b.at - a.at).map((h) => (
              <li key={h.id} className="flex flex-wrap items-start gap-3 py-3 first:pt-0">
                <MessageCircle className="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className="font-semibold text-slate-900">{h.customer}</span>
                    <span className="text-xs text-slate-600">{h.phone}</span>
                  </p>
                  <p className="mt-0.5 text-sm break-words text-slate-800">“{h.question}”</p>
                  <p className="mt-0.5 text-xs text-slate-600">{dayAndTime(h.at, now)} · WhatsApp</p>
                </div>
                <Badge tone="amber">Waiting for the counter</Badge>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Modal
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title="Add an answer"
        description="The assistant will use it straight away and cite where it’s saved."
        footer={
          <>
            <AppButton variant="secondary" onClick={() => setDraft(null)}>
              Cancel
            </AppButton>
            <AppButton onClick={save}>Save answer</AppButton>
          </>
        }
      >
        {draft && (
          <div className="space-y-4">
            <Field label="Question" htmlFor="gap-question" error={draft.error === 'question' ? 'Write the question.' : undefined}>
              <TextInput
                id="gap-question"
                value={draft.question}
                onChange={(e) => setDraft({ ...draft, question: e.target.value, error: undefined })}
                maxLength={200}
                aria-invalid={draft.error === 'question'}
              />
            </Field>
            <Field label="Answer" htmlFor="gap-answer" error={draft.error === 'text' ? 'Write the answer the assistant should give.' : undefined} hint="Write it as you’d say it at the counter">
              <TextArea
                id="gap-answer"
                rows={4}
                value={draft.text}
                onChange={(e) => setDraft({ ...draft, text: e.target.value, error: undefined })}
                maxLength={600}
                placeholder="For example: No, we don’t sell solar panels. We stock the battens, membrane and fixings installers use."
                aria-invalid={draft.error === 'text'}
                aria-describedby={draft.error === 'text' ? 'gap-answer-error' : 'gap-answer-hint'}
              />
            </Field>
            <Field label="Add it to" htmlFor="gap-doc">
              <SelectInput id="gap-doc" value={draft.docId} onChange={(e) => setDraft({ ...draft, docId: e.target.value })}>
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
        )}
      </Modal>
    </div>
  )
}
