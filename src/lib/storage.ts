import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

/*
 * All demo state lives in the visitor's browser (brief, section 7: no backend).
 * Keys look like "lifeline.v1.<demo-slug>.<name>" so one demo can be reset on its own.
 */
const PREFIX = 'lifeline.v1.'

interface Stored<T> {
  v: number
  day: string
  data: T
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Storage can be full or blocked (private browsing). The demo still works for this visit.
  }
}

export function clearDemoStorage(slug: string) {
  try {
    const prefix = `${PREFIX}${slug}.`
    const keys: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (key?.startsWith(prefix)) keys.push(key)
    }
    keys.forEach((key) => window.localStorage.removeItem(key))
  } catch {
    // Nothing stored, nothing to clear.
  }
}

interface Options {
  /** Bump when the shape of the stored data changes, so old data is replaced with fresh samples. */
  version?: number
  /** Re-create the sample data on a new calendar day, so "today" figures always look current. */
  freshDaily?: boolean
}

/** useState that survives page reloads. `key` should start with the demo slug. */
export function usePersistentState<T>(
  key: string,
  init: () => T,
  { version = 1, freshDaily = false }: Options = {},
): [T, Dispatch<SetStateAction<T>>] {
  const storageKey = PREFIX + key
  const [state, setState] = useState<T>(() => {
    const raw = read(storageKey)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Stored<T>
        if (parsed.v === version && (!freshDaily || parsed.day === todayKey())) return parsed.data
      } catch {
        // Corrupt data. Fall through to fresh samples.
      }
    }
    return init()
  })

  useEffect(() => {
    const stored: Stored<T> = { v: version, day: todayKey(), data: state }
    write(storageKey, JSON.stringify(stored))
  }, [storageKey, state, version])

  return [state, setState]
}
