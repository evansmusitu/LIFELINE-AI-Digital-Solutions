import { LEARNERS, REVISION_SLOTS, SCHOOL, TASKS, type DeadlineRow } from './data'
import type { CheckIn, Learner, Marks, ProjectRecord, Task } from './types'

/*
 * The teacher demo's logic: averages and weak topics, what is missing, deadline status, the project
 * authenticity flags, attendance check-ins, the export and the report-comment facts. Pure functions,
 * tested in test/teacher.test.ts.
 */

const pct = (mark: number, outOf: number) => Math.round((mark / outOf) * 100)

/* Marks */

/** A learner's percentage on a task, or null when there is no mark yet. */
export function taskPercent(marks: Marks, task: Task, learnerId: string): number | null {
  const m = marks[task.id]?.[learnerId]
  return m === null || m === undefined ? null : pct(m, task.outOf)
}

/** The class average for a task, in percent, over the learners with a mark. */
export function taskAverage(marks: Marks, task: Task, learners: readonly Learner[] = LEARNERS): number | null {
  const got = learners.map((l) => taskPercent(marks, task, l.id)).filter((p): p is number => p !== null)
  return got.length ? Math.round(got.reduce((a, b) => a + b, 0) / got.length) : null
}

/** A learner's average over the tasks they have a mark for. */
export function learnerAverage(marks: Marks, learnerId: string, tasks: readonly Task[] = TASKS): number | null {
  const got = tasks.map((t) => taskPercent(marks, t, learnerId)).filter((p): p is number => p !== null)
  return got.length ? Math.round(got.reduce((a, b) => a + b, 0) / got.length) : null
}

/** A typed mark: a whole number from 0 to the task's maximum, or empty. */
export function parseMark(raw: string, outOf: number): number | null | 'invalid' {
  const value = raw.trim()
  if (!value) return null
  if (!/^\d{1,3}$/.test(value)) return 'invalid'
  const n = Number(value)
  return n <= outOf ? n : 'invalid'
}

/** Below this class average, a topic goes into the revision plan. */
export const WEAK_BELOW = 55

export interface WeakTopic {
  topic: string
  average: number
  /** Learners under 50% on it. */
  learners: string[]
}

export function weakTopics(marks: Marks, tasks: readonly Task[] = TASKS, learners: readonly Learner[] = LEARNERS): WeakTopic[] {
  return tasks
    .map((t) => ({ t, average: taskAverage(marks, t, learners) }))
    .filter((x): x is { t: Task; average: number } => x.average !== null && x.average < WEAK_BELOW)
    .sort((a, b) => a.average - b.average)
    .map(({ t, average }) => ({
      topic: t.topic,
      average,
      learners: learners.filter((l) => (taskPercent(marks, t, l.id) ?? 100) < 50).map((l) => l.name),
    }))
}

export interface RevisionSession {
  topic: string
  slot: string
  group: string
}

/**
 * A free revision plan in school time, one session per weak topic. Paid extra lessons by a learner's
 * own teacher are not allowed, so every session is in lesson time or the free homework club.
 */
export function revisionPlan(weak: WeakTopic[]): RevisionSession[] {
  return weak.map((w, i) => ({
    topic: w.topic,
    slot: REVISION_SLOTS[i % REVISION_SLOTS.length],
    group: w.learners.length ? `Whole class, with a small group for ${w.learners.length} learner${w.learners.length === 1 ? '' : 's'} under 50%` : 'Whole class',
  }))
}

/* Coursework status */

export const handedIn = (projects: Record<string, ProjectRecord>, learnerId: string) => projects[learnerId]?.stages.final !== undefined

export interface TaskStatus {
  learners: number
  handedIn: number
  marked: number
  /** Learners who haven't handed it in, by name. */
  missing: string[]
}

