import { promises as fs } from 'fs'

/**
 * Reads resume.json at build time. Used by both the landing page and /resume so
 * the JSON stays the single source of truth for site content.
 */
export async function getResume(): Promise<any> {
  const file = await fs.readFile(
    process.cwd() + '/src/app/resume/resume.json',
    'utf8'
  )
  return JSON.parse(file)
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/** "2024-05-28" -> "May 2024"; passes through "present" and empty values. */
export function formatDate(value?: string): string {
  if (!value) return ''
  if (value.toLowerCase() === 'present') return 'Present'
  const [year, month] = value.split('-')
  if (!year) return value
  const m = parseInt(month, 10)
  if (!m || Number.isNaN(m)) return year
  return `${MONTHS[m - 1]} ${year}`
}

/** Renders a "May 2024 — Present" range from a record with start/end dates. */
export function formatRange(start?: string, end?: string): string {
  const s = formatDate(start)
  const e = formatDate(end)
  if (s && e) return `${s} — ${e}`
  return s || e
}
