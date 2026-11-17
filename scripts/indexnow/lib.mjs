/*
 * Pure helpers for scripts/indexnow.mjs, kept apart so tests can run them without the network.
 */

export const ENDPOINT = 'https://api.indexnow.org/indexnow'
export const MAX_URLS = 10000
const KEY_PATTERN = /^[a-f0-9]{32}$/

/** The address of every <loc> in a sitemap, in order, with XML escapes undone. */
export function parseSitemap(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) =>
    m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&'),
  )
}

/** The key from the name of a public/<key>.txt file, or null when the name is not a key. */
export function keyFromFileName(name) {
  const key = name.replace(/\.txt$/, '')
  return name.endsWith('.txt') && KEY_PATTERN.test(key) ? key : null
}

/** The body IndexNow expects. Throws when the key or the list cannot be used. */
export function buildPayload(siteUrl, key, urls) {
  if (!KEY_PATTERN.test(key)) throw new Error('The key must be 32 lowercase hex characters')
  const site = new URL(siteUrl)
  const list = [...new Set(urls)]
  if (list.length === 0) throw new Error('There are no pages to submit')
  if (list.length > MAX_URLS) throw new Error(`IndexNow takes at most ${MAX_URLS} addresses per request`)
  for (const url of list) {
    if (new URL(url).host !== site.host) throw new Error(`${url} is not on ${site.host}`)
  }
  return { host: site.host, key, keyLocation: `${site.origin}/${key}.txt`, urlList: list }
}

/** Plain-words meaning of an IndexNow response status. */
export function describeStatus(status) {
  switch (status) {
    case 200:
      return '200: accepted. The search engines have the addresses.'
    case 202:
      return '202: accepted. The key file will be checked shortly, so make sure it is live.'
    case 400:
      return '400: the request was malformed. Check the payload.'
    case 403:
      return '403: the key was not accepted. The key file is missing or does not contain the key.'
    case 422:
      return '422: the addresses do not belong to the host, or the key does not match.'
    case 429:
      return '429: too many requests. Wait before trying again.'
    default:
      return `${status}: unexpected response.`
  }
}
