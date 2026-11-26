/*
 * The sample school: everything its admissions assistant may say and its website shows. Invented
 * school, people, fees, dates and results. Shared by the demo (browser) and the Worker
 * (worker/prompt.ts builds the assistant's instructions from it), so keep it free of browser and
 * Worker APIs, and free of icons.
 */

import { SCHOOL_PAGE } from '../../receptionist/protocol'

/** The demo page, and the `page` value its assistant sends. The Worker only uses this persona for it. */
export const SCHOOL_SLUG = SCHOOL_PAGE

export const SCHOOL = {
  name: 'Mukwa Ridge Academy',
  /** Also replaced by the visitor's own name on a personalised link (see personalised() in engine.ts). */
  short: 'Mukwa Ridge',
  descriptor: 'Independent day and boarding school, ECD to Upper 6 · Harare',
  area: 'Mount Pleasant, Harare',
  assistant: 'Rudo',
  timeLabel: 'Harare time (UTC+2)',
  utcOffsetMinutes: 120,
  officeHours: 'Monday to Friday 07:30 to 16:00. Closed on public holidays.',
  registration:
    'Registered with the Ministry of Primary and Secondary Education, and a ZIMSEC examination centre. The registration certificate is shown at reception and on request.',
  curriculum:
    'The national curriculum (the Heritage-Based Curriculum) with ZIMSEC examinations at Grade 7, O Level and A Level. Cambridge IGCSE is offered in a few subjects, as approved by the Ministry.',
  results: 'Sample results for 2025: 81% of O Level candidates passed five or more subjects, and 88% of Grade 7 learners passed.',
} as const

/* Grades and fees */

export type Phase = 'ecd' | 'junior' | 'senior' | 'sixth'

export const GRADES = [
  'ECD A',
  'ECD B',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Form 1',
  'Form 2',
  'Form 3',
  'Form 4',
  'Lower 6',
  'Upper 6',
] as const

export type Grade = (typeof GRADES)[number]

export const phaseOf = (grade: Grade): Phase =>
  grade.startsWith('ECD') ? 'ecd' : grade.startsWith('Grade') ? 'junior' : grade.startsWith('Form') ? 'senior' : 'sixth'

export interface FeeBand {
  phase: Phase
  label: string
  /** Tuition per term, in USD. */
  tuition: number
}

export const FEE_BANDS: readonly FeeBand[] = [
  { phase: 'ecd', label: 'ECD A and ECD B', tuition: 420 },
  { phase: 'junior', label: 'Grades 1 to 7', tuition: 620 },
  { phase: 'senior', label: 'Forms 1 to 4', tuition: 840 },
  { phase: 'sixth', label: 'Lower 6 and Upper 6', tuition: 920 },
]

export interface Levy {
  id: string
  name: string
  /** Per term, in USD. */
  amount: number
  /** The approval behind it: fees and levies need the Permanent Secretary's approval before they are charged. */
  approval: string
}

export const LEVIES: readonly Levy[] = [
  { id: 'development', name: 'Development levy', amount: 40, approval: 'Approved by the Ministry, sample reference MRA/LEV/01' },
  { id: 'ict-sport', name: 'ICT and sport levy', amount: 25, approval: 'Approved by the Ministry, sample reference MRA/LEV/02' },
]

export const EXTRAS = {
  boarding: { amount: 680, text: 'Boarding, from Form 1: $680 a term, on top of tuition. Weekly or full boarding.' },
  transport: { amount: 90, text: 'School bus: $90 a term, on three routes.' },
  exams: 'ZIMSEC exam fees are paid separately, at the rates ZIMSEC publishes for each year.',
} as const

/** Paid once, before the first term. */
export const ENTRY_COSTS = {
  application: { amount: 20, text: 'Application fee: $20, paid when you apply. It is not refunded.' },
  deposit: {
    amount: 250,
    text: 'Acceptance deposit: $250, paid when you accept a place. It counts towards the first term’s fees, and it is refunded in full if you withdraw at least 30 days before the term starts.',
  },
  uniform:
    'Uniform: only three items carry the school badge (blazer, tie and sports shirt). Everything else is plain and can be bought from any shop. The school runs a second-hand uniform sale each term.',
} as const

/** The rate wording for every ZiG amount on the website, in the chat and in messages. */
export const ZIG_NOTE = 'ZiG amounts are shown at a sample rate. The bursary fixes the rate on the day it issues each invoice, and that rate stays on the invoice.'

