import { daysAgoAt } from '../../lib/time'
import { hashText, listingMismatches, positionHistory, runAudit } from './engine'
import type { AuditRecord, AuditResult, FoundIssue, IssueId, Keyword, Listing, PageKind, SeoState, Site, SitePage } from './types'

/* Sample business: Avonmere Plumbing & Heating, an invented plumbing and heating company in Bristol, UK. */

export const BUSINESS = {
  name: 'Avonmere Plumbing & Heating',
  shortName: 'Avonmere',
  domain: 'avonmereplumbing.co.uk',
  phone: '0117 496 0123',
}

const HOME_TITLE =
  'Welcome to Avonmere Plumbing & Heating Ltd - Plumbers, Heating Engineers, Boilers, Bathrooms and More in Bristol and the Surrounding Areas'
const SHARED_AREA_TITLE = 'Plumber in Bristol | Avonmere'

type Row = [
  id: string,
  path: string,
  name: string,
  kind: PageKind,
  title: string,
  description: string,
  words: number,
  loadTime: number,
  internalLinks: number,
  images: number,
]

const areaDescription = (area: string) =>
  `Local plumbers and heating engineers in ${area}, Bristol. Boiler repairs, servicing and emergency call-outs from Gas Safe engineers.`

const ROWS: Row[] = [
  [
    'home',
    '/',
    'Home',
    'home',
    HOME_TITLE,
    'Gas Safe plumbers and heating engineers in Bristol. Boiler repairs, new boilers, emergency call-outs and bathroom fitting.',
    640,
    6.8,
    42,
    9,
  ],
  ['boiler-repair', '/boiler-repair', 'Boiler repair', 'service', 'Boiler Repair Bristol | Same-Day Visits | Avonmere', 'We repair all makes of boiler in Bristol.', 980, 2.7, 24, 6],
  [
    'boiler-installation',
    '/boiler-installation',
    'Boiler installation',
    'service',
    'New Boiler Installation in Bristol | Avonmere',
    'New combi, system and heat-only boilers fitted across Bristol by Gas Safe engineers, with up to 10 years of manufacturer warranty.',
    1120,
    2.9,
    22,
    8,
  ],
  ['emergency-plumber', '/emergency-plumber', 'Emergency plumber', 'service', '24/7 Emergency Plumber in Bristol | Avonmere', '', 760, 2.4, 19, 4],
  ['central-heating', '/central-heating', 'Central heating', 'service', 'Central Heating Repairs & Upgrades in Bristol | Avonmere', '', 890, 2.6, 20, 5],
  [
    'bathroom-fitting',
    '/bathroom-fitting',
    'Bathroom fitting',
    'service',
    'Bathroom Fitting in Bristol | Avonmere Plumbing',
    'Complete bathroom fitting in Bristol, from design to tiling. One team for plumbing, electrics and finishing, with a fixed quote.',
    1040,
    3.1,
    21,
    12,
  ],
  [
    'landlord-gas-safety',
    '/landlord-gas-safety-certificates',
    'Landlord gas safety certificates',
    'service',
    'Landlord Gas Safety Certificates (CP12) | Avonmere',
    '',
    820,
    2.3,
    18,
    3,
  ],
  [
    'areas',
    '/areas',
    'Areas we cover',
    'info',
    'Areas We Cover in and Around Bristol | Avonmere',
    'We cover Bristol and nearby towns, including Clifton, Redland, Bedminster, Bishopston, Southville, Fishponds, Horfield and Keynsham.',
    340,
    2.2,
    16,
    2,
  ],
  ['clifton', '/areas/clifton', 'Clifton', 'area', 'Plumber in Clifton, Bristol | Avonmere Plumbing & Heating', areaDescription('Clifton'), 520, 2.3, 14, 3],
  ['redland', '/areas/redland', 'Redland', 'area', 'Plumber & Heating Engineer in Redland | Avonmere', areaDescription('Redland'), 480, 2.2, 13, 2],
  ['bedminster', '/areas/bedminster', 'Bedminster', 'area', 'Plumber in Bedminster, Bristol | Avonmere', areaDescription('Bedminster'), 410, 2.4, 12, 2],
  ['bishopston', '/areas/bishopston', 'Bishopston', 'area', SHARED_AREA_TITLE, areaDescription('Bishopston'), 180, 2.1, 9, 1],
  ['southville', '/areas/southville', 'Southville', 'area', SHARED_AREA_TITLE, areaDescription('Southville'), 165, 2.2, 9, 1],
  ['fishponds', '/areas/fishponds', 'Fishponds', 'area', SHARED_AREA_TITLE, '', 150, 2.0, 8, 1],
  ['horfield', '/areas/horfield', 'Horfield', 'area', SHARED_AREA_TITLE, '', 140, 2.1, 8, 1],
  ['keynsham', '/areas/keynsham', 'Keynsham', 'area', 'Plumber in Keynsham | Avonmere Plumbing & Heating', '', 210, 2.3, 10, 1],
  [
    'about',
    '/about',
    'About',
    'info',
    'About Avonmere Plumbing & Heating | Bristol Plumbers',
    'A family-run team of Gas Safe plumbers and heating engineers looking after Bristol homes and rental properties since 2009.',
    520,
    2.3,
    17,
    5,
  ],
  [
    'contact',
    '/contact',
    'Contact',
    'info',
    'Contact Avonmere | Plumber in Bristol',
    'Call 0117 496 0123 or send us a message. We cover Bristol and nearby towns, with emergency call-outs day and night.',
    260,
    1.9,
    14,
    1,
  ],
  ['prices', '/prices', 'Prices', 'info', 'Plumbing & Heating Prices in Bristol | Avonmere', '', 380, 2.5, 15, 0],
]

