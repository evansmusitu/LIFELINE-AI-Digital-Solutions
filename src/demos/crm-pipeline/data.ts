import { MINUTE, daysAgoAt, todayAt } from '../../lib/time'
import { OPEN_STAGES, OWNERS, addDays, autoTasks, priceProposal, proposalSummary, quarterStart, stageLabel } from './engine'
import type { Activity, ActivityKind, AddOn, CrmState, Deal, Facility, LostReason, OwnerId, PerWeek, Source, Stage, Task } from './types'

/* Sample business: Copperline Commercial Cleaning, an invented office and facility cleaning company in Raleigh, NC. */

/** [days ago, hour, minute] */
type When = [days: number, h: number, m: number]
/** A `proposal` entry with empty text gets the proposal summary for the deal's current quote. */
type Act = [...when: When, kind: ActivityKind, text: string, outcome?: string]

type Head = [id: string, company: string, owner: OwnerId, stage: Stage, source: Source, facility: Facility, sqft: number, perWeek: PerWeek, addOns: AddOn[]]

interface Row {
  head: Head
  contact: [name: string, role: string, phoneEnd: string, email: string]
  created: When
  /** When the deal moved into its current stage. */
  since?: When
  lost?: LostReason
  acts: Act[]
}

const at = ([d, h, m]: When) => daysAgoAt(d, h, m)

