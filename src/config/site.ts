/** Business details from handoff/PROJECT_BRIEF.md. Change them here and every page updates. */
export const SITE = {
  /** Live address, no trailing slash. Used for link previews, canonical links and the sitemap. */
  url: 'https://lifeline-demo-studio.freelancer-d62.workers.dev',
  brand: 'LIFELINE AI CONCIERGE',
  /** The home page's search-result description. Each demo page uses its card summary instead. */
  description:
    'Try live demos of the AI chatbots, workflow automation, WhatsApp ordering and business systems LIFELINE AI CONCIERGE builds. Smart Technology. Practical Innovation. Business Growth.',
  tagline: 'Smart Technology. Practical Innovation. Business Growth.',
  headline: 'See what AI and automation can do for your business.',
  headlineCta: 'Try it live.',
  whatsappNumber: '263781572008',
  whatsappDisplay: '+263 781 572 008',
  whatsappChannelUrl: 'https://whatsapp.com/channel/0029VbES1BzFMqrPyrFUJt2T',
  base: 'Based in Zimbabwe. Working with businesses worldwide.',
} as const

/** The services LIFELINE sells (brief, section 4). Demo "How we'd build this" tags use these exact names. */
export const SERVICES = [
  'Website design, development and redesign',
  'Website maintenance and support',
  'AI chatbots and virtual assistants',
  'Business process and workflow automation',
  'Web applications and custom software',
  'Customer support and lead generation',
  'E-commerce and online stores',
  'API integrations and AI-powered systems',
  'Cloud deployment, hosting and monitoring',
  'Dashboards and data analytics',
  'Website security, backups and performance',
  'UI/UX design and digital branding',
  'SEO and website optimisation',
  'Digital transformation and technology consulting',
] as const

export type Service = (typeof SERVICES)[number]
