import { ArrowRightLeft, CircleCheck, CircleX, Repeat, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { Tone } from '../ui'
import type { ScanKind } from './types'

/** Colour, short label and icon for each gate result, so colour is never the only signal. */
export const SCAN_LOOK: Record<ScanKind, { tone: Tone; label: string; icon: LucideIcon }> = {
  valid: { tone: 'green', label: 'Valid', icon: CircleCheck },
  used: { tone: 'red', label: 'Already used', icon: Repeat },
  transferred: { tone: 'red', label: 'Transferred', icon: ArrowRightLeft },
  'wrong-gate': { tone: 'amber', label: 'Wrong gate', icon: TriangleAlert },
  invalid: { tone: 'red', label: 'Not valid', icon: CircleX },
}