type BlogRow = [slug: string, name: string, title: string, words: number, loadTime: number, internalLinks: number, images: number]

const BLOG: BlogRow[] = [
  ['how-to-bleed-a-radiator', 'How to bleed a radiator', 'How to Bleed a Radiator, Step by Step | Avonmere', 920, 3.0, 8, 3],
  ['boiler-pressure-too-low', 'Boiler pressure too low', 'Boiler Pressure Too Low? What to Do | Avonmere', 860, 2.8, 7, 2],
  ['combi-vs-system-boiler', 'Combi vs system boiler', 'Combi vs System Boiler: Which Suits Your Home?', 1340, 3.3, 10, 4],
  ['frozen-condensate-pipe', 'Frozen condensate pipe', 'Frozen Condensate Pipe? How to Thaw It Safely', 780, 2.7, 6, 2],
  ['landlord-gas-safety-checklist', 'Gas safety checklist for landlords', 'Gas Safety Checklist for Bristol Landlords', 1100, 2.9, 9, 2],
  ['signs-your-boiler-needs-replacing', 'Signs your boiler needs replacing', '7 Signs Your Boiler Needs Replacing | Avonmere', 990, 3.1, 8, 3],
  ['new-boiler-cost-bristol', 'What a new boiler costs', 'How Much Does a New Boiler Cost in Bristol?', 1450, 3.4, 11, 3],
  ['stop-a-dripping-tap', 'How to stop a dripping tap', 'How to Stop a Dripping Tap | Avonmere', 680, 2.6, 6, 2],
  ['power-flushing-explained', 'Power flushing explained', 'Power Flushing Explained: Is It Worth It?', 1020, 3.0, 7, 2],
  ['smart-thermostats-guide', 'Smart thermostats guide', 'Smart Thermostats: A Plain-English Guide', 1260, 3.2, 8, 3],
  ['what-to-do-if-you-smell-gas', 'What to do if you smell gas', 'What to Do If You Smell Gas | Avonmere', 640, 2.5, 6, 1],
  ['bathroom-renovation-timeline', 'Bathroom renovation timeline', 'How Long Does a Bathroom Renovation Take?', 1180, 3.5, 9, 6],
  ['low-water-pressure-causes', 'Low water pressure', 'Low Water Pressure: Causes and Fixes', 870, 2.8, 7, 2],
  ['winter-boiler-checklist', 'Winter boiler checklist', 'Winter Boiler Checklist for Bristol Homes', 940, 2.9, 8, 3],
  ['heat-pumps-vs-gas-boilers', 'Heat pumps vs gas boilers', 'Heat Pumps vs Gas Boilers: What to Know', 1520, 3.3, 10, 4],
]

