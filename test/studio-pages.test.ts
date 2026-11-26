/* The build's page files, sitemap and receptionist knowledge (studioPages in vite.config.ts) follow the listing switch. */
import { describe, expect, it } from 'vitest'
import { studioPages } from '../vite.config'
import { ALL_DEMOS, LIST_SCHOOL_DEMO, LIST_WELLNESS_DEMO } from '../src/demos/registry'
import { KNOWLEDGE_PATH } from '../src/receptionist/protocol'

type Hook = { handler?: (...args: unknown[]) => unknown } | ((...args: unknown[]) => unknown)
const call = (hook: unknown, self: unknown, ...args: unknown[]) => {
  const h = hook as Hook
  return (typeof h === 'function' ? h : h.handler!).apply(self, args)
}

/** Runs the plugin's two build hooks on a minimal index.html and returns the files it emits. */
async function build(): Promise<Record<string, string>> {
  const plugin = studioPages()
  const files: Record<string, string> = {}
  const context = {
    emitFile: (file: { fileName: string; source: string }) => {
      files[file.fileName] = file.source
    },
    error: (message: string) => {
      throw new Error(message)
    },
  }
  const html = (await call(plugin.transformIndexHtml, context, '<html><head><!-- page-meta --></head><body></body></html>')) as string
  await call(plugin.generateBundle, context, {}, { 'index.html': { type: 'asset', source: html } })
  return files
}

describe('the built pages, sitemap and knowledge', () => {
  it('give the unlisted wellness demo a noindex page, and leave it out of the sitemap and the knowledge', async () => {
    const files = await build()
    const page = files['demos/wellness-consulting.html']
    expect(page).toBeDefined()
    expect(page.includes('<meta name="robots" content="noindex" />')).toBe(!LIST_WELLNESS_DEMO)
    expect(files['sitemap.xml'].includes('/demos/wellness-consulting<')).toBe(LIST_WELLNESS_DEMO)
    expect(files[KNOWLEDGE_PATH.slice(1)].includes('"wellness-consulting"')).toBe(LIST_WELLNESS_DEMO)
  })

  it('give the school demo a noindex page while it is unlisted, and leave it out of the sitemap and the knowledge', async () => {
    const files = await build()
    const page = files['demos/school-admissions.html']
    expect(page).toBeDefined()
    expect(page.includes('<meta name="robots" content="noindex" />')).toBe(!LIST_SCHOOL_DEMO)
    expect(files['sitemap.xml'].includes('/demos/school-admissions<')).toBe(LIST_SCHOOL_DEMO)
    expect(files[KNOWLEDGE_PATH.slice(1)].includes('"school-admissions"')).toBe(LIST_SCHOOL_DEMO)
  })

  it('list every listed demo, without noindex', async () => {
    const files = await build()
    for (const demo of ALL_DEMOS.filter((d) => d.listed !== false)) {
      expect(files['sitemap.xml'], demo.slug).toContain(`/demos/${demo.slug}<`)
      expect(files[`demos/${demo.slug}.html`], demo.slug).not.toContain('noindex')
    }
  })
})
