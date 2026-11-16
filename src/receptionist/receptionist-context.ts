import { createContext, useContext } from 'react'

export interface OpenOptions {
  /** Open on the video call screen instead of the chat. The call itself starts only when the visitor presses Start. */
  video?: boolean
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
