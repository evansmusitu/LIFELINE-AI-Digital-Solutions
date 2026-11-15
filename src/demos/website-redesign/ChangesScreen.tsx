import { ArrowRight, Eye } from 'lucide-react'
import { AppButton } from '../ui'
import { CHANGES } from './data'

export function ChangesScreen({ onShow }: { onShow: (id: number) => void }) {
  return (
    <div className="space-y-4 p-3 sm:p-5">
      <p className="max-w-3xl text-sm text-slate-700">
        Each change fixes something that made it hard to find Kopje Spring’s prices or get in touch on the old site.
      </p>
      <ol className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {CHANGES.map((change) => (
          <li key={change.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-amber-400 text-sm font-bold text-slate-900">{change.id}</span>
              <h3 className="min-w-0 pt-1 font-semibold text-slate-900">{change.title}</h3>
            </div>
            <dl className="mt-3 flex-1 space-y-2 text-sm">
              <div>
                <dt className="text-xs font-semibold text-slate-600">Before</dt>
                <dd className="text-slate-800">{change.before}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-slate-600">What we changed</dt>
                <dd className="text-slate-800">{change.after}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-slate-600">Why it matters</dt>
                <dd className="text-slate-800">{change.why}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              {change.metric ? (
                <p className="flex flex-wrap items-center gap-x-1.5 rounded-lg bg-(--accent-soft) px-2.5 py-1 text-sm text-(--accent-ink)">
                  <span>{change.metric.label}</span>
                  <span className="font-semibold whitespace-nowrap">
                    {change.metric.before}
                    <ArrowRight className="mx-1 inline size-3.5 align-[-2px]" aria-hidden="true" />
                    <span className="sr-only"> to </span>
                    {change.metric.after}
                  </span>
                </p>
              ) : (
                <span />
              )}
              <AppButton variant="secondary" icon={Eye} onClick={() => onShow(change.id)} aria-label={`Show on the page: ${change.title}`}>
                Show on the page
              </AppButton>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
