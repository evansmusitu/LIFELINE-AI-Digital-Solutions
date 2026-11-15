import { createContext, useContext } from 'react'

export type ToastTone = 'success' | 'info' | 'warning'

export type PushToast = (message: string, tone?: ToastTone) => void

export const ToastContext = createContext<PushToast>(() => {})

/** Shows a short message in the corner of the screen. Announced to screen readers. */
export function useToast(): PushToast {
  return useContext(ToastContext)
}
