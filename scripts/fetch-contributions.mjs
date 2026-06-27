// Fetches the public GitHub contribution calendar for LOGIN and writes a compact
// snapshot to src/app/data/contributions.json, consumed at build time by
// src/app/lib/contributions.ts. Run in CI before `next build` so the static
// export bakes in fresh data — no third-party dependency at runtime.
//
// Auth: reads a token from GH_TOKEN or GITHUB_TOKEN. The contribution calendar
// is public data, so any valid token works. Only per-day counts + a 0–4 level
// are stored — never commit messages, repo names, or private repo contents.

import { promises as fs } from 'fs'
import path from 'path'

const LOGIN = process.env.CONTRIB_LOGIN || 'j6nca'
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN
const OUT = path.join(process.cwd(), 'src/app/data/contributions.json')

const LEVELS = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
}

const QUERY = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays { date contributionCount contributionLevel }
        }
      }
    }
  }
}`

async function main() {
  if (!TOKEN) {
    throw new Error('No GH_TOKEN / GITHUB_TOKEN set — cannot fetch contributions.')
  }

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': `${LOGIN}-site-build`,
    },
    body: JSON.stringify({ query: QUERY, variables: { login: LOGIN } }),
  })

  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${await res.text()}`)
  }

  const json = await res.json()
  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`)
  }

  const cal = json.data.user.contributionsCollection.contributionCalendar
  const snapshot = {
    login: LOGIN,
    totalContributions: cal.totalContributions,
    updated: new Date().toISOString().slice(0, 10),
    weeks: cal.weeks.map((w) => ({
      days: w.contributionDays.map((d) => ({
        date: d.date,
        count: d.contributionCount,
        level: LEVELS[d.contributionLevel] ?? 0,
      })),
    })),
  }

  await fs.mkdir(path.dirname(OUT), { recursive: true })
  await fs.writeFile(OUT, JSON.stringify(snapshot, null, 2) + '\n')
  console.log(
    `Wrote ${snapshot.weeks.length} weeks (${snapshot.totalContributions} contributions) to ${OUT}`
  )
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
