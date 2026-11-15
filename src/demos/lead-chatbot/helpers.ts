import type { Tone } from '../ui'
import type { Conversation, LeadStatus, Temperature } from './types'

export const LEAD_STATUSES: LeadStatus[] = ['New', 'Contacted', 'Meeting booked', 'Proposal sent', 'Won', 'Lost']

export const temperatureTone: Record<Temperature, Tone> = { hot: 'red', warm: 'amber', cold: 'blue' }

export function displayName(conv: Conversation): string {
  if (conv.contact.name) return conv.contact.name
  return conv.live ? 'You (this demo chat)' : 'Website visitor'
}
