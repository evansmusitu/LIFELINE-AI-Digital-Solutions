/*
 * Words to search tokens. Documents and questions go through the same steps (lowercase, phrases,
 * units, a light stemmer and synonym groups), so "Delivered", "deliveries" and "drop" all meet at "deliver".
 */

/** Light stemmer: plurals, -ing and -ed, and a final e, so "priced", "prices" and "price" match. */
export function stem(word: string): string {
  let w = word
  if (/^\d/.test(w) || w.length <= 3) return w
  if (w.length > 4 && w.endsWith('ies')) w = w.slice(0, -3) + 'y'
  else if (/(ss|x|z|ch|sh)es$/.test(w)) w = w.slice(0, -2)
  else if (w.endsWith('s') && !/(ss|us|is)$/.test(w)) w = w.slice(0, -1)
  if (w.length >= 6 && w.endsWith('ing')) w = undouble(w.slice(0, -3))
  else if (w.length >= 5 && w.endsWith('ied')) w = w.slice(0, -3) + 'y'
  else if (w.length >= 5 && w.endsWith('ed')) w = undouble(w.slice(0, -2))
  if (w.length >= 4 && w.endsWith('e')) w = w.slice(0, -1)
  return w
}

function undouble(w: string): string {
  return /([^aeioulsz])\1$/.test(w) ? w.slice(0, -1) : w
}

const build = (raw: Record<string, string>) => new Map(Object.entries(raw).map(([k, v]) => [stem(k), stem(v)]))

/** Same meaning both ways. Applied to documents and questions. */
const CANON = build({
  delivery: 'deliver', drop: 'deliver', refund: 'return', credit: 'account', unsealed: 'open', opening: 'open',
  sealed: 'unopened', unused: 'unopened', hour: 'time', payment: 'pay', paid: 'pay', collection: 'collect',
  broken: 'damage', cracked: 'damage', sat: 'saturday', wood: 'timber', lumber: 'timber', ply: 'plywood',
  drain: 'drainage', flag: 'paving', slab: 'paving', screw: 'screw', fixing: 'fix', deposit: 'deposit',
  breeze: 'block', breezeblock: 'block', blockwork: 'block', aggregates: 'aggregate', tonne: 'ton',
})

/** One way only: a question word that should also find these document words. */
const EXPAND = new Map(
  Object.entries({
    portland: ['cement'], opc: ['portland', 'cement'], drywall: ['plasterboard'], board: ['plasterboard'],
    cheaper: ['discount'], cheap: ['discount'], reduction: ['discount'], weekend: ['saturday'], cost: ['price'],
    fee: ['price', 'charge'], charge: ['price'], price: ['charge', 'fee'], duration: ['day', 'hour', 'week', 'month'], lorry: ['deliver'], van: ['deliver'],
    unopened: ['unused'], send: ['email', 'text'], sent: ['email', 'text'], close: ['open', 'time'], shut: ['open', 'time'], insulate: ['insulation'],
  }).map(([k, v]) => [stem(k), v.map(stem)]),
)

/** Multi-word phrases that stand for one idea. Keys are lowercase words without apostrophes. */
const PHRASES = new Map<string, string>(
  (
    [
      ['how much', 'price'], ['how long', 'duration'], ['take back', 'return'], ['taken back', 'return'], ['bring back', 'return'],
      ['send back', 'return'], ['money off', 'discount'], ['pick up', 'collect'], ['picked up', 'collect'],
      ['damp proof course', 'dpc'], ['multi purpose', 'multipurpose'], ['sub base', 'subbase'],
    ] as [string, string][]
  ).map(([k, v]) => [k, stem(v)]),
)

const STOP = new Set(
  `a an the and or of to in on at for with by from as is are was were be been being do does did done can could
  would should will shall may might must i im ive id me my mine you youre your yours we our ours us they them their
  he she it its this that these those there here what whats which who whom how when where why if then than so but
  not no yes any some all each every about into over under within up down out off again just also only very too
  please thanks thank hi hello hey ok okay much many more most get got have has had having need want like know tell
  sell buy dont doesnt cant cannot wont isnt arent didnt let lets x one two three four five six seven eight nine
  ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty
  seventy eighty ninety hundred dozen couple few customer customers someone anyone somebody take happen happens
  happened go going say says said document mention mentions policy policies rule rules info
  information detail details`
    .split(/\s+/)
    .filter(Boolean)
    .map(stem),
)

