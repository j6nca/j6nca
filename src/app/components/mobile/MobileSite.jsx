import React from 'react'
import AboutBlurb from '../AboutBlurb'
import ContribGraph from '../ContribGraph'
import PageDots from './PageDots'

/*
 * The mobile site: four full-screen "pages" — whoami, projects, work
 * experience, a year of commits — in a snap-scrolling column, plus a
 * persistent footer bar (email · resume · view desktop mode). No laptop, no
 * animation; the same resume.json / contributions.json drive it. SiteSwitch
 * decides when this renders instead of the laptop scene.
 */

const year = (v) => (v && v !== 'present' ? v.slice(0, 4) : 'now')
const years = (s, e) => {
  const a = year(s)
  const b = year(e || 'present')
  return a === b ? a : `${a}–${b}`
}
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9.]+/g, '-')

const Cmd = ({ n, children }) => (
  <h2 className="m-h2 mono">
    <span className="m-n">{n}</span>
    <span className="m-dollar">$</span> {children}
  </h2>
)

const MobileSite = ({ data, contributions }) => {
  const { basics, projects = [], work = [] } = data
  const weeks = contributions?.weeks || []

  const pages = [
    { id: 'hello', label: 'hello' },
    { id: 'projects', label: 'projects' },
    { id: 'work', label: 'experience' },
    ...(weeks.length ? [{ id: 'commits', label: 'commits' }] : []),
  ]

  return (
    <div className="m-site">
      <div className="m-pages">
        <section className="m-page m-hero" id="hello">
          <div className="m-page-in">
            <p className="m-h2 mono">
              <span className="m-n">01</span>
              <span className="m-dollar">$</span> whoami
            </p>
            <h1 className="m-name">{basics.name.toLowerCase()}</h1>
            <p className="m-label mono">
              site reliability engineer <span className="m-sep">/</span>{' '}
              maker-of-things <span className="m-sep">/</span> toronto, ca
            </p>
            <p className="m-about">
              <AboutBlurb />
            </p>
            <p className="m-tags mono">
              [toronto] [observability] [homelab] [keyboards] [game-dev]
            </p>
          </div>
          <p className="m-hint mono" aria-hidden="true">
            scroll ↓
          </p>
        </section>

        <section className="m-page" id="projects">
          <div className="m-page-in">
            <Cmd n="02">cat ~/projects.md</Cmd>
            <ul className="m-list">
              {projects.map((p) => (
                <li className="m-item" key={p.name}>
                  <div className="m-item-head">
                    {p.url ? (
                      <a className="m-item-name" href={p.url} target="_blank" rel="noreferrer">
                        {slug(p.name)} <span className="card-arrow">↗</span>
                      </a>
                    ) : (
                      <span className="m-item-name">{slug(p.name)}</span>
                    )}
                    <span className="m-item-date mono">{years(p.startDate, p.endDate)}</span>
                  </div>
                  <p className="m-item-desc">{p.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="m-page" id="work">
          <div className="m-page-in">
            <Cmd n="03">cat ~/work_experience.md</Cmd>
            <div className="m-list">
              {work.map((w) => (
                <details className="m-work" key={`${w.name}-${w.startDate}`}>
                  <summary className="m-work-sum">
                    <span className="m-item-head">
                      <span className="m-item-name">{w.name}</span>
                      <span className="m-item-date mono">{years(w.startDate, w.endDate)}</span>
                    </span>
                    <span className="m-work-role">{w.position}</span>
                  </summary>
                  <ul className="m-hl">
                    {(w.highlights || []).map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
            <p className="m-more">
              full detail on the{' '}
              <a href="./resume">
                full resume <span className="card-arrow">↗</span>
              </a>
            </p>
          </div>
        </section>

        {weeks.length > 0 && (
          <section className="m-page" id="commits">
            <div className="m-page-in">
              <Cmd n="04">git log --since=1.year</Cmd>
              <p className="m-sub">
                {contributions.totalContributions.toLocaleString()} contributions in
                the last year ·{' '}
                <a href="https://github.com/j6nca" target="_blank" rel="noreferrer">
                  github.com/j6nca <span className="card-arrow">↗</span>
                </a>
              </p>
              <div className="contrib-scroll m-contrib">
                <div className="contrib-graph">
                  <ContribGraph weeks={weeks} />
                </div>
              </div>
              <p className="m-sub m-links mono">
                <a href="https://github.com/j6nca" target="_blank" rel="noreferrer">github/j6nca</a>
                {' · '}
                <a href="https://www.linkedin.com/in/j6n" target="_blank" rel="noreferrer">linkedin/j6n</a>
                {' · '}
                <a href="https://blog.j6n.ca">blog.j6n.ca</a>
              </p>
              <p className="m-copy mono">© {basics.name}</p>
            </div>
          </section>
        )}
      </div>

      <PageDots pages={pages} />

      <footer className="m-bar mono">
        <a href={`mailto:${basics.email}`}>{basics.email}</a>
        <a href="./resume">resume</a>
        <a href="?desktop=1">
          desktop mode <span className="card-arrow">→</span>
        </a>
      </footer>
    </div>
  )
}

export default MobileSite
