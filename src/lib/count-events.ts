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
