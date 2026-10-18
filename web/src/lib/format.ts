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

/**
 * A name inside a sentence: "EV Charger Installation" → "EV charger installation",
 * "LED Lights" → "LED lights" (words in capitals, such as EV and LED, keep them).
 */
export function inSentence(name: string) {
  return name.replace(/\S+/g, (word) => (/^[A-Z0-9]{2,}$/.test(word) ? word : word.toLowerCase()))
}

/**
 * "2026-02-12" for <time datetime>: the calendar date Arizona sees, the one formatDate
 * shows (a post published at 6:38 pm in Phoenix is already the next day in UTC).
 */
export function isoDate(iso: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : new Date(iso).toLocaleDateString('en-CA', {timeZone: 'America/Phoenix'})
}

/**
 * A heading cut around its highlighted words: [before, accent, after]. The accent is
 * empty when it isn't in the heading (nothing is highlighted then).
 */
export function accentParts(text: string, accent?: string | null): [string, string, string] {
  const at = accent ? text.indexOf(accent) : -1
  return at >= 0 && accent ? [text.slice(0, at), accent, text.slice(at + accent.length)] : [text, '', '']
}

/**
 * A headline in two balanced lines: cut at the space nearest its middle, never inside
 * `keep` (the highlighted words). One line when there is nowhere to cut.
 */
export function balancedLines(text: string, keep?: string | null): string[] {
  const at = keep ? text.indexOf(keep) : -1
  const inside = (i: number) => at >= 0 && keep !== undefined && keep !== null && i > at && i < at + keep.length
  let best = -1
  for (let i = text.indexOf(' '); i > 0; i = text.indexOf(' ', i + 1)) {
    if (inside(i)) continue
    if (best < 0 || Math.abs(i - text.length / 2) < Math.abs(best - text.length / 2)) best = i
  }
  return best > 0 ? [text.slice(0, best), text.slice(best + 1)] : [text]
}

/** A paragraph's first sentence and the rest ("" when it is one sentence). */
export function firstSentence(text: string): [string, string] {
  const m = text.trim().match(/^(.+?[.!?])\s+(\S[\s\S]*)$/)
  return m ? [m[1], m[2]] : [text.trim(), '']
}
