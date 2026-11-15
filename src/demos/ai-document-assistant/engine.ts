import { money, moneyWhole, round2 } from '../../lib/format'
import { SOFT, editDistance, expansions, isStop, splitSentences, stem, tokenize, wordSpans } from './text'
import type { Answer, DeliveryRules, Doc, DocTable, Source, Topic, Zone } from './types'

/*
 * The document "AI". In the demo, keyword search (BM25 with synonyms and typo fixes) finds the best
 * passage, and small rules read prices, quantities and delivery zones. It never answers without a source.
 * A real build uses an AI model that reads every page and still cites where each answer came from.
 */

/* Price lists */

export interface TableSchema {
  name: number
  price?: number
  priceHeader?: string
  bulk?: number
  bulkMin?: number
  unit?: number
  stock?: number
  code?: number
}

export interface PriceItem {
  name: string
  code?: string
  price: number
  bulkPrice?: number
  bulkMin?: number
  bulkLabel?: string
  /** What one "price each" buys: bag, sheet, block. Undefined for "each". */
  noun?: string
  /** "per day" when the price column says so. */
  per?: string
  palletQty?: number
  packQty?: number
  stock: 'in' | 'low' | 'out' | 'unknown'
  stockText?: string
}

const MONEY = /(?:[$£€]\s*)(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?|(\d{1,3}(?:,\d{3})+|\d+)\.(\d{2})\b/

/** "$7.85", "£12", "1,250.00" to a number. Cells without a price give null. */
export function parseMoney(cell: string): number | null {
  const m = MONEY.exec(cell)
  if (!m) {
    const bare = /^\s*(\d{1,6})\s*$/.exec(cell)
    return bare ? Number(bare[1]) : null
  }
  const whole = (m[1] ?? m[3]).replace(/,/g, '')
  const cents = m[2] ?? m[4] ?? '0'
  return Number(`${whole}.${cents.padEnd(2, '0')}`)
}

const isPriceHeader = (h: string) => /price|cost|amount|rate|each|fee|charge|[$£€]|\b(usd|gbp|eur)\b/i.test(h)
const isBulkHeader = (h: string) => /\d+\s*\+|\bbulk\b|\btrade\b|\bpallet\b|wholesale|or more/i.test(h)

/** Works out which column is the product name, the price, the bulk price, the pack and the stock. */
export function detectSchema(table: DocTable): TableSchema {
  const { columns, rows } = table
  const pricey = (i: number) => {
    const cells = rows.map((r) => r[i] ?? '').filter((c) => c.trim() && c.trim() !== '–' && c.trim() !== '-')
    return cells.length > 0 && cells.filter((c) => parseMoney(c) !== null).length / cells.length >= 0.6
  }
  const find = (re: RegExp, skip: number[] = []) => columns.findIndex((h, i) => !skip.includes(i) && re.test(h))
  const priceCols = columns.map((_, i) => i).filter((i) => isPriceHeader(columns[i]) && pricey(i))
  let price: number | undefined = priceCols.find((i) => !isBulkHeader(columns[i])) ?? priceCols[0]
  if (price === undefined) {
    // No price header: take a column whose values look like money with a currency sign or cents.
    const guess = columns.findIndex((_, i) => rows.some((r) => MONEY.test(r[i] ?? '')) && pricey(i))
    price = guess >= 0 ? guess : undefined
  }
  const bulk = priceCols.find((i) => i !== price && isBulkHeader(columns[i]))
  const minMatch = bulk !== undefined ? /(\d+)\s*(?:\+|or more)/i.exec(columns[bulk]) : null
  const used = [price, bulk].filter((i): i is number => i !== undefined)
  let name = find(/\b(product|item|name|description|service|title|material)\b/i, used)
  if (name < 0) name = columns.findIndex((_, i) => !used.includes(i) && rows.some((r) => /[a-z]{3}/i.test(r[i] ?? '')))
  const code = find(/\b(code|sku|ref|part|id)\b/i, [...used, name])
  const unit = find(/\b(unit|pack|size|per|uom|sold)\b/i, [...used, name, code])
  const stock = find(/stock|availab|status|on hand/i, [...used, name, code, unit])
  return {
    name: Math.max(0, name),
    price,
    priceHeader: price !== undefined ? columns[price] : undefined,
    bulk,
    bulkMin: minMatch ? Number(minMatch[1]) : bulk !== undefined ? 50 : undefined,
    unit: unit >= 0 ? unit : undefined,
    stock: stock >= 0 ? stock : undefined,
    code: code >= 0 ? code : undefined,
  }
}

const NOUNS = ['bulk bag', 'bag', 'block', 'brick', 'sheet', 'length', 'roll', 'box', 'tube', 'can', 'tile', 'slab', 'tub', 'kg', 'metre', 'pack', 'pallet', 'tonne']

function readStock(cell: string | undefined): Pick<PriceItem, 'stock' | 'stockText'> {
  if (cell === undefined || !cell.trim()) return { stock: 'unknown' }
  const c = cell.trim().toLowerCase()
  const back = /back (?:on|in)[^·;]*/i.exec(cell)?.[0].trim()
  if (/out of stock|sold out|unavailable|^no$|^n$|^0$|none/.test(c)) return { stock: 'out', stockText: back }
  if (/low/.test(c)) return { stock: 'low' }
  if (/in stock|^yes$|^y$|available/.test(c) || Number(c) > 0) return { stock: 'in' }
  return { stock: 'unknown', stockText: cell.trim() }
}

export function rowItem(row: string[], schema: TableSchema): PriceItem | undefined {
  if (schema.price === undefined) return undefined
  const price = parseMoney(row[schema.price] ?? '')
  const name = (row[schema.name] ?? '').trim()
  if (price === null || !name) return undefined
  const pack = schema.unit !== undefined ? (row[schema.unit] ?? '') : ''
  const lower = pack.toLowerCase()
  const count = (re: RegExp) => {
    const m = re.exec(lower) ?? re.exec(name.toLowerCase())
    return m ? Number(m[1].replace(/,/g, '')) : undefined
  }
  const unitPart = lower.split('·')[0]
  const noun = NOUNS.find((n) => new RegExp(`\\b${n}\\b`).test(unitPart))
  const palletQty = count(/(\d[\d,]*)\s+(?:to|per|on)\s+a\s+pallet|pallet of (\d[\d,]*)/)
  const packQty = count(/(\d[\d,]*)\s+(?:to|per|in)\s+a\s+pack/)
  const bulkCell = schema.bulk !== undefined ? (row[schema.bulk] ?? '') : ''
  const bulkPrice = parseMoney(bulkCell) ?? undefined
  const byPallet = /pallet/i.test(bulkCell) && palletQty !== undefined
  const perHeader = /\bper\s+(day|week|hour|month|metre|m|kg|tonne|sheet|bag|item|unit)\b/i.exec(schema.priceHeader ?? '')
  return {
    name,
    per: perHeader ? `per ${perHeader[1].toLowerCase()}` : undefined,
    code: schema.code !== undefined ? row[schema.code]?.trim() || undefined : undefined,
    price,
    bulkPrice,
    bulkMin: bulkPrice === undefined ? undefined : byPallet ? palletQty : (schema.bulkMin ?? 50),
    bulkLabel: bulkPrice === undefined ? undefined : byPallet ? 'pallet price' : `${schema.bulkMin ?? 50}+ price`,
    noun: noun === 'pack' || noun === 'pallet' ? undefined : noun,
    palletQty,
    packQty,
    ...readStock(schema.stock !== undefined ? row[schema.stock] : undefined),
  }
}

/* Index */

export interface Passage {
  id: string
  docId: string
  docTitle: string
  cite: string
  kind: 'row' | 'section'
  label: string
  text: string
  len: number
  tf: Map<string, number>
  item?: PriceItem
  /** Product name (and code) tokens, for rows. */
  nameTokens?: Set<string>
  nameOnly?: Set<string>
}

export interface SearchIndex {
  passages: Passage[]
  df: Map<string, number>
  avgLen: number
  /** Known tokens, most common first, for typo fixes. */
  vocab: string[]
  docIds: Set<string>
}

function counts(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>()
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1)
  return tf
}

