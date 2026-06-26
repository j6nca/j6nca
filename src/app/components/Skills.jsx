import React from 'react'
import Reveal from './Reveal'

const Skills = ({ skills = [] }) => {
  return (
    <section id="skills" className="section">
      <div className="wrap">
        <Reveal>
          <span className="eyebrow">04 — Toolbox</span>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="section-title">The stack I reach for.</h2>
        </Reveal>

        {skills.map((group, i) => (
          <div className="skill-group" key={i}>
            <Reveal delay={40}>
              <p className="skill-label">{group.name}</p>
            </Reveal>
            <Reveal delay={100}>
              <div className="chips">
                {group.keywords &&
                  group.keywords.map((k) => (
                    <span className="chip" key={k}>
                      {k}
                    </span>
                  ))}
              </div>
            </Reveal>
          </div>
        ))}
      </div>
    </section>
  )
}

export default Skills
