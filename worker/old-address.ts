import { SITE } from '../src/config/site'

/*
 * The site's old address (lifeline-demo-studio.freelancer-d62.workers.dev, in another Cloudflare account).
 * It sends every visitor to the same page at SITE.url, so links shared before the move keep working and
 * link previews follow them. Deployed once to the old account with wrangler.old-address.jsonc.
 *
 * The Durable Object classes stay exported so their stored data is left alone, and so a video call that
 * was running at the switch is still ended at its cut-off.
 */
export { ChatLimiter } from './limiter'
export { SiteStats } from './stats'
export { VideoCalls } from './video-calls'

export function newAddress(request: Request): Response {
  const url = new URL(request.url)
  const location = `${SITE.url}${url.pathname}${url.search}`
  // 308 keeps the method, for a chat message sent from a page that was open before the switch.
  const status = request.method === 'GET' || request.method === 'HEAD' ? 301 : 308
  return new Response(null, { status, headers: { location, 'cache-control': 'public, max-age=86400' } })
}

export default {
  fetch: async (request) => newAddress(request),
} satisfies ExportedHandler<Env>