/**
 * A section becomes one passage, or several of about 70 words when it is long.
 * Paragraphs stay whole unless a single paragraph is very long, then it is cut at sentence ends.
 */
function chunk(paragraphs: string[]): string[] {
  const out: string[] = []
  let current = ''
  const words = (t: string) => t.split(/\s+/).filter(Boolean).length
  const add = (piece: string) => {
    if (current && words(current) + words(piece) > 70) {
      out.push(current)
      current = piece
    } else current = current ? `${current} ${piece}` : piece
  }
  for (const paragraph of paragraphs) {
    if (words(paragraph) <= 90) add(paragraph)
    else splitSentences(paragraph).forEach(add)
  }
  if (current) out.push(current)
  return out
}

function docPassages(doc: Doc): Omit<Passage, 'len'>[] {
  const base = { docId: doc.id, docTitle: doc.title, cite: doc.cite }
  if (doc.table) {
    const schema = detectSchema(doc.table)
    return doc.table.rows.map((row, i) => {
      const label = (row[schema.name] ?? '').trim() || `Row ${i + 1}`
      const fields = doc.table!.columns.map((col, c) => [col, (row[c] ?? '').trim()] as const).filter(([, v]) => v)
      const nameTokens = tokenize(label)
      const codeTokens = schema.code !== undefined ? tokenize(row[schema.code] ?? '') : []
      const other = fields
        .filter(([col], c) => c !== schema.name && c !== schema.price && c !== schema.bulk && Boolean(col))
        .map(([, v]) => v)
      return {
        ...base,
        id: `${doc.id}:r${i}`,
        kind: 'row' as const,
        label,
        text: fields.map(([col, v]) => `${col}: ${v}`).join(' · '),
        tf: counts([...nameTokens, ...nameTokens, ...codeTokens, ...tokenize(other.join(' '))]),
        item: rowItem(row, schema),
        nameTokens: new Set([...nameTokens, ...codeTokens]),
        nameOnly: new Set(nameTokens),
      }
    })
  }
  return (doc.sections ?? []).flatMap((section) => {
    const heading = tokenize(section.heading)
    return chunk(section.paragraphs).map((text, i) => ({
      ...base,
      id: `${doc.id}:${section.id}:${i}`,
      kind: 'section' as const,
      label: section.heading || doc.title,
      text,
      // Headings say what a section is about, so they count twice.
      tf: counts([...heading, ...heading, ...tokenize(text)]),
    }))
  })
}

