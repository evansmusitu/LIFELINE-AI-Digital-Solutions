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
  'by_team_a',
  'by_team_b',
  'by_team_c',
  'by_other',
  'link_personalised',
  'visit',
  'from_search',
  'from_ai',
  'from_social',
  'from_other_site',
  'from_direct',
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

/** The people a link's ?by= may name. Anything else counts as "other", and the text itself is never sent or kept. */
export const BY_TAGS = ['team-a', 'team-b', 'team-c'] as const

/** The event for a raw ?by= value, the same way refEvent treats ?ref=. It is its own count, not tied to the ?ref= one. */
export function byEvent(raw: string | null | undefined): PageEvent | null {
  if (raw === null || raw === undefined) return null
  const tag = raw.trim().toLowerCase()
  const known = (BY_TAGS as readonly string[]).includes(tag)
  return (known ? `by_${tag.replace('-', '_')}` : 'by_other') as PageEvent
}

/*
 * Where a visit came from, by the kind of site in the browser's referrer. Only the kind is sent, never
 * the address. WhatsApp and many apps send no referrer, so their visits count as direct.
 */
const SEARCH = /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|search\.yahoo\.com|yandex\.[a-z]+|ecosia\.org|search\.brave\.com)$/
const AI = /(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|gemini\.google\.com|copilot\.microsoft\.com|claude\.ai|meta\.ai)$/
const SOCIAL = /(^|\.)(facebook\.com|fb\.com|instagram\.com|tiktok\.com|t\.co|x\.com|twitter\.com|linkedin\.com|lnkd\.in|youtube\.com|whatsapp\.com|wa\.me|threads\.net|pinterest\.com)$/

export function sourceEvent(referrer: string, ownHost: string): PageEvent {
  let host = ''
  try {
    host = referrer ? new URL(referrer).hostname.toLowerCase() : ''
  } catch {
    host = ''
  }
  if (!host || host === ownHost) return 'from_direct'
  // AI assistants first: gemini.google.com is also a Google address.
  if (AI.test(host)) return 'from_ai'
  if (SEARCH.test(host)) return 'from_search'
  if (SOCIAL.test(host)) return 'from_social'
  return 'from_other_site'
}
