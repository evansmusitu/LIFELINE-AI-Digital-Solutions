import { seededRandom } from '../../lib/time'
import type {
  AuditRecord,
  AuditResult,
  CategoryId,
  Device,
  FoundIssue,
  Impact,
  IssueId,
  Listing,
  ListingId,
  Site,
  SitePage,
} from './types'

/* Pure audit logic: scores, issue ranking, search-result previews and input checks. */

export const TITLE_LIMIT = 60
export const DESCRIPTION_LIMIT = 155
export const THIN_WORDS = 250
/** Home page load time on phones once the hero photo is compressed. */
export const OPTIMISED_HOME_LOAD = 2.1

/** `residual` is the small gap a clean site still has, so a fully fixed site lands in the low 90s, not 100. */
export const CATEGORIES: { id: CategoryId; label: string; about: string; weight: number; residual: number }[] = [
  { id: 'technical', label: 'Technical', about: 'Links, redirects and sitemap', weight: 0.2, residual: 4 },
  { id: 'onpage', label: 'On-page', about: 'Titles and descriptions', weight: 0.2, residual: 5 },
  { id: 'content', label: 'Content', about: 'Page text and image descriptions', weight: 0.15, residual: 10 },
  { id: 'local', label: 'Local', about: 'Business details and listings', weight: 0.2, residual: 5 },
  { id: 'speed', label: 'Speed', about: 'How fast pages load', weight: 0.15, residual: 2 },
  { id: 'mobile', label: 'Mobile', about: 'How the site works on phones', weight: 0.1, residual: 4 },
]

export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])) as Record<CategoryId, string>

/** Points lost per second of home page load time above the target. */
const LOAD_COST: Partial<Record<CategoryId, { perSecond: number; target: number }>> = {
  speed: { perSecond: 9, target: 1.4 },
  mobile: { perSecond: 3, target: 1.6 },
}

export const IMPACT_ORDER: Impact[] = ['high', 'medium', 'low']

interface Rule {
  id: IssueId
  category: CategoryId
  impact: Impact
  /** Category points lost while the issue is fully open. */
  points: number
  /** How many affected items count as fully open. Fewer items cost proportionally less. */
  full: number
  detect: (site: Site) => { count: number; pages: string[] }
}

const normal = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase()

const where = (site: Site, test: (page: SitePage) => boolean) => {
  const pages = site.pages.filter(test)
  return { count: pages.length, pages: pages.map((p) => p.path) }
}

const flag = (open: boolean, pages: string[] = []) => ({ count: open ? 1 : 0, pages: open ? pages : [] })

export function duplicateTitlePages(pages: SitePage[]): SitePage[] {
  const counts = new Map<string, number>()
  for (const p of pages) counts.set(normal(p.title), (counts.get(normal(p.title)) ?? 0) + 1)
  return pages.filter((p) => normal(p.title) && (counts.get(normal(p.title)) ?? 0) > 1)
}

export type ListingField = 'name' | 'address' | 'phone'

/** Listings whose details differ from the website's. */
export function listingMismatches(listings: Listing[]): { id: ListingId; fields: ListingField[] }[] {
  const ref = listings.find((l) => l.id === 'website')
  if (!ref) return []
  const fields: ListingField[] = ['name', 'address', 'phone']
  return listings
    .filter((l) => l.id !== 'website')
    .map((l) => ({ id: l.id, fields: fields.filter((f) => normal(l[f]) !== normal(ref[f])) }))
    .filter((m) => m.fields.length > 0)
}