const BLOG_WITHOUT_DESCRIPTION = new Set(['stop-a-dripping-tap', 'low-water-pressure-causes'])

/** Suggested alt text for every image that has none, by page. */
const ALT: Record<string, string[]> = {
  home: [
    'Avonmere engineer servicing a combi boiler in a Bristol kitchen',
    'Avonmere van parked outside a terraced house in Bristol',
    'Newly fitted walk-in shower with grey tiles',
    'Engineer checking radiator pipework with a thermal camera',
  ],
  'boiler-repair': [
    'Engineer testing the gas pressure on a wall-mounted boiler',
    'Boiler control panel showing a fault code',
    'Replacement boiler parts laid out on a dust sheet',
  ],
  'boiler-installation': [
    'New combi boiler fitted in a kitchen cupboard',
    'Old floor-standing boiler being removed',
    'Magnetic system filter fitted under a new boiler',
    'Smart thermostat on a hallway wall',
  ],
  'emergency-plumber': ['Engineer fixing a burst pipe under a kitchen sink', 'Avonmere van on an emergency call-out at night'],
  'central-heating': [
    'Engineer bleeding a radiator in a living room',
    'Power flush machine connected to a heating system',
    'Thermostatic radiator valve being fitted',
  ],
  'bathroom-fitting': [
    'Finished bathroom with a freestanding bath',
    'Tiler grouting a shower wall',
    'Vanity unit with a basin and wall-mounted tap',
    'Heated towel rail in a small en suite',
    'Bathroom stripped back before refitting',
    'Walk-in shower with a glass screen',
  ],
  'landlord-gas-safety': ['Engineer filling in a gas safety certificate on a tablet'],
  areas: ['Map of the Bristol areas Avonmere covers'],
  about: ['Avonmere team standing beside their vans', 'Engineer showing a Gas Safe ID card', 'Workshop shelves stocked with boiler parts'],
  contact: ['Map showing the Avonmere workshop in Bristol'],
  'how-to-bleed-a-radiator': ['Radiator key turning a bleed valve'],
  'boiler-pressure-too-low': ['Boiler pressure gauge reading below 1 bar'],
  'combi-vs-system-boiler': ['Combi boiler next to a hot water cylinder'],
  'frozen-condensate-pipe': ['Frozen condensate pipe on an outside wall'],
  'landlord-gas-safety-checklist': ['Carbon monoxide alarm on a ceiling'],
  'signs-your-boiler-needs-replacing': ['Old boiler with rust marks on the casing'],
  'new-boiler-cost-bristol': ['Engineer handing over a written boiler quote'],
  'power-flushing-explained': ['Dark sludgy water drained from a radiator'],
  'smart-thermostats-guide': ['Smart thermostat app open on a phone'],
  'bathroom-renovation-timeline': ['Bathroom halfway through a refit'],
  'winter-boiler-checklist': ['Lagged pipes in a loft'],
}

for (const [id, , name, kind] of ROWS) if (kind === 'area') ALT[id] = [`Avonmere engineer at work in a ${name} home`]

/** Blog posts that loaded images over http before the fix confirmed in the latest audit. */
const INSECURE_PAGES = [
  '/blog/how-to-bleed-a-radiator',
  '/blog/combi-vs-system-boiler',
  '/blog/frozen-condensate-pipe',
  '/blog/smart-thermostats-guide',
  '/blog/bathroom-renovation-timeline',
  '/blog/heat-pumps-vs-gas-boilers',
]

