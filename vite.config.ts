import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, runnerImport, type Plugin } from 'vite'
import { KNOWLEDGE_PATH, type Knowledge } from './src/receptionist/protocol.ts'

/** The fields this file reads from src/config/site.ts and src/demos/registry.ts. */
interface SiteInfo {
  url: string
  brand: string
  description: string
  headline: string
  headlineCta: string
}

interface DemoInfo {
  slug: string
  title: string
  summary: string
  industries: string[]
  build: { timeline: string; services: string[] }
}

interface PageMeta {
  title: string
  description: string
  /** Shown under the title in WhatsApp, Facebook, LinkedIn and X link previews. */
  previewDescription: string
  url: string
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function metaTags(page: PageMeta): string {
  const title = escapeHtml(page.title)
  const url = escapeHtml(page.url)
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${escapeHtml(page.description)}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${escapeHtml(page.previewDescription)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<link rel="canonical" href="${url}" />`,
  ].join('\n    ')
}

function homeMeta(site: SiteInfo): PageMeta {
  return {
    title: `${site.brand} | Demo Studio`,
    description: site.description,
    previewDescription: `${site.headline} ${site.headlineCta}`,
    url: `${site.url}/`,
  }
}

function demoMeta(site: SiteInfo, demo: DemoInfo): PageMeta {
  return {
    // Same as the browser tab title set in src/App.tsx.
    title: `${demo.title} demo | ${site.brand}`,
    description: demo.summary,
    previewDescription: demo.summary,
    url: `${site.url}/demos/${demo.slug}`,
  }
}

async function loadContent() {
  const options = { configFile: false, logLevel: 'silent' } as const
  const [site, registry] = await Promise.all([
    runnerImport<{ SITE: SiteInfo }>('./src/config/site.ts', options),
    runnerImport<{ DEMOS: DemoInfo[] }>('./src/demos/registry.ts', options),
  ])
  return { site: site.module.SITE, demos: registry.module.DEMOS }
}

/**
 * Gives every page its own HTML file, so link previews and search engines (which don't run
 * JavaScript) see the right title and description: dist/index.html for the home page and
 * dist/demos/<slug>.html for each demo. Also writes sitemap.xml and robots.txt.
 */
function studioPages(): Plugin {
  let content: ReturnType<typeof loadContent> | undefined
  const load = () => (content ??= loadContent())

  return {
    name: 'lifeline-studio-pages',
    // After Vite has built index.html.
    enforce: 'post',
    transformIndexHtml: {
      order: 'pre',
      async handler(html) {
        const { site } = await load()
        return html.replace('<!-- page-meta -->', () => metaTags(homeMeta(site))).replaceAll('%SITE_URL%', site.url)
      },
    },
    async generateBundle(_options, bundle) {
      const index = bundle['index.html']
      if (index?.type !== 'asset' || typeof index.source !== 'string') this.error('index.html is missing from the build')
      const { site, demos } = await load()
      const home = metaTags(homeMeta(site))
      if (!index.source.includes(home)) this.error('The page-meta marker is missing from index.html')

      for (const demo of demos) {
        const page = metaTags(demoMeta(site, demo))
        this.emitFile({ type: 'asset', fileName: `demos/${demo.slug}.html`, source: index.source.replace(home, () => page) })
      }

      const urls = [homeMeta(site).url, ...demos.map((demo) => demoMeta(site, demo).url)]
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...urls.map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`),
          '</urlset>',
          '',
        ].join('\n'),
      })
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`,
      })

      // The demo list the AI receptionist answers from (worker/receptionist.ts reads it). Built from
      // the registry, so a new demo is known to the receptionist as soon as it is on the site.
      const knowledge: Knowledge = {
        demos: demos.map((demo) => ({
          slug: demo.slug,
          title: demo.title,
          summary: demo.summary,
          industries: demo.industries,
          timeline: demo.build.timeline,
          services: demo.build.services,
        })),
      }
      this.emitFile({
        type: 'asset',
        fileName: KNOWLEDGE_PATH.slice(1),
        source: `${JSON.stringify(knowledge)}\n`,
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Root-relative asset paths, so /demos/<slug> pages load the same files as the home page.
  // The site must be served from the root of its address.
  base: '/',
  plugins: [react(), tailwindcss(), studioPages()],
})
