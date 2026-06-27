import { promises as fs } from 'fs'

export interface ContributionDay {
  date: string
  count: number
  level: number
}

export interface Contributions {
  login: string
  totalContributions: number
  updated: string
  weeks: { days: ContributionDay[] }[]
}

/**
 * Reads the contribution snapshot written by scripts/fetch-contributions.mjs at
 * build time. Returns null if the snapshot is missing (e.g. a local build that
 * never ran the fetch) so the section can render nothing rather than break.
 */
export async function getContributions(): Promise<Contributions | null> {
  try {
    const file = await fs.readFile(
      process.cwd() + '/src/app/data/contributions.json',
      'utf8'
    )
    return JSON.parse(file)
  } catch {
    return null
  }
}
