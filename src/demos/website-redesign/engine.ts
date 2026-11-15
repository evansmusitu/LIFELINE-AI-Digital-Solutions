import { DAY, MINUTE } from '../../lib/time'
import { TOPICS } from './data'
import type { Enquiry, EnquirySource, EnquiryStatus, RedesignState, TopicId } from './types'

/* Pure logic for the website redesign demo: enquiries, validation and the comparison frame's sizes. */

export const STATUS_FLOW: EnquiryStatus[] = ['New', 'Contacted', 'Survey booked', 'Quoted']

export const STATUS_ACTION: Record<EnquiryStatus, string | null> = {
  New: 'Mark as contacted',
  Contacted: 'Book survey',
  'Survey booked': 'Mark as quoted',
  Quoted: null,
}

export function nextStatus(status: EnquiryStatus): EnquiryStatus | null {
  const index = STATUS_FLOW.indexOf(status)
  return index >= 0 && index < STATUS_FLOW.length - 1 ? STATUS_FLOW[index + 1] : null
}

/** Moves one enquiry a step forward. Quoted enquiries stay where they are. */
export function advanceEnquiry(enquiries: Enquiry[], id: string): Enquiry[] {
  return enquiries.map((e) => {
    if (e.id !== id) return e
    const next = nextStatus(e.status)
    return next ? { ...e, status: next } : e
  })
}

export function formatRef(n: number): string {
  return `KSD-${n}`
}

export interface NewEnquiry {
  name: string
  phone: string
  area: string
  source: EnquirySource
  need: string
  message?: string
}

/** Adds the visitor's enquiry at the top of the list with the next reference number. */
export function addEnquiry(state: RedesignState, input: NewEnquiry, at: number): { state: RedesignState; enquiry: Enquiry } {
  const enquiry: Enquiry = { ...input, id: `enq-${state.nextRef}`, ref: formatRef(state.nextRef), at, status: 'New', mine: true }
  return { state: { ...state, enquiries: [enquiry, ...state.enquiries], nextRef: state.nextRef + 1 }, enquiry }
}

/* Enquiry form */

export interface EnquiryForm {
  name: string
  phone: string
  area: string
}

export type FormErrors = Partial<Record<keyof EnquiryForm, string>>

export const OTHER_AREA = 'Somewhere else'

/**
 * Accepts Zimbabwe mobile numbers in the usual ways people type them (077 123 4567, +263 77 123 4567,
 * 263771234567) and international numbers with a + for family abroad. Returns +<digits>, or null.
 */
export function normalisePhone(raw: string): string | null {
  const value = raw.trim()
  if (!value || /[^\d\s()+.-]/.test(value)) return null
  const international = value.startsWith('+') || value.startsWith('00')
  let digits = value.replace(/\D/g, '')
  if (value.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('263')) digits = digits.slice(3)
  else if (international) return digits.length >= 10 && digits.length <= 15 ? `+${digits}` : null
  digits = digits.replace(/^0/, '')
  return /^7[1378]\d{7}$/.test(digits) ? `+263${digits}` : null
}

/** "+263 77 ••• 4567". Numbers from other countries keep only the first two and last four digits. */
export function maskPhone(e164: string): string {
  const digits = e164.replace(/\D/g, '')
  if (digits.startsWith('263') && digits.length === 12) return `+263 ${digits.slice(3, 5)} ••• ${digits.slice(-4)}`
  return `+${digits.slice(0, 2)} ••• ${digits.slice(-4)}`
}

export function cleanName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

export function validateEnquiry(form: EnquiryForm, areas: string[]): FormErrors {
  const errors: FormErrors = {}
  const name = cleanName(form.name)
  if (!name) errors.name = 'Please tell us your name, so we know who to ask for.'
  else if (name.length < 2 || !/\p{L}/u.test(name)) errors.name = 'Please check your name.'
  else if (name.length > 60) errors.name = 'Please keep your name under 60 characters.'

  if (!form.phone.trim()) errors.phone = 'Add a number we can call you back on.'
  else if (!normalisePhone(form.phone)) errors.phone = 'That number doesn’t look right. Try 077 123 4567, or +44 for a UK number.'

  if (!form.area) errors.area = 'Choose the area closest to you.'
  else if (!areas.includes(form.area) && form.area !== OTHER_AREA) errors.area = 'Choose an area from the list.'
  return errors
}

