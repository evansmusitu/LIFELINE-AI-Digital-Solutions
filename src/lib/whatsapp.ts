import { SITE } from '../config/site'
import { countEvent } from './counts'

/** Builds a wa.me link to LIFELINE's number, with an optional pre-filled message. */
export function whatsappUrl(message?: string): string {
  const base = `https://wa.me/${SITE.whatsappNumber}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

export const GENERAL_ENQUIRY =
  "Hi LIFELINE AI CONCIERGE, I've been looking at your Demo Studio and I'd like to talk about a project for my business."

/** Sent from the "Get a quote for this demo" buttons on a demo page. */
export function demoQuoteMessage(demoTitle: string): string {
  return `Hi LIFELINE AI CONCIERGE, I tried the "${demoTitle}" demo and I'd like a quote for something similar for my business.`
}

/** Sent from the request buttons on the studio home page cards. */
export function demoRequestMessage(demoTitle: string): string {
  return `Hi LIFELINE AI CONCIERGE, I saw the "${demoTitle}" demo in your Demo Studio. Could you build something like it for my business?`
}

export interface EnquiryDetails {
  name: string
  business: string
  service: string
  message: string
}

export function enquiryMessage({ name, business, service, message }: EnquiryDetails): string {
  const details = [`Name: ${name}`]
  if (business) details.push(`Business: ${business}`)
  if (service) details.push(`Interested in: ${service}`)
  return ["Hi LIFELINE AI CONCIERGE, I'd like to discuss a project.", details.join('\n'), message].join('\n\n')
}

/**
 * Opens WhatsApp in a new tab from a click handler. A real link click is used because
 * window.open with "noopener" always returns null, which makes blocked pop-ups undetectable.
 * Callers should also show a plain link in case the browser blocks the new tab.
 */
export function openWhatsApp(message: string): void {
  // This link is never added to the page, so the tap counter (src/lib/counts.ts) doesn't see it.
  countEvent('whatsapp_page')
  const link = document.createElement('a')
  link.href = whatsappUrl(message)
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  link.click()
}
