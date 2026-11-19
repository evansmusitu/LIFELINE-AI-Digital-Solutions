import { Building2, CheckCheck, Laptop, type LucideIcon } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Badge, type Tone } from '../ui'
import { OFFICES, type Mode } from './business'
import type { Source } from './types'

/** WhatsApp-style *bold* text with line breaks kept. */
export function WhatsAppText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line.split(/(\*[^*]+\*)/g).map((part, j) =>
            /^\*[^*]+\*$/.test(part) ? <strong key={j}>{part.slice(1, -1)}</strong> : <Fragment key={j}>{part}</Fragment>,
          )}
        </Fragment>
      ))}
    </>
  )
}

/** A phone showing a WhatsApp chat with the practice. */
export function PhoneFrame({
  title,
  subtitle,
  initials,
  label,
  children,
  footer,
  className,
}: {
  title: string
  subtitle: string
  initials: string
  /** Read out to screen readers, for example "Simulated WhatsApp chat". */
  label: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  return (
    <section aria-label={label} className={cn('mx-auto w-full max-w-[22rem] overflow-hidden rounded-[2rem] border-8 border-slate-900 bg-[#efeae2] shadow-xl', className)}>
      <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15 text-sm font-bold" aria-hidden="true">
          {initials}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="truncate text-xs text-white/85">{subtitle}</p>
        </div>
      </div>
      {children}
      {footer}
    </section>
  )
}

/** One WhatsApp message. `mine` is the client's side (right, green). */
export function WaBubble({ text, mine, time, author, read }: { text: string; mine?: boolean; time?: string; author?: string; read?: boolean }) {
  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[86%] rounded-lg px-2.5 py-1.5 text-[0.84rem] leading-snug text-slate-900 shadow-sm', mine ? 'rounded-tr-none bg-[#d9fdd3]' : 'rounded-tl-none bg-white')}>
        {author && <p className="mb-0.5 text-xs font-semibold text-emerald-800">{author}</p>}
        <p className="break-words">
          <WhatsAppText text={text} />
        </p>
        {time && (
          <p className="mt-0.5 flex items-center justify-end gap-1 text-[0.65rem] text-slate-600">
            {time}
            {mine && read && <CheckCheck className="size-3.5 text-sky-600" aria-label="Read" />}
          </p>
        )}
      </div>
    </div>
  )
}

const SOURCE_TONE: Record<Source, Tone> = {
  'Website chat': 'violet',
  'Booking page': 'neutral',
  WhatsApp: 'green',
  Facebook: 'blue',
  LinkedIn: 'amber',
}

export function SourceBadge({ source }: { source: Source }) {
  return (
    <Badge tone={SOURCE_TONE[source]}>
      <span className="sr-only">From </span>
      {source}
    </Badge>
  )
}

const modeShort = (mode: Mode) => (mode === 'online' ? 'Online' : (OFFICES.find((o) => o.id === mode)?.city ?? mode))

const MODE_ICON: Record<Mode, LucideIcon> = { harare: Building2, johannesburg: Building2, online: Laptop }

export function ModeBadge({ mode }: { mode: Mode }) {
  return (
    <Badge tone={mode === 'online' ? 'blue' : 'accent'} icon={MODE_ICON[mode]}>
      {modeShort(mode)}
    </Badge>
  )
}

export function SampleBanner({ personalised }: { personalised: boolean }) {
  return (
    <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 sm:px-5">
      <span className="font-semibold">Sample business, sample data.</span>{' '}
      {personalised
        ? 'Your business name is shown, but the consultants, services, prices, times and clients are invented for this demo.'
        : 'The practice, consultants, services, prices, times and clients are invented for this demo.'}{' '}
      Nothing is booked or sent.
    </p>
  )
}
