#!/usr/bin/env node
/*
 * Tells Bing, Yandex and other IndexNow search engines which pages are new or changed. Google does
 * not use IndexNow: submit sitemap.xml in Search Console instead (see the README).
 *
 *   npm run indexnow -- --dry-run     show what would be sent, send nothing
 *   npm run indexnow                  read dist/sitemap.xml (run `npm run build` first), then send
 *   npm run indexnow -- --live        read the sitemap from the live site, then send
 *
 * The key is the name of the .txt file in public/. It is public by design: search engines fetch
 * <site>/<key>.txt to confirm the site owner sent the request.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { buildPayload, describeStatus, ENDPOINT, keyFromFileName, parseSitemap } from './indexnow/lib.mjs'

const root = new URL('../', import.meta.url)
const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const live = args.has('--live')

function fail(message) {
  console.error(`indexnow: ${message}`)
  process.exit(1)
}

const siteSource = readFileSync(new URL('src/config/site.ts', root), 'utf8')
const siteUrl = /\burl:\s*'(https?:\/\/[^']+)'/.exec(siteSource)?.[1]
if (!siteUrl) fail('could not read the site address from src/config/site.ts')

const keys = readdirSync(new URL('public/', root)).map(keyFromFileName).filter(Boolean)
if (keys.length !== 1) fail(`expected one <key>.txt file in public/, found ${keys.length}`)
const [key] = keys

let xml
try {
  xml = live ? await (await fetch(`${siteUrl}/sitemap.xml`)).text() : readFileSync(new URL('dist/sitemap.xml', root), 'utf8')
} catch {
  fail(live ? 'could not fetch the live sitemap' : 'dist/sitemap.xml not found. Run `npm run build` first, or use --live')
}

const payload = buildPayload(siteUrl, key, parseSitemap(xml))

if (dryRun) {
  console.log(`Dry run: nothing is sent to ${ENDPOINT}`)
  console.log(JSON.stringify(payload, null, 2))
  process.exit(0)
}

const keyCheck = await fetch(payload.keyLocation).catch(() => null)
if (!keyCheck || !keyCheck.ok || (await keyCheck.text()).trim() !== key) {
  fail(`${payload.keyLocation} does not answer with the key yet. Deploy first, then run this again.`)
}

const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(payload),
})
console.log(`Sent ${payload.urlList.length} addresses.`)
console.log(describeStatus(res.status))
process.exit(res.status === 200 || res.status === 202 ? 0 : 1)
