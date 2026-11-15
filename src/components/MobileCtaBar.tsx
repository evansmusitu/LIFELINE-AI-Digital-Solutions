import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '../lib/cn'

const NON_TEXT_INPUTS = new Set(['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'color', 'file'])

function isTextEntry(el: Element | null): boolean {
  if (el instanceof HTMLTextAreaElement) return true
  if (el instanceof HTMLInputElement) return !NON_TEXT_INPUTS.has(el.type)
  return el instanceof HTMLElement && el.isContentEditable
}

/** True while the visitor is typing, when the on-screen keyboard is likely open. */
function useTyping(): boolean {
  const [typing, setTyping] = useState(false)
  useEffect(() => {
    const update = () => window.setTimeout(() => setTyping(isTextEntry(document.activeElement)), 0)
    document.addEventListener('focusin', update)
    document.addEventListener('focusout', update)
    return () => {
      document.removeEventListener('focusin', update)
      document.removeEventListener('focusout', update)
    }
  }, [])
  return typing
}

/**
 * Sticky call-to-action bar for phones (brief, section 7). It slides away while the
 * visitor types, so it never covers a chat box or form field above the keyboard.
 */
export function MobileCtaBar({ children }: { children: ReactNode }) {
  const typing = useTyping()
  return (
    <div
      inert={typing}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink-950/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgb(0_0_0/0.4)] transition-transform duration-200 md:hidden',
        typing && 'translate-y-full',
      )}
    >
      <div className="mx-auto flex max-w-md items-center gap-2">{children}</div>
    </div>
  )
}