export function indexDocuments(docs: Doc[]): SearchIndex {
  const passages: Passage[] = docs
    .filter((d) => d.enabled)
    .flatMap(docPassages)
    .map((p) => ({ ...p, len: [...p.tf.values()].reduce((a, b) => a + b, 0) }))
  const df = new Map<string, number>()
  for (const p of passages) for (const t of p.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1)
  return {
    passages,
    df,
    avgLen: passages.length ? passages.reduce((s, p) => s + p.len, 0) / passages.length : 1,
    vocab: [...df.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t),
    docIds: new Set(docs.filter((d) => d.enabled).map((d) => d.id)),
  }
}

/* Search */

export interface QueryTerm {
  token: string
  alts: string[]
  soft: boolean
  /** The word as typed, when a typo was fixed. */
  typed?: string
}

function idf(index: SearchIndex, token: string): number {
  const n = index.passages.length
  const df = index.df.get(token) ?? 0
  // Words no document uses at all count extra: the documents probably don't cover the question.
  return Math.log(1 + (n - df + 0.5) / (df + 0.5)) * (df === 0 ? 1.25 : 1)
}

/** Fixes a typo when a known word is one letter away (two for long words). */
function fixTypo(token: string, index: SearchIndex): string | undefined {
  if (index.df.has(token) || /\d/.test(token) || token.length < 5) return undefined
  const cap = token.length >= 8 ? 2 : 1
  return index.vocab.find((v) => !/\d/.test(v) && v.length >= 4 && editDistance(token, v, cap) <= cap)
}

export function queryTerms(text: string, index: SearchIndex): QueryTerm[] {
  const seen = new Set<string>()
  const terms: QueryTerm[] = []
  for (const raw of tokenize(text)) {
    const fixed = fixTypo(raw, index)
    const token = fixed ?? raw
    if (seen.has(token)) continue
    seen.add(token)
    terms.push({ token, alts: expansions(token).filter((a) => a !== token), soft: SOFT.has(token), typed: fixed ? raw : undefined })
  }
  return terms
}

export interface Hit {
  passage: Passage
  score: number
  /** Share of the question's weight this passage matches (0 to 1). */
  coverage: number
  matched: string[]
}

/** How strongly a passage contains a term: 1 for the word itself, 0.8 for a synonym. */
function termIn(term: QueryTerm, has: (t: string) => boolean): { weight: number; token?: string } {
  if (has(term.token)) return { weight: 1, token: term.token }
  const alt = term.alts.find(has)
  return alt ? { weight: 0.8, token: alt } : { weight: 0 }
}

export function search(terms: QueryTerm[], index: SearchIndex, docId?: string): Hit[] {
  const k1 = 1.2
  const b = 0.75
  const hard = terms.filter((t) => !t.soft)
  const weighted = hard.length ? hard : terms
  const total = weighted.reduce((s, t) => s + idf(index, t.token), 0)
  const hits: Hit[] = []
  for (const p of index.passages) {
    if (docId && p.docId !== docId) continue
    let score = 0
    let covered = 0
    const matched: string[] = []
    for (const term of terms) {
      const { weight, token } = termIn(term, (t) => p.tf.has(t))
      if (!token) continue
      const tf = p.tf.get(token) ?? 0
      const w = idf(index, term.token)
      // Scaffolding words like "price" only nudge the score.
      const soft = term.soft && hard.length ? 0.3 : 1
      score += soft * weight * w * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * p.len) / index.avgLen)))
      if (weighted.includes(term)) covered += weight * w
      matched.push(token)
    }
    if (score > 0) hits.push({ passage: p, score, coverage: total ? covered / total : 0, matched })
  }
  return hits.sort((x, y) => y.score - x.score)
}

/* Reading the question */

export interface Quantity {
  count: number
  unit?: string
}

const WORD_NUMBERS: Record<string, number> = Object.fromEntries([
  ...'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'
    .split(' ')
    .map((w, i) => [w, i + 1]),
  ...'thirty forty fifty sixty seventy eighty ninety'.split(' ').map((w, i) => [w, 30 + i * 10]),
  ['hundred', 100],
])
const NUMBER_WORDS = new RegExp(`\\b(${Object.keys(WORD_NUMBERS).join('|')})\\b`, 'g')

