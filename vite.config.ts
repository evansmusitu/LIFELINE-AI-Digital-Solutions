import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, runnerImport, type Plugin } from 'vite'
import { KNOWLEDGE_PATH, toKnowledge } from './src/receptionist/protocol.ts'
import {
  PRERENDER_CSS,
  demoHtml,
  demoJsonLd,
  homeHtml,
  homeJsonLd,
  llmsTxt,
  solutionHtml,
  solutionJsonLd,
  type SeoContent,
  type SeoDemo,
  type SeoSite,
  type SeoSolution,
} from './scripts/seo/prerender.ts'

/** The fields this file reads from src/config/site.ts and src/demos/registry.ts. */
interface SiteInfo extends SeoSite {
  previewDescription: string
}

interface DemoInfo extends SeoDemo {
  /** false: an unlisted demo (see LIST_WELLNESS_DEMO in src/demos/registry.ts). */
  listed?: boolean
}

interface PageMeta {
  title: string
  description: string
  /** Shown under the title in WhatsApp, Facebook, LinkedIn and X link previews. */
  previewDescription: string
  url: string
  /** Asks search engines not to index the page: unlisted demos. */
  noindex?: boolean
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
    ...(page.noindex ? ['<meta name="robots" content="noindex" />'] : []),
  ].join('\n    ')
}

/** The home page's tab and search-result title. The same words as STUDIO_TITLE in src/App.tsx. */
export const HOME_TITLE = 'LIFELINE AI CONCIERGE | AI chatbots, WhatsApp automation and business systems in Zimbabwe'

function homeMeta(site: SiteInfo): PageMeta {
  return {
    title: HOME_TITLE,
    description: site.description,
    previewDescription: site.previewDescription,
    url: `${site.url}/`,
  }
}

function demoMeta(site: SiteInfo, demo: DemoInfo): PageMeta {
  return {
    // Same as the browser tab title set in src/App.tsx.
    title: `${demo.title} demo | ${site.brand}`,
    description: `${demo.summary} Free live demo by ${site.brand}, Zimbabwe.`,
    previewDescription: demo.summary,
    url: `${site.url}/demos/${demo.slug}`,
    noindex: demo.listed === false,
  }
}

function solutionMeta(site: SiteInfo, solution: SeoSolution): PageMeta {
  return {
    title: solution.metaTitle,
    description: solution.description,
    previewDescription: solution.description,
    url: `${site.url}/solutions/${solution.slug}`,
  }
}

async function loadContent() {
  const options = { configFile: false, logLevel: 'silent' } as const
  const [site, registry, about, solutions] = await Promise.all([
    runnerImport<{ SITE: SiteInfo; SERVICES: readonly string[] }>('./src/config/site.ts', options),
    runnerImport<{ ALL_DEMOS: DemoInfo[] }>('./src/demos/registry.ts', options),
    runnerImport<{ ABOUT: { summary: string; view: string } }>('./src/config/about.ts', options),
    runnerImport<{ SOLUTIONS: readonly SeoSolution[] }>('./src/config/solutions.ts', options),
  ])
  const demos = registry.module.ALL_DEMOS
  const seo: SeoContent = {
    site: site.module.SITE,
    about: about.module.ABOUT,
    services: site.module.SERVICES,
    demos: demos.filter((d) => d.listed !== false),
    solutions: solutions.module.SOLUTIONS,
  }
  return { site: site.module.SITE, demos, seo }
}

/** The parts of a page that differ: meta tags, structured data and the pre-rendered body. */
interface PageParts {
  meta: string
  jsonLd: string
  body: string
}

function fill(html: string, parts: PageParts): string {
  return html
    .replace('<!-- page-meta -->', () => parts.meta)
    .replace('<!-- page-jsonld -->', () => `${parts.jsonLd}\n    <style>${PRERENDER_CSS}</style>`)
    .replace('<!-- page-body -->', () => parts.body)
}

