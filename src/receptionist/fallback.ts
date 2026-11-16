import { PRINCIPLES } from '../config/about'
import { SITE } from '../config/site'
import { DEMOS, type DemoMeta } from '../demos/registry'
import { RECEPTIONIST_NAME } from './protocol'

/*
 * Saved answers for when the AI can't reply: the day's free allowance is used up, the visitor is
 * offline, or the AI service fails. Simple keyword matching, so it stays small and instant.
 * Demo paths in the text (/demos/<slug>) become links in the chat, as they do in AI replies.
 */

/** Words that point to a demo, checked in order. */
const DEMO_HINTS: [RegExp, string][] = [
  [/\b(salon|spa|barber\w*|beauty|nails?|hair\w*|massage)\b/, 'salon-spa-booking'],
  [/\b(restaurants?|caf[eé]s?|takeaways?|food|kitchen|menu|deliver\w*)\b/, 'restaurant-delivery'],
  [/\b(clinics?|pharmac\w*|doctors?|patients?|medical|health|hospital|dentist\w*)\b/, 'clinic-pharmacy'],
  [/\b(events?|tickets?|concerts?|festivals?|conferences?)\b/, 'events-ticketing'],
  [/\b(shops?|stores?|retail|stock|inventory|tills?|pos|point of sale|warehouse|hardware)\b/, 'inventory-pos'],
  [/\b(orders?|ordering|catalog(ue)?|e-?commerce|online store)\b/, 'whatsapp-ordering'],
  [/\b(crm|pipeline|follow[- ]?ups?|deals?|sales)\b/, 'crm-pipeline'],
  [/\b(leads?|enquir(y|ies)|inquir(y|ies)|qualif\w*)\b/, 'ai-lead-chatbot'],
  [/\b(support|help ?desk|complaints?|customer service)\b/, 'ai-support-desk'],
  [/\b(documents?|pdfs?|contracts?|polic(y|ies)|manuals?)\b/, 'ai-document-assistant'],
  [/\b(automat\w*|workflows?|repetitive|spreadsheets?|paperwork)\b/, 'workflow-automation'],
  [/\b(apis?|integrat\w*|connect\w*)\b/, 'api-integration-hub'],
  [/\b(seo|google|ranking|search results)\b/, 'seo-audit'],
  [/\b(redesign|new website|web ?design|landing page)\b/, 'website-redesign'],
  [/\b(uptime|downtime|monitor\w*|site speed|website down)\b/, 'website-health-monitor'],
]

const has = (text: string, pattern: RegExp) => pattern.test(text)

function demoFor(slug: string): DemoMeta | undefined {
  return DEMOS.find((d) => d.slug === slug)
}

export function suggestedDemos(text: string): DemoMeta[] {
  const found: DemoMeta[] = []
  for (const [pattern, slug] of DEMO_HINTS) {
    const demo = demoFor(slug)
    if (demo && has(text, pattern) && !found.includes(demo)) found.push(demo)
    if (found.length === 2) break
  }
  return found
}

const WHATSAPP_NEXT = 'Tap “Continue on WhatsApp” below and the team will reply with ideas, a timeline and a quote.'

/** A saved answer to the visitor's message. `page` is "home" or the slug of the demo they are viewing. */
export function fallbackReply(message: string, page: string): string {
  const text = message.toLowerCase().replace(/[’']/g, "'")
  const demo = demoFor(page)

  if (has(text, /^\s*(hi|hello|hey|hiya|good (morning|afternoon|evening)|mhoro|makadii|salibonani|sawubona)\b[\s!.,]*$/)) {
    return `Hello! I’m ${RECEPTIONIST_NAME}, LIFELINE’s AI receptionist. Tell me what your business does and I’ll point you to the demos that fit, or ask me how we work.`
  }
  if (has(text, /\b(are you (a |an )?(bot|robot|human|real|person|ai)|who are you|what are you)\b/)) {
    return 'I’m an AI receptionist, not a person. I’m also an example of what LIFELINE builds: an assistant like me can answer your own customers day and night, then hand them to your team.'
  }
  if (has(text, /\b(prices?|pricing|cost|costs|how much|quote|budget|afford|fees?|charges?|mari)\b|\$/)) {
    const timeline = demo ? ` A build like the ${demo.title} usually takes ${demo.build.timeline}.` : ''
    return `We don’t publish fixed prices, because every business needs something a little different. ${PRINCIPLES[2][1]}${timeline} ${WHATSAPP_NEXT}`
  }
  if (has(text, /\b(human|real person|(live|human|real) agent|representative|call me|phone number|speak (to|with)|talk (to|with)|contact|reach you)\b/)) {
    return `Of course. You can message the team on WhatsApp at ${SITE.whatsappDisplay} or email ${SITE.email}. ${WHATSAPP_NEXT}`
  }
  if (has(text, /\b(how long|timeline|time frame|timeframe|weeks?|months?|how fast|how soon|when can)\b/)) {
    if (demo) return `We estimate ${demo.build.timeline} for a build like the ${demo.title}. The exact plan depends on your business and the tools it connects to. ${WHATSAPP_NEXT}`
    return `It depends on the project. Each demo page shows an estimated build time, for example ${DEMOS[0].build.timeline} for the ${DEMOS[0].title} (/demos/${DEMOS[0].slug}). ${WHATSAPP_NEXT}`
  }
  if (has(text, /\b(founder|owner|who (runs|owns|is behind)|about (you|lifeline)|where are you|based|located|location|zimbabwe|harare|bulawayo)\b/)) {
    return `${SITE.brand} is led by its founder, ${SITE.founder.name}. ${SITE.base} We build websites, chatbots, automation and business systems.`
  }

  const demos = suggestedDemos(text)
  if (demos.length) {
    const list = demos.map((d) => `the ${d.title} (/demos/${d.slug})`).join(' and ')
    return `Have a look at ${list}. ${demos[0].summary} ${WHATSAPP_NEXT}`
  }

  if (demo && has(text, /\b(how (does|do|would) (this|it)|explain|work for (me|my|us|our))\b/)) {
    return `${demo.build.intro} We estimate ${demo.build.timeline}. ${WHATSAPP_NEXT}`
  }
  if (has(text, /\b(what (do|can) you (do|build|make|offer)|services?|help (my|our) business|can you (build|make|do))\b/)) {
    return 'We build websites, AI chatbots and assistants, workflow automation, WhatsApp ordering, online stores, dashboards and custom business software. Tell me what your business does and I’ll suggest a demo to try.'
  }
  if (has(text, /\b(thanks|thank you|cheers|bye|goodbye|ndatenda|ngiyabonga)\b/)) {
    return `You’re welcome! When you’re ready, the team is on WhatsApp at ${SITE.whatsappDisplay}.`
  }
  return `I can answer questions about our services, how we work, timelines and the demos on this site. For anything else, the team can help on WhatsApp at ${SITE.whatsappDisplay}.`
}
