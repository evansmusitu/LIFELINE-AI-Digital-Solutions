import { Bot, ScanBarcode, ShoppingBag, Stethoscope, Workflow, type LucideIcon } from 'lucide-react'
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