/**
 * Gives every page its own HTML file, so link previews and search engines (which don't run
 * JavaScript) see the right title and description: dist/index.html for the home page and
 * dist/demos/<slug>.html for each demo and dist/solutions/<slug>.html for each solution, each with its own
 * readable content and structured data. Also writes sitemap.xml, robots.txt and llms.txt.
 * Unlisted demos get a page (with noindex) but stay out of the sitemap and the receptionist's knowledge.
 */
export function studioPages(): Plugin {
  let content: ReturnType<typeof loadContent> | undefined
  const load = () => (content ??= loadContent())

  return {
    name: 'lifeline-studio-pages',
    // After Vite has built index.html.
    enforce: 'post',
    transformIndexHtml: {
      order: 'pre',
      async handler(html) {
        const { site, seo } = await load()
        const parts = { meta: metaTags(homeMeta(site)), jsonLd: homeJsonLd(seo), body: homeHtml(seo) }
        return fill(html, parts).replaceAll('%SITE_URL%', site.url)
      },
    },
    async generateBundle(_options, bundle) {
      const index = bundle['index.html']
      if (index?.type !== 'asset' || typeof index.source !== 'string') this.error('index.html is missing from the build')
      const source = index.source
      const { site, demos, seo } = await load()
      const home = { meta: metaTags(homeMeta(site)), jsonLd: homeJsonLd(seo), body: homeHtml(seo) }
      for (const part of Object.values(home)) if (!source.includes(part)) this.error('A page marker is missing from index.html')
      const pageFrom = (parts: PageParts) =>
        source.replace(home.meta, () => parts.meta).replace(home.jsonLd, () => parts.jsonLd).replace(home.body, () => parts.body)

      for (const demo of demos) {
        // Unlisted demos keep a bare page: no content or structured data for search engines.
        const listedDemo = demo.listed !== false
        const parts = { meta: metaTags(demoMeta(site, demo)), jsonLd: listedDemo ? demoJsonLd(seo, demo) : '', body: listedDemo ? demoHtml(seo, demo) : '' }
        this.emitFile({ type: 'asset', fileName: `demos/${demo.slug}.html`, source: pageFrom(parts) })
      }
      for (const solution of seo.solutions) {
        const parts = { meta: metaTags(solutionMeta(site, solution)), jsonLd: solutionJsonLd(seo, solution), body: solutionHtml(seo, solution) }
        this.emitFile({ type: 'asset', fileName: `solutions/${solution.slug}.html`, source: pageFrom(parts) })
      }
      this.emitFile({ type: 'asset', fileName: 'llms.txt', source: llmsTxt(seo) })

      const listed = demos.filter((demo) => demo.listed !== false)
      const urls = [homeMeta(site).url, ...seo.solutions.map((s) => solutionMeta(site, s).url), ...listed.map((demo) => demoMeta(site, demo).url)]
      const lastmod = new Date().toISOString().slice(0, 10)
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...urls.map((url) => `  <url><loc>${escapeHtml(url)}</loc><lastmod>${lastmod}</lastmod></url>`),
          '</urlset>',
          '',
        ].join('\n'),
      })
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /stats\n\nSitemap: ${site.url}/sitemap.xml\n`,
      })

      // The demo list the AI receptionist answers from (worker/receptionist.ts reads it). Built from
      // the registry, so a new demo is known to the receptionist as soon as it is on the site.
      const knowledge = toKnowledge(listed)
      this.emitFile({
        type: 'asset',
        fileName: KNOWLEDGE_PATH.slice(1),
        source: `${JSON.stringify(knowledge)}\n`,
      })
    },
  }
}

const noFaceTracking = fileURLToPath(new URL('./src/receptionist/video/no-face-tracking.ts', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  // Root-relative asset paths, so /demos/<slug> pages load the same files as the home page.
  // The site must be served from the root of its address.
  base: '/',
  plugins: [react(), tailwindcss(), studioPages()],
  resolve: {
    alias: {
      // The video call SDK loads these only for face tracking, which the site leaves off.
      '@tensorflow/tfjs': noFaceTracking,
      '@tensorflow-models/face-landmarks-detection': noFaceTracking,
    },
  },
})
