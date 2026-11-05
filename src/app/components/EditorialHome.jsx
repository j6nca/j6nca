'use client'

import { useEffect, useState } from 'react'
import './editorial.css'
import WordCloud from './WordCloud'

const featured = [
  { name: 'Seaglass', category: 'Developer tools', description: 'A thoughtful terminal interface for exploring Kubernetes.', url: 'https://github.com/thanoslabs/seaglass', art: 'terminal', mark: '⌘' },
  { name: 'Nebula MD', category: 'Creative tools', description: 'A connected space for ideas, notes, and discovery.', url: 'https://github.com/thanoslabs/nebula-md', art: 'nebula', mark: '✳' },
  { name: 'Kube Cats', category: 'Experiments', description: 'A playful way to see what is happening inside a cluster.', url: 'https://github.com/j6nca/kube-cats', art: 'cats', mark: '✦' },
]

export default function EditorialHome({ data }) {
  const [theme, setTheme] = useState('light')
  const [scrollProgress, setScrollProgress] = useState(0)
  useEffect(() => {
    let frame = 0
    const update = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        setScrollProgress(Math.min(1, Math.max(0, window.scrollY / Math.max(1, window.innerHeight * .7))))
      })
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      if (frame) window.cancelAnimationFrame(frame)
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
  const introProgress = Math.min(1, Math.max(0, (scrollProgress - .3) / .7))

  return (
    <div className={`editorial-site ${scrollProgress > .85 ? "editorial-scrolled" : ""}`} style={{ "--cloud-progress": scrollProgress }}>
      <header className="editorial-header">
        <a className="editorial-logo" href="#top" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }) }} aria-label="Return to introduction">j6n<span>.</span></a>
        <nav aria-label="Primary navigation">
          <a href="#work">Work</a>
          <a href="#writing">Writing</a>
          <a href="#about">About</a>
          <a href="/resume">Résumé</a>
        </nav>
        <button className="editorial-theme" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title="Toggle color theme">
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </header>

      <main id="top">
        <section className="editorial-hero editorial-panel" aria-label="Introduction word cloud">
          <div className="editorial-cloud-grid" aria-hidden="true">
            {[ [20, 28], [36, 42], [64, 28], [80, 57], [44, 71], [72, 71], [28, 57] ].map(([x, y], index) => (
              <svg key={index} className="editorial-grid-star" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${index * -1.7}s` }} viewBox="0 0 24 24" fill="none">
                <path d="M12 2 C13.3 8.7 15.3 10.7 22 12 C15.3 13.3 13.3 15.3 12 22 C10.7 15.3 8.7 13.3 2 12 C8.7 10.7 10.7 8.7 12 2Z" fill="currentColor" />
              </svg>
            ))}
          </div>
          <div className="editorial-cloud-intro" style={{ opacity: 1 - scrollProgress, transform: `scale(${1 + scrollProgress * .8})` }}>
            <WordCloud />
          </div>
          <a href="#intro" className="editorial-scroll-note editorial-stage-next">SCROLL TO EXPLORE ↓</a>
        </section>

        <section className="editorial-section editorial-panel editorial-self-intro" id="intro" aria-labelledby="intro-heading" style={{ opacity: introProgress, transform: `translateY(${(1 - introProgress) * 36}px)` }}>
          <h2 id="intro-heading">Hello, I&apos;m Jonathan.</h2>
          <p>I&apos;m a site reliability engineer based in Toronto who enjoys building reliable systems, useful tools, and the occasional unexpected thing.</p>
          <a href="#work" className="editorial-text-link">Explore selected work ↘</a>
        </section>

        <section className="editorial-section editorial-panel" id="work" aria-labelledby="work-heading">
          <div className="editorial-section-heading"><div><h2 id="work-heading">Things I&apos;ve built.</h2></div><a href="https://github.com/j6nca" target="_blank" rel="noreferrer">More on GitHub ↗</a></div>
          <div className="editorial-projects">
            {featured.map(project => (
              <a className="editorial-project" key={project.name} href={project.url} target="_blank" rel="noreferrer">
                <div className={`editorial-art editorial-art-${project.art}`}><span className="editorial-art-grid" aria-hidden="true" /><span className="editorial-art-symbol" aria-hidden="true">{project.mark}</span></div>
                <div className="editorial-project-info"><div><h3>{project.name}</h3><p>{project.description}</p></div><span className="editorial-project-arrow" aria-hidden="true">↗</span></div>
              </a>
            ))}
          </div>
        </section>

        <section className="editorial-section editorial-panel editorial-writing" id="writing" aria-labelledby="writing-heading">
          <div className="editorial-section-heading"><div><h2 id="writing-heading">Notes from the field.</h2></div></div>
          <div className="editorial-writing-row"><p>Thoughts on engineering, building things, and whatever else catches my curiosity.</p><a className="editorial-text-link" href="https://blog.j6n.ca" target="_blank" rel="noreferrer">Read the blog ↗</a></div>
        </section>

        <section className="editorial-section editorial-panel editorial-about" id="about" aria-labelledby="about-heading">
          <div><h2 id="about-heading">Curiosity is the common thread.</h2><p>Most days I work on infrastructure, observability, and developer experience. Outside of that, I&apos;m usually experimenting with open-source software, keyboards, games, or my homelab.</p><a className="editorial-text-link" href="/resume">View my résumé ↗</a></div>
          <div className="editorial-experience"><h3>Where I&apos;ve worked</h3>{work.map(job => <div className="editorial-job" key={job.name}><strong>{job.name}</strong><span>{job.position}</span></div>)}</div>
        </section>
      </main>
      <footer className="editorial-footer"><span>© {new Date().getFullYear()} {data.basics?.name || 'Jonathan Ng'}</span><div><a href={`mailto:${data.basics?.email || 'me@j6n.ca'}`}>Email ↗</a><a href="https://github.com/j6nca">GitHub ↗</a><a href="https://linkedin.com/in/j6n">LinkedIn ↗</a></div><a href="#top" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }) }}>Back to top ↑</a></footer>
    </div>
  )
}
