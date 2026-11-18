import { describe, expect, it } from 'vitest'
import { BY_TAGS, REF_TAGS } from '../src/lib/count-events'
import { parseBusinessName } from '../src/lib/business-name'
import { SITE } from '../src/config/site'
import { DEMOS } from '../src/demos/registry'
// @ts-expect-error plain Node script without types
import { buildRow, cleanName, encodeValue, loadConfig, nameProblem, parseCsv } from '../scripts/outreach/links.mjs'

const config = loadConfig()

describe('outreach link builder', () => {
  it('reads the address, demos and tags from the source, in sync with the site', () => {
    expect(config.baseUrl).toBe(SITE.url)
    expect(config.slugs).toEqual(DEMOS.map((d) => d.slug))
    expect(config.refTags).toEqual([...REF_TAGS])
    expect(config.byTags).toEqual([...BY_TAGS])
  })

  it('applies the same name rules as the site', () => {
    for (const raw of ["Mama's Kitchen", 'Café  Olé', '<script>', '', '...', 'x'.repeat(41), 'a\u0007b', 'Glow & Shine (Avondale)']) {
      expect(cleanName(raw)).toBe(parseBusinessName(raw))
    }
  })

  it('explains names that would be tidied or ignored', () => {
    expect(nameProblem("Mama's Kitchen")).toBeNull()
    expect(nameProblem('Mama   Kitchen')).toMatch(/tidied/)
    expect(nameProblem('<b>x</b>')).toMatch(/not allow/)
    expect(nameProblem('x'.repeat(41))).toMatch(/longer/)
    expect(nameProblem('')).toMatch(/empty/)
  })

  it('parses quoted fields, commas, escaped quotes and CRLF', () => {
    const rows = parseCsv('a,b,c\r\n"Sweet, Crumbs",whatsapp-ordering,walk-in\r\n"Say ""hi""",x,y\r\n\r\n')
    expect(rows).toEqual([
      ['Sweet, Crumbs', 'whatsapp-ordering', 'walk-in'],
      ['Say "hi"', 'x', 'y'],
    ])
  })

  it('encodes values for a query string', () => {
    expect(encodeValue("Mama's Kitchen")).toBe('Mama%27s%20Kitchen')
    expect(encodeValue('Glow & Shine')).toBe('Glow%20%26%20Shine')
  })

  it('builds a link and message', () => {
    const r = buildRow(["Mama's Kitchen", 'whatsapp-ordering', 'Walk-In'], config)
    expect(r.errors).toEqual([])
    expect(r.link).toBe(`${SITE.url}/demos/whatsapp-ordering?for=Mama%27s%20Kitchen&ref=walk-in`)
    expect(r.message).toContain(r.link)
    expect(r.message).toContain('invented')
  })

  it('rejects unknown demos, tags and unusable names', () => {
    expect(buildRow(['A', 'nope', 'walk-in'], config).errors[0]).toMatch(/unknown demo/)
    expect(buildRow(['A', 'whatsapp-ordering', 'garbage'], config).errors[0]).toMatch(/unknown ref tag/)
    expect(buildRow(['<b>', 'whatsapp-ordering', 'walk-in'], config).link).toBeNull()
  })

  it('adds a validated by tag, and allows it to be empty', () => {
    const r = buildRow(["Mama's Kitchen", 'whatsapp-ordering', 'walk-in', 'Team-B'], config)
    expect(r.errors).toEqual([])
    expect(r.link).toBe(`${SITE.url}/demos/whatsapp-ordering?for=Mama%27s%20Kitchen&ref=walk-in&by=team-b`)
    expect(buildRow(['A', 'whatsapp-ordering', 'walk-in', ''], config).link).not.toContain('by=')
    expect(buildRow(['A', 'whatsapp-ordering', 'walk-in'], config).link).not.toContain('by=')
    const bad = buildRow(['A', 'whatsapp-ordering', 'walk-in', 'team-z'], config)
    expect(bad.link).toBeNull()
    expect(bad.errors[0]).toMatch(/unknown by tag/)
  })

  it('warns when a name is tidied', () => {
    const r = buildRow(['Mama   Kitchen', 'whatsapp-ordering', 'status'], config)
    expect(r.warnings).toHaveLength(1)
    expect(r.link).toContain('for=Mama%20Kitchen')
  })
})