export function sampleSite(): Site {
  const page = (row: Row, phoneFormat: SitePage['phoneFormat']): SitePage => {
    const [id, path, name, kind, title, description, words, loadTime, internalLinks, images] = row
    return {
      id,
      path,
      name,
      kind,
      title,
      description,
      h1Count: 1,
      words,
      images,
      imagesNoAlt: ALT[id]?.length ?? 0,
      loadTime,
      status: 200,
      internalLinks,
      hasLocalDetails: kind !== 'blog',
      phoneFormat,
    }
  }
  const pages = ROWS.map((row) => page(row, row[0] === 'prices' ? 'international' : 'local'))
  BLOG.forEach(([slug, name, title, words, loadTime, internalLinks, images], index) => {
    const description = BLOG_WITHOUT_DESCRIPTION.has(slug) ? '' : `${name}: plain-English advice from Avonmere’s Gas Safe engineers in Bristol.`
    const row: Row = [slug, `/blog/${slug}`, name, 'blog', title, description, words, loadTime, internalLinks, images]
    pages.push(page(row, index < 10 ? 'international' : 'local'))
  })

  const listing = (id: Listing['id'], label: string, changes: Partial<Listing> = {}): Listing => ({
    id,
    label,
    name: BUSINESS.name,
    address: 'Unit 3, Larkfield Yard, Bristol BS3',
    phone: BUSINESS.phone,
    ...changes,
  })

  return {
    domain: BUSINESS.domain,
    pages,
    brokenLinks: [
      { from: '/blog/combi-vs-system-boiler', to: '/boiler-installation-prices' },
      { from: '/blog/power-flushing-explained', to: '/services/power-flush' },
      { from: '/blog/winter-boiler-checklist', to: '/offers/winter-boiler-service' },
    ],
    redirects: [
      { from: '/boiler-service', hops: ['/services/boiler-service', '/boiler-repair'] },
      { from: '/gas-safety', hops: ['/landlords/gas-safety', '/landlord-gas-safety-certificates'] },
    ],
    listings: [
      listing('website', 'Website'),
      listing('map', 'Map listing', { name: 'Avonmere Plumbing' }),
      listing('dirA', 'Directory A'),
      listing('dirB', 'Directory B', { phone: '0117 496 0188' }),
    ],
    insecureImages: [],
    sitemapSubmitted: false,
    robotsSitemapLine: false,
    localBusinessData: false,
    openingHoursOnContact: false,
    heroImageMb: 3.4,
    tapTargetsOk: false,
  }
}

export interface AltSuggestion {
  key: string
  pageId: string
  file: string
  alt: string
}

const SMALL_WORDS = new Set(['a', 'an', 'the', 'of', 'in', 'on', 'at', 'with', 'to', 'and'])

/** Suggested alt text for the images on pages that still have some without it. */
export function altSuggestions(site: Site): AltSuggestion[] {
  return site.pages.flatMap((p) =>
    (ALT[p.id] ?? []).slice(0, p.imagesNoAlt).map((alt, i) => ({
      key: `${p.id}-${i}`,
      pageId: p.id,
      file: `${alt
        .toLowerCase()
        .replace(/-/g, ' ')
        .replace(/[^a-z0-9 ]/g, '')
        .split(' ')
        .filter((w) => w && !SMALL_WORDS.has(w))
        .slice(0, 4)
        .join('-')}.jpg`,
      alt,
    })),
  )
}

