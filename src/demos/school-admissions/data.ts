import type { Grade } from './business'
import { stageFor, placesLeft, tourSlots } from './engine'
import type { Application, Enquiry, EnquiryStatus, Entry, SchoolState, Source, Stage, Tour } from './types'

/*
 * Sample data, made up for the demo and laid out around the visitor's own clock, so "today" and
 * "this week" always look current. Families' names are invented and phone numbers are masked.
 */

const HOUR = 3_600_000

/** [hours ago, parent, masked phone, source, grade, entry, note, minutes to first reply, status] */
const ENQUIRIES: [number, string, string, Source, Grade, Entry, string, number | null, EnquiryStatus][] = [
  [0.6, 'Tendai Mapfumo', '+263 ••• ••• 418', 'Website chat', 'Form 1', 'January 2027', 'Asked about the Form 1 entrance test and boarding', 0, 'New'],
  [2.5, 'Nyasha Gumbo', '+27 ••• ••• 902', 'WhatsApp', 'Grade 4', 'Mid-year transfer', 'Moving back from Pretoria in April, asked about transfers', 0, 'Handed over'],
  [5, 'Farai Dube', '+263 ••• ••• 377', 'Facebook', 'ECD A', 'January 2027', 'Asked about ECD fees in ZiG', 0, 'Contacted'],
  [9, 'Ruvimbo Chari', '+263 ••• ••• 145', 'Phone', 'Lower 6', 'January 2027', 'Asked which A Level subjects are offered', 240, 'Contacted'],
  [21, 'Blessing Sibanda', '+44 ••• ••• 630', 'Website chat', 'Form 2', 'January 2027', 'Parent in the UK, asked how family can pay from abroad', 0, 'Tour booked'],
  [28, 'Kudzai Moyo', '+263 ••• ••• 851', 'WhatsApp', 'Grade 1', 'January 2027', 'Asked about the school bus routes', 0, 'Applied'],
  [46, 'Memory Ncube', '+263 ••• ••• 209', 'Phone', 'Form 3', 'Mid-year transfer', 'Left a message at reception', 1_380, 'Contacted'],
  [70, 'Tafadzwa Mutasa', '+263 ••• ••• 564', 'Facebook', 'Grade 6', 'January 2027', 'Asked if there is a waiting list', null, 'New'],
]

/** [hours ago, child, parent, masked phone, grade, entry, documents attached, sibling, source, stage] */
const APPLICATIONS: [number, string, string, string, Grade, Entry, string[], boolean, Source, Stage | null][] = [
  [3, 'Anesu M.', 'Kudzai Moyo', '+263 ••• ••• 851', 'Grade 1', 'January 2027', ['birth', 'reports', 'immunisation', 'photo'], false, 'WhatsApp', null],
  [26, 'Takunda C.', 'Grace Chikore', '+263 ••• ••• 732', 'Form 1', 'January 2027', ['birth', 'photo'], false, 'Application', null],
  [50, 'Rufaro N.', 'Peter Nyoni', '+263 ••• ••• 118', 'Form 1', 'January 2027', ['birth', 'reports', 'photo'], false, 'Application', 'Assessment booked'],
  [75, 'Tinotenda S.', 'Lindiwe Sibanda', '+27 ••• ••• 446', 'Form 2', 'Mid-year transfer', ['birth', 'reports', 'photo'], false, 'WhatsApp', null],
  [120, 'Chiedza M.', 'Rumbi Marufu', '+263 ••• ••• 590', 'Grade 6', 'January 2027', ['birth', 'reports', 'photo'], true, 'Application', null],
  [140, 'Tawanda K.', 'Joseph Kanengoni', '+263 ••• ••• 263', 'Grade 6', 'January 2027', ['birth', 'reports', 'photo'], false, 'Facebook', null],
  [200, 'Nokuthula D.', 'Thandi Dlamini', '+263 ••• ••• 371', 'Lower 6', 'January 2027', ['birth', 'reports', 'photo'], false, 'Application', 'Offer made'],
  [260, 'Simbarashe G.', 'Agnes Gwatidzo', '+263 ••• ••• 904', 'ECD A', 'January 2027', ['birth', 'immunisation', 'photo'], false, 'Phone', 'Accepted'],
]

/** [parent, masked phone, grade, tour number from the first free one, source] */
const TOURS: [string, string, Grade, number, Source][] = [
  ['Blessing Sibanda', '+44 ••• ••• 630', 'Form 2', 0, 'Website chat'],
  ['Tendai Mapfumo', '+263 ••• ••• 418', 'Form 1', 0, 'Tour page'],
  ['Peter Nyoni', '+263 ••• ••• 118', 'Form 1', 1, 'Tour page'],
  ['Ruvimbo Chari', '+263 ••• ••• 145', 'Lower 6', 2, 'Phone'],
]

export function createInitialState(now: number): SchoolState {
  const enquiries: Enquiry[] = ENQUIRIES.map(([ago, parent, contact, source, grade, entry, note, firstReplyMinutes, status], i) => ({
    id: `enquiry-${i + 1}`,
    parent,
    contact,
    source,
    grade,
    entry,
    note,
    at: now - ago * HOUR,
    firstReplyMinutes,
    status,
  }))

  const applications: Application[] = []
  APPLICATIONS.forEach(([ago, child, parent, contact, grade, entry, docs, sibling, source, stage], i) => {
    const docMap = Object.fromEntries(docs.map((d) => [d, true]))
    const base = { grade, entry, docs: docMap }
    applications.push({
      id: `application-${i + 1}`,
      ref: `MRA-${1001 + i}`,
      child,
      parent,
      contact,
      ...base,
      consent: true,
      stage: stage ?? stageFor(base, placesLeft(grade, applications)),
      sibling,
      source,
      at: now - ago * HOUR,
    })
  })

  const slots = tourSlots([], now)
  const tours: Tour[] = TOURS.flatMap(([parent, contact, grade, n, source], i) => {
    const slot = slots[n]
    return slot
      ? [{ id: `tour-${i + 1}`, ref: `MRA-${1101 + i}`, parent, contact, grade, start: slot.start, source, createdAt: now - (i + 1) * 5 * HOUR }]
      : []
  })

  return { enquiries, tours, applications, notices: [], nextRef: 1201 }
}
