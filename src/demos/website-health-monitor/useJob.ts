import { useEffect, useRef, useState } from 'react'
import { phaseAt } from './engine'

export interface JobInfo {
  key: string
  phases: string[]
  durationMs: number
}

type Finish = (silent: boolean) => void

/**
 * Plays one simulated job (a backup, a scan, a fix) with a progress fraction.
 * If the screen closes mid-job, the job finishes at once without a toast, so a tab switch never loses a result
 * and nothing updates after unmount. Progress itself is never stored, so a reload can't leave anything stuck.
 */
export function useJob() {
  const [job, setJob] = useState<JobInfo | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const live = useRef<{ timer: number | null; finish: Finish | null }>({ timer: null, finish: null })

  useEffect(() => {
    const ref = live.current
    return () => {
      if (ref.timer !== null) window.clearInterval(ref.timer)
      const finish = ref.finish
      ref.timer = null
      ref.finish = null
      finish?.(true)
    }
  }, [])

  const start = (info: JobInfo, onDone: Finish) => {
    const ref = live.current
    if (ref.finish) return
    const began = Date.now()
    ref.finish = onDone
    setJob(info)
    setElapsed(0)
    ref.timer = window.setInterval(() => {
      const t = Date.now() - began
      if (t < info.durationMs) {
        setElapsed(t)
        return
      }
      if (ref.timer !== null) window.clearInterval(ref.timer)
      const finish = ref.finish
      ref.timer = null
      ref.finish = null
      setJob(null)
      setElapsed(0)
      finish?.(false)
    }, 100)
  }

  const progress = job ? Math.min(1, elapsed / job.durationMs) : 0
  return { job, progress, phase: job ? job.phases[phaseAt(progress, job.phases.length)] : '', start, busy: job !== null }
}
