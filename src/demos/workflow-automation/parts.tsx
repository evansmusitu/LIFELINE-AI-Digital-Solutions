import { ArrowRight, Paperclip } from 'lucide-react'
import { cn } from '../../lib/cn'
import { money } from '../../lib/format'
import { APPS } from './catalog'
import type { AppId, Output } from './types'

export function AppTile({ app, size = 'md' }: { app: AppId; size?: 'sm' | 'md' }) {
  const { icon: Icon, tile, name } = APPS[app]
  return (
    <span
      title={name}
      className={cn('grid shrink-0 place-items-center rounded-lg', tile, size === 'sm' ? 'size-7' : 'size-9')}
    >
      <Icon className={size === 'sm' ? 'size-3.5' : 'size-4.5'} aria-hidden="true" />
      <span className="sr-only">{name}</span>
    </span>
  )
}

/** Shows {{fields}} as chips so templates are easy to read. */
export function TemplateText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\{\{\s*[\w.]+\s*\}\})/g)
  return (
    <span className={cn('whitespace-pre-line', className)}>
      {parts.map((part, i) =>
        /^\{\{/.test(part) ? (
          <span key={i} className="mx-0.5 rounded bg-(--accent-soft) px-1 py-px font-mono text-[0.78em] text-(--accent-ink)">
            {part.replace(/[{}\s]/g, '')}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  )
}

/** Preview of what a step produced in a test run. */
export function OutputPreview({ output }: { output: Output }) {
  switch (output.kind) {
    case 'invoice':
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">Hartwell Loom</p>
              <p className="text-xs text-slate-600">Bill to: {output.customer}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-900">{output.number}</p>
              <p className="text-xs text-slate-600">{output.terms}</p>
            </div>
          </div>
          <ul className="mt-3 divide-y divide-slate-100 border-y border-slate-100">
            {output.lines.map((line) => (
              <li key={line.label} className="flex justify-between gap-3 py-1.5">
                <span className="text-slate-700">{line.label}</span>
                <span className="font-medium text-slate-900 tabular-nums">{money(line.amount)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 flex justify-between font-semibold text-slate-900">
            <span>Total</span>
            <span className="tabular-nums">{money(output.total)}</span>
          </p>
        </div>
      )
    case 'email':
      return (
        <div className="rounded-lg border border-slate-200 bg-white text-sm">
          <dl className="space-y-1 border-b border-slate-100 px-3 py-2 text-xs">
            <div className="flex gap-2">
              <dt className="w-14 text-slate-600">To</dt>
              <dd className="font-medium break-all text-slate-900">{output.to}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-14 text-slate-600">Subject</dt>
              <dd className="font-medium text-slate-900">{output.subject}</dd>
            </div>
          </dl>
          <p className="px-3 py-2.5 whitespace-pre-line text-slate-800">{output.body}</p>
          {output.attachment && (
            <p className="mx-3 mb-3 inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
              <Paperclip className="size-3.5" aria-hidden="true" />
              {output.attachment}
            </p>
          )}
        </div>
      )
    case 'whatsapp':
      return (
        <div className="rounded-lg bg-[#efeae2] p-3">
          <p className="mb-1 text-xs font-medium text-slate-700">To: {output.to}</p>
          <p className="ml-auto max-w-[90%] rounded-lg rounded-tr-none bg-[#d9fdd3] px-3 py-2 text-sm whitespace-pre-line text-slate-900 shadow-sm">
            {output.body}
          </p>
        </div>
      )
    case 'stock':
      return (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
          {output.lines.map((line) => (
            <li key={line.name} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="text-slate-700">{line.name}</span>
              <span className="flex items-center gap-2 tabular-nums">
                <span className="text-slate-600">{line.before}</span>
                <ArrowRight className="size-3.5 text-slate-500" aria-hidden="true" />
                <span className="sr-only">to</span>
                <span className={cn('font-semibold', line.low ? 'text-amber-700' : 'text-slate-900')}>{line.after}</span>
                {line.low && <span className="rounded bg-amber-50 px-1.5 text-xs font-semibold text-amber-800">Low</span>}
              </span>
            </li>
          ))}
        </ul>
      )
    case 'row':
      return (
        <div className="relative overflow-x-auto rounded-lg border border-slate-200 bg-white text-sm">
          <p className="border-b border-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">{output.sheet}</p>
          <div className="flex">
            {output.values.map((value, i) => (
              <span key={i} className="min-w-28 border-r border-slate-100 px-3 py-2 whitespace-nowrap text-slate-800 last:border-r-0">
                {value}
              </span>
            ))}
          </div>
        </div>
      )
    case 'po':
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
          <p className="flex justify-between font-semibold text-slate-900">
            <span>Purchase order {output.number}</span>
            {output.cost && <span className="tabular-nums">{output.cost}</span>}
          </p>
          <p className="mt-1 text-slate-700">
            {output.quantity} × {output.product}
          </p>
          <p className="text-xs text-slate-600">Supplier: {output.supplier}</p>
        </div>
      )
  }
}
