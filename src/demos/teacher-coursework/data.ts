import { seededRandom } from '../../lib/time'
import { TEACHER_PAGE } from '../../receptionist/protocol'
import type { Learner, Marks, ProjectRecord, Task, TeacherState } from './types'

/*
 * The sample teacher, class and coursework. Invented school, people and marks. The deadlines are
 * counted from today, so the demo always has something due. They are sample dates, not the boards'.
 */

export const TEACHER_SLUG = TEACHER_PAGE

export const SCHOOL = {
  name: 'Mukwa Ridge Academy',
  short: 'Mukwa Ridge',
  teacher: 'Mr T. Moyo',
  subject: 'Geography',
  className: 'Form 4B Geography',
  board: 'ZIMSEC O Level',
  centre: '090417',
} as const

const NAMES = [
  'Tanaka M.',
  'Rutendo C.',
  'Kudakwashe N.',
  'Chipo D.',
  'Tatenda G.',
  'Nyasha S.',
  'Farai K.',
  'Ruvimbo T.',
  'Tinashe B.',
  'Vimbai Z.',
  'Takudzwa H.',
  'Anesu P.',
  'Munashe R.',
  'Rumbidzai J.',
  'Tawanda F.',
  'Ropafadzo L.',
  'Simbarashe W.',
  'Tariro E.',
  'Panashe V.',
  'Kundai O.',
  'Mufaro A.',
  'Nokutenda Y.',
  'Shamiso I.',
  'Batsirai U.',
]

/** Learners whose attendance has dropped (sample), by index. */
const LOW_ATTENDANCE: Record<number, number[]> = { 4: [12, 13, 15, 16, 18], 9: [17, 18, 19], 15: [2, 7, 11] }

export const LEARNERS: readonly Learner[] = NAMES.map((name, i) => ({
  id: `l${i + 1}`,
  name,
  candidate: `${SCHOOL.centre}${String(101 + i).padStart(4, '0')}`,
  attendance: Array.from({ length: 20 }, (_, d) => !(LOW_ATTENDANCE[i] ?? []).includes(d)),
}))

export const TASKS: readonly Task[] = [
  { id: 'map', name: 'Map work test', topic: 'Map work', outOf: 40, dueInDays: -48, board: false },
  { id: 'weather', name: 'Weather station records', topic: 'Weather and climate', outOf: 30, dueInDays: -33, board: true },
  { id: 'settlement', name: 'Settlement study', topic: 'Settlement', outOf: 30, dueInDays: -19, board: true },
  { id: 'farming', name: 'Farming systems test', topic: 'Agriculture', outOf: 40, dueInDays: -8, board: false },
  { id: 'fieldwork', name: 'Fieldwork project: final report', topic: 'Fieldwork project', outOf: 50, dueInDays: 5, board: true },
]

/** The board's sample deadline for entering this class's coursework marks on its portal, in days from today. */
export const ENTRY_DEADLINE_DAYS = 12

/** Average share of the marks per task in the sample, so Map work and Agriculture come out weak. */
const TASK_LEVEL: Record<string, number> = { map: 0.49, weather: 0.66, settlement: 0.71, farming: 0.52, fieldwork: 0.68 }

/** Not handed in yet (sample), by task and learner index. */
const NOT_IN: Record<string, number[]> = { weather: [9], settlement: [4], fieldwork: [1, 4, 6, 9, 13, 15, 20] }

function sampleMarks(): Marks {
  const random = seededRandom(417)
  const marks: Marks = {}
  for (const task of TASKS) {
    marks[task.id] = {}
    LEARNERS.forEach((l, i) => {
      if ((NOT_IN[task.id] ?? []).includes(i)) {
        marks[task.id][l.id] = null
        return
      }
      // The final reports handed in so far are not all marked yet: the first few are.
      if (task.id === 'fieldwork' && i > 11) {
        marks[task.id][l.id] = null
        return
      }
      const share = Math.min(0.97, Math.max(0.18, TASK_LEVEL[task.id] + (random() - 0.5) * 0.42 + (i % 5 === 0 ? 0.08 : 0)))
      marks[task.id][l.id] = Math.round(share * task.outOf)
    })
  }
  return marks
}