/** Question scaffolding: counted in the score, but not needed to call a passage a match. */
export const SOFT = new Set(['price', 'charge', 'today', 'tomorrow', 'tonight', 'now', 'usually', 'normally'].map(stem))

export interface WordSpan {
  start: number
  end: number
  /** Lowercase word before stemming (apostrophes removed). */
  raw: string
  tokens: string[]
  /** Second or later word of a phrase: highlight it, but don't count it again. */
  cont?: boolean
}

const WORD = /[\p{L}\p{N}]+(?:['’]\p{L}+)*(?:[.,]\p{N}+)*/gu
const UNIT = /^(\d+(?:\.\d+)?)(mm|cm|m|kg|g|ml|l|ft|in|m2|m3)$/

function wordTokens(raw: string): string[] {
  let w = raw.replace(/'s$/, '').replace(/'/g, '')
  if (/^\d{1,3}(,\d{3})+$/.test(w)) w = w.replace(/,/g, '')
  return w
    .split(/,|(?<=\d)x(?=\d)/)
    .flatMap((part) => {
      const unit = UNIT.exec(part)
      if (unit) return [unit[1], unit[2]]
      // "OSB3" is also found by "OSB".
      const coded = /^([a-z]{2,})\d+$/.exec(part)
      return coded ? [part, coded[1]] : [part]
    })
    .filter(Boolean)
    .map((t) => {
      const s = stem(t)
      return CANON.get(s) ?? s
    })
}

export function wordSpans(text: string): WordSpan[] {
  const spans: WordSpan[] = []
  for (const m of text.matchAll(WORD)) {
    const raw = m[0].toLowerCase().replace(/’/g, "'")
    spans.push({ start: m.index, end: m.index + m[0].length, raw: raw.replace(/'/g, ''), tokens: wordTokens(raw) })
  }
  for (let i = 0; i < spans.length; i++) {
    for (const size of [3, 2]) {
      const group = spans.slice(i, i + size)
      if (group.length < size) continue
      const token = PHRASES.get(group.map((s) => s.raw).join(' '))
      if (!token) continue
      group.forEach((s, j) => {
        s.tokens = [token]
        s.cont = j > 0
      })
      i += size - 1
      break
    }
  }
  return spans
}

export function isStop(token: string): boolean {
  return STOP.has(token)
}

/** Search tokens for a piece of text, in order, stop words removed. */
export function tokenize(text: string): string[] {
  return wordSpans(text).flatMap((s) => (s.cont ? [] : s.tokens.filter((t) => !STOP.has(t))))
}

export function expansions(token: string): string[] {
  return EXPAND.get(token) ?? []
}

/** Splits text into plain and highlighted parts for <mark>. */
export function highlight(text: string, terms: Iterable<string>): { text: string; hit: boolean }[] {
  const wanted = new Set(terms)
  const parts: { text: string; hit: boolean }[] = []
  let at = 0
  const push = (value: string, hit: boolean) => {
    if (!value) return
    const last = parts[parts.length - 1]
    if (last && last.hit === hit) last.text += value
    else parts.push({ text: value, hit })
  }
  const spans = wordSpans(text)
  spans.forEach((span, i) => {
    const hit = span.tokens.some((t) => wanted.has(t))
    // Keep the space inside a highlighted phrase ("take back") highlighted too.
    push(text.slice(at, span.start), hit && Boolean(span.cont) && parts[parts.length - 1]?.hit === true)
    push(text.slice(span.start, span.end), hit)
    at = span.end
    if (i === spans.length - 1) push(text.slice(at), false)
  })
  if (!spans.length) push(text, false)
  return parts
}

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9“"‘'(£$])/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Edit distance with a cap, for typo matching. Returns cap + 1 when further apart. */
export function editDistance(a: string, b: string, cap = 2): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1
  let before: number[] = []
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost)
      // Swapped neighbours ("cmeent") count as one edit.
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) row[j] = Math.min(row[j], before[j - 2] + 1)
      best = Math.min(best, row[j])
    }
    if (best > cap) return cap + 1
    before = prev
    prev = row
  }
  return prev[b.length]
}

/** "Delivery and collection" style text to a compare key: lowercase words only. */
export function plainKey(text: string): string {
  return wordSpans(text)
    .map((s) => s.raw)
    .join(' ')
}
