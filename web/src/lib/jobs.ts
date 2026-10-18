// Job openings as /careers shows them. The page shows and marks up the same list:
// every JobPosting node is a job visible on the page (lib/page-schema.ts).
import {isoDate} from './format'
import type {JobOpening} from './types'

/**
 * Open jobs whose closing date (if any) hasn't passed by build time in Arizona, newest first
 * as queried: a job closing on the 18th stays up through the 18th there, not until 5 pm.
 */
export function currentJobs(jobs: JobOpening[], now = new Date()): JobOpening[] {
  const today = isoDate(now.toISOString())
  return jobs.filter((job) => !job.validThrough || job.validThrough.slice(0, 10) >= today)
}

const EMPLOYMENT_TYPES: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACTOR: 'Contract',
  TEMPORARY: 'Temporary',
  INTERN: 'Internship',
  PER_DIEM: 'Per diem',
  OTHER: 'Other',
}

/** "Full-time" for FULL_TIME (schema.org employmentType values). */
export function employmentLabel(type?: string) {
  return type ? (EMPLOYMENT_TYPES[type] ?? type.replace(/_/g, ' ').toLowerCase()) : undefined
}