/** Fieldwork reports handed in but not marked yet. */
export const HANDED_IN_UNMARKED = new Set(LEARNERS.filter((_, i) => i > 11 && !NOT_IN.fieldwork.includes(i)).map((l) => l.id))

function sampleProjects(): Record<string, ProjectRecord> {
  const projects: Record<string, ProjectRecord> = {}
  LEARNERS.forEach((l, i) => {
    const handedIn = !NOT_IN.fieldwork.includes(i)
    const base: ProjectRecord = {
      stages: { proposal: -40, draft1: -24, draft2: -12, ...(handedIn ? { final: -2 - (i % 3) } : {}) },
      draftWords: 900 + ((i * 53) % 400),
      finalWords: handedIn ? 1400 + ((i * 71) % 500) : undefined,
      declared: handedIn,
      signedOff: handedIn && i < 6,
    }
    projects[l.id] = base
  })
  // Three that need a conversation (sample).
  projects.l8 = { ...projects.l8, stages: { proposal: -40, final: -3 }, draftWords: undefined, signedOff: false }
  projects.l12 = { ...projects.l12, draftWords: 520, finalWords: 2350, signedOff: false }
  projects.l17 = { ...projects.l17, declared: false, signedOff: false }
  return projects
}

export function createInitialState(): TeacherState {
  return { marks: sampleMarks(), projects: sampleProjects(), comments: {}, checkIns: [], entered: { weather: true } }
}

/* The deadlines screen: this teacher's classes, and the same tracker in a Kenyan school */

export interface DeadlineRow {
  className: string
  task: string
  /** Days from today. */
  dueInDays: number
  learners: number
  handedIn: number
  marked: number
  entered: number
  portal: string
}

export type BoardId = 'zimsec' | 'knec'

export const BOARDS: Record<BoardId, { label: string; school: string; note: string; rows: readonly DeadlineRow[] }> = {
  zimsec: {
    label: 'ZIMSEC',
    school: SCHOOL.name,
    note: 'Sample deadlines. The school copies the real ones from ZIMSEC’s circulars each year.',
    rows: [
      { className: 'Upper 6 Biology', task: 'Practical investigation', dueInDays: 9, learners: 18, handedIn: 18, marked: 18, entered: 12, portal: 'ZIMSEC portal' },
      { className: 'Form 4A Geography', task: 'Fieldwork project', dueInDays: 12, learners: 26, handedIn: 25, marked: 25, entered: 0, portal: 'ZIMSEC portal' },
      { className: 'Form 3A Mathematics', task: 'Statistics investigation (school only)', dueInDays: 20, learners: 30, handedIn: 28, marked: 20, entered: 0, portal: 'School mark book' },
    ],
  },
  knec: {
    label: 'KNEC (Kenya)',
    school: 'A sample school in Nakuru',
    note: 'The same tracker set up for a Kenyan school, with sample KNEC school-based assessment deadlines.',
    rows: [
      { className: 'Grade 10 East', task: 'Agriculture project', dueInDays: 6, learners: 44, handedIn: 41, marked: 30, entered: 18, portal: 'KNEC CBA portal' },
      { className: 'Grade 9 West', task: 'KJSEA project', dueInDays: 11, learners: 47, handedIn: 47, marked: 47, entered: 47, portal: 'KNEC CBA portal' },
      { className: 'Grade 8 North', task: 'Performance task: integrated science', dueInDays: 15, learners: 45, handedIn: 32, marked: 12, entered: 0, portal: 'KNEC CBA portal' },
    ],
  },
}

/* Revision in school time: lesson slots the plan can use (sample timetable) */

export const REVISION_SLOTS = ['Tuesday, period 3', 'Thursday, period 5', 'Friday homework club (free, 14:30)'] as const
