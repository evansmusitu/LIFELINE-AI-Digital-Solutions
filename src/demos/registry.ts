import {
  Activity,
  BookMarked,
  Bot,
  Cable,
  FileSearch,
  GraduationCap,
  Headset,
  Leaf,
  PanelsLeftRight,
  ScanBarcode,
  Scissors,
  SearchCheck,
  ShoppingBag,
  SquareKanban,
  Stethoscope,
  Ticket,
  UtensilsCrossed,
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

/**
 * THE SWITCH for the wellness consulting demo (/demos/wellness-consulting).
 * false: unlisted. It works for anyone with the link, but it is left out of the gallery, the footer,
 * "More demos", the demo count, the sitemap and the AI receptionist's knowledge, and its page asks
 * search engines not to index it (noindex).
 * true: listed like every other demo. Nothing else needs changing.
 */
export const LIST_WELLNESS_DEMO = true

/**
 * THE SWITCH for the school admissions demo (/demos/school-admissions). Works the same way as
 * LIST_WELLNESS_DEMO: false keeps it unlisted (link only, noindex), true lists it.
 */
export const LIST_SCHOOL_DEMO = false

/** THE SWITCH for the teacher coursework demo (/demos/teacher-coursework). Same as the others. */
export const LIST_TEACHER_DEMO = false

export const INDUSTRIES = [
  'Retail & e-commerce',
  'Food & hospitality',
  'Healthcare',
  'Professional services',
  'Property & construction',
  'Beauty & wellness',
  'Events & tourism',
  'Education',
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
  /** Number in the brief's list of 25 demos, or 0 for a demo outside that list. */
  number: number
  /**
   * false: reachable by its link only, with noindex, and left out of every list, the sitemap and the
   * receptionist's knowledge. Leave it out (or true) for a normal, listed demo.
   */
  listed?: boolean
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

/** Every demo with a page, listed or not. Pages, routing and the build use this. */
export const ALL_DEMOS: DemoMeta[] = [
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
    slug: 'ai-document-assistant',
    number: 8,
    title: 'AI document assistant',
    category: 'AI & automation',
    icon: FileSearch,
    summary:
      'Ask your price list and policies a question and get the answer in seconds, with the source shown. When the documents don’t say, it says so instead of guessing.',
    intro:
      'Ask a builders’ merchant’s assistant about prices, delivery and returns, see where each answer comes from, then try it with your own price list or policy.',
    highlights: [
      'Answers from your own documents, with sources',
      'Works out prices for any quantity',
      'Try it with your own file. It stays in your browser',
    ],
    tryThis: [
      'Ask “How much for 40 bags of Portland cement?” and check the source',
      'Ask “Do you sell solar panels?” and add an answer for it in Insights',
      'Upload your own price list or policy in Documents and ask about it',
    ],
    industries: ['Retail & e-commerce', 'Property & construction', 'Professional services'],
    business: { name: 'Irkdale Building Supplies', location: 'Manchester, UK' },
    build: {
      timeline: '2 to 4 weeks',
      intro: 'Your assistant reads your price lists, policies and manuals, answers staff and customers, and shows where every answer came from.',
      steps: [
        {
          when: 'Week 1',
          title: 'Gather your documents',
          detail: 'Price lists, policies, manuals and FAQs in whatever form you have them: PDF, Word, Excel or web pages.',
        },
        {
          when: 'Week 2',
          title: 'Set up the assistant',
          detail: 'It learns your documents and answers with sources. Anything it can’t find goes to a person instead of a guess.',
        },
        {
          when: 'Week 3',
          title: 'Put it where questions arrive',
          detail: 'On your website, on WhatsApp Business and at the counter, with a handoff to your team for orders and quotes.',
        },
        {
          when: 'Week 4',
          title: 'Test, launch and keep it current',
          detail: 'Your team checks real questions before launch. When you update a price list, the answers update with it.',
        },
      ],
      services: [
        'AI chatbots and virtual assistants',
        'API integrations and AI-powered systems',
        'Customer support and lead generation',
        'Web applications and custom software',
      ],
    },
    ...demoModule(() => import('./ai-document-assistant')),
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
    slug: 'restaurant-delivery',
    number: 10,
    title: 'Restaurant and delivery app',
    category: 'Sales & customers',
    icon: UtensilsCrossed,
    summary:
      'Customers order from your menu, the kitchen sees every ticket on one screen, and diners follow their food from the grill to their door.',
    intro:
      'Order dinner from an Abu Dhabi grill kitchen, then switch to the kitchen screen and cook it. Watch the customer’s tracker move, and take a dish off the menu when it runs out.',
    highlights: [
      'Menu with options, delivery areas and live ETAs',
      'Kitchen screen with timers, instead of paper tickets',
      'Order tracking customers can follow',
    ],
    tryThis: [
      'Order a mixed grill with extra bread for delivery to Al Reem Island',
      'Press “Start cooking” on your ticket in the Kitchen, then watch Track order',
      'Switch off kunafa in the Menu manager and see it sold out on the Menu',
    ],
    industries: ['Food & hospitality'],
    business: { name: 'Dhow & Thyme', location: 'Abu Dhabi, UAE' },
    build: {
      timeline: '4 to 7 weeks',
      intro: 'Your own ordering app with no commission per order, a kitchen screen your chefs will actually use, and tracking your customers can trust.',
      steps: [
        {
          when: 'Week 1',
          title: 'Menu and delivery areas',
          detail: 'We set up your dishes, options, prices and photos, plus delivery areas with fees, minimums and times.',
        },
        {
          when: 'Weeks 2 to 3',
          title: 'Ordering and payments',
          detail: 'Ordering on your website and as an app on customers’ phones, with card, cash on delivery or your payment provider.',
        },
        {
          when: 'Weeks 4 to 5',
          title: 'Kitchen screen and riders',
          detail: 'Tickets go straight to a kitchen tablet with timers. Riders get the address and customers get live updates by WhatsApp or SMS.',
        },
        {
          when: 'Weeks 6 to 7',
          title: 'Trial nights and launch',
          detail: 'We run trial services with your team before launch, then watch the first busy weekend with you.',
        },
      ],
      services: [
        'E-commerce and online stores',
        'Web applications and custom software',
        'Dashboards and data analytics',
        'UI/UX design and digital branding',
      ],
    },
    ...demoModule(() => import('./restaurant-delivery')),
  },
  {
    slug: 'salon-spa-booking',
    number: 11,
    title: 'Salon and spa booking',
    category: 'Sales & customers',
    icon: Scissors,
    summary:
      'Clients book the right stylist and time online, day or night. Deposits stop no-shows, and loyalty points and referral codes bring them back with friends.',
    intro:
      'Book a massage at a Johannesburg salon and spa, pay the deposit, then find the booking in the team calendar. Check the client in and redeem a reward on their loyalty card.',
    highlights: [
      'Online booking with each stylist’s real free times',
      'Deposits that cut no-shows',
      'Loyalty points and WhatsApp referral codes',
    ],
    tryThis: [
      'Book a 90-minute Swedish massage with Kgomotso and pay the deposit',
      'Find your booking in the Calendar and press “Check in”',
      'Redeem a free blow-dry on the Loyalty card',
    ],
    industries: ['Beauty & wellness', 'Healthcare'],
    business: { name: 'Sunbird & Sage Salon & Spa', location: 'Johannesburg, South Africa' },
    build: {
      timeline: '3 to 5 weeks',
      intro: 'Online booking that knows each stylist’s diary, with deposits, reminders and a loyalty programme your clients will use.',
      steps: [
        {
          when: 'Week 1',
          title: 'Services, team and hours',
          detail: 'We set up your treatments, prices and durations, who does what, working hours, breaks and your deposit rules.',
        },
        {
          when: 'Week 2',
          title: 'Online booking and deposits',
          detail: 'Booking on your website and Instagram link, with deposits through your payment provider and calendar invites for clients.',
        },
        {
          when: 'Weeks 3 to 4',
          title: 'Reminders and loyalty',
          detail: 'WhatsApp reminders the day before, rebooking prompts, points on every visit and referral codes clients can share.',
        },
        {
          when: 'Week 5',
          title: 'Move your clients over and launch',
          detail: 'We import your client list and upcoming bookings, and train your team on the calendar.',
        },
      ],
      services: [
        'Web applications and custom software',
        'Business process and workflow automation',
        'Customer support and lead generation',
        'UI/UX design and digital branding',
      ],
    },
    ...demoModule(() => import('./salon-spa-booking')),
  },
  {
    slug: 'crm-pipeline',
    number: 12,
    title: 'CRM and lead pipeline',
    category: 'Sales & customers',
    icon: SquareKanban,
    summary:
      'Every lead on one board with an owner and a next step. Reminders make sure nothing is forgotten, and proposals are priced in a minute.',
    intro:
      'Send an enquiry to a commercial cleaning company and watch it land on the sales board. Then build and send a proposal, and clear today’s follow-ups.',
    highlights: [
      'Pipeline board from new lead to won',
      'Follow-up reminders created for you',
      'Proposals priced from size and frequency',
    ],
    tryThis: [
      'Send an enquiry from the Website form and find the new lead on the Pipeline',
      'Open a deal, build a proposal and press “Send proposal”',
      'Mark a follow-up as done on the Follow-ups screen',
    ],
    industries: ['Professional services', 'Property & construction'],
    business: { name: 'Copperline Commercial Cleaning', location: 'Raleigh, North Carolina, US' },
    build: {
      timeline: '3 to 6 weeks',
      intro: 'A sales system shaped around how you sell, not a generic CRM your team has to fight with.',
      steps: [
        {
          when: 'Week 1',
          title: 'Map how you sell',
          detail: 'We agree your stages, what counts as a qualified lead, who owns what and how you price a job.',
        },
        {
          when: 'Weeks 2 to 3',
          title: 'Board, leads and proposals',
          detail: 'Website forms, calls and WhatsApp enquiries all become leads, and proposals are priced from your own rates.',
        },
        {
          when: 'Weeks 4 to 5',
          title: 'Reminders and reports',
          detail: 'Follow-ups created automatically, alerts for stuck deals and a weekly forecast for the owner.',
        },
        {
          when: 'Week 6',
          title: 'Import and train',
          detail: 'We bring in your existing contacts and open deals from spreadsheets or email, and train your sales team.',
        },
      ],
      services: [
        'Customer support and lead generation',
        'Web applications and custom software',
        'Business process and workflow automation',
        'Dashboards and data analytics',
      ],
    },
    ...demoModule(() => import('./crm-pipeline')),
  },
  {
    slug: 'events-ticketing',
    number: 13,
    title: 'Events and ticketing',
    category: 'Sales & customers',
    icon: Ticket,
    summary:
      'Sell tickets online with real QR codes, let buyers share and transfer them, and check people in at the gate in a second, with no paper lists.',
    intro:
      'Buy tickets for a Harare festival, send one to a friend on WhatsApp, then switch to the gate scanner and check it in. Scan it twice to see a duplicate stopped.',
    highlights: [
      'Real, scannable QR tickets',
      'Gate scanner that stops duplicates',
      'Live sales and check-in figures',
    ],
    tryThis: [
      'Buy two General admission tickets with the code MSASA10',
      'Open My tickets and send one to WhatsApp',
      'Scan your ticket in the Scanner, then scan it again',
    ],
    industries: ['Events & tourism', 'Food & hospitality'],
    business: { name: 'Msasa Sky Festival', location: 'Harare, Zimbabwe' },
    build: {
      timeline: '3 to 6 weeks',
      intro: 'Your own ticket shop with your branding, with no per-ticket fees to a platform, and a gate app your volunteers can learn in a minute.',
      steps: [
        {
          when: 'Week 1',
          title: 'Event, tickets and prices',
          detail: 'Ticket types, capacity, early-bird dates and promo codes, with payment by mobile money, card or bank transfer.',
        },
        {
          when: 'Weeks 2 to 3',
          title: 'Ticket shop and QR tickets',
          detail: 'Tickets arrive by WhatsApp, SMS and email with a signed QR code that can’t be copied or reused.',
        },
        {
          when: 'Weeks 4 to 5',
          title: 'Gate scanning',
          detail: 'Any phone becomes a scanner. It keeps working if the signal drops at the gate and syncs when it’s back.',
        },
        {
          when: 'Week 6',
          title: 'Test run and event day',
          detail: 'We run a test entry with your gate team and stay on call on the day.',
        },
      ],
      services: [
        'E-commerce and online stores',
        'Web applications and custom software',
        'Dashboards and data analytics',
        'Cloud deployment, hosting and monitoring',
      ],
    },
    ...demoModule(() => import('./events-ticketing')),
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
  {
    slug: 'wellness-consulting',
    number: 0,
    listed: LIST_WELLNESS_DEMO,
    title: 'Wellness practice: AI assistant and booking',
    category: 'Services & local markets',
    icon: Leaf,
    summary:
      'A wellness practice’s own AI assistant on its website and WhatsApp: answers enquiries, captures leads, books consultations.',
    intro:
      'See how a wellness consulting practice with offices in Harare and Johannesburg handles enquiries, consultations and bookings: the website assistant, online booking, the same assistant on WhatsApp, and the owner’s view.',
    highlights: [
      'Answers enquiries as the practice, day and night',
      'Books in-person or online consultations',
      'WhatsApp confirmations and reminders',
    ],
    tryThis: [
      'Ask the assistant how online consultations work',
      'Book an online consultation and see the WhatsApp messages',
      'Play the WhatsApp conversation, then open the Owner view',
    ],
    industries: ['Beauty & wellness'],
    business: { name: 'Sable Leaf Wellness', location: 'Harare, Zimbabwe and Johannesburg, South Africa' },
    build: {
      timeline: '3 to 5 weeks',
      intro:
        'Your website, an assistant that knows your services and stays within them, online booking for both offices and online sessions, and the same assistant on your WhatsApp number.',
      steps: [
        {
          when: 'Week 1',
          title: 'Your services, offices and hours',
          detail: 'We agree your services, prices, consultants, office hours and what the assistant may and may not say.',
        },
        {
          when: 'Weeks 1 to 2',
          title: 'Website and online booking',
          detail: 'Your website goes up on a preview link, with booking for each office and online consultations.',
        },
        {
          when: 'Weeks 2 to 3',
          title: 'The assistant',
          detail: 'It learns your services and answers enquiries in your tone, captures leads and hands over to you.',
        },
        {
          when: 'Weeks 3 to 5',
          title: 'WhatsApp and go-live',
          detail: 'We connect your WhatsApp Business number, test the confirmations and reminders with you, and go live.',
        },
      ],
      services: [
        'Website design, development and redesign',
        'AI chatbots and virtual assistants',
        'Customer support and lead generation',
        'API integrations and AI-powered systems',
      ],
    },
    ...demoModule(() => import('./wellness-consulting')),
  },
  {
    slug: 'school-admissions',
    number: 0,
    listed: LIST_SCHOOL_DEMO,
    title: 'School admissions and parent desk',
    category: 'Services & local markets',
    icon: GraduationCap,
    summary:
      'A school’s own AI admissions assistant: answers parents in English or Shona, books tours, takes applications and sends urgent notices.',
    intro:
      'See how an independent school in Harare answers parents day and night: fees in USD and ZiG, term dates, mid-year transfers and boarding, tours and online applications, WhatsApp, and the admissions office’s view.',
    highlights: [
      'Answers parents in English or Shona, day and night',
      'Tours, applications and document checklists',
      'Urgent notices to every parent at once',
    ],
    tryThis: [
      'Ask the assistant about Form 1 fees, or ask in Shona',
      'Apply for a place and see what is still needed',
      'Send an urgent notice from the admissions office',
    ],
    industries: ['Education'],
    business: { name: 'Mukwa Ridge Academy', location: 'Harare, Zimbabwe' },
    build: {
      timeline: '3 to 5 weeks',
      intro:
        'An assistant that knows your fees, dates and admissions rules and stays within them, tour booking and online applications, urgent notices, and the same assistant on your WhatsApp number. It works next to your current school system or spreadsheet.',
      steps: [
        {
          when: 'Week 1',
          title: 'Your fees, dates and rules',
          detail: 'We agree your fees and approved levies, term dates, admissions steps, documents and what the assistant may and may not say.',
        },
        {
          when: 'Weeks 1 to 2',
          title: 'Website, tours and applications',
          detail: 'Your admissions pages go up on a preview link, with tour booking, the application form and the document checklist.',
        },
        {
          when: 'Weeks 2 to 3',
          title: 'The assistant',
          detail: 'It learns your school and answers parents in English and Shona, hands over to the office and never asks for a child’s details.',
        },
        {
          when: 'Weeks 3 to 5',
          title: 'WhatsApp and go-live',
          detail: 'We connect your WhatsApp Business number, test the messages and urgent notices with your office, and go live.',
        },
      ],
      services: [
        'Website design, development and redesign',
        'AI chatbots and virtual assistants',
        'Customer support and lead generation',
        'Business process and workflow automation',
      ],
    },
    ...demoModule(() => import('./school-admissions')),
  },
  {
    slug: 'teacher-coursework',
    number: 0,
    listed: LIST_TEACHER_DEMO,
    title: 'Teacher time-saver: coursework and reports',
    category: 'AI & automation',
    icon: BookMarked,
    summary:
      'Coursework deadlines, a mark book that finds weak topics, a project authenticity log and AI report comments the teacher approves.',
    intro:
      'See how a Geography teacher in Harare keeps ZIMSEC coursework on time: deadlines and the upload export, a mark book with a free revision plan, a dated project log, AI-drafted report comments and attendance check-ins.',
    highlights: [
      'Board deadlines and a ready-to-upload export',
      'AI report comments, approved by the teacher',
      'A dated log of every project draft',
    ],
    tryThis: [
      'Draft a report comment with AI, then edit and approve it',
      'Change a mark and watch the weak topics update',
      'Switch the deadlines to a Kenyan school',
    ],
    industries: ['Education'],
    business: { name: 'Mukwa Ridge Academy', location: 'Harare, Zimbabwe' },
    build: {
      timeline: '3 to 5 weeks',
      intro:
        'Your classes, coursework tasks and board deadlines, a mark book, the project log, report comments in your school’s style and attendance check-ins. It works next to your current school system.',
      steps: [
        {
          when: 'Week 1',
          title: 'Your classes and deadlines',
          detail: 'We load your classes and subjects, the board’s coursework tasks and deadlines, and your report comment style.',
        },
        {
          when: 'Weeks 1 to 3',
          title: 'Mark book, project log and export',
          detail: 'Teachers get the mark book and project log on a preview link, and we match the export to the board’s template.',
        },
        {
          when: 'Weeks 2 to 4',
          title: 'Report comments',
          detail: 'The assistant learns your school’s tone. It only sees marks, never names, and every comment needs a teacher’s approval.',
        },
        {
          when: 'Weeks 4 to 5',
          title: 'Training and go-live',
          detail: 'A short session with your teachers on their phones, then WhatsApp deadline reminders are switched on.',
        },
      ],
      services: [
        'Web applications and custom software',
        'AI chatbots and virtual assistants',
        'Business process and workflow automation',
        'Dashboards and data analytics',
      ],
    },
    ...demoModule(() => import('./teacher-coursework')),
  },
]

/** The listed demos: the gallery, footer, "More demos", the demo count, the sitemap and the receptionist use these. */
export const DEMOS: DemoMeta[] = ALL_DEMOS.filter((demo) => demo.listed !== false)

/** Any demo with a page, listed or not. */
export function findDemo(slug: string): DemoMeta | undefined {
  return ALL_DEMOS.find((demo) => demo.slug === slug)
}
