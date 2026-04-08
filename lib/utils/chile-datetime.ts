/**
 * Chile Timezone Utilities
 *
 * Chile observes:
 *   CLT  (UTC-4): April – September  (winter/autumn)
 *   CLST (UTC-3): October – March    (spring/summer / DST)
 *
 * All times entered by users are in Chile local time.
 * These helpers ensure correct storage (with explicit offset) and
 * correct display (always in America/Santiago zone, 24-hour clock).
 */

/** Returns the UTC offset string for a YYYY-MM-DD date in Chile. */
export function getChileOffset(dateStr: string): string {
  const month = parseInt(dateStr.split('-')[1], 10)
  return month >= 4 && month <= 9 ? '-04:00' : '-03:00'
}

/**
 * Builds a timezone-aware ISO string for storage.
 * e.g. "2026-04-10" + "17:00" → "2026-04-10T17:00:00-04:00"
 * PostgreSQL will store this as the correct UTC equivalent.
 */
export function toChileDatetime(date: string, time: string): string {
  return `${date}T${time}:00${getChileOffset(date)}`
}

/**
 * Returns "YYYY-MM-DD" in Chile timezone (for calendar day grouping).
 * Prevents evening-UTC visits from appearing on the wrong calendar day.
 */
export function toChileDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
}

/**
 * Formats an ISO datetime as "HH:MM" in 24-hour Chile time.
 * Safe on both server (Vercel/UTC) and browser.
 */
export function formatChileTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CL', {
    timeZone: 'America/Santiago',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
}

/**
 * Formats an ISO datetime as a full Chilean date+time string (24-hour).
 * e.g. "vie, 10 abr 2026, 17:00"
 */
export function formatChileDateTimeDisplay(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', {
    timeZone: 'America/Santiago',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
}

/**
 * Returns UTC ISO bounds for a Chile calendar day (for DB range queries).
 * e.g. "2026-04-10" → { start: "2026-04-10T04:00:00.000Z", end: "2026-04-11T03:59:59.999Z" }
 */
export function getChileDayBoundsISO(date: string): { start: string; end: string } {
  const offset = getChileOffset(date)
  const start = new Date(`${date}T00:00:00${offset}`)
  const end   = new Date(`${date}T23:59:59${offset}`)
  return { start: start.toISOString(), end: end.toISOString() }
}
