// Display formatting shared by templates.

const FORMATS = {
  /** "Feb 12, 2026" */
  short: {month: 'short', day: 'numeric', year: 'numeric'},
  /** "February 12, 2026" */
  long: {month: 'long', day: 'numeric', year: 'numeric'},
} as const

/** A date (YYYY-MM-DD or ISO) as Arizona sees it. */
export function formatDate(iso: string, style: keyof typeof FORMATS = 'long') {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00Z`) : new Date(iso)
  return date.toLocaleDateString('en-US', {...FORMATS[style], timeZone: 'America/Phoenix'})
}

/** "2026-02-12" for <time datetime>. */
export function isoDate(iso: string) {
  return iso.slice(0, 10)
}
