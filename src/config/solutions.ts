/*
 * Solution pages: one page for each kind of problem a business searches for, at /solutions/<slug>.
 * Each points to the demos that show it. The React page (src/pages/SolutionPage.tsx) and the build's
 * pre-rendered HTML and search data (vite.config.ts) both read from here, so they always agree.
 * Only facts LIFELINE stands behind: no prices, client names, results or guarantees.
 */

export interface Solution {
  slug: string
  /** The page heading. Written the way people search. */
  title: string
  /** The search-result title. */
  metaTitle: string
  /** The search-result description, under 160 characters. */
  description: string
  /** Who it is for, one line. */
  audience: string
  intro: string
  problems: string[]
  build: string[]
  /** Demo slugs, most relevant first. */
  demos: string[]
  faqs: [question: string, answer: string][]
}

const PRICE_FAQ: [string, string] = [
  'How much does it cost?',
  'It depends on what you need. After a short WhatsApp chat about your business, we agree the scope, timeline and price in writing before any work starts, including any outside service costs.',
]

const TRY_FAQ: [string, string] = [
  'Can I try it before I pay?',
  'Yes. Every demo on this site works on your phone, free and with no sign-up. They use invented sample businesses, so you can click everything.',
]

export const SOLUTIONS: readonly Solution[] = [
  {
    slug: 'whatsapp-business-automation',
    title: 'WhatsApp ordering, bookings and replies for your business',
    metaTitle: 'WhatsApp ordering and automation for businesses in Zimbabwe | LIFELINE AI CONCIERGE',
    description:
      'Take orders and bookings on WhatsApp without the chaos of voice notes: a catalogue, clear order messages, confirmations and reminders. Built in Zimbabwe.',
    audience: 'Shops, bakeries, takeaways, restaurants, salons and any business whose customers message on WhatsApp.',
    intro:
      'Your customers already use WhatsApp. We build a catalogue or booking page they open from your chats, so every order and booking arrives as one clear message, in USD or ZiG, with EcoCash, InnBucks, card or cash.',
    problems: [
      'Orders arrive as voice notes and long chats, and details get missed.',
      'Customers ask the same questions about prices, hours and delivery all day.',
      'Bookings clash, and no-shows cost you money.',
    ],
    build: [
      'A WhatsApp catalogue with your products, prices and delivery areas.',
      'Order and booking messages your team can act on straight away.',
      'Confirmations and reminders sent automatically.',
      'An AI assistant that answers common questions and hands over to a person.',
    ],
    demos: ['whatsapp-ordering', 'restaurant-delivery', 'salon-spa-booking', 'ai-support-desk'],
    faqs: [
      ['Do my customers need a new app?', 'No. They tap a link in WhatsApp and order or book in their phone’s browser. The order comes back to your WhatsApp.'],
      ['Can customers pay in ZiG or with EcoCash?', 'Yes. Prices can show in USD and ZiG, and customers can choose cash, EcoCash, InnBucks, card or bank transfer.'],
      PRICE_FAQ,
      TRY_FAQ,
    ],
  },
  {
    slug: 'ai-chatbot-for-business',
    title: 'AI chatbots and AI receptionists for your business',
    metaTitle: 'AI chatbots and AI receptionists in Zimbabwe and South Africa | LIFELINE AI CONCIERGE',
    description:
      'An AI assistant on your website and WhatsApp that answers customers day and night from your own facts, captures leads and hands over to your team.',
    audience: 'Service businesses, clinics, consultants, schools and shops that get the same questions every day.',
    intro:
      'We build AI assistants that know your services, prices and policies and stay within them. They answer in English or Shona, capture enquiries, book appointments and pass the conversation to a person when it matters. Talk to Tari, our own AI receptionist, on this site to see one at work.',
    problems: [
      'Enquiries come in after hours and nobody answers until the next day.',
      'Staff spend hours answering the same questions.',
      'Leads are lost because nobody follows up quickly.',
    ],
    build: [
      'An assistant trained on your own services, prices and rules, with clear limits on what it may say.',
      'Lead capture and hand-over to your team on WhatsApp.',
      'The same assistant on your website and your WhatsApp number.',
      'Safety rules for sensitive topics, such as health or children, written into the assistant.',
    ],
    demos: ['ai-lead-chatbot', 'ai-support-desk', 'wellness-consulting', 'school-admissions', 'ai-document-assistant'],
    faqs: [
      ['Will it make things up?', 'It answers only from the facts you give it, and says when it doesn’t know. Every assistant we build has written rules and is tested before it goes live.'],
      ['Can it reply in Shona?', 'Yes. It replies in the language the customer writes in, including Shona and Ndebele, when it can write it well, and in simple English otherwise.'],
      PRICE_FAQ,
      TRY_FAQ,
    ],
  },
  {
    slug: 'school-software-zimbabwe',
    title: 'School admissions, fees and coursework software for Zimbabwean schools',
    metaTitle: 'School admissions, fees and ZIMSEC coursework software in Zimbabwe | LIFELINE AI CONCIERGE',
    description:
      'An AI admissions assistant for parents, fees in USD and ZiG with approved levies and audit trails, and ZIMSEC coursework deadlines and report comments.',
    audience: 'Private, trust, mission and government schools, heads, bursars, School Development Committees and teachers.',
    intro:
      'Three tools built around problems Zimbabwean schools report: parents who can’t get answers, fees in two currencies with levies that need approval, and coursework deadlines on top of heavy teaching loads. Each works next to the school system or spreadsheet you already use.',
    problems: [
      'Parents phone and message the office all day about fees, dates and transfers.',
      'Fees in USD and ZiG, arrears, and levies that must be approved and accounted for.',
      'Continuous assessment marks, project authenticity and report comments take teachers’ evenings.',
    ],
    build: [
      'An admissions assistant for parents in English and Shona, with tours, applications and urgent notices.',
      'Fee statements in USD and ZiG, payment links for family abroad, plans instead of sending children home, and a levy ledger with an audit trail.',
      'A coursework tracker with board deadlines and an upload export, a project log, and AI-drafted report comments that teachers approve.',
    ],
    demos: ['school-admissions', 'school-fees', 'teacher-coursework'],
    faqs: [
      ['Do pupils use the AI?', 'No. The assistants are for parents and staff only. The admissions assistant never asks for a child’s details, and report comments are drafted from marks without names.'],
      ['Does it replace our school system?', 'No. It works next to the system or spreadsheet you already use, so you don’t have to switch.'],
      ['Does it work for Kenyan schools?', 'The coursework tracker can follow any exam board’s deadlines. The demo includes a KNEC example.'],
      PRICE_FAQ,
    ],
  },
  {
    slug: 'online-booking-and-clinic-systems',
    title: 'Online booking, clinic and pharmacy systems',
    metaTitle: 'Online booking, clinic and pharmacy systems in Zimbabwe | LIFELINE AI CONCIERGE',
    description:
      'Online booking that fits your real diary, WhatsApp reminders, front desk and pharmacy stock: systems for clinics, salons, spas and consultants.',
    audience: 'Clinics, pharmacies, salons, spas, wellness practices and consultants.',
    intro:
      'Clients book a service and a time that really fits your diary, get a WhatsApp confirmation and a reminder, and your team sees everything in one calendar. For clinics, the front desk, reminders, dispensing and pharmacy stock work together.',
    problems: ['Bookings by phone clash or get forgotten.', 'No-shows waste time slots.', 'Stock runs out without warning.'],
    build: [
      'Online booking for each service, staff member and branch.',
      'WhatsApp confirmations and reminders.',
      'Front desk, patient reminders, dispensing and stock alerts for clinics and pharmacies.',
    ],
    demos: ['salon-spa-booking', 'clinic-pharmacy', 'wellness-consulting'],
    faqs: [
      ['Can it handle more than one branch?', 'Yes. Each branch can have its own hours, staff and services, as the wellness demo shows for Harare and Johannesburg.'],
      PRICE_FAQ,
      TRY_FAQ,
    ],
  },
  {
    slug: 'business-systems-pos-crm',
    title: 'Point of sale, inventory, CRM and workflow automation',
    metaTitle: 'Point of sale, inventory, CRM and workflow automation for small businesses | LIFELINE AI CONCIERGE',
    description:
      'Checkout and stock, a sales pipeline with follow-ups, event tickets and automations that take repetitive work off your team.',
    audience: 'Shops, hardware stores, event organisers, sales teams and growing businesses.',
    intro:
      'Simple systems that fit how your business works: a checkout with live stock and reorder alerts, a sales pipeline that reminds you to follow up, ticketing with QR codes, and automations that move information between your tools.',
    problems: ['Stock counts are wrong and reorders are late.', 'Leads go cold because follow-ups are forgotten.', 'The same data is typed into three places.'],
    build: ['Point of sale with inventory and purchase orders.', 'A CRM pipeline with follow-ups and proposals.', 'Event ticketing with QR check-in.', 'Workflow automation and integrations between your tools.'],
    demos: ['inventory-pos', 'crm-pipeline', 'events-ticketing', 'workflow-automation', 'api-integration-hub'],
    faqs: [PRICE_FAQ, TRY_FAQ],
  },
  {
    slug: 'website-design-zimbabwe',
    title: 'Website design, redesign and SEO',
    metaTitle: 'Website design, redesign and SEO in Zimbabwe | LIFELINE AI CONCIERGE',
    description:
      'Fast, mobile-first websites that load on weak connections, a clear before-and-after redesign, SEO audits and website health monitoring.',
    audience: 'Any business that needs a professional website or wants its current site to bring in more customers.',
    intro:
      'Most customers find you on their phone, often on a slow connection. We build websites that load fast, explain what you do in plain words and make it easy to contact you on WhatsApp, then keep them healthy and visible in search.',
    problems: ['The website is slow, out of date or hard to use on a phone.', 'Customers can’t find you on Google.', 'Nobody notices when the site goes down.'],
    build: ['A mobile-first website or redesign.', 'An SEO audit with clear fixes.', 'Uptime, security and performance monitoring.'],
    demos: ['website-redesign', 'seo-audit', 'website-health-monitor'],
    faqs: [PRICE_FAQ, TRY_FAQ],
  },
]

export const findSolution = (slug: string) => SOLUTIONS.find((s) => s.slug === slug)
