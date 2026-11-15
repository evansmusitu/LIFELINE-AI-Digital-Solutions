import { cn } from '../lib/cn'
import badgeSrc from '../assets/logo-badge.jpg'
import markSrc from '../assets/logo-mark.png'

/*
 * Both images are made from the master logo in public/logo.png (brief, section 3):
 * - logo-badge.jpg: the full badge, resized to 480px (34 KB instead of 474 KB).
 * - logo-mark.png: the "L" icon alone on a navy disc, 128px. Below about 120px wide only
 *   the "L" is used, because the thin "AI CONCIERGE" lettering stops being readable.
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

/** Full badge for sizes of 120px and up. */
export function LogoBadge({ size = 200, className }: { size?: number; className?: string }) {
  return (
    <div className={cn('relative rounded-full', className)} style={{ width: size, height: size }}>
      {/* A radial gradient instead of a blur filter: same glow, far cheaper on low-end phones. */}
      <div
        aria-hidden="true"
        className="absolute -inset-[18%] rounded-full bg-[radial-gradient(circle,rgb(0_212_255/0.32)_0%,rgb(139_92_246/0.18)_45%,transparent_70%)]"
      />
      {/* Lazy, so phones skip the download while the home hero hides the badge on small screens. */}
      <img
        src={badgeSrc}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className="relative rounded-full"
      />
    </div>
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
