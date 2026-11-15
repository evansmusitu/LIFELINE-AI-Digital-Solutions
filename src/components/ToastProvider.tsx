import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import { useCallback, useState, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import { ToastContext, type PushToast, type ToastTone } from './toast-context'

interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

const icons = { success: CircleCheck, info: Info, warning: CircleAlert }
const iconColour = { success: 'text-emerald-300', info: 'text-brand-cyan', warning: 'text-amber-300' }

let sequence = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const push = useCallback<PushToast>((message, tone = 'success') => {
    sequence += 1
    const id = sequence
    setToasts((current) => [...current.slice(-2), { id, message, tone }])
    window.setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 5000)
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 md:inset-x-auto md:right-6 md:bottom-6 md:items-end"
      >
        {toasts.map((toast) => {
          const Icon = icons[toast.tone]
          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-2.5 rounded-xl border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white shadow-[0_12px_32px_rgb(0_0_0/0.45)]"
            >
              <Icon className={cn('mt-0.5 size-4 shrink-0', iconColour[toast.tone])} aria-hidden="true" />
              <span>{toast.message}</span>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
