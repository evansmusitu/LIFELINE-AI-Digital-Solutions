import { X, type LucideIcon } from 'lucide-react'
import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '../lib/cn'
import { initials } from '../lib/format'
import { appButton, inputClass, type AppSize, type AppVariant } from './styles'

/* Light UI kit for the sample businesses' apps. Class helpers live in styles.ts. */

interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AppVariant
  size?: AppSize
  icon?: LucideIcon
}

export function AppButton({ variant, size, icon: Icon, className, type = 'button', children, ...props }: AppButtonProps) {
  return (
    <button type={type} className={appButton(variant, size, className)} {...props}>
      {Icon && <Icon className={size === 'sm' ? 'size-3.5' : 'size-4'} aria-hidden="true" />}
      {children}
    </button>
  )
}

/* Badges */

export type Tone = 'neutral' | 'green' | 'amber' | 'red' | 'blue' | 'violet' | 'accent'

const tones: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  green: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  blue: 'bg-sky-50 text-sky-800 ring-sky-200',
  violet: 'bg-violet-50 text-violet-800 ring-violet-200',
  accent: 'bg-(--accent-soft) text-(--accent-ink) ring-(--accent)/30',
}

export function Badge({
  tone = 'neutral',
  icon: Icon,
  className,
  children,
}: {
  tone?: Tone
  icon?: LucideIcon
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      {Icon && <Icon className="size-3" aria-hidden="true" />}
      {children}
    </span>
  )
}

/* Layout */

export function Panel({
  title,
  description,
  action,
  className,
  bodyClassName,
  children,
}: {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
  bodyClassName?: string
  children: ReactNode
}) {
  return (
    <section className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold text-slate-900">{title}</h3>}
            {description && <p className="mt-0.5 text-xs text-slate-600">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </section>
  )
}

export function Stat({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string
  value: ReactNode
  detail?: ReactNode
  icon?: LucideIcon
  tone?: 'neutral' | 'accent' | 'amber' | 'red' | 'green'
}) {
  const iconTone = {
    neutral: 'bg-slate-100 text-slate-700',
    accent: 'bg-(--accent-soft) text-(--accent-ink)',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    green: 'bg-emerald-50 text-emerald-700',
  }[tone]
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-center gap-2">
        {Icon && (
          <span className={cn('grid size-7 place-items-center rounded-lg', iconTone)}>
            <Icon className="size-4" aria-hidden="true" />
          </span>
        )}
        <p className="text-xs font-medium text-slate-600">{label}</p>
      </div>
      <p className="mt-2 text-xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</p>
      {detail && <p className="mt-0.5 text-xs text-slate-600">{detail}</p>}
    </div>
  )
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-full bg-(--accent-soft) text-xs font-bold text-(--accent-ink)',
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}

export function Notice({
  tone = 'neutral',
  icon: Icon,
  title,
  children,
  className,
}: {
  tone?: 'neutral' | 'accent' | 'amber' | 'green' | 'red'
  icon?: LucideIcon
  title?: ReactNode
  children?: ReactNode
  className?: string
}) {
  const styles = {
    neutral: 'border-slate-200 bg-slate-50 text-slate-700',
    accent: 'border-(--accent)/25 bg-(--accent-soft) text-(--accent-ink)',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    red: 'border-red-200 bg-red-50 text-red-800',
  }[tone]
  return (
    <div className={cn('flex gap-2.5 rounded-lg border px-3 py-2.5 text-sm', styles, className)}>
      {Icon && <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : undefined}>{children}</div>}
      </div>
    </div>
  )
}

/* Form controls */

interface ControlProps {
  /** Smaller control for dense tables. */
  compact?: boolean
  /** Set to false to size the control with your own width class. */
  fullWidth?: boolean
}

const controlSize = (compact?: boolean) => (compact ? 'h-8 text-xs' : 'h-10 text-sm')

