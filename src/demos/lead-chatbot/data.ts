import { daysAgoAt, todayAt } from '../../lib/time'
import { DESIGNER, SALES_LEAD, newLiveConversation, summarise } from './engine'
import type { Answers, ChatState, Contact, Conversation, Lead, Message, Settings } from './types'

/* Sample business: Dunebridge Interiors, an invented office fit-out company in Dubai. */

export const DEFAULT_SETTINGS: Settings = {
  greeting:
    'Hi, I’m Noor, Dunebridge Interiors’ virtual assistant. I can give you a ballpark for your project and put you in touch with a designer. It takes about a minute.',
  threshold: 70,
  handoffOnRequest: true,
  afterHours: false,
  questions: { projectType: true, size: true, timeline: true, budget: true, role: true },
}

let seq = 0
function m(from: Message['from'], text: string, at: number, author?: string): Message {
  seq += 1
  return { id: `sample-m${seq}`, from, text, at, author }
}

function lead(
  id: string,
  contact: Required<Pick<Contact, 'name' | 'company'>> & { reach: string },
  answers: Answers,
  score: number,
  extra: Pick<Lead, 'status' | 'owner' | 'capturedAt' | 'source'> & { conversationId?: string },
): Lead {
  return {
    id,
    name: contact.name,
    company: contact.company,
    contact: contact.reach,
    answers,
    score,
    temperature: score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold',
    summary: summarise(answers, contact),
    ...extra,
  }
}

