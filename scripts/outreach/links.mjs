#!/usr/bin/env node
/*
 * Outreach link builder. Reads a CSV (business name, demo slug, ref tag) and prints, for each row,
 * a personalised demo link and a short WhatsApp-ready message.
 *
 *   node scripts/outreach/links.mjs scripts/outreach/prospects.example.csv
 *
 * No dependencies. The site address, demo slugs and ref tags are read from the source files, so
 * nothing is copied here. The name rules mirror src/lib/business-name.ts (a test keeps them in sync).
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = new URL('../../', import.meta.url)
const read = (path) => readFileSync(new URL(path, root), 'utf8')

export const MAX_BUSINESS_NAME = 40
const ALLOWED = /^[\p{L}\p{M}\p{N} '’&.,!()-]+$/u
const HAS_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u

/** Same rules as parseBusinessName in src/lib/business-name.ts: a clean name, or null. */
export function cleanName(raw) {
  if (!raw) return null
  const name = raw.replace(/\s+/g, ' ').trim()
  if (!name || name.length > MAX_BUSINESS_NAME) return null
  if (!ALLOWED.test(name) || !HAS_LETTER_OR_DIGIT.test(name)) return null
  return name
}

/** Why a name would not be used on the site, or null when it is fine as typed. */
export function nameProblem(raw) {
  const name = cleanName(raw)
  if (name === null) {
    const trimmed = (raw ?? '').replace(/\s+/g, ' ').trim()
    if (!trimmed) return 'name is empty'
    if (trimmed.length > MAX_BUSINESS_NAME) return `name is longer than ${MAX_BUSINESS_NAME} characters, the site would ignore it`
    return 'name has characters the site does not allow, it would be ignored'
  }
  if (name !== raw) return `extra spaces will be tidied to "${name}"`
  return null
}

/** Parse CSV text (header row first) into rows of fields. Handles quoted fields, commas and "" escapes. */
export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  const src = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.some((f) => f.trim() !== '')) rows.push(row)
      row = []
    } else field += c
  }
  row.push(field)
  if (row.some((f) => f.trim() !== '')) rows.push(row)
  return rows.slice(1).map((r) => r.map((f) => f.trim()))
}

/** Encode for a query string. Apostrophes become %27 so the link survives chat apps. */
export function encodeValue(value) {
  return encodeURIComponent(value).replace(/'/g, '%27').replace(/[!()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
}

/** The site address, demo slugs and ref tags, read from the source files. */
export function loadConfig() {
  const url = /url:\s*'(https?:\/\/[^']+)'/.exec(read('src/config/site.ts'))?.[1]
  const slugs = [...read('src/demos/registry.ts').matchAll(/^\s*slug:\s*'([^']+)'/gm)].map((m) => m[1])
  const tagList = /REF_TAGS\s*=\s*\[([^\]]*)\]/.exec(read('src/lib/count-events.ts'))?.[1] ?? ''
  const refTags = [...tagList.matchAll(/'([^']+)'/g)].map((m) => m[1])
  if (!url || slugs.length === 0 || refTags.length === 0) throw new Error('Could not read the site address, demo slugs or ref tags from the source files.')
  return { baseUrl: url.replace(/\/+$/, ''), slugs, refTags }
}

/** Build the link and message for one row. Returns { link, message, warnings, errors }. */
export function buildRow([name = '', slug = '', ref = ''], config) {
  const warnings = []
  const errors = []
  const problem = nameProblem(name)
  const usable = cleanName(name)
  if (problem) (usable ? warnings : errors).push(problem)
  if (!config.slugs.includes(slug)) errors.push(`unknown demo "${slug}" (use one of: ${config.slugs.join(', ')})`)
  const tag = ref.toLowerCase()
  if (!config.refTags.includes(tag)) errors.push(`unknown ref tag "${ref}" (use one of: ${config.refTags.join(', ')})`)
  if (errors.length) return { link: null, message: null, warnings, errors }
  const link = `${config.baseUrl}/demos/${slug}?for=${encodeValue(usable)}&ref=${tag}`
  const what = slug === 'whatsapp-ordering' ? 'your menu' : 'your business'
  const message =
    `Hi ${usable}, this is Evans from LIFELINE. I made a sample of how ${what} could work on WhatsApp, ` +
    `with an AI receptionist answering customers. It uses invented items and sample data, so nothing is real yet: ${link}`
  return { link, message, warnings, errors }
}

function main(path) {
  if (!path) {
    console.error('Usage: node scripts/outreach/links.mjs <prospects.csv>')
    return 1
  }
  const config = loadConfig()
  const rows = parseCsv(readFileSync(path, 'utf8'))
  let failed = 0
  rows.forEach((row, i) => {
    const result = buildRow(row, config)
    console.log(`#${i + 1} ${row[0] || '(no name)'}`)
    for (const w of result.warnings) console.log(`  warning: ${w}`)
    for (const e of result.errors) console.log(`  error: ${e}`)
    if (result.errors.length) failed++
    else console.log(`  link: ${result.link}\n  message: ${result.message}`)
    console.log('')
  })
  return failed ? 1 : 0
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exitCode = main(process.argv[2])
