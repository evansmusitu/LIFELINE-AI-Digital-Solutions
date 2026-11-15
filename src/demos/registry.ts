import {
  Activity,
  Bot,
  Cable,
  Headset,
  PanelsLeftRight,
  ScanBarcode,
  SearchCheck,
  ShoppingBag,
  Stethoscope,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { Service } from '../config/site'

/*
 * One entry per demo. The studio home page, the demo page frame, the footer and the
 * WhatsApp messages all read from this list. Demo code loads only when it is opened.
 * To add a demo: create src/demos/<slug>/index.tsx and add an entry here.
 */

export const INDUSTRIES = [
  'Retail & e-commerce',
  'Food & hospitality',
  'Healthcare',
  'Professional services',
  'Property & construction',
] as const

export type Industry = (typeof INDUSTRIES)[number]

export type DemoCategory = 'AI & automation' | 'Sales & customers' | 'Operations & finance' | 'Services & local markets'

export interface BuildStep {
  when: string
  title: string
  detail: string
}

export interface DemoMeta {
  slug: string
  /** Number in the brief's list of 25 demos. */
  number: number
  title: string
  category: DemoCategory
  icon: LucideIcon
  /** One sentence for cards. */
  summary: string
  /** One or two sentences under the demo page heading. */
  intro: string
  highlights: string[]
  tryThis: string[]
  industries: Industry[]
  business: { name: string; location: string }
  build: {
    timeline: string
    intro: string
    steps: BuildStep[]
    services: Service[]
  }
  /** Starts downloading the demo code, for example when a card is hovered. */
  load: () => Promise<{ default: ComponentType }>
  Component: LazyExoticComponent<ComponentType>
}

/** Created once per demo at start-up, so each demo's code is fetched only when it is opened. */
function demoModule(load: () => Promise<{ default: ComponentType }>) {
  return { load, Component: lazy(load) }
}

export const DEMOS: DemoMeta[] = [
  {
    slug: 'ai-lead-chatbot',
    number: 1,
    title: 'AI lead-qualification chatbot',
    category: 'AI & automation',
    icon: Bot,
    summary:
      'A website assistant that asks the right questions, scores every enquiry and hands hot leads to your team while the customer is still chatting.',
    intro:
      'Chat as a customer of an interiors company. Then open the team inbox to see the lead score, the AI summary and the live handoff to a designer.',
    highlights: [
      'Qualifies enquiries day and night',
      'Scores each lead hot, warm or cold',
      'Hands hot leads to a person mid-chat',
    ],
    tryThis: [
      'Say you need about 6,000 sq ft by next month',
      'Type “can I speak to a person?”',
      'Reply as the designer in the Team inbox',
    ],
    industries: ['Professional services', 'Property & construction'],
    business: { name: 'Dunebridge Interiors', location: 'Dubai, UAE' },
    build: {
      timeline: '3 to 4 weeks',
      intro: 'Your assistant learns your services and asks your questions, and your team takes over at the right moment.',
      steps: [
        {
          when: 'Week 1',
          title: 'Agree the questions and scoring',
          detail: 'We work out what makes a good lead for you, which questions to ask and who should get each lead.',
        },
        {
          when: 'Week 2',
          title: 'Train the assistant on your business',
          detail: 'It learns your services, prices, service areas and common questions, written in your tone of voice.',
        },
        {
          when: 'Week 3',
          title: 'Connect your team and tools',
          detail: 'Live handoff to your staff on WhatsApp or a web inbox. Leads go to your CRM, a spreadsheet or email.',
        },
        {
          when: 'Week 4',
          title: 'Test, launch and improve',
          detail: 'We test with your team, go live on your website and WhatsApp, then review real conversations after 30 days.',
        },
      ],
      services: [
        'AI chatbots and virtual assistants',
        'Customer support and lead generation',
        'API integrations and AI-powered systems',
        'Website design, development and redesign',
      ],
    },
    ...demoModule(() => import('./lead-chatbot')),
  },
  {
    slug: 'ai-support-desk',
    number: 2,
    title: 'AI customer support desk',
    category: 'AI & automation',
    icon: Headset,
    summary:
      'An AI assistant reads every message, sorts it by topic and urgency, looks up the order and drafts the reply, so urgent problems never wait.',
    intro:
      'Write to an outdoor gear store as a customer and watch the assistant sort your message in seconds. Then work the team inbox: triage new tickets and send a suggested reply.',
    highlights: [
      'Email, WhatsApp and chat in one sorted inbox',
      'Answers “where is my order?” straight away',
      'Drafts replies with the order details filled in',
    ],
    tryThis: [
      'Send “Where is my order SO-48213?” from Get help',
      'Press “Triage new tickets” in the Inbox',
      'Open an urgent ticket and send the suggested reply',
    ],
    industries: ['Retail & e-commerce', 'Professional services'],
    business: { name: 'Grysbok Outdoor', location: 'Cape Town, South Africa' },
    build: {
      timeline: '3 to 6 weeks',
      intro: 'Your assistant learns your products, policies and past tickets, so it sorts and answers the way your best agent would.',
      steps: [
        {
          when: 'Week 1',
          title: 'Learn how you support customers',
          detail: 'We go through your past tickets with you to agree the topics, priorities, reply times and who handles what.',
        },
        {
          when: 'Week 2',
          title: 'Connect your channels and orders',
          detail: 'Email, WhatsApp Business and website chat come into one inbox, linked to your online store’s orders.',
        },
        {
          when: 'Weeks 3 to 4',
          title: 'Set up triage and reply drafts',
          detail: 'The assistant learns your topics and tone of voice, and the languages your customers write in.',
        },
        {
          when: 'Weeks 5 to 6',
          title: 'Test, launch and tune',
          detail: 'Your team checks the assistant’s labels for a week before automatic answers go live. Then we review accuracy after 30 days.',
        },
      ],
      services: [
        'AI chatbots and virtual assistants',
        'Customer support and lead generation',
        'API integrations and AI-powered systems',
        'Dashboards and data analytics',
      ],
    },
    ...demoModule(() => import('./ai-support-desk')),
  },
  {
    slug: 'workflow-automation',
    number: 3,
    title: 'Workflow automation builder',
    category: 'AI & automation',
    icon: Workflow,
    summary:
      'Connect your shop, invoices, email and WhatsApp so routine work runs itself. An order comes in, and the invoice and receipt go out.',
    intro:
      'Open a live workflow for an online homeware store, change a step, then run a test and watch each action produce its result.',
    highlights: [
      'Trigger, action, result. No code needed',
      'Test runs show every invoice, email and message',
      'Run history with automatic retries',
    ],
    tryThis: [
      'Run a test of the order → invoice → email workflow',
      'Add a WhatsApp alert step, then test again',
      'Start a new workflow from a template',
    ],
    industries: ['Retail & e-commerce', 'Professional services'],
    business: { name: 'Hartwell Loom', location: 'Leeds, UK' },
    build: {
      timeline: '2 to 6 weeks, depending on the number of workflows',
      intro: 'We find the jobs your team repeats every day and hand them to reliable automations.',
      steps: [
        {
          when: 'Week 1',
          title: 'Map your processes',
          detail: 'We list the repetitive jobs with your team: orders, invoices, follow-ups, stock and reports.',
        },
        {
          when: 'Week 2',
          title: 'Connect your tools',
          detail: 'We link the systems you already use, such as your online store, accounting software, email and WhatsApp Business.',
        },
        {
          when: 'Weeks 3 to 5',
          title: 'Build and test each workflow',
          detail: 'Every workflow is tested with sample data before it touches a real customer.',
        },
        {
          when: 'Ongoing',
          title: 'Monitor and support',
          detail: 'You get alerts if a step fails, automatic retries and a monthly report of the time saved.',
        },
      ],
      services: [
        'Business process and workflow automation',
        'API integrations and AI-powered systems',
        'Cloud deployment, hosting and monitoring',
        'Web applications and custom software',
      ],
    },
    ...demoModule(() => import('./workflow-automation')),
  },
  {
    slug: 'api-integration-hub',
    number: 4,
    title: 'API integration hub',
    category: 'AI & automation',
    icon: Cable,
    summary:
      'Your CRM, payments, accounting, email and WhatsApp share data by themselves. Every hand-off is tracked, and failed ones are retried for you.',
    intro:
      'Follow a rent payment through five systems at a property management company. See what happens when one app goes offline, then reconnect it and watch nothing get lost.',
    highlights: [
      'Payments, CRM, accounting and WhatsApp in sync',
      'Nothing lost when an app is down',
      'Problems explained in plain English, with one-tap fixes',
    ],
    tryThis: [
      'Press “Simulate a rent payment” and watch it reach every app',
      'Reconnect Accounting on the Errors screen and watch the waiting payments go through',
      'Connect the E-signatures app',
    ],
    industries: ['Property & construction', 'Professional services'],
    business: { name: 'Linden Hollow Property Management', location: 'Atlanta, Georgia, US' },
    build: {
      timeline: '3 to 8 weeks, depending on the number of apps',
      intro: 'We connect the tools you already pay for, so your team stops typing the same details into each one.',
      steps: [
        {
          when: 'Week 1',
          title: 'Map your systems',
          detail: 'We list every tool you use, what each one needs to know and where your team retypes information today.',
        },
        {
          when: 'Weeks 2 to 4',
          title: 'Connect each app',
          detail: 'We use each tool’s official connection (its API), with access keys stored securely and test accounts first.',
        },
        {
          when: 'Weeks 4 to 6',
          title: 'Mapping, retries and alerts',
          detail: 'Fields are matched between apps, failed hand-offs retry automatically, and you’re alerted only when you need to act.',
        },
        {
          when: 'Weeks 6 to 8',
          title: 'Run side by side, then switch',
          detail: 'The hub runs alongside your current process for a week, so you can check every record before you rely on it.',
        },
      ],
      services: [
        'API integrations and AI-powered systems',
        'Business process and workflow automation',
        'Cloud deployment, hosting and monitoring',
        'Web applications and custom software',
      ],
    },
    ...demoModule(() => import('./api-integration-hub')),
  },
  {
    slug: 'website-health-monitor',
    number: 5,
    title: 'Website health and security monitor',
    category: 'AI & automation',
    icon: Activity,
    summary:
      'Know the minute your website goes down. Uptime checks, nightly off-site backups and a security score with one-tap fixes, with alerts on WhatsApp.',
    intro:
      'Open a safari lodge’s website care dashboard. Simulate an outage on the booking site, fix security issues until the score passes 90, and restore a backup safely.',
    highlights: [
      'Checks your sites every minute from 4 places',
      'WhatsApp alert and automatic restart if a site goes down',
      'Nightly off-site backups you can restore safely',
    ],
    tryThis: [
      'Press “Simulate an outage” on Uptime and watch the alert and recovery',
      'Fix the security issues until the score passes 90',
      'Restore last night’s backup to a test copy',
    ],
    industries: ['Food & hospitality', 'Retail & e-commerce'],
    business: { name: 'Hornbill Spray Lodge', location: 'Victoria Falls, Zimbabwe' },
    build: {
      timeline: '1 to 2 weeks to set up, then ongoing care',
      intro: 'We look after your website like a building manager: watching it day and night, and fixing problems before guests notice.',
      steps: [
        {
          when: 'Days 1 to 3',
          title: 'Health check',
          detail: 'We review your hosting, software versions, certificates, domain renewals and current backups.',
        },
        {
          when: 'Week 1',
          title: 'Monitoring and alerts',
          detail: 'Your sites are checked every minute from several countries, with alerts to the right people on WhatsApp and email.',
        },
        {
          when: 'Week 2',
          title: 'Backups and security fixes',
          detail: 'Nightly off-site backups with a test restore, safe updates, two-step login for staff and certificates that renew themselves.',
        },
        {
          when: 'Ongoing',
          title: 'Monthly care',
          detail: 'Updates installed safely each month, and a one-page report on uptime, backups and security.',
        },
      ],
      services: [
        'Website security, backups and performance',
        'Website maintenance and support',
        'Cloud deployment, hosting and monitoring',
      ],
    },
    ...demoModule(() => import('./website-health-monitor')),
  },
  {
    slug: 'seo-audit',
    number: 6,
    title: 'SEO audit tool',
    category: 'AI & automation',
    icon: SearchCheck,
    summary:
      'Find out why customers can’t find you in search. A score for every part of your site and a plain-English fix list, ordered by what matters most.',
    intro:
      'Audit a Bristol plumber’s website, fix the problems that matter most and run the audit again to watch the score climb. Then ask us to check your own site.',
    highlights: [
      'Score and fix list in plain English',
      'Search result preview with live checks',
      'Local search checks for trades and shops',
    ],
    tryThis: [
      'Press “Run a new audit” and watch the score',
      'Shorten the home page title in Search preview and save it',
      'Mark the top fixes as done, then run the audit again',
    ],
    industries: ['Property & construction', 'Professional services'],
    business: { name: 'Avonmere Plumbing & Heating', location: 'Bristol, UK' },
    build: {
      timeline: '1 week for the audit, then 4 to 8 weeks of fixes',
      intro: 'We fix what holds your site back in search, biggest problems first. Nobody can promise the top spot, but every fix makes you easier to find.',
      steps: [
        {
          when: 'Week 1',
          title: 'Full audit and plan',
          detail: 'We check every page, your speed on mobile and your map and directory listings, then agree a fix list in plain English.',
        },
        {
          when: 'Weeks 2 to 3',
          title: 'Technical and speed fixes',
          detail: 'Broken links, slow images, missing sitemap and mobile problems fixed first, because they affect every page.',
        },
        {
          when: 'Weeks 3 to 6',
          title: 'Content and local search',
          detail: 'Titles and descriptions written for real searches, stronger service and area pages, and the same details on every listing.',
        },
        {
          when: 'Ongoing',
          title: 'Track and report',
          detail: 'Each month you see your score, your positions for the searches that matter and what we’re fixing next.',
        },
      ],
      services: [
        'SEO and website optimisation',
        'Website design, development and redesign',
        'Website security, backups and performance',
      ],
    },
    ...demoModule(() => import('./seo-audit')),
  },
  {
    slug: 'website-redesign',
    number: 7,
    title: 'Website redesign: before and after',
    category: 'AI & automation',
    icon: PanelsLeftRight,
    summary:
      'See a dated, slow website become fast, clear and built for phones, with the call and WhatsApp buttons right where customers look.',
    intro:
      'Drag the slider across a borehole company’s old and new website, see what changed and why, then send an enquiry from the new site and find it on the team side.',
    highlights: [
      'Before and after on phone and desktop',
      '8 changes explained in plain English',
      'Enquiries arrive with name, phone and area',
    ],
    tryThis: [
      'Drag the slider to compare the old and new home page',
      'Open “What changed” and press “Show on the page” on any change',
      'Send an enquiry from the New site, then find it in Enquiries',
    ],
    industries: ['Property & construction', 'Professional services'],
    business: { name: 'Kopje Spring Drilling', location: 'Harare, Zimbabwe' },
    build: {
      timeline: '3 to 6 weeks',
      intro: 'We rebuild your site around what customers came to do: find out what you offer, trust you and get in touch.',
      steps: [
        {
          when: 'Week 1',
          title: 'Review your current site',
          detail: 'We look at what customers search for, which pages they use and where they give up, and agree what the new site must do.',
        },
        {
          when: 'Week 2',
          title: 'Design for phones first',
          detail: 'You see the new look on your own phone and approve it before we build anything.',
        },
        {
          when: 'Weeks 3 to 5',
          title: 'Build and move your content',
          detail: 'Fast pages, clear call and WhatsApp buttons and a short enquiry form. Old page addresses are redirected so your search ranking carries over.',
        },
        {
          when: 'Week 6',
          title: 'Launch and hand over',
          detail: 'We launch, check every page on real phones and show your team how to update prices and photos.',
        },
      ],
      services: [
        'Website design, development and redesign',
        'UI/UX design and digital branding',
        'SEO and website optimisation',
        'Website maintenance and support',
      ],
    },
    ...demoModule(() => import('./website-redesign')),
  },
  {
    slug: 'whatsapp-ordering',
    number: 9,
    title: 'WhatsApp ordering catalogue',
    category: 'Sales & customers',
    icon: ShoppingBag,
    summary:
      'A mobile catalogue where customers choose items and send a clear, ready-to-confirm order to your WhatsApp in one tap.',
    intro:
      'Order from a Harare bakery as a customer, see the WhatsApp message it builds, then manage the order from the shop side.',
    highlights: [
      'Catalogue with options and delivery areas',
      'Builds a tidy, pre-filled WhatsApp order',
      'Order dashboard with one-tap status replies',
    ],
    tryThis: [
      'Add a cake and two coffees to your order',
      'Choose delivery and preview the WhatsApp message',
      'Move the order to “Out for delivery” in Shop orders',
    ],
    industries: ['Food & hospitality', 'Retail & e-commerce'],
    business: { name: 'Jacaranda & Rye Bakehouse', location: 'Harare, Zimbabwe' },
    build: {
      timeline: '1 to 3 weeks',
      intro: 'Customers keep ordering on the app they already use, and your staff get orders they can confirm at a glance.',
      steps: [
        {
          when: 'Week 1',
          title: 'Set up your catalogue',
          detail: 'We add your products, prices, options and photos, plus delivery areas and fees.',
        },
        {
          when: 'Week 1',
          title: 'Shape the order message',
          detail: 'Orders reach your WhatsApp number in a format your staff can check and confirm quickly.',
        },
        {
          when: 'Week 2',
          title: 'Add your order dashboard',
          detail: 'Follow every order from new to delivered and send status updates in one tap.',
        },
        {
          when: 'Week 3',
          title: 'Launch and promote',
          detail: 'You get a catalogue link and QR code for your WhatsApp status, social pages and shop window.',
        },
      ],
      services: [
        'E-commerce and online stores',
        'Website design, development and redesign',
        'UI/UX design and digital branding',
        'SEO and website optimisation',
      ],
    },
    ...demoModule(() => import('./whatsapp-ordering')),
  },
  {
    slug: 'inventory-pos',
    number: 16,
    title: 'Inventory and point of sale',
    category: 'Operations & finance',
    icon: ScanBarcode,
    summary:
      'A till that updates stock with every sale, warns you before items run out and shows the day’s takings at a glance.',
    intro:
      'Ring up a sale at a hardware store and watch the stock drop. Then turn low-stock alerts into a purchase order for the supplier.',
    highlights: ['Quick checkout with receipts', 'Low-stock alerts and supplier orders', 'Daily sales, margins and top sellers'],
    tryThis: [
      'Sell 3 rolls of painter’s tape and check Reorder',
      'Create a purchase order and send it',
      'Open today’s sales and the end-of-day summary',
    ],
    industries: ['Retail & e-commerce', 'Food & hospitality'],
    business: { name: 'Bramblewood Hardware & Garden', location: 'Austin, Texas, US' },
    build: {
      timeline: '4 to 8 weeks',
      intro: 'One system for the till, the stockroom and the reports, set up around the way your shop already works.',
      steps: [
        {
          when: 'Weeks 1 to 2',
          title: 'Import your products and stock',
          detail: 'We bring in your product list from spreadsheets or your old system, with prices, costs and suppliers.',
        },
        {
          when: 'Weeks 2 to 4',
          title: 'Set up the till',
          detail: 'It runs on a tablet, laptop or phone, with barcode scanners and receipt printers if you use them.',
        },
        {
          when: 'Weeks 4 to 6',
          title: 'Reorder rules and reports',
          detail: 'Reorder levels, supplier purchase orders, and daily, weekly and monthly reports.',
        },
        {
          when: 'Weeks 6 to 8',
          title: 'Train your staff and go live',
          detail: 'We train your team and run beside your current system for a week before you switch over.',
        },
      ],
      services: [
        'Web applications and custom software',
        'Dashboards and data analytics',
        'Cloud deployment, hosting and monitoring',
        'Website maintenance and support',
      ],
    },
    ...demoModule(() => import('./inventory-pos')),
  },
  {
    slug: 'clinic-pharmacy',
    number: 22,
    title: 'Clinic and pharmacy system',
    category: 'Services & local markets',
    icon: Stethoscope,
    summary:
      'Appointments, WhatsApp reminders, prescriptions and pharmacy stock in one place, so patients turn up and medicines don’t run out.',
    intro:
      'Run a morning at a family clinic: check patients in, send reminders, dispense a prescription and watch the pharmacy stock update.',
    highlights: [
      'Day view of appointments and the waiting room',
      'WhatsApp reminders patients can confirm',
      'Pharmacy stock by batch and expiry date',
    ],
    tryThis: [
      'Check in the next patient and complete the visit',
      'Send tomorrow’s reminders and watch replies arrive',
      'Dispense a prescription, then check the stock',
    ],
    industries: ['Healthcare'],
    business: { name: 'Lindhaven Family Clinic & Pharmacy', location: 'Bulawayo, Zimbabwe' },
    build: {
      timeline: '6 to 10 weeks',
      intro: 'A calmer front desk, fewer missed appointments and a pharmacy that knows what to reorder.',
      steps: [
        {
          when: 'Weeks 1 to 2',
          title: 'Learn how your clinic runs',
          detail: 'We follow a normal day at the front desk, in the consulting rooms and at the pharmacy counter.',
        },
        {
          when: 'Weeks 3 to 5',
          title: 'Appointments and reminders',
          detail: 'Front-desk and online booking, with WhatsApp or SMS reminders that patients can confirm.',
        },
        {
          when: 'Weeks 5 to 8',
          title: 'Pharmacy and prescriptions',
          detail: 'Stock by batch and expiry date, prescriptions sent straight to the dispensary, and reorder alerts.',
        },
        {
          when: 'Weeks 8 to 10',
          title: 'Secure launch',
          detail: 'Staff logins with the right permissions, encrypted daily backups, training and go-live support.',
        },
      ],
      services: [
        'Web applications and custom software',
        'Business process and workflow automation',
        'Website security, backups and performance',
        'Cloud deployment, hosting and monitoring',
      ],
    },
    ...demoModule(() => import('./clinic-pharmacy')),
  },
]

export function findDemo(slug: string): DemoMeta | undefined {
  return DEMOS.find((demo) => demo.slug === slug)
}