function sampleLeads(): Lead[] {
  return [
    lead(
      'lead-kareem',
      { name: 'Kareem Nasser', company: 'Sevenpine Clinics', reach: '+971 50 ••• 3184' },
      { projectType: 'retail', size: 'm', timeline: 'q', budget: 'b2', role: 'decision' },
      80,
      { status: 'New', owner: DESIGNER, capturedAt: todayAt(10, 37), source: 'WhatsApp', conversationId: 'c-kareem' },
    ),
    lead(
      'lead-daniel',
      { name: 'Daniel Mwangi', company: 'Quillon Analytics', reach: 'daniel@quillonanalytics.com' },
      { projectType: 'refurb', size: 's', timeline: 'asap', budget: 'b2', role: 'decision' },
      75,
      { status: 'Meeting booked', owner: SALES_LEAD, capturedAt: todayAt(9, 12), source: 'Website chat', conversationId: 'c-daniel' },
    ),
    lead(
      'lead-sofia',
      { name: 'Sofia Marchetti', company: 'Ombra Dental Studio', reach: 'sofia@ombradental.ae' },
      { projectType: 'retail', size: 's', timeline: 'h', budget: 'b2', role: 'decision' },
      65,
      { status: 'Meeting booked', owner: SALES_LEAD, capturedAt: daysAgoAt(1, 14, 5), source: 'Website chat' },
    ),
    lead(
      'lead-grace',
      { name: 'Grace Adeyemi', company: 'Marlowe & Strand Legal', reach: 'g.adeyemi@marlowestrand.com' },
      { projectType: 'new-office', size: 's', timeline: 'h', budget: 'b2', role: 'team' },
      65,
      { status: 'Meeting booked', owner: SALES_LEAD, capturedAt: daysAgoAt(1, 19, 50), source: 'Website chat', conversationId: 'c-grace' },
    ),
    lead(
      'lead-rania',
      { name: 'Rania Haddad', company: 'Corvane Logistics', reach: 'rania.haddad@corvanelogistics.com' },
      { projectType: 'new-office', size: 'l', timeline: 'q', budget: 'b4', role: 'decision' },
      100,
      { status: 'Proposal sent', owner: DESIGNER, capturedAt: daysAgoAt(2, 16, 20), source: 'Website chat' },
    ),
    lead(
      'lead-tom',
      { name: 'Tom Bradley', company: 'Vantor Freight', reach: '+971 55 ••• 7720' },
      { projectType: 'refurb', size: 'xs', timeline: 'asap', budget: 'b1', role: 'decision' },
      55,
      { status: 'Contacted', owner: SALES_LEAD, capturedAt: daysAgoAt(2, 8, 45), source: 'WhatsApp' },
    ),
    lead(
      'lead-arjun',
      { name: 'Arjun Mehta', company: 'Saltbridge Ventures', reach: 'arjun@saltbridgeventures.com' },
      { projectType: 'browsing', size: 'xs', timeline: 'research', budget: 'unsure', role: 'team' },
      15,
      { status: 'New', owner: 'Nurture emails', capturedAt: daysAgoAt(3, 21, 40), source: 'Website chat' },
    ),
    lead(
      'lead-mariam',
      { name: 'Mariam Khoury', company: 'Halden Rowe Consulting', reach: 'mariam.khoury@haldenrowe.com' },
      { projectType: 'new-office', size: 'm', timeline: 'q', budget: 'b3', role: 'team' },
      85,
      { status: 'Proposal sent', owner: DESIGNER, capturedAt: daysAgoAt(4, 11, 30), source: 'Website chat', conversationId: 'c-mariam' },
    ),
    lead(
      'lead-chen',
      { name: 'Chen Wei', company: 'Peregrine Arc Labs', reach: 'chen.wei@peregrinearc.com' },
      { projectType: 'refurb', size: 'm', timeline: 'h', budget: 'b3', role: 'decision' },
      75,
      { status: 'Contacted', owner: DESIGNER, capturedAt: daysAgoAt(5, 10, 15), source: 'Website chat' },
    ),
    lead(
      'lead-noura',
      { name: 'Noura Saeed', company: 'Tessera Pilates', reach: '+971 52 ••• 0466' },
      { projectType: 'retail', size: 'xs', timeline: 'q', budget: 'b1', role: 'decision' },
      55,
      { status: 'Meeting booked', owner: SALES_LEAD, capturedAt: daysAgoAt(6, 13, 10), source: 'WhatsApp' },
    ),
    lead(
      'lead-luca',
      { name: 'Luca Romano', company: 'Kilnworks Coworking', reach: 'luca@kilnworks.co' },
      { projectType: 'new-office', size: 'l', timeline: 'h', budget: 'b4', role: 'team' },
      85,
      { status: 'Proposal sent', owner: DESIGNER, capturedAt: daysAgoAt(6, 16, 0), source: 'Website chat' },
    ),
  ]
}

