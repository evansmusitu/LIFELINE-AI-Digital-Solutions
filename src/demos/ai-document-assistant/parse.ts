import { detectSchema } from './engine'
import type { Doc, DocSection, DocTable } from './types'

/* Turning a visitor's .csv, .md or .txt file (or pasted text) into a document the assistant can search. */

export type UploadFormat = 'csv' | 'markdown' | 'text'

export const MAX_FILE_BYTES = 300 * 1024
/** Bigger documents are kept for this visit only, so localStorage doesn't fill up. */
export const KEEP_LIMIT = 150_000

export function formatFromName(fileName: string): UploadFormat | 'unsupported' {
  const ext = /\.([a-z0-9]+)$/i.exec(fileName)?.[1].toLowerCase() ?? ''
  if (ext === 'csv' || ext === 'tsv') return 'csv'
  if (ext === 'md' || ext === 'markdown') return 'markdown'
  if (ext === 'txt' || ext === 'text') return 'text'
  return 'unsupported'
}

/** Splits CSV text into rows. Handles quoted fields with commas, "" escapes and line breaks inside quotes. */
export function splitCsv(text: string, delimiter = detectDelimiter(text)): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"' && cell.trim() === '') {
      quoted = true
      cell = ''
    } else if (ch === delimiter) {
      row.push(cell.trim())
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell.trim())
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell || row.length) {
    row.push(cell.trim())
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c !== ''))
}

function countOutsideQuotes(line: string, ch: string): number {
  let n = 0
  let quoted = false
  for (const c of line) {
    if (c === '"') quoted = !quoted
    else if (c === ch && !quoted) n++
  }
  return n
}

export function detectDelimiter(text: string): string {
  const first = text.split(/\r?\n/).find((l) => l.trim()) ?? ''
  const options = [',', ';', '\t']
  return options.reduce((best, ch) => (countOutsideQuotes(first, ch) > countOutsideQuotes(first, best) ? ch : best), ',')
}

const numeric = (cell: string) => /^[\s$£€-]*[\d,.]+\s*%?$/.test(cell)

/** CSV to a table. The first row is the header unless it looks like data (numbers or prices). */
export function parseCsv(text: string): DocTable | null {
  const raw = splitCsv(text.replace(/^\uFEFF/, ''))
  if (!raw.length) return null
  const width = Math.max(...raw.map((r) => r.length))
  const rows = raw.map((r) => [...r, ...Array<string>(width - r.length).fill('')])
  const head = rows[0]
  const textOnly = head.some((c) => c) && head.every((c) => !c || !numeric(c))
  // A single row of words is a header with no data.
  if (rows.length === 1 && textOnly) return null
  const isHeader = rows.length > 1 && textOnly
  const columns = isHeader ? head.map((c, i) => c || `Column ${i + 1}`) : head.map((_, i) => `Column ${i + 1}`)
  const body = isHeader ? rows.slice(1) : rows
  return body.length ? { columns, rows: body } : null
}

export function looksLikeCsv(text: string): boolean {
  const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 10)
  if (lines.length < 2 || lines[0].trim().startsWith('#')) return false
  const delimiter = detectDelimiter(text)
  const counts = lines.map((l) => countOutsideQuotes(l, delimiter))
  return counts[0] >= 1 && counts.filter((c) => c === counts[0]).length / counts.length >= 0.8
}

