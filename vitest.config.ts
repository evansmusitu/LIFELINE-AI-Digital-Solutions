import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/*
 * Logic tests for the receptionist and video calls (test/). They run in Node: the Worker code
 * with Cloudflare's runtime module replaced by a stub, the browser code without a page.
 */
export default defineConfig({
  resolve: {
    alias: {
      'cloudflare:workers': fileURLToPath(new URL('./test/stubs/cloudflare-workers.ts', import.meta.url)),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    // The Worker logs warnings on purpose in failure paths. Keep the test output readable.
    onConsoleLog: (log, type) => !(type === 'stderr' && /^(receptionist|video):/.test(log)),
  },
})
