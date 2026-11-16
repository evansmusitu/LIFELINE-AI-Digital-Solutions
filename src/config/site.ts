/** Business details from handoff/PROJECT_BRIEF.md. Change them here and every page updates. */
export const SITE = {
  /** Live address, no trailing slash. Used for link previews, canonical links and the sitemap. */
  url: 'https://lifeline.mftintelligence.com',
  brand: 'LIFELINE AI CONCIERGE',
  /** The home page's search-result description. Each demo page uses its card summary instead. */
  description:
    'Talk to Tari, our AI receptionist, by chat or video call, and try live demos of the AI chatbots, workflow automation, WhatsApp ordering and business systems LIFELINE AI CONCIERGE builds.',
  /** The text under the home page's link preview on WhatsApp, Facebook, LinkedIn and X. Goes with public/og-image.jpg. */
  previewDescription:
    'Talk to Tari, our AI receptionist, by chat or face-to-face video call. Then try live demos of what AI and automation can do for your business. Free, no sign-up.',
  tagline: 'Smart Technology. Practical Innovation. Business Growth.',
  headline: 'See what AI and automation can do for your business.',
  headlineCta: 'Try it live.',
  whatsappNumber: '263781572008',
  whatsappDisplay: '+263 781 572 008',
  whatsappChannelUrl: 'https://whatsapp.com/channel/0029VbES1BzFMqrPyrFUJt2T',
  email: 'support@mftintelligence.com',
  founder: { name: 'Evans Musitu', initials: 'EM', role: 'Founder and Lead Developer' },
  /** The earlier 16-demo studio. Linked as "more demos" until all 25 demos are live here; then remove the links. */
  earlierStudioUrl: 'https://lifeline-digital-demo-studio-llx092.v2.appdeploy.ai/',
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