const UNITS = 'bulk bags?|pallets?|packs?|bags?|sheets?|lengths?|rolls?|box(?:es)?|tubes?|cans?|tiles?|slabs?|blocks?|bricks?|tubs?'
const QTY_WITH_UNIT = new RegExp(
  `\\b(\\d{1,5}|an?|couple of|dozen)\\s+(?:(?:[a-z][a-z’'-]*|\\d+(?:\\.\\d+)?\\s?(?:mm|kg|m))\\s+){0,2}?(${UNITS})\\b`,
)
const BARE_QTY =
  /(?<![\d.,$£€:×x/-])(?<!\b(?:type|class|grade|zone|no|number|size|day|the)\s)\b(\d{1,5})\b(?!\s*(?:mm|cm|m\b|kg|g\b|ml|l\b|ft|n\b|%|:|[.,]\d|x\s*\d|×|miles?|days?|hours?|months?|years?|weeks?|working|am\b|pm\b|th\b|st\b|nd\b|rd\b|°))/

function normalise(question: string): string {
  return question
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\ba couple of\b/g, '2')
    .replace(/\ba dozen\b/g, '12')
    .replace(NUMBER_WORDS, (w) => String(WORD_NUMBERS[w]))
}

/** "40 bags", "a pallet", "3 pallets", "twenty sheets". Sizes like "100 mm" or "47 × 100" are not quantities. */
export function parseQuantity(question: string): { qty?: Quantity; rest: string } {
  const text = normalise(question)
  const withUnit = QTY_WITH_UNIT.exec(text)
  if (withUnit) {
    const word = withUnit[1]
    const count = /^\d/.test(word) ? Number(word) : word === 'dozen' ? 12 : word.startsWith('couple') ? 2 : 1
    const unit = withUnit[2] === 'boxes' ? 'box' : withUnit[2].replace(/s$/, '')
    const rest = /^\d/.test(word) ? text.slice(0, withUnit.index) + text.slice(withUnit.index + word.length) : text
    return count > 0 ? { qty: { count, unit }, rest } : { rest }
  }
  const bare = BARE_QTY.exec(text)
  if (bare && Number(bare[1]) > 0) {
    return { qty: { count: Number(bare[1]) }, rest: text.slice(0, bare.index) + text.slice(bare.index + bare[1].length) }
  }
  return { rest: text }
}

export function findPlace(question: string, rules: DeliveryRules) {
  const text = ` ${question.toLowerCase().replace(/[-’']/g, ' ').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ')} `
  const keys = Object.keys(rules.places).sort((a, b) => b.length - a.length)
  const exact = keys.find((k) => text.includes(` ${k} `))
  if (exact) return { key: exact, ...rules.places[exact] }
  // Typos in longer place names: "Stockprt".
  const words = text.trim().split(' ')
  const near = keys.find((k) => !k.includes(' ') && k.length >= 6 && words.some((w) => w.length >= 5 && editDistance(w, k, 1) <= 1))
  return near ? { key: near, ...rules.places[near] } : undefined
}

const has = (re: RegExp, text: string) => re.test(text)
const PRICE_WORDS = /\b(how much|pric(e|es|ed|ing)|costs?|quote|total|cheapest|rate)\b|[$£]/
const STOCK_WORDS = /\b(in stock|stock|stocked|available|availability|got any|have any|do you (?:have|sell|stock|carry|do)|sell)\b/
const POLICY_WORDS = /\b(return(s|ed)?|refunds?|exchange|take back|bring back|account|credit|discount|deposit|damaged|broken|terms|apply|(un)?opened)\b/
const SATURDAY = /\b(saturdays?|sat|weekends?)\b/
const SUNDAY = /\bsundays?\b/
const DELIVERY_WORDS = /\b(deliver\w*|drop off)\b/
export const HANDOFF_WORDS = /\b(order(s|ing)?|quotes?|send me|book(ing)?|reserve)\b/

/** Words that say what kind of question it is, rather than which product. */
const NOT_PRODUCT = new Set(
  `price cost charge fee stock available availability quote total deliver order send rate cheapest saturday sunday
  today tomorrow week zone collect pallet pack bag bulk sheet length roll box tube can tub unit item piece lot load
  site urgent next day morning afternoon`
    .split(/\s+/)
    .filter(Boolean)
    .map(stem),
)

/* Answers */

export interface AnswerOptions {
  rules?: DeliveryRules
  /** The product picked from a "Which one?" question. */
  rowId?: string
  /** Possessive business name for "I couldn't find that in …’s documents". */
  owner?: string
}

const THRESHOLD = 0.6

const topicForDoc = (docId: string): Topic =>
  (({ prices: 'Prices', delivery: 'Delivery', returns: 'Returns', accounts: 'Accounts' }) as Record<string, Topic>)[docId] ?? 'Other'

export function topicFromWords(question: string): Topic {
  const q = question.toLowerCase()
  if (/stock|available/.test(q)) return 'Stock'
  if (/deliver|collect|saturday|open|close/.test(q)) return 'Delivery'
  if (/return|refund|exchange|damaged/.test(q)) return 'Returns'
  if (/account|credit|discount|pay|invoice/.test(q)) return 'Accounts'
  if (/price|cost|how much|quote/.test(q)) return 'Prices'
  return 'Other'
}

