import React from 'react'
import Reveal from './Reveal'
import WorkHighlights from './WorkHighlights'
import { formatRange } from '../lib/resume'

const Experience = ({ work = [] }) => {
  return (
    <section id="experience" className="section">
      <div className="wrap">
        <Reveal>
          <span className="eyebrow">02 — Experience</span>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="section-title">Where I&apos;ve shipped.</h2>
        </Reveal>
        <Reveal delay={140}>
          <p className="section-lead">
            A timeline of the teams I&apos;ve helped keep reliable, fast, and
            observable.
          </p>
        </Reveal>

        <div className="timeline">
          {work.map((job, i) => (
            <Reveal key={i} delay={i === 0 ? 0 : 60} className="tl-item">
              <div className="tl-head">
                <div className="tl-role">
                  {job.position} <span className="tl-company">@ {job.name}</span>
                </div>
                <div className="tl-dates">
                  {formatRange(job.startDate, job.endDate)}
                </div>
              </div>
              <WorkHighlights highlights={job.highlights} />
            </Reveal>
          ))}
        </div>

        <Reveal delay={80}>
          <div style={{ marginTop: '2.5rem' }}>
            <a className="btn btn-ghost" href="./resume" target="_blank" rel="noreferrer">
              View full résumé →
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default Experience