export const RULES: Rule[] = [
  { id: 'hero-image', category: 'speed', impact: 'high', points: 0, full: 1, detect: (s) => flag(s.heroImageMb > 1, ['/']) },
  {
    id: 'local-business-data',
    category: 'local',
    impact: 'high',
    points: 20,
    full: 1,
    detect: (s) => flag(!s.localBusinessData, ['/', '/contact']),
  },
  {
    id: 'broken-links',
    category: 'technical',
    impact: 'high',
    points: 16,
    full: 3,
    detect: (s) => ({ count: s.brokenLinks.length, pages: [...new Set(s.brokenLinks.map((l) => l.from))] }),
  },
  {
    id: 'long-titles',
    category: 'onpage',
    impact: 'high',
    points: 16,
    full: 1,
    detect: (s) => where(s, (p) => p.title.trim().length > TITLE_LIMIT),
  },
  {
    id: 'missing-descriptions',
    category: 'onpage',
    impact: 'high',
    points: 16,
    full: 9,
    detect: (s) => where(s, (p) => !p.description.trim()),
  },
  {
    id: 'insecure-images',
    category: 'technical',
    impact: 'high',
    points: 15,
    full: 6,
    detect: (s) => ({ count: s.insecureImages.length, pages: s.insecureImages }),
  },
  {
    id: 'thin-pages',
    category: 'content',
    impact: 'medium',
    points: 18,
    full: 5,
    detect: (s) => where(s, (p) => p.kind !== 'info' && p.words < THIN_WORDS),
  },
  {
    id: 'duplicate-titles',
    category: 'onpage',
    impact: 'medium',
    points: 12,
    full: 4,
    detect: (s) => {
      const pages = duplicateTitlePages(s.pages)
      return { count: pages.length, pages: pages.map((p) => p.path) }
    },
  },
  { id: 'sitemap', category: 'technical', impact: 'medium', points: 12, full: 1, detect: (s) => flag(!s.sitemapSubmitted) },
  {
    id: 'alt-text',
    category: 'content',
    impact: 'medium',
    points: 14,
    full: 47,
    detect: (s) => ({
      count: s.pages.reduce((sum, p) => sum + p.imagesNoAlt, 0),
      pages: s.pages.filter((p) => p.imagesNoAlt > 0).map((p) => p.path),
    }),
  },
  {
    id: 'listing-mismatch',
    category: 'local',
    impact: 'medium',
    points: 10,
    full: 2,
    detect: (s) => ({ count: listingMismatches(s.listings).length, pages: [] }),
  },
  {
    id: 'opening-hours',
    category: 'local',
    impact: 'medium',
    points: 8,
    full: 1,
    detect: (s) => flag(!s.openingHoursOnContact, ['/contact']),
  },
  {
    id: 'phone-format',
    category: 'local',
    impact: 'medium',
    points: 8,
    full: 11,
    detect: (s) => where(s, (p) => p.phoneFormat === 'international'),
  },
  {
    id: 'redirect-chains',
    category: 'technical',
    impact: 'low',
    points: 6,
    full: 2,
    detect: (s) => ({ count: s.redirects.length, pages: s.redirects.map((r) => r.from) }),
  },
  { id: 'tap-targets', category: 'mobile', impact: 'low', points: 12, full: 1, detect: (s) => flag(!s.tapTargetsOk, ['/prices']) },
  { id: 'robots-sitemap', category: 'technical', impact: 'low', points: 5, full: 1, detect: (s) => flag(!s.robotsSitemapLine) },
]

export const RULE_BY_ID = Object.fromEntries(RULES.map((r) => [r.id, r])) as Record<IssueId, Rule>

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** Checks the site. Issues in `fixes` count as fixed. Same input, same result. */
export function runAudit(site: Site, fixes: readonly IssueId[] = []): AuditResult {
  const issues: FoundIssue[] = []
  for (const rule of RULES) {
    if (fixes.includes(rule.id)) continue
    const found = rule.detect(site)
    if (found.count > 0) issues.push({ id: rule.id, ...found })
  }
  const home = site.pages.find((p) => p.kind === 'home')
  const heroOpen = issues.some((i) => i.id === 'hero-image')
  const homeLoad = heroOpen && home ? home.loadTime : OPTIMISED_HOME_LOAD

  const raw = {} as Record<CategoryId, number>
  const categories = {} as Record<CategoryId, number>
  for (const cat of CATEGORIES) {
    let score = 100 - cat.residual
    for (const issue of issues) {
      const rule = RULE_BY_ID[issue.id]
      if (rule.category === cat.id) score -= rule.points * Math.min(1, issue.count / rule.full)
    }
    const load = LOAD_COST[cat.id]
    if (load) score -= load.perSecond * Math.max(0, homeLoad - load.target)
    raw[cat.id] = clamp(score, 0, 100)
    categories[cat.id] = Math.round(raw[cat.id])
  }
  const total = CATEGORIES.reduce((sum, c) => sum + c.weight * raw[c.id], 0)
  return { score: Math.round(total), raw: total, categories, issues, homeLoad }
}