function toSource(p: Passage, terms: string[]): Source {
  return { passageId: p.id, docId: p.docId, docTitle: p.docTitle, cite: p.cite, label: p.label, kind: p.kind, text: p.text, terms: [...new Set(terms)] }
}

/** "a bag", "per day" (from a "Price per day" column) or "each". */
const per = (item: PriceItem) => (item.noun ? `a ${item.noun}` : (item.per ?? 'each'))

const plural = (noun: string, n: number) => (n === 1 ? noun : noun.endsWith('x') ? `${noun}es` : `${noun}s`)

function stockSentence(item: PriceItem): string {
  if (item.stock === 'out') return item.stockText ? `Out of stock, ${item.stockText}.` : 'Out of stock.'
  if (item.stock === 'low') return 'Low stock, so it’s worth checking before you set off.'
  if (item.stock === 'in') return 'In stock.'
  return item.stockText ? `Stock: ${item.stockText}.` : ''
}

function bulkSentence(item: PriceItem): string {
  if (item.bulkPrice === undefined || item.bulkMin === undefined) return ''
  return item.bulkLabel === 'pallet price'
    ? `By the full pallet (${item.bulkMin}) it’s ${money(item.bulkPrice)} each.`
    : `From ${item.bulkMin} it’s ${money(item.bulkPrice)} each.`
}

const zoneOf = (rules: DeliveryRules, id: string): Zone | undefined => rules.zones.find((z) => z.id === id)

const readFlags = (text: string) => ({
  saturday: has(SATURDAY, text),
  sunday: has(SUNDAY, text),
  delivery: has(DELIVERY_WORDS, text),
  price: has(PRICE_WORDS, text),
  stock: has(STOCK_WORDS, text),
})
type Flags = ReturnType<typeof readFlags>

type Place = ReturnType<typeof findPlace>

const placeTerms = (place: NonNullable<Place>) => tokenize(place.key)

/** The passage in the delivery policy that covers a place or a rule. */
function deliveryPassage(index: SearchIndex, rules: DeliveryRules, words: string): Hit | undefined {
  return search(queryTerms(words, index), index, rules.docId)[0]
}

