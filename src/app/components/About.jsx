import React from 'react'
import Reveal from './Reveal'

const facts = ['Toronto, CA', 'Observability', 'Homelab', 'Custom keyboards', 'Game dev']

const About = () => {
  return (
    <section id="about" className="section">
      <div className="wrap">
        <Reveal>
          <span className="eyebrow">01 — About</span>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="section-title">
            DevOps engineer &amp; <span className="gradient-text">maker-of-things</span>.
          </h2>
        </Reveal>
        <Reveal delay={140}>
          <p className="hero-lead" style={{ maxWidth: '62ch' }}>
            I&apos;m a Site Reliability Engineer based in Toronto, Canada with an
            interest in homelab, observability, and game development. Day to day I
            work on metrics, logging, tracing, and the internal platforms that let
            teams ship with confidence. Off the clock you&apos;ll find me building
            custom keyboards, cooking, fishing, and playing far too many video
            games. See what I&apos;m currently working on{' '}
            <a className="highlight" href="https://trello.com/b/7yMlHI5q/todos">
              here
            </a>
            , dive into my{' '}
            <a className="highlight" href="https://blog.j6n.ca">
              blog
            </a>
            , or check out what I&apos;m running in my{' '}
            <a className="highlight" href="https://meow.j6n.dev">
              homelab
            </a>
            .
          </p>
        </Reveal>

        <Reveal delay={200}>
          <div className="chips" style={{ marginTop: '1.75rem' }}>
            {facts.map((f) => (
              <span className="chip" key={f}>
                {f}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default About
