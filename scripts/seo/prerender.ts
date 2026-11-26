/*
 * What search engines and AI assistants read before any JavaScript runs: plain HTML for each page
 * (put inside #root, and replaced by the app as soon as it starts), structured data (JSON-LD) and
 * llms.txt. Used by the studioPages plugin in vite.config.ts. Pure functions over plain data.
 */

export interface SeoSite {
  url: string
  brand: string
  description: string
  tagline: string
  headline: string
  whatsappNumber: string
  whatsappDisplay: string
  whatsappChannelUrl: string
  email: string
  founder: { name: string; role: string }
  base: string
}

export interface SeoDemo {
  slug: string
  title: string
  category: string
  summary: string
  intro: string
  highlights: string[]
  tryThis: string[]
  industries: string[]
  business: { name: string; location: string }
  build: { timeline: string; intro: string; steps: { when: string; title: string; detail: string }[]; services: string[] }
}

export interface SeoSolution {
  slug: string
  title: string
  metaTitle: string
  description: string
  audience: string
  intro: string
  problems: string[]
  build: string[]
  demos: string[]
  faqs: [string, string][]
}

export interface SeoContent {
  site: SeoSite
  about: { summary: string; view: string }
  services: readonly string[]
  demos: SeoDemo[]
  solutions: readonly SeoSolution[]
}

export const esc = (text: string) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const wa = (site: SeoSite) => `https://wa.me/${site.whatsappNumber}`
const list = (items: string[]) => `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`

function frame(site: SeoSite, body: string): string {
  return [
    '<div class="pre">',
    `<header class="pre-head"><a href="/">${esc(site.brand)}</a> <nav aria-label="Main"><a href="/#demos">Demos</a> <a href="/#solutions">Solutions</a> <a href="/#about">About</a> <a href="${wa(site)}">WhatsApp ${esc(site.whatsappDisplay)}</a></nav></header>`,
    `<main>${body}</main>`,
    `<footer class="pre-foot"><p>${esc(site.brand)}. ${esc(site.tagline)} ${esc(site.base)}</p><p>WhatsApp <a href="${wa(site)}">${esc(site.whatsappDisplay)}</a> · Email <a href="mailto:${esc(site.email)}">${esc(site.email)}</a></p></footer>`,
    '</div>',
  ].join('')
}

const demoLink = (d: SeoDemo) => `<li><a href="/demos/${d.slug}">${esc(d.title)}</a>: ${esc(d.summary)}</li>`

export function homeHtml(c: SeoContent): string {
  return frame(
    c.site,
    [
      `<h1>${esc(c.site.headline)}</h1>`,
      `<p>${esc(c.site.description)}</p>`,
      `<p>${esc(c.about.summary)} Our view is simple: ${esc(c.about.view)}</p>`,
      `<h2>Live demos</h2><p>Working examples of the systems we build, each set in an invented sample business. Free, no sign-up.</p>`,
      `<ul>${c.demos.map(demoLink).join('')}</ul>`,
      `<h2>Solutions</h2><ul>${c.solutions.map((s) => `<li><a href="/solutions/${s.slug}">${esc(s.title)}</a>: ${esc(s.description)}</li>`).join('')}</ul>`,
      `<h2>Services</h2>${list([...c.services])}`,
      `<h2>Talk to us</h2><p>Founder: ${esc(c.site.founder.name)}, ${esc(c.site.founder.role)}. WhatsApp <a href="${wa(c.site)}">${esc(c.site.whatsappDisplay)}</a>.</p>`,
    ].join(''),
  )
}

export function demoHtml(c: SeoContent, d: SeoDemo): string {
  const related = c.solutions.filter((s) => s.demos.includes(d.slug))
  return frame(
    c.site,
    [
      `<nav aria-label="Breadcrumb"><a href="/#demos">All demos</a> / ${esc(d.category)}</nav>`,
      `<h1>${esc(d.title)}</h1>`,
      `<p>${esc(d.intro)}</p>`,
      `<p>Sample business: ${esc(d.business.name)}, ${esc(d.business.location)}. Invented business and sample data.</p>`,
      `<h2>What it does</h2>${list(d.highlights)}`,
      `<h2>Try this</h2>${list(d.tryThis)}`,
      `<h2>How we’d build this for you</h2><p>${esc(d.build.intro)} Estimated timeline: ${esc(d.build.timeline)}.</p>`,
      `<ol>${d.build.steps.map((s) => `<li><strong>${esc(s.when)}: ${esc(s.title)}.</strong> ${esc(s.detail)}</li>`).join('')}</ol>`,
      `<h2>Services involved</h2>${list(d.build.services)}`,
      related.length ? `<h2>Related solutions</h2><ul>${related.map((s) => `<li><a href="/solutions/${s.slug}">${esc(s.title)}</a></li>`).join('')}</ul>` : '',
      `<p><a href="${wa(c.site)}">Get a quote for this on WhatsApp</a></p>`,
    ].join(''),
  )
}