/** AI-suggested meta descriptions for the pages that have none (pre-written for the demo). */
export const DESCRIPTION_SUGGESTIONS: Record<string, string> = {
  'emergency-plumber':
    'Burst pipe, leak or no hot water? Our Bristol emergency plumbers answer day and night and aim to reach you within the hour. Call 0117 496 0123.',
  'central-heating':
    'Cold radiators, noisy pipes or heating that can’t keep up? We repair, balance and upgrade central heating systems across Bristol.',
  'landlord-gas-safety':
    'CP12 landlord gas safety certificates across Bristol from Gas Safe engineers, with renewal reminders and digital copies for your tenants.',
  prices:
    'Clear prices for boiler repairs, servicing, new boilers and plumbing jobs in Bristol. You get a fixed quote before we start any work.',
  fishponds:
    'Plumbers and heating engineers in Fishponds, Bristol. Boiler repairs, servicing, leaks and emergency call-outs from a local Gas Safe team.',
  horfield:
    'Local plumbing and heating help in Horfield. Boiler repairs, radiator fixes, new bathrooms and landlord gas safety checks across BS7.',
  keynsham:
    'Avonmere covers Keynsham and nearby villages for boiler repairs, new boiler installs, emergency plumbing and gas safety certificates.',
  'stop-a-dripping-tap':
    'A dripping tap wastes water and money. Here’s how to find the cause, change a washer or cartridge, and when to call a plumber.',
  'low-water-pressure-causes':
    'Weak shower or slow taps? The common causes of low water pressure in Bristol homes, the simple checks to try first, and the fixes.',
}

export type PreviewPageId = 'home' | 'boiler-repair' | 'emergency-plumber' | 'landlord-gas-safety'

/** Pages in the Search preview picker, with the words that count as the main service and an AI suggestion. */
export const PREVIEW_PAGES: { id: PreviewPageId; terms: string[]; suggestion: { title: string; description: string } }[] = [
  {
    id: 'home',
    terms: ['plumber', 'plumbing', 'heating'],
    suggestion: {
      title: 'Plumber & Heating Engineer in Bristol | Avonmere',
      description:
        'Gas Safe plumbers and heating engineers across Bristol. Boiler repairs, new boilers, emergency call-outs and bathrooms. Call 0117 496 0123.',
    },
  },
  {
    id: 'boiler-repair',
    terms: ['boiler repair'],
    suggestion: {
      title: 'Boiler Repair in Bristol | Same-Day Visits | Avonmere',
      description:
        'Boiler stopped working? Our Gas Safe engineers repair all major makes across Bristol, often the same day, with a clear price before we start.',
    },
  },
  {
    id: 'emergency-plumber',
    terms: ['emergency plumber'],
    suggestion: {
      title: 'Emergency Plumber in Bristol | 24/7 Call-Outs | Avonmere',
      description: DESCRIPTION_SUGGESTIONS['emergency-plumber'],
    },
  },
  {
    id: 'landlord-gas-safety',
    terms: ['gas safety'],
    suggestion: {
      title: 'Landlord Gas Safety Certificates in Bristol | Avonmere',
      description: DESCRIPTION_SUGGESTIONS['landlord-gas-safety'],
    },
  },
]

type Unit = 'page' | 'image' | 'link' | 'redirect' | 'listing' | 'site'

export type IssueAction = 'mark' | 'preview' | 'descriptions' | 'alt' | 'listings'

