/*
 * LIFELINE's own words, from its "Meet LIFELINE" text (15 November 2026), shortened for the site.
 * The home page shows them, and the AI receptionist answers from them (worker/prompt.ts),
 * so the two never disagree. Only facts LIFELINE has given: no testimonials, client names or figures.
 */

export const ABOUT = {
  summary:
    'We make professional websites, automation and practical business technology accessible to entrepreneurs, growing companies and organizations, in Zimbabwe and worldwide.',
  /** Follows "Our view is simple:" on the page. */
  view: 'technology should do more than look impressive. It should solve a real problem, improve your customers’ experience and make your business easier to run.',
  founderDuties: 'Oversees planning, development, technical decisions and client communication.',
  musitu: 'also leads MUSITU Intelligence, which builds AI research and financial intelligence tools.',
} as const

export const PRINCIPLES = [
  [
    'Try it before you invest.',
    'Working demos and prototypes show what your solution could look like before you commit to a bigger project.',
  ],
  [
    'Your problem comes first.',
    'Not every problem needs AI. Sometimes a clear website, an FAQ assistant or a simple automation is the better fix.',
  ],
  [
    'Scope and price agreed up front.',
    'Deliverables, milestones, revisions, price and any outside service costs are agreed before work starts.',
  ],
  [
    'Honest about what’s real.',
    'We tell you what’s a demo, what’s working, and what needs extra integrations, hosting or testing.',
  ],
  [
    'You stay in control.',
    'We show you how to use and maintain what we build, and hand over the agreed source files and documentation.',
  ],
] as const

export const PROCESS_STEPS = [
  ['Tell us about your business', 'What you sell, who your customers are and what takes up your team’s time.'],
  ['Get a clear plan', 'We suggest the right solution, a timeline and a quote. No jargon.'],
  ['We build, launch and support it', 'You see progress every week, and we stay on hand after launch.'],
] as const
