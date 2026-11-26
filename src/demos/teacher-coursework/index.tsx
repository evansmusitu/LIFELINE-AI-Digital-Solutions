import { BookMarked, CalendarClock, HeartHandshake, NotebookPen, ShieldCheck, Table2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useToast } from '../../components/toast-context'
import { useBusinessName } from '../../lib/business-name'
import { num } from '../../lib/format'
import { usePersistentState } from '../../lib/storage'
import { uid, useTicker } from '../../lib/time'
import { useDemoMetrics } from '../metrics'
import { DemoAppShell, type DemoScreen } from '../shell'
import { createInitialState, LEARNERS, SCHOOL, TASKS, TEACHER_SLUG } from './data'
import { DeadlinesScreen } from './DeadlinesScreen'
import { commentFacts, needsCheckIn, savedComment, weakTopics } from './engine'
import { MarkbookScreen } from './MarkbookScreen'
import { PastoralScreen } from './PastoralScreen'
import { ProjectsScreen } from './ProjectsScreen'
import { ReportsScreen } from './ReportsScreen'
import type { CheckInKind, TeacherState } from './types'
import { useCommentDraft } from './useCommentDraft'

const ACCENT = { base: '#0e7490', strong: '#155e75', soft: '#ecfeff', ink: '#164e63' }

type ScreenId = 'deadlines' | 'markbook' | 'projects' | 'reports' | 'pastoral'

export default function TeacherCourseworkDemo() {
  const business = useBusinessName()
  const now = useTicker(useCallback(() => Date.now(), []))
  const toast = useToast()
  const [state, setState] = usePersistentState<TeacherState>(`${TEACHER_SLUG}.state`, createInitialState, { version: 1 })
  const [screen, setScreen] = useState<ScreenId>('deadlines')
  const [note, setNote] = useState<string | null>(null)
  const { draft, pending } = useCommentDraft()
  const name = business ?? SCHOOL.name

  const setMark = (taskId: string, learnerId: string, mark: number | null) =>
    setState((s) => ({ ...s, marks: { ...s.marks, [taskId]: { ...s.marks[taskId], [learnerId]: mark } }, entered: { ...s.entered, [taskId]: false } }))

  const discussed = (learnerId: string, outcome: string) =>
    setState((s) => {
      const p = s.projects[learnerId]
      if (!p) return s
      return { ...s, projects: { ...s.projects, [learnerId]: { ...p, discussed: outcome, declared: p.declared || /declar/i.test(outcome) } } }
    })

  const signOff = (learnerId: string) => {
    setState((s) => ({ ...s, projects: { ...s.projects, [learnerId]: { ...s.projects[learnerId], signedOff: true } } }))
    toast(`Signed off: ${LEARNERS.find((l) => l.id === learnerId)?.name}’s fieldwork project.`, 'success')
  }

  const draftComment = async (learnerId: string) => {
    const result = await draft(learnerId, commentFacts(state.marks, learnerId, state.projects))
    if (!result) return
    const text = result.ok ? result.text : savedComment(state.marks, learnerId, state.projects)
    setNote(result.ok ? null : result.note)
    setState((s) => ({ ...s, comments: { ...s.comments, [learnerId]: { text, source: result.ok ? 'ai' : 'saved', approved: false } } }))
  }

  const editComment = (learnerId: string, text: string) =>
    setState((s) => ({ ...s, comments: { ...s.comments, [learnerId]: { text, source: 'teacher', approved: false } } }))

  const approve = (learnerId: string) => {
    setState((s) => ({ ...s, comments: { ...s.comments, [learnerId]: { ...s.comments[learnerId], approved: true } } }))
    toast('Comment approved. It goes on the report.', 'success')
  }

  const logCheckIn = (learnerId: string, kind: CheckInKind, text: string) => {
    setState((s) => ({ ...s, checkIns: [{ id: uid('checkin'), learnerId, kind, at: Date.now(), note: text }, ...s.checkIns] }))
    toast(kind === 'Referred to the counsellor' ? 'Sent privately to the school counsellor (simulated).' : `${kind} logged.`, 'success')
  }

  const approved = LEARNERS.filter((l) => state.comments[l.id]?.approved).length
  const weak = weakTopics(state.marks)
  useDemoMetrics([
    { label: 'Report comments approved', value: `${num(approved)} of ${num(LEARNERS.length)}`, detail: 'Drafted by the assistant, checked by the teacher' },
    { label: 'Weak topics found', value: num(weak.length), detail: weak.map((w) => w.topic).join(', ') || 'None' },
    { label: 'Board tasks entered', value: `${num(TASKS.filter((t) => t.board && state.entered[t.id]).length)} of ${num(TASKS.filter((t) => t.board).length)}`, detail: 'Before the deadline' },
    { label: 'Check-ins suggested', value: num(LEARNERS.filter(needsCheckIn).length), detail: 'From attendance, this week' },
  ])

  const screens: DemoScreen<ScreenId>[] = [
    { id: 'deadlines', label: 'Deadlines', icon: CalendarClock, audience: 'team' },
    { id: 'markbook', label: 'Mark book', icon: Table2, audience: 'team' },
    { id: 'projects', label: 'Project log', icon: ShieldCheck, audience: 'team' },
    { id: 'reports', label: 'Report comments', icon: NotebookPen, audience: 'team' },
    { id: 'pastoral', label: 'Check-ins', icon: HeartHandshake, audience: 'team', badge: LEARNERS.filter(needsCheckIn).length },
  ]

  return (
    <DemoAppShell
      slug={TEACHER_SLUG}
      business={{ name, descriptor: business ? 'Your school, sample data' : `${SCHOOL.teacher} · ${SCHOOL.className} · ${SCHOOL.board}`, icon: BookMarked }}
      accent={ACCENT}
      screens={screens}
      active={screen}
      onChange={setScreen}
    >
      <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 sm:px-5">
        <span className="font-semibold">Sample school, sample data.</span> The teacher, learners, marks and deadlines are invented for this demo. Nothing is
        uploaded or sent.
      </p>
      {screen === 'deadlines' && (
        <DeadlinesScreen
          marks={state.marks}
          projects={state.projects}
          entered={state.entered}
          onEntered={(id) => {
            setState((s) => ({ ...s, entered: { ...s.entered, [id]: true } }))
            toast('Marked as entered on the portal.', 'success')
          }}
          onExported={(task) => toast(`Exported ${task} in the upload layout.`, 'success')}
        />
      )}
      {screen === 'markbook' && <MarkbookScreen marks={state.marks} projects={state.projects} onMark={setMark} />}
      {screen === 'projects' && <ProjectsScreen projects={state.projects} onDiscussed={discussed} onSignOff={signOff} />}
      {screen === 'reports' && (
        <ReportsScreen
          marks={state.marks}
          projects={state.projects}
          comments={state.comments}
          pending={pending}
          note={note}
          onDraft={(id) => void draftComment(id)}
          onEdit={editComment}
          onApprove={approve}
        />
      )}
      {screen === 'pastoral' && <PastoralScreen now={now} checkIns={state.checkIns} onLog={logCheckIn} />}
    </DemoAppShell>
  )
}
