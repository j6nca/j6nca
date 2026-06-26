import React from 'react'
import Reveal from './Reveal'
import { formatRange } from '../lib/resume'

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return 'view →'
  }
}

const Projects = ({ projects = [] }) => {
  return (
    <section id="projects" className="section">
      <div className="wrap">
        <Reveal>
          <span className="eyebrow">03 — Projects</span>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="section-title">
            Things I&apos;ve <span className="gradient-text">built</span>.
          </h2>
        </Reveal>
        <Reveal delay={140}>
          <p className="section-lead">
            Side projects, tools, and experiments — mostly born in the homelab.
          </p>
        </Reveal>

        <div className="card-grid">
          {projects.map((p, i) => {
            const Tag = p.url ? 'a' : 'div'
            const linkProps = p.url
              ? { href: p.url, target: '_blank', rel: 'noreferrer' }
              : {}
            return (
              <Reveal key={i} variant="up" delay={(i % 3) * 80}>
                <Tag className="card" {...linkProps}>
                  <div className="card-head">
                    <span className="card-title">{p.name}</span>
                    <span className="card-date">
                      {formatRange(p.startDate, p.endDate)}
                    </span>
                  </div>
                  <p className="card-desc">{p.description}</p>
                  {p.url && (
                    <span className="card-link">
                      {hostOf(p.url)} <span className="card-arrow">↗</span>
                    </span>
                  )}
                </Tag>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default Projects
