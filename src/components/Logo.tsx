import { cn } from '../lib/cn'
import markSrc from '../assets/logo-mark.png'

/*
 * logo-mark.png is made from the master logo in public/logo.png (brief, section 3): the "L" icon
 * alone on a navy disc, 128px. At small sizes only the "L" is used, because the thin
 * "AI CONCIERGE" lettering stops being readable below about 120px.
 */

/** "L" icon for small sizes (header, footer, "Powered by" bars). Decorative: the name is always in live text nearby. */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <img
      src={markSrc}
      alt=""
      width={size}
      height={size}
      decoding="async"
      className={cn('shrink-0 rounded-full', className)}
    />
  )
}

/** Mark plus live-text wordmark, used in the header and footer. */
export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <LogoMark size={compact ? 32 : 40} />
      <span className="leading-none">
        <span className="block font-display text-[1.05rem] font-extrabold tracking-[0.14em] text-white">
          LIFELINE
        </span>
        <span className="mt-1 block text-[0.66rem] font-medium tracking-[0.3em] text-mist-300">
          AI CONCIERGE
        </span>
      </span>
    </span>
  )
}