function cleanInline(line: string): string {
  return line
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/(\*\*|__|~~|`)/g, '')
    .replace(/(^|\s)[*_](\S[^*_]*\S|\S)[*_](?=\s|[.,;:!?]|$)/g, '$1$2')
    .replace(/^>\s?/, '')
    .trim()
}

const BULLET = /^\s*(?:[-*•+]|\d+[.)])\s+/

/** A short line on its own, without sentence punctuation, reads as a heading in plain text. */
function looksLikeHeading(line: string, prevBlank: boolean, next: string | undefined): boolean {
  const t = line.trim()
  if (!prevBlank || !next?.trim() || BULLET.test(t) || t.length > 60 || !/[a-z]/i.test(t)) return false
  if (/[.!?,;]$/.test(t)) return false
  return t.split(/\s+/).length <= 8
}

/** Markdown or plain text to sections: headings start sections, blank lines end paragraphs, list items stand alone. */
export function parseText(text: string, markdown: boolean): DocSection[] {
  const lines = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n')
  const hasHashHeadings = markdown && lines.some((l) => /^#{1,6}\s+\S/.test(l))
  const sections: DocSection[] = []
  let current: DocSection = { id: 's0', heading: '', paragraphs: [] }
  let paragraph = ''
  const flush = () => {
    const p = cleanInline(paragraph)
    if (p) current.paragraphs.push(p)
    paragraph = ''
  }
  const start = (heading: string) => {
    flush()
    if (current.paragraphs.length) sections.push(current)
    current = { id: `s${sections.length + 1}`, heading: cleanInline(heading.replace(/:$/, '')), paragraphs: [] }
  }
  lines.forEach((line, i) => {
    const t = line.trim()
    const prevBlank = i === 0 || !lines[i - 1].trim()
    const hash = /^#{1,6}\s+(.*?)\s*#*$/.exec(t)
    if (hash && markdown) return start(hash[1])
    if (markdown && /^(=+|-+)$/.test(lines[i + 1]?.trim() ?? '') && t && !BULLET.test(t)) return start(t)
    if (markdown && /^(=+|-{3,}|\*{3,})$/.test(t)) return flush()
    if (!t) return flush()
    if (!hasHashHeadings && looksLikeHeading(t, prevBlank, lines[i + 1])) return start(t)
    if (/^\|.*\|$/.test(t)) {
      flush()
      if (/^\|?[\s:|-]+\|?$/.test(t)) return
      paragraph = t.slice(1, -1).split('|').map((c) => c.trim()).filter(Boolean).join(' · ')
      return flush()
    }
    if (BULLET.test(t)) {
      flush()
      paragraph = t.replace(BULLET, '')
      return
    }
    paragraph = paragraph ? `${paragraph} ${t}` : t
  })
  flush()
  if (current.paragraphs.length) sections.push(current)
  return sections
}

export type UploadError = 'empty' | 'unreadable'

/** Builds the library document from a file or pasted text. */
export function docFromUpload(input: { id: string; name: string; text: string; format: UploadFormat; at: number }): Doc | UploadError {
  const { text } = input
  if (!text.trim()) return 'empty'
  const replacement = (text.match(/\uFFFD/g) ?? []).length
  if (text.includes('\u0000') || replacement > Math.max(3, text.length / 100)) return 'unreadable'
  const title = input.name.trim().slice(0, 80) || 'Your document'
  const base = { id: input.id, title, cite: title, origin: 'visitor' as const, updatedAt: input.at, enabled: true, transient: text.length > KEEP_LIMIT || undefined }
  if (input.format === 'csv') {
    const table = parseCsv(text)
    if (!table) return 'unreadable'
    const priced = detectSchema(table).price !== undefined
    return { ...base, label: priced ? 'Price list' : 'Spreadsheet', table }
  }
  const sections = parseText(text, input.format === 'markdown')
  if (!sections.length) return 'unreadable'
  return { ...base, label: 'Document', sections }
}

export function docSize(doc: Doc): string {
  if (doc.table) return `${doc.table.rows.length} ${doc.table.rows.length === 1 ? 'row' : 'rows'}`
  const sections = doc.sections ?? []
  const words = sections.reduce((n, s) => n + s.paragraphs.join(' ').split(/\s+/).length, 0)
  const pages = Math.max(1, Math.ceil(words / 450))
  return `${pages} ${pages === 1 ? 'page' : 'pages'} · ${sections.length} ${sections.length === 1 ? 'section' : 'sections'}`
}