/** Overall points gained if this one issue were fixed too. */
export function issueImpact(site: Site, fixes: readonly IssueId[], id: IssueId): number {
  if (fixes.includes(id)) return 0
  return runAudit(site, [...fixes, id]).raw - runAudit(site, fixes).raw
}

/** The score the next audit will give, counting fixes that are waiting to be confirmed. */
export function expectedScore(site: Site, pendingFixes: readonly IssueId[]): number {
  return runAudit(site, pendingFixes).score
}

export type IssueStatus = 'todo' | 'pending' | 'fixed'

export interface BoardItem {
  id: IssueId
  impact: Impact
  category: CategoryId
  status: IssueStatus
  /** What the last audit that found this issue reported. */
  found: FoundIssue
  /** Items still affected right now. */
  left: number
  /** Points the overall score should gain from fixing it. Zero once fixed. */
  gain: number
  /** When an audit confirmed the fix. */
  confirmedAt?: number
}

/**
 * Every issue any audit has found, with its status:
 * to do (in the latest audit and still there), pending (fixed since the latest audit) or fixed (confirmed by an audit).
 */
export function issueBoard(audits: AuditRecord[], site: Site, fixes: readonly IssueId[]): BoardItem[] {
  const current = runAudit(site, fixes)
  const items: BoardItem[] = []
  for (const rule of RULES) {
    const last = audits.findLastIndex((a) => a.issues.some((i) => i.id === rule.id))
    if (last < 0) continue
    const found = audits[last].issues.find((i) => i.id === rule.id) as FoundIssue
    const open = current.issues.find((i) => i.id === rule.id)
    const status: IssueStatus = last === audits.length - 1 ? (open ? 'todo' : 'pending') : 'fixed'
    items.push({
      id: rule.id,
      impact: rule.impact,
      category: rule.category,
      status,
      found,
      left: open?.count ?? 0,
      gain: status === 'todo' ? issueImpact(site, fixes, rule.id) : 0,
      confirmedAt: status === 'fixed' ? audits[last + 1]?.at : undefined,
    })
  }
  const rank = (i: BoardItem) => IMPACT_ORDER.indexOf(i.impact)
  return items.sort((a, b) => rank(a) - rank(b) || b.gain - a.gain)
}

/** Open issues with the biggest score gain first. */
export function topFixes(board: BoardItem[], count = 5): BoardItem[] {
  return board
    .filter((i) => i.status === 'todo')
    .sort((a, b) => b.gain - a.gain || IMPACT_ORDER.indexOf(a.impact) - IMPACT_ORDER.indexOf(b.impact))
    .slice(0, count)
}

export function scoreLabel(score: number): 'Needs work' | 'Good' | 'Excellent' {
  if (score >= 90) return 'Excellent'
  if (score >= 70) return 'Good'
  return 'Needs work'
}

/** "+3", "−2" or "No change". */
export function signedChange(diff: number): string {
  if (diff > 0) return `+${diff}`
  if (diff < 0) return `−${Math.abs(diff)}`
  return 'No change'
}

/** Gain shown on a fix: at least 1 point, so small fixes still show they count. */
export function pointsLabel(gain: number): string {
  const points = Math.max(1, Math.round(gain))
  return `+${points} ${points === 1 ? 'point' : 'points'}`
}

/* Search result previews */

export const PREVIEW_LIMITS: Record<Device, { title: number; description: number }> = {
  phone: { title: 75, description: 120 },
  desktop: { title: 60, description: 155 },
}

export interface PreviewText {
  text: string
  truncated: boolean
  length: number
  limit: number
  /** Over the recommended length, whatever the device. */
  over: boolean
}

