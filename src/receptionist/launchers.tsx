import { Sparkles } from 'lucide-react'
import { Button } from '../components/Button'
import { cn } from '../lib/cn'
import { useReceptionist } from './receptionist-context'

type ButtonProps = Parameters<typeof Button>[0]

/** A studio button that opens the AI receptionist. `iconOnly` keeps the label for screen readers only. */
export function AskAiButton({
  label,
  iconOnly,
  className,
  ...props
}: Omit<ButtonProps, 'onClick' | 'children'> & { label: string; iconOnly?: boolean }) {
  const { open, prefetch } = useReceptionist()
  return (
    <Button
      {...props}
      className={cn(iconOnly && 'size-11 shrink-0 px-0!', className)}
      onClick={(event) => open(event.currentTarget)}
      onPointerEnter={prefetch}
      onFocus={prefetch}
    >
      <Sparkles className={cn('shrink-0', iconOnly ? 'size-5' : 'size-[1.1em]')} aria-hidden="true" />
      <span className={cn(iconOnly && 'sr-only')}>{label}</span>
    </Button>
  )
}

/** Floating "Ask our AI receptionist" button in the bottom-right corner, from tablet width up. Phones use the bar at the bottom. */
export function ReceptionistLauncher() {
  const { open, prefetch, isOpen } = useReceptionist()
  return (
    <button
      type="button"
      onClick={(event) => open(event.currentTarget)}
      onPointerEnter={prefetch}
      onFocus={prefetch}
      className={cn(
        'fixed right-6 bottom-6 z-40 hidden items-center gap-2.5 rounded-full bg-brand-gradient py-2 pr-5 pl-2 font-semibold text-ink-950 shadow-[0_12px_40px_-8px_rgb(0_0_0/0.7)] glow-button transition hover:brightness-110 md:flex',
        isOpen && 'md:hidden',
      )}
    >
      <span className="grid size-9 animate-pulse-ring place-items-center rounded-full bg-ink-950 text-brand-cyan">
        <Sparkles className="size-5" aria-hidden="true" />
      </span>
      Ask our AI receptionist
    </button>
  )
}
