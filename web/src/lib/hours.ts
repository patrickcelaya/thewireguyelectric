// Office hours from Site settings → openingHours, as display text and as the
// small config the <head> gate uses to say whether the office is open right now.
import type {OpeningHours} from './types'

/** The office is in Arizona, which has no daylight saving time. */
export const BUSINESS_TIME_ZONE = 'America/Phoenix'

const WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}

/** "09:00" → "9 am", "17:30" → "5:30 pm". */
export function formatTime(hhmm: string) {
  const total = minutes(hhmm)
  const h = Math.floor(total / 60)
  const m = total % 60
  const h12 = h % 12 || 12
  return `${h12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'am' : 'pm'}`
}

type HoursStyle = 'site' | 'footer' | 'prose'

const STYLES: Record<HoursStyle, {dash: string; sep: string; day: (i: number) => string}> = {
  site: {dash: ' – ', sep: ', ', day: (i) => WEEK[i].slice(0, 3)},
  footer: {dash: ' - ', sep: ': ', day: (i) => WEEK[i].slice(0, 3)},
  prose: {dash: ' to ', sep: ', ', day: (i) => WEEK[i]},
}

/** "Monday".."Friday" → "Mon – Fri" (a run of three or more days) or "Mon, Wed" (a list). */
function dayRange(days: string[], style: HoursStyle) {
  const {dash, day} = STYLES[style]
  const idx = days.map((d) => WEEK.indexOf(d as (typeof WEEK)[number])).filter((i) => i >= 0)
  if (!idx.length) return ''
  const run = idx.every((d, i) => i === 0 || d === idx[i - 1] + 1)
  return run && idx.length > 2 ? `${day(idx[0])}${dash}${day(idx[idx.length - 1])}` : idx.map(day).join(', ')
}

/**
 * The hours as one line:
 * - `site` → "Mon – Fri, 9 am – 5 pm" (the header and the status lines);
 * - `footer` → "Mon - Fri: 9 am - 5 pm" (the live footer's wording);
 * - `prose` → "Monday to Friday, 9 am to 5 pm" (inside a sentence).
 * Several entries are joined with " · " (" and " in prose).
 */
export function formatHours(hours: OpeningHours[] | null | undefined, style: HoursStyle = 'site') {
  const {dash, sep} = STYLES[style]
  return (hours ?? [])
    .filter((h) => h.days?.length && h.opens && h.closes)
    .map((h) => `${dayRange(h.days, style)}${sep}${formatTime(h.opens)}${dash}${formatTime(h.closes)}`)
    .join(style === 'prose' ? ' and ' : ' · ')
}

export interface OfficeGate {
  timeZone: string
  /** [weekday 0–6 (Sunday = 0), opens, closes] in minutes after midnight. */
  slots: Array<[number, number, number]>
}

/** What the <head> gate needs to tell open from closed. */
export function officeGate(hours: OpeningHours[] | null | undefined): OfficeGate {
  const slots: OfficeGate['slots'] = []
  for (const h of hours ?? []) {
    if (!h.opens || !h.closes) continue
    for (const d of h.days ?? []) {
      const i = WEEK.indexOf(d as (typeof WEEK)[number])
      if (i >= 0) slots.push([i, minutes(h.opens), minutes(h.closes)])
    }
  }
  return {timeZone: BUSINESS_TIME_ZONE, slots}
}

/**
 * The words of the closed-office line: "Office opens at 9 am", or, when the next
 * opening is more than a day away (a weekend), "Office opens Monday at 9 am".
 * `day` is the first open day after the longest closed stretch of the week.
 */
export function nextOpening(hours: OpeningHours[] | null | undefined) {
  const {slots} = officeGate(hours)
  if (!slots.length) return undefined
  const open = new Set(slots.map(([d]) => d))
  let best = {len: -1, day: slots[0][0]}
  for (let start = 0; start < 7; start++) {
    if (!open.has(start) || open.has((start + 6) % 7)) continue
    let len = 0
    while (len < 7 && !open.has((start + 6 - len + 7) % 7)) len++
    if (len > best.len) best = {len, day: start}
  }
  const first = slots.find(([d]) => d === best.day) ?? slots[0]
  const t = first[1]
  return {day: WEEK[best.day], time: formatTime(`${Math.floor(t / 60)}:${t % 60}`)}
}