export function cleanText(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

/** Cuts at a word boundary and adds "…", the way search results do. */
export function truncate(text: string, limit: number): { text: string; truncated: boolean } {
  const clean = cleanText(text)
  if (clean.length <= limit) return { text: clean, truncated: false }
  const cut = clean.slice(0, Math.max(1, limit - 1))
  const space = cut.lastIndexOf(' ')
  const base = space > limit * 0.6 ? cut.slice(0, space) : cut
  return { text: `${base.replace(/[\s,.;:|&–—-]+$/, '')}…`, truncated: true }
}

export function previewTitle(text: string, device: Device): PreviewText {
  const length = cleanText(text).length
  return { ...truncate(text, PREVIEW_LIMITS[device].title), length, limit: TITLE_LIMIT, over: length > TITLE_LIMIT }
}

export function previewDescription(text: string, device: Device): PreviewText {
  const length = cleanText(text).length
  return {
    ...truncate(text, PREVIEW_LIMITS[device].description),
    length,
    limit: DESCRIPTION_LIMIT,
    over: length > DESCRIPTION_LIMIT,
  }
}

export interface SnippetCheck {
  id: 'bristol' | 'service' | 'unique' | 'length'
  label: string
  pass: boolean
}

export function snippetChecks(site: Site, pageId: string, title: string, description: string, serviceTerms: string[]): SnippetCheck[] {
  const t = normal(title)
  return [
    { id: 'bristol', label: 'Includes ‘Bristol’', pass: t.includes('bristol') },
    { id: 'service', label: 'Includes the main service', pass: serviceTerms.some((term) => t.includes(term.toLowerCase())) },
    { id: 'unique', label: 'Unique on the site', pass: t.length > 0 && !site.pages.some((p) => p.id !== pageId && normal(p.title) === t) },
    {
      id: 'length',
      label: 'Not too long',
      pass: t.length > 0 && t.length <= TITLE_LIMIT && cleanText(description).length <= DESCRIPTION_LIMIT,
    },
  ]
}

/** "avonmereplumbing.co.uk › areas › clifton" */
export function breadcrumb(domain: string, path: string): string {
  return [domain, ...path.split('/').filter(Boolean)].join(' › ')
}

/* The WhatsApp request for a real audit */

/** Loose check for a website address. Adds https:// when missing. Returns null if it can't be a website. */
export function normaliseUrl(input: string): string | null {
  const text = input.trim()
  if (!text || /\s/.test(text) || !text.includes('.')) return null
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(text)
  if (hasScheme && !/^https?:\/\//i.test(text)) return null
  const withScheme = hasScheme ? text : `https://${text}`
  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    return null
  }
  const host = url.hostname
  if (url.username || url.password || !host.includes('.') || host.startsWith('.') || host.endsWith('.') || host.includes('..')) return null
  return withScheme.replace(/\/+$/, '')
}

/* Keyword tracking (sample figures) */

/** FNV-1a, so the same search always gets the same sample figures. */
export function hashText(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Eight weekly positions that drift from `start` to `end`. */
export function positionHistory(start: number | null, end: number | null, seed: number, weeks = 8): (number | null)[] {
  const rand = seededRandom(seed)
  return Array.from({ length: weeks }, (_, i) => {
    if (i === weeks - 1) return end
    const from = start ?? 55
    const to = end ?? 55
    const value = Math.round(from + ((to - from) * i) / (weeks - 1) + (rand() - 0.5) * 4)
    if (i === 0) return start
    return value > 50 ? null : Math.max(1, value)
  })
}

export function sampleKeyword(query: string): { position: number | null; monthly: number; history: (number | null)[] } {
  const seed = hashText(cleanText(query).toLowerCase())
  const rand = seededRandom(seed)
  const position = rand() < 0.25 ? null : 3 + Math.floor(rand() * 46)
  const monthly = Math.round((20 + rand() * 580) / 10) * 10
  const startRoll = rand()
  const start =
    position === null
      ? startRoll < 0.5
        ? null
        : 40 + Math.floor(startRoll * 10)
      : Math.min(50, Math.max(1, position + Math.round((startRoll - 0.35) * 12)))
  return { position, monthly, history: positionHistory(start, position, seed) }
}

/** "Up 5 places", "Down 4 places", "No change", "New in the top 50", "Not in the top 50" */
export function positionChange(history: (number | null)[]): { text: string; direction: 'up' | 'down' | 'same' } {
  const first = history[0] ?? null
  const last = history[history.length - 1] ?? null
  if (first === null && last === null) return { text: 'Not in the top 50 yet', direction: 'same' }
  if (first === null) return { text: 'New in the top 50', direction: 'up' }
  if (last === null) return { text: 'Dropped out of the top 50', direction: 'down' }
  const diff = first - last
  if (diff === 0) return { text: 'No change', direction: 'same' }
  const places = `${Math.abs(diff)} ${Math.abs(diff) === 1 ? 'place' : 'places'}`
  return diff > 0 ? { text: `Up ${places}`, direction: 'up' } : { text: `Down ${places}`, direction: 'down' }
}