export const ISSUE_TEXT: Record<IssueId, { title: (count: number) => string; why: string; how: string[]; unit: Unit; action: IssueAction }> = {
  'hero-image': {
    title: () => 'Your home page takes 6.8 seconds to load on phones',
    why: 'The main photo is 3.4 MB. Most people looking for a plumber search on a phone, and slow pages lose visitors and rank lower.',
    how: [
      'Resize the photo to 1,600 px wide',
      'Save it as WebP at about 80% quality (around 300 KB)',
      'Load photos further down the page only as people scroll',
    ],
    unit: 'site',
    action: 'mark',
  },
  'local-business-data': {
    title: () => 'Search engines can’t read your business details',
    why: 'Business details in a standard format tell search engines your trade, address, phone and hours. They help you show up in map results nearby.',
    how: [
      'Add local business markup to the home and contact pages (most website builders have a setting for it)',
      'Include your name, address, phone, hours and the areas you cover',
    ],
    unit: 'site',
    action: 'mark',
  },
  'broken-links': {
    title: (n) => `${n} ${n === 1 ? 'link' : 'links'} on your blog lead to missing pages`,
    why: 'Visitors land on an error page and search engines waste time on dead ends. It makes the site look neglected.',
    how: ['Open each blog post listed below', 'Point the link at the right live page, or remove it'],
    unit: 'link',
    action: 'mark',
  },
  'long-titles': {
    title: (n) => (n === 1 ? 'Your home page title is too long' : `${n} page titles are too long`),
    why: 'Search results cut titles at about 60 characters, so people never see “Bristol” and your most important words get lost.',
    how: ['Keep it under 60 characters', 'Put the main service and “Bristol” first', 'End with your business name'],
    unit: 'page',
    action: 'preview',
  },
  'missing-descriptions': {
    title: (n) => `${n} ${n === 1 ? 'page has' : 'pages have'} no meta description`,
    why: 'Without one, search engines pick any text from the page. A clear description gets more people to click.',
    how: ['Write one or two sentences per page, up to 155 characters', 'Say what you do, where, and how to get in touch'],
    unit: 'page',
    action: 'descriptions',
  },
  'insecure-images': {
    title: (n) => `${n} blog posts load images over an insecure connection`,
    why: 'Browsers warn visitors when a secure page loads insecure files, and it can hold back rankings.',
    how: ['Change the image links from http:// to https://'],
    unit: 'page',
    action: 'mark',
  },
  'thin-pages': {
    title: (n) => `${n} area ${n === 1 ? 'page has' : 'pages have'} very little text`,
    why: 'Pages with under 250 words rarely rank. Search engines can’t tell why yours is the best answer for that area.',
    how: [
      'Add 300 to 500 words about the work you do in that area',
      'Mention local landmarks and the kind of homes you work on',
      'Add a photo of a recent job',
    ],
    unit: 'page',
    action: 'mark',
  },
  'duplicate-titles': {
    title: (n) => `${n} area pages share the same title`,
    why: 'Search engines can’t tell these pages apart, so they may show only one of them, or none.',
    how: ['Give each page its own title, for example “Plumber in Fishponds | Avonmere”'],
    unit: 'page',
    action: 'mark',
  },
  sitemap: {
    title: () => 'Your sitemap hasn’t been sent to search engines',
    why: 'A sitemap lists every page, so new and updated pages get found sooner.',
    how: ['Create sitemap.xml (most website builders make one for you)', 'Submit it in each search engine’s webmaster tools'],
    unit: 'site',
    action: 'mark',
  },
  'alt-text': {
    title: (n) => `${n} ${n === 1 ? 'image has' : 'images have'} no alt text`,
    why: 'Alt text describes a photo for people using screen readers, and helps your work photos appear in image search.',
    how: ['Describe each photo in a short sentence', 'Mention the job and the area where it fits naturally'],
    unit: 'image',
    action: 'alt',
  },
  'listing-mismatch': {
    title: (n) => `${n} online ${n === 1 ? 'listing doesn’t' : 'listings don’t'} match your website`,
    why: 'Search engines compare your name, address and phone across the web. Differences make them less sure which details are right.',
    how: ['Update each listing so it matches your website exactly', 'Mark it as updated in the listing check'],
    unit: 'listing',
    action: 'listings',
  },
  'opening-hours': {
    title: () => 'Your opening hours are missing from the Contact page',
    why: 'People want to know you’re open before they call, and search engines show your hours in local results.',
    how: ['Add your hours, including emergency call-out times', 'Use the same hours on your map listing'],
    unit: 'site',
    action: 'mark',
  },
  'phone-format': {
    title: (n) => `Your phone number is written a different way on ${n} pages`,
    why: 'Using “0117 496 0123” on some pages and “+44 117 496 0123” on others makes it harder for search engines to match your details.',
    how: ['Pick one format: 0117 496 0123', 'Update the pages listed below'],
    unit: 'page',
    action: 'mark',
  },
  'redirect-chains': {
    title: (n) => `${n} old web addresses go through more than one redirect`,
    why: 'Each extra hop slows the page down and can stop search engines following the link.',
    how: ['Point each old address straight at the final page'],
    unit: 'redirect',
    action: 'mark',
  },
  'tap-targets': {
    title: () => 'Buttons in the Prices table are too close together on phones',
    why: 'People tap the wrong thing and give up. Search engines check this for phone users.',
    how: ['Give each button at least 44 px of height and some space around it', 'Show the table as cards on small screens'],
    unit: 'site',
    action: 'mark',
  },
  'robots-sitemap': {
    title: () => 'Your robots.txt file doesn’t point to your sitemap',
    why: 'It’s the first file search engines read. One line there helps them find every page.',
    how: ['Add “Sitemap: https://avonmereplumbing.co.uk/sitemap.xml” to robots.txt'],
    unit: 'site',
    action: 'mark',
  },
}