const ROWS: Row[] = [
  {
    head: ['fernhollow', 'Fernhollow Pediatrics', 'diego', 'new', 'Website form', 'Medical', 3600, 5, []],
    contact: ['Dana Whitfield', 'Practice manager', '47', 'dwhitfield'],
    created: [0, 8, 21],
    acts: [
      [0, 8, 21, 'form', 'Website enquiry: “Pediatric office with 3 exam rooms, 2 restrooms and a waiting area. Our current cleaner keeps missing nights.”'],
    ],
  },
  {
    head: ['mossgrove', 'Mossgrove Software', 'grace', 'new', 'Google search', 'Office', 6200, 3, ['windows']],
    contact: ['Nikhil Shah', 'Office manager', '18', 'nshah'],
    created: [1, 16, 15],
    acts: [[1, 16, 15, 'email', 'Nikhil emailed after finding us on Google. 40-person office, lease renews in 6 weeks.']],
  },
  {
    head: ['basalt', 'Basalt Bouldering Gym', 'monique', 'new', 'Walk-in', 'Gym', 7000, 5, ['supplies']],
    contact: ['Tomás Rivera', 'Owner', '62', 'trivera'],
    created: [2, 11, 40],
    acts: [[2, 11, 40, 'note', 'Tomás stopped by the office. Chalk dust everywhere. Wants mats and restrooms done before the 6 AM opening.']],
  },
  {
    head: ['lanternhill', 'Lanternhill Title & Escrow', 'grace', 'new', 'Website form', 'Office', 2400, 2, []],
    contact: ['Rachel Goldberg', 'Office manager', '05', 'rgoldberg'],
    created: [3, 13, 5],
    acts: [
      [3, 13, 5, 'form', 'Website enquiry: “Small office with two closing rooms. Twice a week, evenings if possible.”'],
      [3, 13, 50, 'call', 'Called within the hour. No answer, left a voicemail with my direct line.', 'Left a voicemail'],
      [1, 15, 30, 'call', 'Second try. No answer again.', 'No answer'],
    ],
  },
  {
    head: ['wrenfield', 'Wrenfield Credit Union branch', 'diego', 'new', 'Referral', 'Office', 3100, 2, ['supplies']],
    contact: ['Samuel Okafor', 'Branch manager', '31', 'sokafor'],
    created: [4, 10, 20],
    acts: [[4, 10, 20, 'note', 'Referred by Lindale Dental. Lobby and 4 offices, vault area off limits. Crew needs background checks.']],
  },
  {
    head: ['harlow', 'Harlow & Pike Accounting', 'diego', 'contacted', 'Referral', 'Office', 4800, 3, ['windows']],
    contact: ['Keisha Monroe', 'Operations manager', '86', 'kmonroe'],
    created: [9, 9, 30],
    since: [6, 14, 0],
    acts: [
      [9, 9, 30, 'note', 'Referred by their landlord, who uses us at another building.'],
      [6, 14, 0, 'call', 'Spoke with Keisha. Tax season means late nights, so cleaning has to start after 9 PM.', 'Spoke to them'],
      [2, 16, 10, 'email', 'Sent our insurance certificate and two references.'],
    ],
  },
  {
    head: ['larkspur', 'Larkspur Orthodontics', 'grace', 'contacted', 'Google search', 'Medical', 2900, 5, ['supplies']],
    contact: ['Mei-Ling Chou', 'Practice administrator', '23', 'mchou'],
    created: [12, 10, 0],
    since: [10, 11, 15],
    acts: [
      [12, 10, 0, 'note', 'Found us on Google. Unhappy with how their current cleaner handles the sterilization area.'],
      [10, 11, 15, 'call', 'Good first call. Wants a quote after seeing our medical cleaning checklist.', 'Spoke to them'],
      [9, 15, 40, 'email', 'Sent the medical cleaning checklist.'],
    ],
  },
  {
    head: ['redbud', 'Redbud Strength Club', 'diego', 'contacted', 'Phone', 'Gym', 5500, 3, ['supplies']],
    contact: ['Andre Lewis', 'General manager', '58', 'alewis'],
    created: [6, 12, 10],
    since: [5, 9, 45],
    acts: [
      [6, 12, 10, 'call', 'Andre called the main line. Open 24 hours, so cleaning has to work around members.', 'Spoke to them'],
      [1, 17, 20, 'email', 'Andre asked for references from other gyms we clean.'],
    ],
  },
  {
    head: ['halvorsen', 'Halvorsen Architects', 'monique', 'contacted', 'Website form', 'Office', 3800, 2, []],
    contact: ['Bethany Cole', 'Studio manager', '74', 'bcole'],
    created: [8, 15, 50],
    since: [7, 10, 5],
    acts: [
      [8, 15, 50, 'form', 'Website enquiry: “Open-plan studio with a model shop. Dust is the big issue.”'],
      [7, 10, 5, 'call', 'Spoke with Bethany. The quote should include the model shop floor.', 'Spoke to them'],
      [3, 11, 30, 'email', 'Bethany says a walkthrough is fine any weekday after 4 PM.'],
    ],
  },
  {
    head: ['fallow', 'Fallow Street Insurance', 'monique', 'contacted', 'Phone', 'Office', 1500, 1, ['windows']],
    contact: ['Omar Haddad', 'Agency owner', '09', 'ohaddad'],
    created: [16, 13, 20],
    since: [10, 9, 0],
    acts: [
      [16, 13, 20, 'call', 'Omar called about a small agency office. His cleaner retires next month.', 'Spoke to them'],
      [10, 9, 0, 'email', 'Sent a short intro and asked for a good time to visit.'],
    ],
  },
  {
    head: ['saltmarsh', 'Saltmarsh Physical Therapy', 'grace', 'visit', 'Referral', 'Medical', 5200, 3, ['supplies']],
    contact: ['Carmen Ortiz', 'Clinic director', '40', 'cortiz'],
    created: [15, 9, 10],
    since: [4, 13, 0],
    acts: [
      [15, 9, 10, 'note', 'Referred by Jenna at Oak & Ember Pilates.'],
      [12, 10, 30, 'call', 'Carmen wants evening cleans after the last patient at 7 PM.', 'Meeting booked'],
      [1, 16, 30, 'visit', 'Walked the site with Carmen. Open gym floor, 6 treatment rooms, 2 restrooms and a waiting area. Mats and equipment wiped every visit.'],
    ],
  },
  {
    head: ['quillmont', 'Quillmont Montessori', 'diego', 'visit', 'Phone', 'School', 7500, 5, ['carpet']],
    contact: ['Hannah Kowalski', 'Head of school', '92', 'hkowalski'],
    created: [20, 14, 0],
    since: [11, 10, 0],
    acts: [
      [20, 14, 0, 'call', 'Hannah called after their cleaner gave notice. 6 classrooms, a small gym and a kitchen.', 'Spoke to them'],
      [11, 10, 0, 'visit', 'First walkthrough done. Classroom rugs need a proper deep-clean every term.'],
      [2, 12, 15, 'call', 'Hannah wants the board chair at a second walkthrough on Thursday.', 'Meeting booked'],
    ],
  },
  {
    head: ['birchway', 'Birchway Dermatology', 'monique', 'visit', 'Google search', 'Medical', 3400, 3, ['supplies']],
    contact: ['Lauren Pierce', 'Practice manager', '67', 'lpierce'],
    created: [10, 11, 0],
    since: [3, 15, 0],
    acts: [
      [10, 11, 0, 'note', 'Found us on Google. Two procedure rooms need hospital-grade disinfectant.'],
      [3, 15, 0, 'visit', 'Walked the site with the practice manager. 3 exam rooms, 2 restrooms, waiting area. Wants evening cleans.'],
      [0, 8, 15, 'email', 'Lauren sent the floor plan with room sizes.'],
    ],
  },
  {
    head: ['ironleaf', 'Ironleaf Co-working', 'grace', 'proposal', 'Website form', 'Office', 8500, 5, ['windows', 'supplies']],
    contact: ['Kwame Asante', 'Community manager', '15', 'kasante'],
    created: [18, 10, 45],
    since: [3, 14, 10],
    acts: [
      [18, 10, 45, 'form', 'Website enquiry: “Co-working space on 3 floors with a busy kitchen. We need a clean before members arrive.”'],
      [13, 9, 30, 'call', 'Kwame wants cleaning Monday to Friday plus monthly windows.', 'Meeting booked'],
      [8, 16, 0, 'visit', 'Site visit done. 120 desks, 6 meeting rooms, 2 kitchens, 6 restrooms.'],
      [3, 14, 10, 'proposal', ''],
    ],
  },
  {
    head: ['tallgrass', 'Tallgrass Freight office', 'diego', 'proposal', 'Referral', 'Office', 5000, 2, []],
    contact: ['Derek Lowry', 'Office manager', '51', 'dlowry'],
    created: [21, 9, 0],
    since: [5, 11, 20],
    acts: [
      [21, 9, 0, 'note', 'Referred by the building manager at Ironleaf.'],
      [16, 10, 0, 'call', 'Dispatch runs 24/7. Cleaning must avoid the 6 AM shift change.', 'Spoke to them'],
      [9, 14, 30, 'visit', 'Walked the office with Derek. Dispatch room, 12 desks, break room, 2 restrooms.'],
      [5, 11, 20, 'proposal', ''],
    ],
  },
  {
    head: ['sycamore', 'Sycamore Row Veterinary', 'monique', 'proposal', 'Phone', 'Medical', 4200, 5, ['supplies']],
    contact: ['Jamal Price', 'Hospital manager', '38', 'jprice'],
    created: [14, 15, 0],
    since: [1, 10, 40],
    acts: [
      [14, 15, 0, 'call', 'Jamal called about the animal hospital. Their own staff keep the kennels.', 'Spoke to them'],
      [6, 11, 0, 'visit', 'Site visit with Jamal. 5 exam rooms, surgery suite, lab, lobby, 3 restrooms.'],
      [1, 10, 40, 'proposal', ''],
    ],
  },
  {
    head: ['thistledown', 'Thistledown Charter Academy', 'monique', 'negotiation', 'Referral', 'School', 10000, 5, ['carpet']],
    contact: ['Sofia Moreno', 'Business manager', '26', 'smoreno'],
    created: [34, 9, 15],
    since: [4, 16, 0],
    acts: [
      [34, 9, 15, 'note', 'Referred by Ethan at Ashby Lane Learning Academy.'],
      [27, 13, 0, 'visit', 'Toured both buildings with Sofia. 14 classrooms, cafeteria, gym, 8 restrooms.'],
      [11, 10, 0, 'proposal', ''],
      [4, 16, 0, 'call', 'Sofia asked for a 2-year price lock. Their board meets Thursday.', 'Asked for changes'],
    ],
  },
  {
    head: ['marrowstone', 'Marrowstone Law', 'diego', 'negotiation', 'Google search', 'Office', 4200, 3, ['windows']],
    contact: ['Victor Huang', 'Firm administrator', '83', 'vhuang'],
    created: [17, 11, 30],
    since: [2, 15, 45],
    acts: [
      [17, 11, 30, 'note', 'Found us on Google. Third-floor suite, 14 offices and a file room.'],
      [12, 10, 0, 'visit', 'Walked the suite with Victor. Confidential files, so the same crew every night.'],
      [8, 9, 40, 'proposal', ''],
      [2, 15, 45, 'email', 'Victor wants our insurance certificate and background-check policy before signing.'],
    ],
  },
  {
    head: ['oakember', 'Oak & Ember Pilates', 'grace', 'won', 'Walk-in', 'Gym', 2600, 3, ['supplies']],
    contact: ['Jenna Whitaker', 'Studio owner', '12', 'jwhitaker'],
    created: [30, 10, 0],
    since: [6, 15, 0],
    acts: [
      [30, 10, 0, 'note', 'Jenna walked in after her cleaner moved away.'],
      [24, 17, 0, 'visit', 'Studio walkthrough. Reformer room, 2 changing rooms, 2 restrooms.'],
      [20, 9, 0, 'proposal', ''],
    ],
  },
  {
    head: ['lindale', 'Lindale Dental Group', 'diego', 'won', 'Referral', 'Medical', 3000, 5, ['supplies']],
    contact: ['Aaliyah Grant', 'Office manager', '44', 'agrant'],
    created: [41, 9, 0],
    since: [16, 11, 30],
    acts: [
      [41, 9, 0, 'note', 'Referred by a patient who manages an office we clean.'],
      [35, 12, 0, 'visit', 'Walked the practice with Aaliyah. 6 operatories, sterilization room, 2 restrooms.'],
      [27, 10, 0, 'proposal', ''],
    ],
  },
  {
    head: ['ashby', 'Ashby Lane Learning Academy', 'monique', 'won', 'Website form', 'School', 6000, 5, []],
    contact: ['Ethan Brooks', 'Facilities coordinator', '70', 'ebrooks'],
    created: [52, 14, 0],
    since: [27, 10, 0],
    acts: [
      [52, 14, 0, 'form', 'Website enquiry: “Private K–5 school, 9 classrooms. Our contract ends this term.”'],
      [45, 15, 30, 'visit', 'Walked the school with Ethan. Cafeteria floors are the priority.'],
      [36, 9, 0, 'proposal', ''],
    ],
  },
  {
    head: ['corbel', 'Corbel Wealth Advisors', 'grace', 'lost', 'Google search', 'Office', 2200, 2, ['windows']],
    contact: ['Marcus Bell', 'Operations lead', '97', 'mbell'],
    created: [33, 11, 0],
    since: [12, 14, 0],
    lost: 'Chose competitor',
    acts: [
      [33, 11, 0, 'note', 'Found us on Google. Small advisory office downtown.'],
      [21, 10, 0, 'proposal', ''],
      [13, 16, 0, 'call', 'Marcus went with the cleaner their building manager recommended.', 'Not interested'],
    ],
  },
  {
    head: ['juniper', 'Juniper Hall Fitness', 'diego', 'lost', 'Phone', 'Gym', 6500, 5, ['supplies']],
    contact: ['Priya Natarajan', 'Club manager', '64', 'pnatarajan'],
    created: [38, 16, 0],
    since: [20, 9, 30],
    lost: 'Price',
    acts: [
      [38, 16, 0, 'call', 'Priya called about nightly cleaning for a 2-floor club.', 'Spoke to them'],
      [29, 11, 0, 'proposal', ''],
      [21, 15, 0, 'call', 'Priya’s budget is about $4,000 a month. We can’t do 5 nights for that.', 'Asked for changes'],
    ],
  },
]

