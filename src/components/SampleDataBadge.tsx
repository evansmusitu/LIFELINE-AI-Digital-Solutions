import { FlaskConical } from 'lucide-react'
import { cn } from '../lib/cn'

/** Shown on every demo (brief, section 5). */
export function SampleDataBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-brand-lilac/45 bg-brand-lilac/10 px-2.5 py-1 text-xs font-semibold text-brand-lilac',
        className,
      )}
    >
      <FlaskConical className="size-3.5" aria-hidden="true" />
      Sample data for demonstration
    </span>
  )
}
