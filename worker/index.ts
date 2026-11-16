import { EVENT_PATH, STATS_PATH } from '../src/lib/count-events'
import { RECEPTIONIST_PATH, VIDEO_END_PATH, VIDEO_START_PATH } from '../src/receptionist/protocol'
import { handleReceptionist } from './receptionist'
import { counter, handleEvent } from './stats'
import { handleStats } from './stats-page'
import { handleVideo } from './video'

export { ChatLimiter } from './limiter'
export { SiteStats } from './stats'
export { VideoCalls } from './video-calls'

/*
 * The site's Worker. wrangler.jsonc sends only /api/* and /stats here (run_worker_first). Every
 * other path is served straight from the static build in dist/ without running this code.
 */
export default {
  async fetch(request, env, ctx): Promise<Response> {
    const { pathname } = new URL(request.url)
    // ctx.exports (not env bindings), so each Preview gets its own Durable Objects.
    const count = counter(ctx.exports.SiteStats, ctx)
    if (pathname === RECEPTIONIST_PATH) return handleReceptionist(request, env, ctx.exports.ChatLimiter, count)
    if (pathname === VIDEO_START_PATH || pathname === VIDEO_END_PATH) {
      return handleVideo(request, env, pathname, { calls: ctx.exports.VideoCalls, limiter: ctx.exports.ChatLimiter }, count)
    }
    if (pathname === EVENT_PATH) return handleEvent(request, ctx.exports.ChatLimiter, count)
    if (pathname === STATS_PATH) {
      return handleStats(request, env, { stats: ctx.exports.SiteStats, calls: ctx.exports.VideoCalls, limiter: ctx.exports.ChatLimiter })
    }
    if (pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
      })
    }
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
