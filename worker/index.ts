import { RECEPTIONIST_PATH } from '../src/receptionist/protocol'
import { handleReceptionist } from './receptionist'

/*
 * The site's Worker. wrangler.jsonc sends only /api/* here (run_worker_first). Every other path
 * is served straight from the static build in dist/ without running this code.
 */
export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url)
    if (pathname === RECEPTIONIST_PATH) return handleReceptionist(request, env)
    if (pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
      })
    }
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
