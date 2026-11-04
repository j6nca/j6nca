'use client'

import { useEffect, useRef, useState } from 'react'
import './editorial.css'
import WordCloud from './WordCloud'

const featured = [
  { name: 'Seaglass', category: 'Developer tools', description: 'A thoughtful terminal interface for exploring Kubernetes.', url: 'https://github.com/thanoslabs/seaglass', art: 'terminal', mark: '⌘' },
  { name: 'Nebula MD', category: 'Creative tools', description: 'A connected space for ideas, notes, and discovery.', url: 'https://github.com/thanoslabs/nebula-md', art: 'nebula', mark: '✳' },
  { name: 'Kube Cats', category: 'Experiments', description: 'A playful way to see what is happening inside a cluster.', url: 'https://github.com/j6nca/kube-cats', art: 'cats', mark: '✦' },
]

export default function EditorialHome({ data }) {
  const [theme, setTheme] = useState('light')
  const [stage, setStage] = useState(0)
  const stageRef = useRef(0)
  const locked = useRef(false)
  const touchStart = useRef(null)
  const goTo = next => {
    const target = Math.max(0, Math.min(3, next))
    if (locked.current || target === stageRef.current) return
    locked.current = true
    stageRef.current = target
    setStage(target)
    window.setTimeout(() => { locked.current = false }, 850)
  }
  useEffect(() => {
    const wheel = event => {
      if (Math.abs(event.deltaY) < 8) return
      event.preventDefault()
      if (!locked.current) goTo(stageRef.current + Math.sign(event.deltaY))
    }
    const keydown = event => {
      if (['ArrowDown', 'PageDown', ' '].includes(event.key) && !['INPUT', 'TEXTAREA', 'BUTTON'].includes(document.activeElement?.tagName)) {
        event.preventDefault(); goTo(stageRef.current + 1)
      } else if (['ArrowUp', 'PageUp'].includes(event.key)) {
        event.preventDefault(); goTo(stageRef.current - 1)
      } else if (event.key === 'Home') { event.preventDefault(); goTo(0) }
      else if (event.key === 'End') { event.preventDefault(); goTo(3) }
    }
    const start = event => { touchStart.current = event.touches[0]?.clientY ?? null }
    const end = event => {
      if (touchStart.current === null) return
      const delta = touchStart.current - (event.changedTouches[0]?.clientY ?? touchStart.current)
      touchStart.current = null
      if (Math.abs(delta) > 45) goTo(stageRef.current + Math.sign(delta))
    }
    window.addEventListener('wheel', wheel, { passive: false })
    window.addEventListener('keydown', keydown)
    window.addEventListener('touchstart', start, { passive: true })
    window.addEventListener('touchend', end, { passive: true })
    return () => {
      window.removeEventListener('wheel', wheel)
      window.removeEventListener('keydown', keydown)
      window.removeEventListener('touchstart', start)
      window.removeEventListener('touchend', end)
    }
  }, [])
  useEffect(() => {
    const stored = localStorage.getItem('j6n-theme')
    const initial = stored === 'light' || stored === 'dark'
      ? stored
      : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    setTheme(initial)
  }, [])
  useEffect(() => {
    document.documentElement.dataset.editorialTheme = theme
    return () => { delete document.documentElement.dataset.editorialTheme }
  }, [theme])
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('j6n-theme', next)
    setTheme(next)
  }
  const work = data.work?.slice(0, 3) || []

  return (
    <div className="editorial-site">
      <LimestoneEntrance />
      <div className="editorial-cloud-transition" aria-hidden={stage !== 0}>\n        <WordCloud />\n      </div>\n      <header className="editorial-header">
        <a className="editorial-logo" href="#top" onClick={e => { e.preventDefault(); goTo(0) }} aria-label="Return to introduction">j6n<span>.</span></a>
        <nav aria-label="Primary navigation">
          <a href="#work" onClick={e => { e.preventDefault(); goTo(1) }}>Work</a>
          <a href="#writing" onClick={e => { e.preventDefault(); goTo(2) }}>Writing</a>
          <a href="#about" onClick={e => { e.preventDefault(); goTo(3) }}>About</a>
          <a href="/resume">Résumé</a>
        </nav>
        <button className="editorial-theme" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title="Toggle color theme">
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </header>

      <main className="editorial-stage-track" style={{ transform: `translateY(-${stage * 100}dvh)` }}>
        <section className="editorial-hero editorial-panel" aria-labelledby="editorial-heading">
          <p className="editorial-kicker"><span className="editorial-status" /> HELLO, I&apos;M JONATHAN — BASED IN TORONTO</p>
          <WordCloud />
          <div className="editorial-hero-bottom">
            <p>I&apos;m a site reliability engineer who enjoys building reliable systems, useful tools, and the occasional unexpected thing.</p>
            <a href="#work" className="editorial-text-link">Explore selected work <span aria-hidden="true">↘</span></a>
          </div>
          <button type="button" className="editorial-scroll-note editorial-stage-next" onClick={() => goTo(1)}>SCROLL TO EXPLORE ↓</button>
        </section>

        <section className="editorial-section editorial-panel" id="work" aria-labelledby="work-heading">
          <div className="editorial-section-heading"><div><span className="editorial-number">01 / SELECTED WORK</span><h2 id="work-heading">Things I&apos;ve built.</h2></div><a href="https://github.com/j6nca" target="_blank" rel="noreferrer">More on GitHub ↗</a></div>
          <div className="editorial-projects">
            {featured.map((project, index) => (
              <a className="editorial-project" key={project.name} href={project.url} target="_blank" rel="noreferrer">
                <div className={`editorial-art editorial-art-${project.art}`}><span className="editorial-art-grid" aria-hidden="true" /><span className="editorial-art-symbol" aria-hidden="true">{project.mark}</span><span className="editorial-art-index">0{index + 1} / EXPERIMENTS</span></div>
                <div className="editorial-project-info"><div><span className="editorial-category">{project.category}</span><h3>{project.name}</h3><p>{project.description}</p></div><span className="editorial-project-arrow" aria-hidden="true">↗</span></div>
              </a>
            ))}
          </div>
        </section>

        <section className="editorial-section editorial-panel editorial-writing" id="writing" aria-labelledby="writing-heading">
          <div className="editorial-section-heading"><div><span className="editorial-number">02 / WRITING & NOTES</span><h2 id="writing-heading">Notes from the field.</h2></div></div>
          <div className="editorial-writing-row"><p>Thoughts on engineering, building things, and whatever else catches my curiosity.</p><a className="editorial-text-link" href="https://blog.j6n.ca" target="_blank" rel="noreferrer">Read the blog ↗</a></div>
        </section>

        <section className="editorial-section editorial-panel editorial-about" id="about" aria-labelledby="about-heading">
          <div><span className="editorial-number">03 / A LITTLE ABOUT ME</span><h2 id="about-heading">Curiosity is the common thread.</h2><p>Most days I work on infrastructure, observability, and developer experience. Outside of that, I&apos;m usually experimenting with open-source software, keyboards, games, or my homelab.</p><a className="editorial-text-link" href="/resume">View my résumé ↗</a></div>
          <div className="editorial-experience"><h3>Where I&apos;ve worked</h3>{work.map(job => <div className="editorial-job" key={job.name}><strong>{job.name}</strong><span>{job.position}</span></div>)}</div>
        </section>
      </main>
      <footer className="editorial-footer"><span>© {new Date().getFullYear()} {data.basics?.name || 'Jonathan Ng'}</span><div><a href={`mailto:${data.basics?.email || 'me@j6n.ca'}`}>Email ↗</a><a href="https://github.com/j6nca">GitHub ↗</a><a href="https://linkedin.com/in/j6n">LinkedIn ↗</a></div><a href="#top" onClick={e => { e.preventDefault(); goTo(0) }}>Back to top ↑</a></footer>
    </div>
  )
}