/* Call and WhatsApp buttons */

/** One call-button enquiry per visitor every 10 minutes, so repeated taps don't flood the inbox. */
export function shouldLogCall(enquiries: Enquiry[], now: number): boolean {
  return !enquiries.some((e) => e.mine && e.source === 'Call button' && now - e.at < 10 * MINUTE)
}

export function whatsappMessage(topic: TopicId): string {
  const line = TOPICS.find((t) => t.id === topic)?.line ?? TOPICS[0].line
  return `Hello Kopje Spring, ${line.charAt(0).toLowerCase()}${line.slice(1)} When could you come out?`
}

export function validateMessage(text: string): string | null {
  const value = text.trim()
  if (!value) return 'Write a short message first.'
  if (value.length > 500) return 'Please keep the message under 500 characters.'
  return null
}

/* Counts */

export function countByStatus(enquiries: Enquiry[]): Record<EnquiryStatus | 'All', number> {
  const counts = { All: enquiries.length, New: 0, Contacted: 0, 'Survey booked': 0, Quoted: 0 }
  for (const e of enquiries) counts[e.status] += 1
  return counts
}

export function countBySource(enquiries: Enquiry[]): Record<EnquirySource, number> {
  const counts: Record<EnquirySource, number> = { Form: 0, 'WhatsApp button': 0, 'Call button': 0 }
  for (const e of enquiries) counts[e.source] += 1
  return counts
}

export function inLastDays(enquiries: Enquiry[], now: number, days: number): number {
  // Enquiries sent since the last clock tick are a few seconds "ahead" of now. They still count.
  return enquiries.filter((e) => now - e.at < days * DAY).length
}

/** Minutes saved per enquiry, because each one arrives with a name, phone number and area. */
export const MINUTES_PER_ENQUIRY = 6

/* Comparison frame */

export const PHONE_WIDTH = 375
export const DESKTOP_WIDTH = 1100
/** The old site has a fixed 960 px layout, so a phone shrinks the whole page to fit its screen. */
export const OLD_SITE_WIDTH = 960
/** Phone bezel on each side, in px. */
export const BEZEL = 10

export type CompareMode = 'phone' | 'desktop'

export interface CompareLayout {
  /** On-screen width of the frame in px. */
  frame: number
  oldWidth: number
  oldScale: number
  newWidth: number
  newScale: number
}

/** Sizes for the comparison frame, given the width available for it. Never wider than the space. */
export function compareLayout(mode: CompareMode, available: number): CompareLayout {
  const space = Number.isFinite(available) ? Math.max(0, available) : 0
  if (mode === 'phone') {
    const frame = Math.floor(Math.min(PHONE_WIDTH, Math.max(0, space - 2 * BEZEL)))
    return { frame, oldWidth: OLD_SITE_WIDTH, oldScale: frame / OLD_SITE_WIDTH, newWidth: PHONE_WIDTH, newScale: frame / PHONE_WIDTH }
  }
  const frame = Math.floor(Math.min(DESKTOP_WIDTH, space))
  const scale = frame / DESKTOP_WIDTH
  return { frame, oldWidth: DESKTOP_WIDTH, oldScale: scale, newWidth: DESKTOP_WIDTH, newScale: scale }
}

/** A marker sits on the new site, which only shows to the right of the divider. */
export function isMarkerHidden(centreX: number, frameWidth: number, divider: number): boolean {
  if (frameWidth <= 0) return true
  return (centreX / frameWidth) * 100 < divider
}

/** Slider value that puts the divider just left of a marker, so the marker is on the visible new side. */
export function revealDivider(centreX: number, frameWidth: number, divider: number): number {
  if (frameWidth <= 0 || !isMarkerHidden(centreX - 16, frameWidth, divider)) return divider
  return Math.max(0, Math.floor(((centreX - 28) / frameWidth) * 100))
}

/* Colour contrast (WCAG 2.x), used to show and check the style palettes */

function luminance(hex: string): number {
  const n = hex.replace('#', '')
  const channels = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