export const PAYMENT = {
  methods: 'Bank transfer in USD or ZiG, EcoCash, InnBucks, or card at the bursary.',
  abroad: 'Family abroad can pay with a secure payment link that the bursary sends them, in South Africa, the UK or anywhere else.',
  plans: 'Fees are due at the start of each term. A monthly plan over the term is available on request, at no extra cost.',
  neverExclude:
    'No learner is ever sent home or kept out of class over fees. If paying is difficult, ask the bursar for a private meeting to agree a plan.',
  bursaries: 'A small number of means-tested bursaries are awarded each year. Ask for the form when you apply.',
} as const

/* Dates and notices */

export interface Term {
  name: string
  opens: string
  closes: string
}

export const TERMS_2027: readonly Term[] = [
  { name: 'Term 1', opens: 'Tuesday 12 January 2027', closes: 'Thursday 8 April 2027' },
  { name: 'Term 2', opens: 'Tuesday 11 May 2027', closes: 'Thursday 5 August 2027' },
  { name: 'Term 3', opens: 'Tuesday 7 September 2027', closes: 'Thursday 2 December 2027' },
]

export const TERM_NOTE = 'Sample dates. The school follows the Ministry’s official calendar and posts any change here first.'

/** Shown on the website's notice board until the office sends a new notice. */
export const STANDING_NOTICES = [
  {
    title: 'Rumour check: Term 1 is not moving',
    body: 'A message on WhatsApp says Term 1 2027 will start late. It did not come from the school. Term 1 opens on Tuesday 12 January 2027. Official changes are only ever posted on this page and sent from the school’s own number.',
  },
  {
    title: 'Open morning, Saturdays at 09:00',
    body: 'Tour the school, meet the Head and ask the bursar about fees. Book a place on the tour page.',
  },
] as const

/* Admissions */

export const ADMISSION_STEPS = [
  'Ask a question or book a tour.',
  'Apply online. The $20 application fee is paid when you apply.',
  'Assessment: a play visit for ECD, a short reading and maths assessment for Grades 1 to 7, an entrance test on a Saturday for Form 1, and an interview with the last two reports for other forms and Lower 6.',
  'The school makes an offer within 10 working days of the assessment. You accept with the acceptance deposit.',
] as const

export type DocId = 'birth' | 'reports' | 'transfer' | 'immunisation' | 'photo'

export interface DocumentNeed {
  id: DocId
  name: string
  /** Who needs it. Omitted: everyone. */
  when?: 'transfer' | 'young'
}

export const DOCUMENTS: readonly DocumentNeed[] = [
  { id: 'birth', name: 'Birth certificate' },
  { id: 'reports', name: 'The last two school reports (not needed for ECD A)' },
  { id: 'transfer', name: 'Transfer letter from the current school', when: 'transfer' },
  { id: 'immunisation', name: 'Immunisation card', when: 'young' },
  { id: 'photo', name: 'One passport photo' },
]

export const TRANSFERS =
  'Mid-year transfers are welcome in Term 2 and Term 3 when there is a place, including learners returning from South Africa. Bring a transfer letter and the last report. For Form 4 and Upper 6, a late transfer depends on the ZIMSEC entry deadlines, and the office checks them with you first.'

export const WAITING_LIST =
  'When a grade is full, the waiting list follows the published order: brothers and sisters of current learners first, then the date the application was complete.'

export const TOURS = {
  text: 'School tours on Tuesdays and Thursdays at 10:00 and 14:00, and an open morning on Saturdays at 09:00. Each tour takes about an hour. Families abroad can ask for a video tour.',
  capacity: 3,
} as const

export const CARE = {
  transport:
    'Three bus routes. Every bus and driver is checked and approved by the school, a roll is taken when learners get on and off, and parents get a WhatsApp message when the bus arrives at school.',
  boarding:
    'Weekly and full boarding from Form 1. The sick bay has a registered nurse on duty day and night, and parents are told straight away if their child is unwell.',
  safeguarding:
    'The school has a designated safeguarding lead. Any concern about a child is taken seriously and handled privately.',
  data: 'The school keeps only the details it needs for an application, with a parent’s or guardian’s written consent, as the data protection rules require.',
} as const

/** The two facts every price in the demo comes from. */
export const tuitionFor = (grade: Grade): number => FEE_BANDS.find((b) => b.phase === phaseOf(grade))?.tuition ?? 0
export const leviesTotal = (): number => LEVIES.reduce((sum, l) => sum + l.amount, 0)
