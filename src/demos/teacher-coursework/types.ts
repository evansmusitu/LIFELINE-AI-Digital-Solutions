/** A learner as the teacher's tools show them: first name and the first letter of the surname only. */
export interface Learner {
  id: string
  name: string
  /** A sample candidate number, used in the export instead of the name. */
  candidate: string
  /** The last 20 school days, oldest first: true when present. */
  attendance: boolean[]
}

export interface Task {
  id: string
  name: string
  topic: string
  outOf: number
  /** Days from today: negative is past. */
  dueInDays: number
  /** A coursework task that counts towards the exam board's marks. */
  board: boolean
}

export type Marks = Record<string, Record<string, number | null>>

export type Stage = 'proposal' | 'draft1' | 'draft2' | 'final'

export interface ProjectRecord {
  /** When each stage was handed in, in days from today (negative), or undefined when it wasn't. */
  stages: Partial<Record<Stage, number>>
  /** Words in the last draft and in the final report. */
  draftWords?: number
  finalWords?: number
  /** The learner signed the declaration that the work is their own, and said how they used any AI tool. */
  declared: boolean
  /** The teacher talked to the learner about a flag. */
  discussed?: string
  signedOff: boolean
}

export interface Comment {
  text: string
  source: 'ai' | 'saved' | 'teacher'
  approved: boolean
}

export type CheckInKind = 'Check-in with the learner' | 'Call home' | 'Referred to the counsellor'

export interface CheckIn {
  id: string
  learnerId: string
  kind: CheckInKind
  at: number
  /** For a referral, a reason category only, never a diagnosis. */
  note: string
}

export interface TeacherState {
  marks: Marks
  projects: Record<string, ProjectRecord>
  comments: Record<string, Comment>
  checkIns: CheckIn[]
  /** Tasks whose marks are entered on the board's portal. */
  entered: Record<string, boolean>
}
