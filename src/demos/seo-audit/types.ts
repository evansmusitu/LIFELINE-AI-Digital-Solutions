export type CategoryId = 'technical' | 'onpage' | 'content' | 'local' | 'speed' | 'mobile'

export type Impact = 'high' | 'medium' | 'low'

export type IssueId =
  | 'hero-image'
  | 'local-business-data'
  | 'broken-links'
  | 'long-titles'
  | 'missing-descriptions'
  | 'insecure-images'
  | 'thin-pages'
  | 'duplicate-titles'
  | 'sitemap'
  | 'alt-text'
  | 'listing-mismatch'
  | 'opening-hours'
  | 'phone-format'
  | 'redirect-chains'
  | 'tap-targets'
  | 'robots-sitemap'

export type PageKind = 'home' | 'service' | 'area' | 'info' | 'blog'

export type Device = 'phone' | 'desktop'

export interface SitePage {
  id: string
  path: string
  name: string
  kind: PageKind
  title: string
  /** Empty when the page has no meta description. */
  description: string
  h1Count: number
  words: number
  images: number
  imagesNoAlt: number
  /** Mobile load time in seconds. */
  loadTime: number
  status: number
  internalLinks: number
  hasLocalDetails: boolean
  phoneFormat: 'local' | 'international' | 'none'
}

export interface BrokenLink {
  from: string
  to: string
}

export interface RedirectChain {
  from: string
  hops: string[]
}

export type ListingId = 'website' | 'map' | 'dirA' | 'dirB'

export interface Listing {
  id: ListingId
  label: string
  name: string
  address: string
  phone: string
}

export interface Site {
  domain: string
  pages: SitePage[]
  brokenLinks: BrokenLink[]
  redirects: RedirectChain[]
  listings: Listing[]
  /** Pages that load images over http. */
  insecureImages: string[]
  sitemapSubmitted: boolean
  robotsSitemapLine: boolean
  localBusinessData: boolean
  openingHoursOnContact: boolean
  heroImageMb: number
  tapTargetsOk: boolean
}

export interface FoundIssue {
  id: IssueId
  /** Pages, images, links or listings affected. */
  count: number
  pages: string[]
}

export interface AuditResult {
  score: number
  /** Unrounded overall score, used to compare fixes. */
  raw: number
  categories: Record<CategoryId, number>
  issues: FoundIssue[]
  homeLoad: number
}

export interface AuditRecord {
  id: string
  at: number
  score: number
  categories: Record<CategoryId, number>
  issues: FoundIssue[]
  pages: number
  homeLoad: number
}

export interface Keyword {
  id: string
  query: string
  /** null when the site isn't in the top 50. */
  position: number | null
  /** Weekly positions, oldest first, ending with this week. */
  history: (number | null)[]
  monthly: number
  addedByVisitor: boolean
}

/** A running audit. Kept out of saved state, so a reload never leaves it stuck. */
export interface AuditProgress {
  stage: 'crawl' | 'titles' | 'speed' | 'local'
  crawled: number
}

export interface SeoState {
  site: Site
  /** Issues the owner has marked as fixed. The next audit confirms them. */
  fixes: IssueId[]
  /** Oldest first. */
  audits: AuditRecord[]
  keywords: Keyword[]
  /** Descriptions, alt texts and titles drafted in the demo. */
  drafted: number
}
