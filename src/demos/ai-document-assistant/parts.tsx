import { Calculator, FileSpreadsheet, FileText, LoaderCircle, MessageSquareText, Quote } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Badge } from '../ui'
import { highlight } from './text'
import type { Answer, Doc, Source } from './types'

export function DocIcon({ doc, className }: { doc: Pick<Doc, 'table' | 'origin'>; className?: string }) {
  const Icon = doc.table ? FileSpreadsheet : doc.origin === 'team' ? MessageSquareText : FileText
  return (
    <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg bg-(--accent-soft) text-(--accent-ink)', className)}>
      <Icon className="size-5" aria-hidden="true" />
    </span>
  )
}

/** Passage text with the matched words in <mark>. */
export function Highlighted({ text, terms }: { text: string; terms: string[] }) {
  return (
    <>
      {highlight(text, terms).map((part, i) =>
        part.hit ? (
          <mark key={i} className="rounded-sm bg-amber-100 px-0.5 font-medium text-amber-950">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  )
}

export function SourceCard({ source }: { source: Source }) {
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="font-semibold text-slate-900">{source.docTitle}</span>
        <Badge>{source.kind === 'row' ? 'Row' : 'Section'}</Badge>
      </p>
      <p className="mt-0.5 text-xs break-words text-slate-600">{source.label}</p>
      <blockquote className="mt-2 flex gap-2 border-l-2 border-(--accent) pl-2.5 text-sm leading-relaxed break-words text-slate-800">
        <Quote className="mt-1 size-3 shrink-0 text-slate-500" aria-hidden="true" />
        <span className="min-w-0">
          <Highlighted text={source.text} terms={source.terms} />
        </span>
      </blockquote>
    </li>
  )
}

/** The answer itself: text, the working for prices, and short notes. */
export function AnswerBody({ answer, compact }: { answer: Answer; compact?: boolean }) {
  return (
    <div className="space-y-2">
      <p className="break-words">{compact ? answer.short : answer.text}</p>
      {!compact && answer.working && (
        <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Calculator className="size-3.5" aria-hidden="true" />
            Working
          </p>
          <ul className="mt-1 space-y-0.5 text-sm text-slate-800 tabular-nums">
            {answer.working.map((line) => (
              <li key={line} className="break-words">
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!compact && answer.notes && (
        <ul className="list-disc space-y-0.5 pl-5 text-sm text-slate-700">
          {answer.notes.map((note) => (
            <li key={note} className="break-words">
              {note}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function Thinking({ label, className }: { label: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-sm text-slate-700', className)}>
      <LoaderCircle className="size-4 text-(--accent) motion-safe:animate-spin" aria-hidden="true" />
      {label}
    </span>
  )
}

export function QuestionChips({
  questions,
  onPick,
  disabled,
  label,
  className,
}: {
  questions: string[]
  onPick: (q: string) => void
  disabled?: boolean
  label: string
  className?: string
}) {
  return (
    <div className={className}>
      <p className="mb-1.5 text-xs font-semibold text-slate-700">{label}</p>
      <ul className="flex flex-wrap gap-2">
        {questions.map((q) => (
          <li key={q} className="max-w-full">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(q)}
              className="min-h-9 max-w-full rounded-full border border-slate-300 bg-white px-3 py-1.5 text-left text-xs font-medium break-words text-slate-800 transition hover:border-(--accent) hover:bg-(--accent-soft) disabled:cursor-not-allowed disabled:opacity-50"
            >
              {q}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
