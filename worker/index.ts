import { RECEPTIONIST_PATH, VIDEO_END_PATH, VIDEO_START_PATH } from '../src/receptionist/protocol'
import { handleReceptionist } from './receptionist'
import { handleVideo } from './video'

export { ChatLimiter } from './limiter'
export { VideoCalls } from './video-calls'

/*
 * The site's Worker. wrangler.jsonc sends only /api/* here (run_worker_first). Every other path
 * is served straight from the static build in dist/ without running this code.
 */
export default {
  async fetch(request, env, ctx): Promise<Response> {
    const { pathname } = new URL(request.url)
    // ctx.exports (not env bindings), so each Preview gets its own Durable Objects.
    if (pathname === RECEPTIONIST_PATH) return handleReceptionist(request, env, ctx.exports.ChatLimiter)
    if (pathname === VIDEO_START_PATH || pathname === VIDEO_END_PATH) {
      return handleVideo(request, env, pathname, { calls: ctx.exports.VideoCalls, limiter: ctx.exports.ChatLimiter })
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
