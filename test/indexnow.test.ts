import { describe, expect, it } from 'vitest'
import { SITE } from '../src/config/site'
// @ts-expect-error plain Node script without types
import { buildPayload, describeStatus, keyFromFileName, parseSitemap, MAX_URLS } from '../scripts/indexnow/lib.mjs'

const KEY = '0123456789abcdef0123456789abcdef'

describe('IndexNow helpers', () => {
  it('reads addresses from a sitemap and undoes XML escapes', () => {
    const xml = `<urlset><url><loc>${SITE.url}/</loc></url>\n<url><loc>${SITE.url}/a?x=1&amp;y=2</loc></url></urlset>`
    expect(parseSitemap(xml)).toEqual([`${SITE.url}/`, `${SITE.url}/a?x=1&y=2`])
    expect(parseSitemap('<urlset></urlset>')).toEqual([])
  })

  it('recognises key file names only', () => {
    expect(keyFromFileName(`${KEY}.txt`)).toBe(KEY)
    for (const name of ['robots.txt', `${KEY}.png`, `${KEY.toUpperCase()}.txt`, `${KEY}0.txt`]) {
      expect(keyFromFileName(name)).toBeNull()
    }
  })

  it('builds the payload and drops repeated addresses', () => {
    const payload = buildPayload(SITE.url, KEY, [`${SITE.url}/`, `${SITE.url}/demos/x`, `${SITE.url}/`])
    expect(payload).toEqual({
      host: new URL(SITE.url).host,
      key: KEY,
      keyLocation: `${SITE.url}/${KEY}.txt`,
      urlList: [`${SITE.url}/`, `${SITE.url}/demos/x`],
    })
  })

  it('refuses a bad key, an empty list, another host and too many addresses', () => {
    expect(() => buildPayload(SITE.url, 'nope', [`${SITE.url}/`])).toThrow()
    expect(() => buildPayload(SITE.url, KEY, [])).toThrow()
    expect(() => buildPayload(SITE.url, KEY, ['https://example.com/'])).toThrow()
    const many = Array.from({ length: MAX_URLS + 1 }, (_, i) => `${SITE.url}/p${i}`)
    expect(() => buildPayload(SITE.url, KEY, many)).toThrow()
  })

  it('explains response statuses', () => {
    for (const status of [200, 202, 400, 403, 422, 429, 500]) {
      expect(describeStatus(status).startsWith(`${status}:`)).toBe(true)
    }
  })
})