function priceAnswer(
  passage: Passage,
  qty: Quantity | undefined,
  place: Place,
  flags: Flags,
  index: SearchIndex,
  rules: DeliveryRules | undefined,
  terms: QueryTerm[],
  alternatives: Passage[],
): Answer {
  const item = passage.item!
  const sources: Source[] = [toSource(passage, terms.flatMap((t) => termIn(t, (x) => passage.tf.has(x)).token ?? []))]
  const working: string[] = []
  const notes: string[] = []
  const noun = item.noun
  let text = ''
  let short = ''
  let lead = ''
  let hint = ''
  let delivered = ''
  let total: number | undefined
  let palletised = false

  if (!qty) {
    const each = `${item.name} is ${money(item.price)} ${per(item)}.`
    if (flags.stock && !flags.price) {
      const stockLead =
        item.stock === 'out'
          ? `${item.name} is out of stock${item.stockText ? `, ${item.stockText}` : ''}.`
          : item.stock === 'unknown'
            ? each
            : `Yes, ${item.name} is ${item.stock === 'low' ? 'in stock, but running low' : 'in stock'}.`
      text = item.stock === 'unknown' ? stockLead : `${stockLead} It’s ${money(item.price)} ${per(item)}.`
      short = stockLead
    } else {
      text = [each, bulkSentence(item), stockSentence(item)].filter(Boolean).join(' ')
      short = [each, stockSentence(item)].filter(Boolean).join(' ')
    }
  } else {
    let units = qty.count
    let phrase: string
    const per = qty.unit === 'pallet' ? item.palletQty : qty.unit === 'pack' ? item.packQty : undefined
    const itemNoun = noun ?? 'item'
    if ((qty.unit === 'pallet' || qty.unit === 'pack') && per) {
      units = qty.count * per
      palletised = qty.unit === 'pallet'
      phrase = `${qty.count} ${plural(qty.unit, qty.count)} of ${item.name} (${units} ${plural(itemNoun, units)})`
      working.push(`${qty.count} ${plural(qty.unit, qty.count)} × ${per} = ${units} ${plural(itemNoun, units)}`)
    } else {
      if (qty.unit === 'pallet' || qty.unit === 'pack') {
        notes.push(`The price list doesn’t say how many come in a ${qty.unit}, so this is for ${qty.count} ${plural(itemNoun, qty.count)}.`)
      }
      // "40 bags of Portland cement", but "100 × Facing bricks" when the name already says what it is.
      const named = noun && new RegExp(`\\b${noun}`, 'i').test(item.name)
      phrase = noun && !named ? `${qty.count} ${plural(noun, qty.count)} of ${item.name}` : `${qty.count} × ${item.name}`
    }
    const bulk = item.bulkPrice !== undefined && item.bulkMin !== undefined && units >= item.bulkMin
    const unitPrice = bulk ? item.bulkPrice! : item.price
    total = round2(units * unitPrice)
    working.push(`${units} × ${money(unitPrice)}${bulk ? ` (${item.bulkLabel})` : ''} = ${money(total)}`)
    lead = `${phrase} ${units === 1 ? 'is' : 'come to'} ${money(total)}.`
    if (!bulk && item.bulkMin !== undefined && units < item.bulkMin) hint = bulkSentence(item)
  }

  // Delivery, when the policy is in use and the question asks for it.
  const rulesOn = rules && index.docIds.has(rules.docId) ? rules : undefined
  if (rulesOn && total !== undefined && (place || flags.delivery)) {
    if (place && place.zone === 'out') {
      delivered = `We can’t deliver to ${place.name}: it’s more than ${rulesOn.maxMiles} miles from the yard, but you can collect.`
      const hit = deliveryPassage(index, rulesOn, 'beyond miles yard')
      if (hit) sources.push(toSource(hit.passage, hit.matched))
    } else if (place) {
      const zone = zoneOf(rulesOn, place.zone)!
      const free = zone.freeOver !== undefined && total > zone.freeOver
      const fee = free ? 0 : zone.fee
      working.push(`Delivery to ${place.name} (Zone ${zone.id}): ${free ? `free over ${moneyWhole(zone.freeOver!)}` : money(fee)}`)
      let extra = 0
      if (flags.saturday) {
        if (rulesOn.saturdayZones.includes(zone.id)) {
          extra += rulesOn.saturdayFee
          working.push(`Saturday delivery: ${money(rulesOn.saturdayFee)}`)
        } else notes.push(`Saturday delivery only goes to Zones ${rulesOn.saturdayZones.join(' and ')}, so this would be a weekday delivery.`)
      }
      if (palletised) {
        extra += rulesOn.craneFee
        working.push(`Crane offload for pallets: ${money(rulesOn.craneFee)}`)
      }
      const withDelivery = round2(total + fee + extra)
      working.push(`Total delivered: ${money(withDelivery)}`)
      delivered = `Delivered to ${place.name}, it’s ${money(withDelivery)}${fee + extra === 0 ? ' with free delivery' : ''}.`
      const hit = deliveryPassage(index, rulesOn, `${place.key} zone`)
      if (hit) sources.push(toSource(hit.passage, [...hit.matched, ...placeTerms(place)]))
      if (palletised) {
        const crane = deliveryPassage(index, rulesOn, 'crane offload pallets')
        if (crane) sources.push(toSource(crane.passage, crane.matched))
      }
    } else {
      const a = rulesOn.zones[0]
      notes.push(`Delivery is ${moneyWhole(a.fee)} within 5 miles${a.freeOver ? ` (free over ${moneyWhole(a.freeOver)})` : ''}. Tell me the town for an exact price.`)
      const hit = deliveryPassage(index, rulesOn, 'zone a deliver')
      if (hit) sources.push(toSource(hit.passage, hit.matched))
    }
  } else if (rulesOn && total !== undefined) {
    const a = rulesOn.zones[0]
    if (a.freeOver !== undefined && total > a.freeOver) notes.push(`Delivery is free within 5 miles (Zone A) on orders over ${moneyWhole(a.freeOver)}.`)
  } else if (!rulesOn && (place || flags.delivery)) {
    notes.push('There’s no delivery policy in use, so this price doesn’t include delivery.')
  }

  if (lead) {
    const stock = stockSentence(item)
    text = [lead, hint, delivered, stock].filter(Boolean).join(' ')
    short = [lead, delivered, stock].filter(Boolean).join(' ')
  }

  if (item.stock === 'out') {
    const alt = alternatives.find((p) => p.id !== passage.id && p.item && p.item.stock !== 'out')
    if (alt?.item) notes.push(`In stock instead: ${alt.item.name}, ${money(alt.item.price)} ${per(alt.item)}.`)
  }

  return {
    kind: 'price',
    text,
    short,
    working: working.length ? working : undefined,
    notes: notes.length ? notes : undefined,
    sources,
    topic: flags.stock && !flags.price && !qty ? 'Stock' : 'Prices',
  }
}

interface Candidate {
  passage: Passage
  coverage: number
  specificity: number
}

/** Rows whose product name matches the question's product words, best first. */
function matchProducts(terms: QueryTerm[], index: SearchIndex): Candidate[] {
  if (!terms.length) return []
  const total = terms.reduce((s, t) => s + idf(index, t.token), 0)
  const out: Candidate[] = []
  for (const p of index.passages) {
    if (p.kind !== 'row' || !p.nameTokens?.size) continue
    let covered = 0
    const hits = new Set<string>()
    for (const t of terms) {
      const { weight, token } = termIn(t, (x) => p.nameTokens!.has(x))
      if (!token) continue
      covered += weight * idf(index, t.token)
      hits.add(token)
    }
    const coverage = total ? covered / total : 0
    // Specificity uses the name only, so product codes don't dilute it.
    const name = p.nameOnly ?? p.nameTokens
    if (coverage >= THRESHOLD) out.push({ passage: p, coverage, specificity: [...hits].filter((t) => name.has(t)).length / Math.max(1, name.size) })
  }
  return out.sort((a, b) => b.coverage - a.coverage || b.specificity - a.specificity)
}