/** [deal id, task, due in days (negative = overdue), hour, minute] */
const TASKS: [string, string, number, number, number][] = [
  ['mossgrove', 'Intro call: ask when their current contract ends', 1, 10, 30],
  ['basalt', 'Email our gym cleaning checklist', 1, 11, 0],
  ['lanternhill', 'Try Rachel again before noon', -1, 11, 0],
  ['wrenfield', 'Call Samuel to book a walkthrough', 2, 10, 0],
  ['harlow', 'Book a walkthrough for next week', 0, 14, 0],
  ['larkspur', 'Second call attempt', -2, 10, 0],
  ['redbud', 'Send references from two gyms we clean', 3, 12, 0],
  ['halvorsen', 'Confirm the walkthrough time with Bethany', 1, 9, 30],
  ['saltmarsh', 'Send the proposal', 0, 15, 0],
  ['quillmont', 'Second walkthrough with the board chair, 4 PM', 2, 16, 0],
  ['birchway', 'Price the procedure rooms and send the proposal', 1, 10, 0],
  ['thistledown', 'Send final terms with the 2-year price lock', 1, 9, 0],
  ['marrowstone', 'Send our insurance certificate and background-check policy', 0, 11, 30],
]

function buildDeal(row: Row, index: number, q0: number): Deal {
  const [id, company, owner, stage, source, facility, sqft, perWeek, addOns] = row.head
  const [name, role, phoneEnd, email] = row.contact
  const author = OWNERS[owner].name
  const closing = stage === 'won' || stage === 'lost'
  // Sample wins and losses must fall in the current quarter, even on its first day (then they're early this morning).
  const since = row.since ? (closing ? Math.max(at(row.since), q0 + (index + 1) * 20 * MINUTE) : at(row.since)) : at(row.created)
  const contact = { name, role, phone: `(919) 555-••${phoneEnd}`, email: `${email}@example.com` }
  const building = { facility, sqft, perWeek, addOns }
  const value = priceProposal(building).monthly
  const activities: Activity[] = row.acts.map(([d, h, m, kind, text, outcome], i) => ({
    id: `${id}-a${i}`,
    at: daysAgoAt(d, h, m),
    kind,
    text: text || proposalSummary({ contact, ...building }, value),
    author: kind === 'form' ? name : author,
    outcome,
  }))
  if (stage !== 'new') {
    const prev = OPEN_STAGES[Math.max(0, OPEN_STAGES.indexOf(stage) - 1)]
    const text =
      stage === 'won'
        ? 'Marked as won. Contract signed.'
        : stage === 'lost'
          ? `Marked as lost. Reason: ${row.lost}.`
          : `Moved from ${stageLabel(prev)} to ${stageLabel(stage)}.`
    activities.push({ id: `${id}-stage`, at: since, kind: 'stage', text, author })
  }
  activities.sort((a, b) => b.at - a.at)
  return {
    id,
    company,
    contact,
    owner,
    stage,
    value,
    source,
    ...building,
    createdAt: at(row.created),
    stageSince: since,
    lastActivityAt: activities[0].at,
    activities,
    closedAt: closing ? since : undefined,
    lostReason: row.lost,
    startDate: stage === 'won' ? addDays(since, 11) : undefined,
  }
}

