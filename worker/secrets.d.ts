/*
 * Secrets set in Cloudflare (wrangler secret put), which `wrangler types` can't see.
 * Optional, so the Worker still runs, with video calls off, where a secret is missing.
 */
interface Env {
  NAPSTER_API_KEY?: string
}

declare namespace Cloudflare {
  interface Env {
    NAPSTER_API_KEY?: string
  }
}