/** For past tasks a mark means handed in; for the fieldwork project the log says whether the final report is in. */
export function taskStatus(task: Task, marks: Marks, projects: Record<string, ProjectRecord>, learners: readonly Learner[] = LEARNERS): TaskStatus {
  const isIn = (l: Learner) => (task.id === 'fieldwork' ? handedIn(projects, l.id) : marks[task.id]?.[l.id] !== null && marks[task.id]?.[l.id] !== undefined)
  const marked = learners.filter((l) => marks[task.id]?.[l.id] !== null && marks[task.id]?.[l.id] !== undefined).length
  return { learners: learners.length, handedIn: learners.filter(isIn).length, marked, missing: learners.filter((l) => !isIn(l)).map((l) => l.name) }
}

export type Readiness = 'Done' | 'On track' | 'Behind' | 'Overdue'

/** Where a class stands against a deadline: behind when less than the expected share is marked for the days left. */
export function readiness(row: Pick<DeadlineRow, 'dueInDays' | 'learners' | 'marked' | 'entered' | 'portal'>): Readiness {
  const target = row.portal === 'School mark book' ? row.marked : row.entered
  if (target >= row.learners) return 'Done'
  if (row.dueInDays < 0) return 'Overdue'
  return row.marked / row.learners >= (row.dueInDays <= 7 ? 0.8 : 0.5) ? 'On track' : 'Behind'
}

export const daysLabel = (days: number) =>
  days === 0 ? 'today' : days === 1 ? 'tomorrow' : days > 0 ? `in ${days} days` : days === -1 ? 'yesterday' : `${-days} days ago`

/* Authenticity */

export type Flag = 'No drafts recorded' | 'Big jump from the last draft' | 'Declaration not signed' | 'Not handed in'

/** What the teacher should talk to the learner about before signing the project off. */
export function projectFlags(p: ProjectRecord | undefined): Flag[] {
  if (!p || p.stages.final === undefined) return ['Not handed in']
  const flags: Flag[] = []
  if (p.stages.draft1 === undefined && p.stages.draft2 === undefined) flags.push('No drafts recorded')
  else if (p.draftWords && p.finalWords && p.finalWords > p.draftWords * 2) flags.push('Big jump from the last draft')
  if (!p.declared) flags.push('Declaration not signed')
  return flags
}

/** The teacher can sign off once there is no open flag, or after recording the conversation about it. */
export const canSignOff = (p: ProjectRecord | undefined) => {
  const flags = projectFlags(p)
  return !!p && !flags.includes('Not handed in') && !flags.includes('Declaration not signed') && (flags.length === 0 || !!p.discussed)
}

/* Attendance */

export const attendanceRate = (l: Learner) => Math.round((l.attendance.filter(Boolean).length / l.attendance.length) * 100)
export const recentAbsences = (l: Learner, days = 10) => l.attendance.slice(-days).filter((p) => !p).length

/**
 * A check-in is suggested below 90% over 20 school days, or with 3 or more absences in the last 10.
 * It's a prompt for a kind conversation, never a label on the learner.
 */
export const needsCheckIn = (l: Learner) => attendanceRate(l) < 90 || recentAbsences(l) >= 3

export const lastCheckIn = (checkIns: CheckIn[], learnerId: string) =>
  checkIns.filter((c) => c.learnerId === learnerId).sort((a, b) => b.at - a.at)[0]

/** Reason categories for a counsellor referral. Never a diagnosis. */
export const REFERRAL_REASONS = ['Seems withdrawn or unhappy', 'Worried about something at home', 'Friendship or bullying worry', 'Asked to talk to someone', 'Other (I’ll explain in person)'] as const

/* Export */

/** The coursework marks laid out for upload: centre, candidate number, task and mark. Names are not included. */
export function exportCsv(task: Task, marks: Marks, learners: readonly Learner[] = LEARNERS): string {
  const rows = [['centre', 'candidate', 'subject', 'task', 'mark', 'out_of']]
  for (const l of learners) {
    const m = marks[task.id]?.[l.id]
    rows.push([SCHOOL.centre, l.candidate, SCHOOL.subject, task.name, m === null || m === undefined ? 'ABSENT' : String(m), String(task.outOf)])
  }
  return rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\n')
}