export function pageName(site: Site, path: string): string {
  return site.pages.find((p) => p.path === path)?.name ?? path
}

const joinNames = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`)

/** "9 pages", "47 images on 21 pages", "Home and Contact pages", "Whole site" */
export function affectedLabel(site: Site, found: FoundIssue): string {
  const { count, pages } = found
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  switch (ISSUE_TEXT[found.id].unit) {
    case 'image':
      return `${plural(count, 'image')} on ${plural(pages.length, 'page')}`
    case 'link':
      return `${plural(count, 'link')} on ${plural(pages.length, 'page')}`
    case 'redirect':
      return `${count} old ${count === 1 ? 'address' : 'addresses'}`
    case 'listing':
      return `${count} of ${site.listings.length - 1} listings`
    case 'site':
      return pages.length ? `${joinNames(pages.map((p) => pageName(site, p)))} ${pages.length === 1 ? 'page' : 'pages'}` : 'Whole site'
    default:
      return plural(count, 'page')
  }
}

/** The pages, links or listings behind an issue, for the "Show details" list. */
export function affectedDetails(site: Site, found: FoundIssue): string[] {
  if (found.id === 'broken-links') return site.brokenLinks.map((l) => `${pageName(site, l.from)} links to ${l.to}`)
  if (found.id === 'redirect-chains') return site.redirects.map((r) => [r.from, ...r.hops].join(' → '))
  if (found.id === 'listing-mismatch')
    return listingMismatches(site.listings).map((m) => `${site.listings.find((l) => l.id === m.id)?.label}: ${m.fields.join(' and ')} differ`)
  if (ISSUE_TEXT[found.id].unit === 'site') return []
  return found.pages.map((path) => {
    const page = site.pages.find((p) => p.path === path)
    if (found.id === 'alt-text' && page) return `${page.name}: ${page.imagesNoAlt || 'no'} without alt text`
    return page ? `${page.name} (${path})` : path
  })
}

const KEYWORDS: [query: string, start: number | null, now: number | null, monthly: number][] = [
  ['emergency plumber bristol', 19, 14, 1300],
  ['boiler repair bristol', 11, 9, 880],
  ['boiler installation bristol', 18, 22, 590],
  ['plumber clifton', 9, 6, 170],
  ['landlord gas safety certificate bristol', 27, 31, 260],
  ['bathroom fitters bristol', null, null, 720],
  ['central heating repair bristol', 24, 17, 210],
]

function sampleKeywords(): Keyword[] {
  return KEYWORDS.map(([query, start, position, monthly], i) => ({
    id: `kw-${i + 1}`,
    query,
    position,
    history: positionHistory(start, position, hashText(query)),
    monthly,
    addedByVisitor: false,
  }))
}

export function auditRecord(id: string, at: number, result: AuditResult, site: Site): AuditRecord {
  return {
    id,
    at,
    score: result.score,
    categories: result.categories,
    issues: result.issues,
    pages: site.pages.length,
    homeLoad: result.homeLoad,
  }
}

export function createInitialState(): SeoState {
  const site = sampleSite()
  const before = runAudit({ ...site, insecureImages: INSECURE_PAGES })
  return {
    site,
    fixes: [],
    audits: [auditRecord('audit-1', daysAgoAt(8, 10, 15), before, site), auditRecord('audit-2', daysAgoAt(1, 16, 40), runAudit(site), site)],
    keywords: sampleKeywords(),
    drafted: 0,
  }
}