/** Products the question could mean equally well. */
function ties(cands: Candidate[]): Candidate[] {
  const best = cands[0]
  if (!best) return []
  return cands.filter((c) => c.coverage >= best.coverage - 1e-6 && c.specificity >= best.specificity - 0.12).slice(0, 3)
}

function deliveryAnswer(place: NonNullable<Place>, flags: Flags, index: SearchIndex, rules: DeliveryRules): Answer {
  const sources: Source[] = []
  const add = (words: string, extra: string[] = []) => {
    const hit = deliveryPassage(index, rules, words)
    if (hit && !sources.some((s) => s.passageId === hit.passage.id)) sources.push(toSource(hit.passage, [...hit.matched, ...extra]))
  }
  let text: string
  if (place.zone === 'out') {
    text = `We can’t deliver to ${place.name}: it’s more than ${rules.maxMiles} miles from the yard. You’re welcome to collect from the yard instead.`
    add('beyond miles yard')
  } else {
    const zone = zoneOf(rules, place.zone)!
    const weekday = `${moneyWhole(zone.fee)} a drop${zone.freeOver ? `, free on orders over ${moneyWhole(zone.freeOver)}` : ''}`
    add(`${place.key} zone`, placeTerms(place))
    if (flags.sunday) {
      text = `We don’t deliver on Sundays. ${place.name} is in Zone ${zone.id}, so a weekday delivery is ${weekday}.`
      add('sunday deliver')
    } else if (flags.saturday) {
      text = rules.saturdayZones.includes(zone.id)
        ? `Yes. ${place.name} is in Zone ${zone.id}, and Saturday delivery runs from ${rules.saturdayHours} to Zones ${rules.saturdayZones.join(' and ')}, at ${moneyWhole(rules.saturdayFee)} extra per drop.`
        : `Not on a Saturday. ${place.name} is in Zone ${zone.id}, and Saturday delivery only goes to Zones ${rules.saturdayZones.join(' and ')}. A weekday delivery is ${weekday}.`
      add('saturday deliver zone')
    } else {
      text = `Yes. ${place.name} is in Zone ${zone.id} (${zone.miles}): ${weekday}. Order by 14:00 for delivery the next working day.`
      add('order 14 00 next working day')
    }
  }
  return { kind: 'policy', text, short: text, sources, topic: 'Delivery' }
}

function policyAnswer(hits: Hit[], terms: QueryTerm[], index: SearchIndex): Answer {
  const best = hits[0]
  const p = best.passage
  const sentences = splitSentences(p.text)
  const scored = sentences.map((s, i) => {
    const tokens = new Set(tokenize(s))
    const found = terms.filter((t) => termIn(t, (x) => tokens.has(x)).token)
    // Words like "price" only break ties between sentences.
    const score = found.reduce((sum, t) => sum + idf(index, t.token) * (t.soft ? 0.3 : 1), 0)
    return { s, i, score, found: new Set(found.filter((t) => !t.soft).map((t) => t.token)) }
  })
  const ranked = [...scored].sort((a, b) => b.score - a.score)
  let chosen = ranked.filter((r) => r.score > 0).slice(0, 1)
  const second = ranked.find((r) => r !== chosen[0] && r.found.size > 0 && [...r.found].some((t) => !chosen[0]?.found.has(t)))
  if (second) chosen.push(second)
  // Two sentences or fewer: give both, they usually depend on each other.
  if (!chosen.length || scored.length <= 2) chosen = scored.slice(0, 2)
  chosen.sort((a, b) => a.i - b.i)
  const body = chosen.map((c) => c.s).join(' ')
  const text = p.kind === 'row' ? `${p.label}: ${p.text}` : body
  const sources = [toSource(p, best.matched)]
  const next = hits.find(
    (h) => h.passage.label !== p.label && h.coverage >= Math.max(THRESHOLD, best.coverage - 0.15) && h.score >= best.score * 0.75,
  )
  if (next) sources.push(toSource(next.passage, next.matched))
  const short = p.kind === 'row' || scored.length <= 2 ? text : (ranked[0].score > 0 ? ranked[0] : chosen[0]).s
  return { kind: 'policy', text, short, sources, topic: topicForDoc(p.docId) }
}

function notFound(question: string, owner: string | undefined, reason: Answer['reason']): Answer {
  const vague = reason !== 'not-found'
  return {
    kind: 'none',
    text: vague
      ? 'Ask me about prices, stock, delivery, returns or trade accounts, and I’ll answer from the documents.'
      : `I couldn’t find that in ${owner ? `${owner} ` : 'the '}documents, so I won’t guess.`,
    short: vague
      ? 'Ask me about prices, stock, delivery, returns or trade accounts.'
      : 'I couldn’t find that in our documents, so I won’t guess.',
    sources: [],
    topic: topicFromWords(question),
    reason,
  }
}