export function createInitialState(): CrmState {
  const q0 = quarterStart(todayAt(8, 50))
  const deals = ROWS.map((row, i) => buildDeal(row, i, q0))
  const deal = (id: string) => deals.find((d) => d.id === id)!
  const task = (dealId: string, text: string, due: number, createdAt: number, extra: Partial<Task> = {}): Task => ({
    id: `t-${dealId}${extra.auto ? `-${extra.auto}` : ''}`,
    dealId,
    text,
    due,
    owner: deal(dealId).owner,
    createdAt,
    ...extra,
  })
  const tasks = TASKS.map(([id, text, days, h, m]) => task(id, text, addDays(todayAt(h, m), days), deal(id).lastActivityAt))
  const fern = deal('fernhollow').createdAt
  const lantern = deal('lanternhill').createdAt
  const oak = deal('oakember').stageSince
  tasks.push(
    task('fernhollow', 'Call within 1 business hour', fern + 60 * MINUTE, fern, { auto: 'form' }),
    task('lanternhill', 'Call within 1 business hour', lantern + 60 * MINUTE, lantern, { auto: 'form', doneAt: daysAgoAt(3, 13, 50) }),
    task('oakember', 'Onboarding: collect keys and alarm codes, agree the checklist', addDays(oak, 1), oak, { auto: 'won', doneAt: addDays(oak, 1) }),
    // Proposal follow-ups, booked by the rule when each proposal went out.
    ...deals.filter((d) => d.stage === 'proposal').map((d) => task(d.id, 'Follow up on the proposal', addDays(d.stageSince, 3), d.stageSince, { auto: 'proposal' })),
  )
  // The overnight check, so the stuck-deal reminders are already waiting this morning.
  return autoTasks({ deals, tasks, rules: { stuck: true, proposal: true, manager: true } }, todayAt(7, 0))
}
