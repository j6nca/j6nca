import React from 'react'
import Reveal from './Reveal'

const Hero = ({ name = 'Jonathan Ng', label = 'Site Reliability Engineer' }) => {
  return (
    <section className="hero">
      {/* animated gradient mesh backdrop */}
      <div className="mesh" aria-hidden="true">
        <span className="blob a" />
        <span className="blob b" />
        <span className="blob c" />
      </div>

      <div className="wrap hero-grid">
        <div>
          <Reveal>
            <span className="eyebrow">~/j6n — whoami</span>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="hero-title">
              <span className="gradient-text">{name}</span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="hero-sub">
              {label}
              <span className="sep">/</span>
              <span className="highlight">maker-of-things</span>
            </p>
          </Reveal>

          <Reveal delay={240}>
            <p className="hero-lead">
              I build and keep distributed systems healthy — observability,
              internal platforms, and the automation that makes shipping calm.
              Based in Toronto, deep into homelab, metrics, and custom keyboards.
            </p>
          </Reveal>

          <Reveal delay={320}>
            <div className="hero-cta">
              <a className="btn btn-primary" href="./resume" target="_blank" rel="noreferrer">
                View résumé →
              </a>
              <a className="btn btn-ghost" href="https://blog.j6n.ca">
                Read the blog
              </a>
              <a className="btn btn-ghost" href="https://meow.j6n.dev">
                Peek the homelab
              </a>
            </div>
          </Reveal>
        </div>

        <Reveal variant="scale" delay={200}>
          <div className="portrait-wrap">
            <img
              className="portrait"
              src="./images/linkedin2.jpg"
              alt="Jonathan Ng"
            />
          </div>

          <div className="term" aria-hidden="true">
            <div className="term-bar">
              <span />
              <span />
              <span />
            </div>
            <div className="term-body">
              <div>
                <span className="prompt">$</span> motd
              </div>
              <pre className="term-art">{`⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⠠⣤⣐⣒⣒⣤⠤⢀⢠⢪⣿⣫⣮⡷⠤⣀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⡠⢰⡵⠞⠋⠀⠀⠀⠑⠈⠛⢶⣭⣼⠉⢿⠃⠛⣽⢪⠃
⠀⠀⠀⠀⠀⠀⢠⢊⡾⠋⠀⠀⠀⠀⠀⠀⣴⡄⠀⠀⠈⢳⣤⡈⣿⣦⡿⡇⠀
⠀⠀⠀⠀⠀⢠⢣⡿⠀⣀⠀⠀⠀⠀⠀⠀⢀⣠⣴⠏⠀⠀⣿⢙⣿⡳⠈⠀⠀
⠀⠀⡠⢫⣭⡚⣾⠁⠀⠙⠁⢀⣀⣤⡴⠾⠛⠉⠀⠀⠀⢀⡿⡆⠀⠀⠀⠀⠀
⠀⣞⣾⢻⡏⠿⠻⡄⠘⠛⠛⠛⠉⠀⠀⠀⠀⠀⠀⠀⠀⣾⣣⠃⠀⠀⠀⠀⠀
⢠⢊⣿⣂⢠⣤⣺⣿⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣤⠞⣡⡣⢤⠤⣀⠀⠀⠀
⠀⠓⠭⢝⡻⣫⣛⣰⠝⣳⠶⢦⣤⣤⣤⡴⡀⡻⣟⡕⢋⢏⡾⠋⠙⣮⢦⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⡜⣥⢦⣴⠏⠉⢠⣿⡇⢻⡜⣪⡿⠀⠀⢀⣾⡼⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠘⡏⣧⠢⡝⡄⠸⣷⣬⡷⢸⣏⠁⠀⢀⣠⡾⣳⠁⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⠼⡷⣶⣳⣦⣤⣠⡄⠛⠛⣿⢻⠯⠕⠊⠁⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠐⠺⢛⣶⣞⡫⠋⠀⠀⠀⠀⠀⠀`}</pre>
            </div>
          </div>
        </Reveal>
      </div>

      <div className="scroll-hint" aria-hidden="true">
        <span className="mouse" />
        scroll
      </div>
    </section>
  )
}

export default Hero
