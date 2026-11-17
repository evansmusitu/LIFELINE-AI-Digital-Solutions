/*
 * The site's totals: one number per event per UTC day, kept by the Worker (worker/stats.ts) and shown on
 * the private /stats page. Nothing about who did what is kept: no cookies, IDs or addresses.
 */

export const EVENT_PATH = '/api/event'
export const STATS_PATH = '/stats'

/** Counted in the browser (src/lib/counts.ts) and sent to EVENT_PATH. */
export const PAGE_EVENTS = [
  'whatsapp_chat',
  'whatsapp_video',
  'whatsapp_page',
  'share_whatsapp',
  'share_sheet',
  'share_copy',
  'ref_walk_in',
  'ref_status',
  'ref_tiktok',
  'ref_facebook',
  'ref_instagram',
  'ref_referral',
  'ref_flyer',
  'ref_other',
  'link_personalised',
] as const
export type PageEvent = (typeof PAGE_EVENTS)[number]

/** Counted by the Worker as it answers. */
export const WORKER_EVENTS = [
  'chat_started',
  'ai_reply',
  'saved_quota',
  'saved_busy',
  'saved_error',
  'video_started',
  'video_refused_budget',
  'video_refused_daily',
  'video_refused_visitor',
  'video_refused_busy',
  'video_refused_off',
  'video_refused_error',
] as const
export type WorkerEvent = (typeof WORKER_EVENTS)[number]

export type CountEvent = PageEvent | WorkerEvent

export function isPageEvent(value: unknown): value is PageEvent {
  return typeof value === 'string' && (PAGE_EVENTS as readonly string[]).includes(value)
}

/** The source tags a link's ?ref= may carry. Anything else counts as "other", and the text itself is never sent or kept. */
export const REF_TAGS = ['walk-in', 'status', 'tiktok', 'facebook', 'instagram', 'referral', 'flyer'] as const

/** The event for a raw ?ref= value: a listed tag counts as itself, any other text as "other", and no value as nothing. */
export function refEvent(raw: string | null | undefined): PageEvent | null {
  if (raw === null || raw === undefined) return null
  const tag = raw.trim().toLowerCase()
  const known = (REF_TAGS as readonly string[]).includes(tag)
  return (known ? `ref_${tag.replace('-', '_')}` : 'ref_other') as PageEvent
}