export function TextInput({ compact, fullWidth = true, className, ...props }: InputHTMLAttributes<HTMLInputElement> & ControlProps) {
  return <input className={cn(inputClass, controlSize(compact), fullWidth && 'w-full', className)} {...props} />
}

export function TextArea({ className, rows = 4, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} className={cn(inputClass, 'w-full resize-y py-2 text-sm leading-relaxed', className)} {...props} />
}

export function SelectInput({
  compact,
  fullWidth = true,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & ControlProps) {
  return (
    <select className={cn(inputClass, controlSize(compact), 'pr-8', fullWidth && 'w-full', className)} {...props}>
      {children}
    </select>
  )
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  className,
  children,
}: {
  label: string
  hint?: string
  error?: string
  htmlFor: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-semibold text-slate-700">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${htmlFor}-hint`} className="mt-1 text-xs text-slate-600">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  ariaLabel,
  className,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  /** Use when the visible label isn't unique, for example "On" in a list. */
  ariaLabel?: string
  className?: string
}) {
  const id = useId()
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <p id={`${id}-label`} className="text-sm font-medium text-slate-900">
          {label}
        </p>
        {description && (
          <p id={`${id}-desc`} className="mt-0.5 text-xs text-slate-600">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : `${id}-label`}
        aria-describedby={description ? `${id}-desc` : undefined}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition',
          checked ? 'bg-(--accent)' : 'bg-slate-300',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'inline-block size-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5.5' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  )
}

export interface SegmentOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
}

/** A row of radio buttons styled as a segmented control, with arrow-key support. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: SegmentOption<T>[]
  label: string
  className?: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
    if (!delta) return
    event.preventDefault()
    const next = (index + delta + options.length) % options.length
    onChange(options[next].value)
    refs.current[next]?.focus()
  }
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1', className)}>
      {options.map((option, index) => {
        const selected = option.value === value
        const Icon = option.icon
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition',
              selected ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {Icon && <Icon className="size-4" aria-hidden="true" />}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function QtyStepper({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
}: {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  label: string
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`Remove one ${label}`}
        className="grid size-8 place-items-center rounded-l-lg text-lg leading-none text-slate-700 hover:bg-slate-50 disabled:opacity-40"
      >
        −
      </button>
      <span className="min-w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">
        <span className="sr-only">{label} quantity: </span>
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`Add one ${label}`}
        className="grid size-8 place-items-center rounded-r-lg text-lg leading-none text-slate-700 hover:bg-slate-50 disabled:opacity-40"
      >
        +
      </button>
    </div>
  )
}

/* Dialog */

export function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  size = 'md',
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const width = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }[size]

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className={cn(
        'm-auto w-[calc(100%-1.5rem)] overflow-hidden rounded-2xl bg-white p-0 text-slate-900 shadow-2xl',
        width,
      )}
    >
      {open && (
        <div className="flex max-h-[min(88dvh,46rem)] flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 id={titleId} className="text-base font-semibold text-slate-900">
                {title}
              </h2>
              {description && <p className="mt-0.5 text-sm text-slate-600">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1 grid size-8 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">{footer}</div>
          )}
        </div>
      )}
    </dialog>
  )
}

/* Charts */

export function BarChart({
  data,
  format,
  label,
  className,
}: {
  data: { label: string; value: number; muted?: boolean }[]
  format: (value: number) => string
  label: string
  className?: string
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <figure className={className}>
      <figcaption className="sr-only">{label}</figcaption>
      <ul className="flex h-40 items-end gap-1.5 sm:gap-2">
        {data.map((d) => (
          <li key={d.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
            <span className="sr-only">
              {d.label}: {format(d.value)}
            </span>
            <span
              aria-hidden="true"
              title={`${d.label}: ${format(d.value)}`}
              className={cn('w-full rounded-t-md', d.muted ? 'bg-slate-200' : 'bg-(--accent)')}
              style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }}
            />
            <span aria-hidden="true" className="text-[0.65rem] text-slate-600 tabular-nums">
              {d.label}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  )
}

