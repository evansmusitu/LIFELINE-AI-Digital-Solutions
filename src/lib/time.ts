import { useCallback, useEffect, useState } from 'react'

export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

/** Timestamp for today at the given local time. */
export function todayAt(hours: number, minutes = 0): number {
  const d = new Date()
  d.setHours(hours, minutes, 0, 0)
  return d.getTime()
}

export function daysAgoAt(days: number, hours: number, minutes = 0): number {
  return todayAt(hours, minutes) - days * DAY
}

/** Timestamp for tomorrow at the given local time. Uses the calendar, so clock changes don't shift it. */
export function tomorrowAt(hours: number, minutes = 0): number {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(hours, minutes, 0, 0)
  return d.getTime()
}

export function isSameDay(a: number, b: number): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

/**
 * Each demo runs on its own clock that starts at a fixed time of day (for example 10:40),
 * so the sample day looks the same whenever someone visits. The clock then moves in real time.
 */
export function useDemoClock(startHours: number, startMinutes = 0): () => number {
  const [offset] = useState(() => todayAt(startHours, startMinutes) - Date.now())
  return useCallback(() => Date.now() + offset, [offset])
}

/** Re-renders every `intervalMs` and returns the current demo time. */
export function useTicker(clock: () => number, intervalMs = 30_000): number {
  const [now, setNow] = useState(clock)
  useEffect(() => {
    const id = window.setInterval(() => setNow(clock()), intervalMs)
    return () => window.clearInterval(id)
  }, [clock, intervalMs])
  return now
}

/** Small deterministic random generator, so generated sample data is identical on every visit. */
export function seededRandom(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

let counter = 0
export function uid(prefix = 'id'): string {
  counter += 1
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`
}
