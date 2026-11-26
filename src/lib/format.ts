const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const usdWhole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const plain = new Intl.NumberFormat('en-US')

/** USD is the default currency for every demo (brief, section 5). */
export function money(amount: number): string {
  return usd.format(amount)
}

export function moneyWhole(amount: number): string {
  return usdWhole.format(amount)
}

/**
 * Zimbabwe gold (ZiG) at a sample rate, for demos set in Zimbabwe, where prices are quoted in USD and
 * ZiG. Always shown with a note that it is a sample rate. The events demo keeps its own copy.
 */
export const ZIG_SAMPLE_RATE = 26.8

/** "ZiG 16,616" at the sample rate, rounded to whole ZiG. */
export function zigWhole(usd: number): string {
  return `ZiG ${Math.round(usd * ZIG_SAMPLE_RATE).toLocaleString('en-GB')}`
}

export function num(value: number): string {
  return plain.format(value)
}

export function pct(value: number, digits = 0): string {
  return `${value.toFixed(digits)}%`
}

/** Rounds to cents and avoids floating point drift in totals. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function clockTime(at: number, locale = 'en-GB'): string {
  return new Date(at).toLocaleTimeString(locale, { hour: locale === 'en-US' ? 'numeric' : '2-digit', minute: '2-digit' })
}

export function shortDate(at: number, locale = 'en-GB'): string {
  return new Date(at).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

export function dayAndTime(at: number, now: number, locale = 'en-GB'): string {
  const date = new Date(at)
  const today = new Date(now)
  const yesterday = new Date(now - 86_400_000)
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  const time = clockTime(at, locale)
  if (sameDay(date, today)) return `Today ${time}`
  if (sameDay(date, yesterday)) return `Yesterday ${time}`
  return `${date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}, ${time}`
}

export function relativeTime(at: number, now: number): string {
  const minutes = Math.round((now - at) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

/** "1 h 25 min", "40 min" */
export function duration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

export function hoursLabel(minutes: number): string {
  const hours = minutes / 60
  return `${hours >= 10 ? Math.round(hours) : hours.toFixed(1)} h`
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName
}

export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '')).toUpperCase()
}