/* Report comments */

/** The placeholder the assistant writes instead of a name. The browser puts the first name in when it shows the draft. */
export const NAME = '{name}'

const bandWord = (p: number) => (p >= 75 ? 'strong' : p >= 60 ? 'good' : p >= 50 ? 'fair' : 'weak')

/**
 * The facts sent to the assistant for one learner's comment. No name, candidate number, attendance or
 * anything personal: only the subject, the marks by topic and the coursework status.
 */
export function commentFacts(marks: Marks, learnerId: string, projects: Record<string, ProjectRecord>, tasks: readonly Task[] = TASKS): string {
  const scored = tasks
    .map((t) => ({ t, p: taskPercent(marks, t, learnerId), avg: taskAverage(marks, t) }))
    .filter((x): x is { t: Task; p: number; avg: number } => x.p !== null && x.avg !== null)
  const best = [...scored].sort((a, b) => b.p - a.p)[0]
  const worst = [...scored].sort((a, b) => a.p - b.p)[0]
  const average = learnerAverage(marks, learnerId, tasks)
  const project = handedIn(projects, learnerId) ? 'fieldwork project handed in on time' : 'fieldwork project not handed in yet'
  return [
    `Subject: ${SCHOOL.subject}, ${SCHOOL.className.split(' ')[0]} ${SCHOOL.className.split(' ')[1]}, ${SCHOOL.board}.`,
    `Term average: ${average ?? 'no marks'}%.`,
    ...scored.map((x) => `${x.t.topic}: ${x.p}% (class ${x.avg}%, ${bandWord(x.p)}).`),
    best ? `Strongest topic: ${best.t.topic}.` : '',
    worst && worst !== best ? `Topic to work on: ${worst.t.topic}.` : '',
    `Coursework: ${project}.`,
  ]
    .filter(Boolean)
    .join(' ')
}

/** The message sent to the assistant. Short enough for the chat limit. */
export const commentRequest = (facts: string) => `Draft a report comment from these facts. ${facts}`.slice(0, 500)

/** The draft with the first name put in. A draft without the placeholder is shown as it is. */
export const withName = (draft: string, learnerName: string) => draft.replaceAll(NAME, learnerName.split(' ')[0]).replaceAll('{Name}', learnerName.split(' ')[0])

const TIPS: Record<string, string> = {
  'Map work': 'practising grid references and scale with past questions',
  'Weather and climate': 'reading climate graphs carefully and naming the trend',
  Settlement: 'using a named example in every answer',
  Agriculture: 'learning the key terms for each farming system',
  'Fieldwork project': 'linking each finding back to the hypothesis',
}

/** A comment written from the facts without AI, used when there is no AI reply. */
export function savedComment(marks: Marks, learnerId: string, projects: Record<string, ProjectRecord>, tasks: readonly Task[] = TASKS): string {
  const scored = tasks.map((t) => ({ t, p: taskPercent(marks, t, learnerId) })).filter((x): x is { t: Task; p: number } => x.p !== null)
  if (!scored.length) return `${NAME} has no marks recorded yet this term. We will agree the next steps together.`
  const best = [...scored].sort((a, b) => b.p - a.p)[0]
  const worst = [...scored].sort((a, b) => a.p - b.p)[0]
  const average = learnerAverage(marks, learnerId, tasks) ?? 0
  const opener =
    average >= 70 ? `${NAME} has worked very well in Geography this term` : average >= 55 ? `${NAME} has made steady progress in Geography this term` : `${NAME} has worked to keep up in Geography this term`
  const project = handedIn(projects, learnerId) ? '' : ' Please hand in the fieldwork report as soon as possible.'
  return `${opener}, with particularly good work on ${best.t.topic.toLowerCase()}. The next step is ${worst.t.topic.toLowerCase()}: ${TIPS[worst.t.topic] ?? 'regular practice'} will help.${project}`
}
