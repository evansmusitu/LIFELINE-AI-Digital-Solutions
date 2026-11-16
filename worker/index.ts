import { RECEPTIONIST_PATH } from '../src/receptionist/protocol'
import { handleReceptionist } from './receptionist'

export { ChatLimiter } from './limiter'

/*
 * The site's Worker. wrangler.jsonc sends only /api/* here (run_worker_first). Every other path
 * is served straight from the static build in dist/ without running this code.
 */
export default {
  async fetch(request, env, ctx): Promise<Response> {
    const { pathname } = new URL(request.url)
    // ctx.exports (not an env binding), so each Preview gets its own limiter objects.
    if (pathname === RECEPTIONIST_PATH) return handleReceptionist(request, env, ctx.exports.ChatLimiter)
    if (pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
      })
    }
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