function sampleConversations(): Conversation[] {
  const greet = DEFAULT_SETTINGS.greeting
  const kareemAt = todayAt(10, 29)
  const anonAt = todayAt(10, 31)
  const danielAt = todayAt(9, 2)

  return [
    {
      id: 'c-kareem',
      live: false,
      channel: 'WhatsApp',
      status: 'waiting',
      step: 'done',
      answers: { projectType: 'retail', size: 'm', timeline: 'q', budget: 'b2', role: 'decision' },
      contact: { name: 'Kareem Nasser', company: 'Sevenpine Clinics', phone: '+971 50 ••• 3184' },
      score: 80,
      temperature: 'hot',
      assignedTo: DESIGNER,
      handoffReason: 'Hot lead, score 80',
      leadId: 'lead-kareem',
      startedAt: kareemAt,
      updatedAt: todayAt(10, 37),
      unread: true,
      messages: [
        m('visitor', 'Hi, do you do clinic fit-outs?', kareemAt),
        m('bot', 'Hi Kareem, thanks for messaging Dunebridge Interiors. I’m Noor, the virtual assistant. Yes, we fit out clinics, shops and restaurants as well as offices. What kind of project are you planning?', kareemAt + 20_000),
        m('visitor', 'We’re opening a second clinic in Dubai Hills. Empty shell unit.', kareemAt + 80_000),
        m('bot', 'Got it. Roughly how big is the space?', kareemAt + 90_000),
        m('visitor', 'Around 6,500 sq ft', kareemAt + 150_000),
        m('bot', 'Thanks. When would you like the work to start?', kareemAt + 160_000),
        m('visitor', 'Next month ideally', kareemAt + 230_000),
        m('bot', 'Great. Do you have a budget in mind? A range is fine.', kareemAt + 240_000),
        m('visitor', 'Around 90k USD', kareemAt + 320_000),
        m('bot', 'Perfect. Will you be making the final decision on this project?', kareemAt + 330_000),
        m('visitor', 'Yes, I’m the owner', kareemAt + 400_000),
        m('bot', `Thanks, Kareem. Your project looks like a strong fit, so I’m bringing in ${DESIGNER}, one of our senior designers. He can see everything you’ve told me.`, todayAt(10, 37)),
      ],
    },
    {
      id: 'c-anon',
      live: false,
      channel: 'Website chat',
      status: 'bot',
      step: 'budget',
      answers: { projectType: 'new-office', size: 's', timeline: 'h' },
      contact: {},
      startedAt: anonAt,
      updatedAt: todayAt(10, 34),
      unread: false,
      messages: [
        m('bot', greet, anonAt),
        m('bot', 'What kind of project are you planning?', anonAt + 1000),
        m('visitor', 'New office fit-out', anonAt + 25_000),
        m('bot', 'Got it. Roughly how big is the space?', anonAt + 26_000),
        m('visitor', 'We’re 30 people, so maybe 3,000 sq ft', anonAt + 70_000),
        m('bot', 'Thanks. When would you like the work to start?', anonAt + 71_000),
        m('visitor', 'In 3–6 months', anonAt + 100_000),
        m('bot', 'Great. Do you have a budget in mind? A range is fine.', anonAt + 101_000),
        m('visitor', 'How much does it usually cost per sq ft?', todayAt(10, 34) - 2000),
        m('bot', 'Most office fit-outs we deliver in Dubai cost between $45 and $120 per sq ft, depending on finishes, building works and furniture. A few more answers and I can narrow that down.', todayAt(10, 34)),
      ],
    },
    {
      id: 'c-daniel',
      live: false,
      channel: 'Website chat',
      status: 'agent',
      step: 'done',
      answers: { projectType: 'refurb', size: 's', timeline: 'asap', budget: 'b2', role: 'decision' },
      contact: { name: 'Daniel Mwangi', company: 'Quillon Analytics', email: 'daniel@quillonanalytics.com' },
      score: 75,
      temperature: 'hot',
      assignedTo: SALES_LEAD,
      handoffReason: 'Hot lead, score 75',
      leadId: 'lead-daniel',
      startedAt: danielAt,
      updatedAt: todayAt(9, 41),
      unread: false,
      messages: [
        m('bot', greet, danielAt),
        m('bot', 'What kind of project are you planning?', danielAt + 1000),
        m('visitor', 'Refurbish an existing office', danielAt + 30_000),
        m('bot', 'Got it. Roughly how big is the space?', danielAt + 31_000),
        m('visitor', 'About 3,200 sq ft, 28 people', danielAt + 75_000),
        m('bot', 'Thanks. When would you like the work to start?', danielAt + 76_000),
        m('visitor', 'As soon as possible, our lease renewal is in 6 weeks', danielAt + 130_000),
        m('bot', 'Great. Do you have a budget in mind? A range is fine.', danielAt + 131_000),
        m('visitor', '$25,000–$100,000', danielAt + 160_000),
        m('bot', 'Perfect. Will you be making the final decision on this project?', danielAt + 161_000),
        m('visitor', 'Yes, it’s my decision', danielAt + 190_000),
        m('bot', 'Thanks, Daniel. Your project looks like a strong fit, so I’m bringing in one of our team now.', todayAt(9, 12)),
        m('system', `${SALES_LEAD} joined the chat`, todayAt(9, 14)),
        m('agent', 'Hi Daniel, Hana here. A 3,200 sq ft refurbishment in six weeks is doable if we start the design this week. Could we visit your office on Thursday?', todayAt(9, 15), SALES_LEAD),
        m('visitor', 'Thursday at 11:00 works. See you then.', todayAt(9, 41)),
      ],
    },
    {
      id: 'c-grace',
      live: false,
      channel: 'Website chat',
      status: 'closed',
      step: 'done',
      answers: { projectType: 'new-office', size: 's', timeline: 'h', budget: 'b2', role: 'team' },
      contact: { name: 'Grace Adeyemi', company: 'Marlowe & Strand Legal', email: 'g.adeyemi@marlowestrand.com' },
      score: 65,
      temperature: 'warm',
      leadId: 'lead-grace',
      startedAt: daysAgoAt(1, 19, 41),
      updatedAt: daysAgoAt(1, 19, 50),
      unread: false,
      messages: [
        m('bot', greet, daysAgoAt(1, 19, 41)),
        m('visitor', 'We’re moving our law firm to a new floor in DIFC, around 4,000 sq ft', daysAgoAt(1, 19, 43)),
        m('bot', 'Got it. When would you like the work to start?', daysAgoAt(1, 19, 43)),
        m('visitor', 'Probably in four or five months', daysAgoAt(1, 19, 45)),
        m('bot', 'The best next step is a free 20-minute call with one of our designers. Which time suits you?', daysAgoAt(1, 19, 49)),
        m('visitor', 'Tomorrow, 10:00', daysAgoAt(1, 19, 50)),
        m('bot', `Booked: tomorrow at 10:00 (Gulf time) with ${SALES_LEAD}. A calendar invite is on its way to g.adeyemi@marlowestrand.com.`, daysAgoAt(1, 19, 50)),
      ],
    },
    {
      id: 'c-mariam',
      live: false,
      channel: 'Website chat',
      status: 'closed',
      step: 'done',
      answers: { projectType: 'new-office', size: 'm', timeline: 'q', budget: 'b3', role: 'team' },
      contact: { name: 'Mariam Khoury', company: 'Halden Rowe Consulting', email: 'mariam.khoury@haldenrowe.com' },
      score: 85,
      temperature: 'hot',
      assignedTo: DESIGNER,
      leadId: 'lead-mariam',
      startedAt: daysAgoAt(4, 11, 22),
      updatedAt: daysAgoAt(4, 11, 58),
      unread: false,
      messages: [
        m('bot', greet, daysAgoAt(4, 11, 22)),
        m('visitor', 'We need a full fit-out for 9,000 sq ft in Business Bay, starting in about two months. Budget is roughly $150k.', daysAgoAt(4, 11, 25)),
        m('bot', 'Thanks, that helps a lot. Will you be making the final decision on this project?', daysAgoAt(4, 11, 25)),
        m('visitor', 'With our two partners', daysAgoAt(4, 11, 27)),
        m('bot', `Your project looks like a strong fit, so I’m bringing in ${DESIGNER}, one of our senior designers.`, daysAgoAt(4, 11, 30)),
        m('system', `${DESIGNER} joined the chat`, daysAgoAt(4, 11, 31)),
        m('agent', 'Hi Mariam, Omar here. Business Bay towers usually need landlord approvals, so starting in two months is the right call. I’ll send concept ideas and a cost range by Thursday.', daysAgoAt(4, 11, 33), DESIGNER),
        m('visitor', 'Perfect, thank you Omar.', daysAgoAt(4, 11, 58)),
      ],
    },
  ]
}

export function createInitialState(now: number): ChatState {
  return {
    conversations: [newLiveConversation(DEFAULT_SETTINGS, now), ...sampleConversations()],
    leads: sampleLeads(),
    settings: DEFAULT_SETTINGS,
  }
}
