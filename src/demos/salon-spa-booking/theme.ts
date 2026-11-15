import { Flower2, Hand, Scissors, type LucideIcon } from 'lucide-react'
import type { ServiceGroup } from './types'

/** Each service group has its own colour in the calendar, always paired with the service name. */
export const GROUP_STYLE: Record<ServiceGroup, { icon: LucideIcon; tile: string; block: string; swatch: string }> = {
  Hair: { icon: Scissors, tile: 'bg-violet-50 text-violet-700', block: 'border-violet-500 bg-violet-50 text-violet-950', swatch: 'bg-violet-500' },
  Nails: { icon: Hand, tile: 'bg-amber-50 text-amber-700', block: 'border-amber-500 bg-amber-50 text-amber-950', swatch: 'bg-amber-500' },
  Spa: { icon: Flower2, tile: 'bg-teal-50 text-teal-700', block: 'border-teal-600 bg-teal-50 text-teal-950', swatch: 'bg-teal-600' },
}