/** Answers a question from the indexed documents, or says it can't. */
export function answer(question: string, index: SearchIndex, options: AnswerOptions = {}): Answer {
  const q = question.trim().slice(0, 500)
  if (!q) return notFound(q, options.owner, 'empty')
  const { qty, rest } = parseQuantity(q)
  const lower = q.toLowerCase()
  const flags = readFlags(lower)
  const rules = options.rules && index.docIds.has(options.rules.docId) ? options.rules : undefined
  const place = options.rules ? findPlace(q, options.rules) : undefined
  const terms = queryTerms(rest, index)
  const placeTokens = new Set(place ? placeTerms(place) : [])
  const productTerms = terms.filter((t) => !NOT_PRODUCT.has(t.token) && !placeTokens.has(t.token) && !t.soft)

  if (options.rowId) {
    const row = index.passages.find((p) => p.id === options.rowId && p.item)
    if (row) return priceAnswer(row, qty, place, flags, index, options.rules, productTerms, [])
  }
  if (!terms.length && !place) return notFound(q, options.owner, 'vague')

  const policyQuestion = has(POLICY_WORDS, lower) && !flags.price
  const wantsRow = productTerms.length > 0 && (flags.price || flags.stock || Boolean(qty)) && !policyQuestion
  const tryRows = (): Answer | undefined => {
    const cands = matchProducts(productTerms, index).filter((c) => c.passage.item)
    if (!cands.length) return undefined
    const tied = ties(cands)
    if (tied.length > 1) {
      return {
        kind: 'clarify',
        text: `I found ${tied.length} products that match. Which one do you mean?`,
        short: `We have ${tied.length} that match. Which one do you mean?`,
        choices: tied.map((c) => ({ label: c.passage.label, rowId: c.passage.id })),
        sources: tied.map((c) => toSource(c.passage, [...c.passage.nameTokens!].filter((t) => productTerms.some((p) => p.token === t || p.alts.includes(t))))),
        topic: 'Prices',
      }
    }
    return priceAnswer(cands[0].passage, qty, place, flags, index, options.rules, productTerms, cands.map((c) => c.passage))
  }

  if (wantsRow) {
    const found = tryRows()
    if (found) return found
    // "40 bags of X" with no X in any price list: other documents mentioning X don't answer it.
    if (qty && !place) return notFound(q, options.owner, 'not-found')
  }
  if (place && rules) return deliveryAnswer(place, flags, index, rules)

  const hits = search(terms, index)
  const best = hits[0]
  if (!best || best.coverage < THRESHOLD) return notFound(q, options.owner, 'not-found')
  if (best.passage.kind === 'row' && best.passage.item && productTerms.length && !policyQuestion) {
    const found = tryRows()
    if (found) return found
  }
  return policyAnswer(hits, terms, index)
}

/** "From our Trade price list 2026 and Delivery and collection policy" */
export function citeLine(answer: Answer): string {
  const cites = [...new Set(answer.sources.map((s) => s.cite))]
  if (!cites.length) return ''
  return `From our ${cites.length > 1 ? `${cites.slice(0, -1).join(', ')} and ${cites[cites.length - 1]}` : cites[0]}`
}

/** Up to three questions a visitor can ask about a document they just added, checked against the index. */
export function suggestQuestions(doc: Doc, index: SearchIndex, rules?: DeliveryRules): string[] {
  const ideas: string[] = []
  if (doc.table) {
    const schema = detectSchema(doc.table)
    const names = doc.table.rows
      .map((r) => (r[schema.name] ?? '').trim())
      .filter(Boolean)
      .map((n) => (/^[A-Z][a-z]/.test(n) ? n.charAt(0).toLowerCase() + n.slice(1) : n))
    if (schema.price !== undefined) {
      if (names[0]) ideas.push(`How much is ${names[0]}?`)
      if (names[1]) ideas.push(schema.stock !== undefined ? `Is ${names[1]} in stock?` : `What’s the price of ${names[1]}?`)
      if (names[2]) ideas.push(`How much for 3 ${names[2]}?`)
    }
    for (const name of names.slice(0, 6)) ideas.push(`Tell me about ${name}`)
  } else {
    for (const s of doc.sections ?? []) {
      const h = s.heading.trim()
      if (!h) continue
      const topic = h === h.toUpperCase() ? h.toLowerCase() : /^[A-Z][a-z]/.test(h) ? h.charAt(0).toLowerCase() + h.slice(1) : h
      ideas.push(/\?$/.test(h) ? h : `What does it say about ${topic}?`)
    }
    if (ideas.length < 3) {
      // Few headings: ask about the words the document uses most.
      const freq = new Map<string, number>()
      for (const span of wordSpans((doc.sections ?? []).flatMap((x) => x.paragraphs).join(' '))) {
        if (span.raw.length >= 5 && !/\d/.test(span.raw) && span.tokens.every((t) => !isStop(t))) freq.set(span.raw, (freq.get(span.raw) ?? 0) + 1)
      }
      for (const [word] of [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)) ideas.push(`What does it say about ${word}?`)
    }
  }
  const out: string[] = []
  for (const idea of ideas) {
    if (out.length >= 3) break
    if (out.includes(idea)) continue
    const a = answer(idea, index, { rules })
    if (a.kind !== 'none' && a.sources.some((s) => s.docId === doc.id)) out.push(idea)
  }
  return out
}