export function solutionHtml(c: SeoContent, s: SeoSolution): string {
  const demos = s.demos.map((slug) => c.demos.find((d) => d.slug === slug)).filter((d): d is SeoDemo => !!d)
  return frame(
    c.site,
    [
      `<nav aria-label="Breadcrumb"><a href="/#solutions">All solutions</a></nav>`,
      `<h1>${esc(s.title)}</h1>`,
      `<p>${esc(s.intro)}</p>`,
      `<p>For: ${esc(s.audience)}</p>`,
      `<h2>Sound familiar?</h2>${list(s.problems)}`,
      `<h2>What we build</h2>${list(s.build)}`,
      `<h2>See it working: live demos</h2><ul>${demos.map(demoLink).join('')}</ul>`,
      `<h2>Questions</h2><dl>${s.faqs.map(([q, a]) => `<dt>${esc(q)}</dt><dd>${esc(a)}</dd>`).join('')}</dl>`,
      `<p><a href="${wa(c.site)}">Talk to us on WhatsApp</a></p>`,
    ].join(''),
  )
}

/* Structured data */

function organization(c: SeoContent) {
  return {
    '@type': ['Organization', 'ProfessionalService'],
    '@id': `${c.site.url}/#organization`,
    name: c.site.brand,
    url: `${c.site.url}/`,
    logo: `${c.site.url}/logo.png`,
    image: `${c.site.url}/og-image.jpg`,
    description: c.about.summary,
    slogan: c.site.tagline,
    telephone: `+${c.site.whatsappNumber}`,
    email: c.site.email,
    address: { '@type': 'PostalAddress', addressLocality: 'Harare', addressCountry: 'ZW' },
    areaServed: ['Zimbabwe', 'South Africa', 'Worldwide'],
    founder: { '@type': 'Person', name: c.site.founder.name, jobTitle: c.site.founder.role },
    knowsAbout: [...c.services],
    sameAs: [c.site.whatsappChannelUrl],
    contactPoint: { '@type': 'ContactPoint', contactType: 'sales', telephone: `+${c.site.whatsappNumber}`, email: c.site.email, availableLanguage: ['English', 'Shona'] },
  }
}

function crumbs(c: SeoContent, items: [string, string][]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${c.site.url}${path}` })),
  }
}

const script = (graph: object[]) =>
  `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>`

export function homeJsonLd(c: SeoContent): string {
  return script([
    organization(c),
    { '@type': 'WebSite', '@id': `${c.site.url}/#website`, url: `${c.site.url}/`, name: c.site.brand, publisher: { '@id': `${c.site.url}/#organization` }, inLanguage: 'en' },
    {
      '@type': 'ItemList',
      name: 'Live demos',
      itemListElement: c.demos.map((d, i) => ({ '@type': 'ListItem', position: i + 1, name: d.title, url: `${c.site.url}/demos/${d.slug}` })),
    },
  ])
}

export function demoJsonLd(c: SeoContent, d: SeoDemo): string {
  return script([
    organization(c),
    crumbs(c, [
      ['Home', '/'],
      ['Demos', '/#demos'],
      [d.title, `/demos/${d.slug}`],
    ]),
    {
      '@type': 'Service',
      name: d.title,
      description: d.summary,
      provider: { '@id': `${c.site.url}/#organization` },
      areaServed: ['Zimbabwe', 'South Africa', 'Worldwide'],
      url: `${c.site.url}/demos/${d.slug}`,
      serviceType: d.build.services.join(', '),
    },
  ])
}

export function solutionJsonLd(c: SeoContent, s: SeoSolution): string {
  return script([
    organization(c),
    crumbs(c, [
      ['Home', '/'],
      ['Solutions', '/#solutions'],
      [s.title, `/solutions/${s.slug}`],
    ]),
    { '@type': 'Service', name: s.title, description: s.description, audience: { '@type': 'Audience', audienceType: s.audience }, provider: { '@id': `${c.site.url}/#organization` }, areaServed: ['Zimbabwe', 'South Africa'], url: `${c.site.url}/solutions/${s.slug}` },
    { '@type': 'FAQPage', mainEntity: s.faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ])
}

/** A plain summary of the site for AI assistants (llmstxt.org). */
export function llmsTxt(c: SeoContent): string {
  return [
    `# ${c.site.brand}`,
    '',
    `> ${c.about.summary} ${c.site.base}`,
    '',
    `${c.site.description} Contact: WhatsApp ${c.site.whatsappDisplay} (${wa(c.site)}), email ${c.site.email}. Founder: ${c.site.founder.name}.`,
    '',
    '## Solutions',
    ...c.solutions.map((s) => `- [${s.title}](${c.site.url}/solutions/${s.slug}): ${s.description}`),
    '',
    '## Live demos (sample businesses, invented data)',
    ...c.demos.map((d) => `- [${d.title}](${c.site.url}/demos/${d.slug}): ${d.summary} Typical build: ${d.build.timeline}.`),
    '',
    '## Services',
    ...c.services.map((s) => `- ${s}`),
    '',
  ].join('\n')
}

/** Shown before the app starts, and to crawlers. Matches the site's dark look so the switch is quiet. */
export const PRERENDER_CSS =
  '.pre{max-width:62rem;margin:0 auto;padding:1.25rem 1rem 3rem;font:16px/1.6 system-ui,sans-serif;color:#dce3f2}.pre a{color:#00d4ff}.pre h1{font-size:2rem;line-height:1.2;color:#fff;margin:2rem 0 1rem}.pre h2{font-size:1.25rem;color:#fff;margin:2rem 0 .5rem}.pre-head{display:flex;flex-wrap:wrap;gap:1rem;justify-content:space-between;font-weight:600}.pre-head nav a{margin-left:1rem}.pre-foot{margin-top:3rem;font-size:.85rem;color:#9aa6c4}.pre dt{font-weight:600;color:#fff;margin-top:1rem}.pre dd{margin:0}'
