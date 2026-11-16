import { createContext, useContext } from 'react'

export type ReceptionistView = 'chat' | 'video'

export interface OpenOptions {
  /**
   * Open on this screen. Without it, the panel shows the screen it was on last. A video call starts only when
   * the visitor presses Start, and leaving the video screen ends a running call, as "Back to chat" does.
   */
  view?: ReceptionistView
}

/** A button's request for a screen. `id` goes up by one each time, so asking for the same screen again still works. */
export interface ViewRequest {
  view: ReceptionistView
  id: number
}

export interface ReceptionistControls {
  /** Opens the chat. When it closes, focus goes back to `from`, or to whatever had focus. */
  open: (from?: HTMLElement | null, options?: OpenOptions) => void
  /** Starts downloading the chat code, for example when a button that opens it is hovered. */
  prefetch: () => void
  isOpen: boolean
}

export const ReceptionistContext = createContext<ReceptionistControls>({
  open: () => {},
  prefetch: () => {},
  isOpen: false,
})

/** Opens LIFELINE's AI receptionist from anywhere in the studio. */
export function useReceptionist(): ReceptionistControls {
  return useContext(ReceptionistContext)
}
