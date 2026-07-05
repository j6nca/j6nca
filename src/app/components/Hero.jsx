import React from 'react'
import Reveal from './Reveal'

const ASCII_NAME = `     ██╗ ██████╗ ███╗   ██╗ █████╗ ████████╗██╗  ██╗ █████╗ ███╗   ██╗
     ██║██╔═══██╗████╗  ██║██╔══██╗╚══██╔══╝██║  ██║██╔══██╗████╗  ██║
     ██║██║   ██║██╔██╗ ██║███████║   ██║   ███████║███████║██╔██╗ ██║
██   ██║██║   ██║██║╚██╗██║██╔══██║   ██║   ██╔══██║██╔══██║██║╚██╗██║
╚█████╔╝╚██████╔╝██║ ╚████║██║  ██║   ██║   ██║  ██║██║  ██║██║ ╚████║
 ╚════╝  ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝

███╗   ██╗ ██████╗
████╗  ██║██╔════╝
██╔██╗ ██║██║  ███╗
██║╚██╗██║██║   ██║
██║ ╚████║╚██████╔╝
╚═╝  ╚═══╝ ╚═════╝`

// Powerline-style prompt: cwd, git branch, k8s cluster, then the command.
const Prompt = ({ cmd }) => (
  <div className="term-cmd">
    <span className="pl" aria-hidden="true">
      <span className="pl-seg pl-dir">~/j6nca</span>
      <span className="pl-seg pl-git">⎇ main</span>
      <span className="pl-seg pl-k8s">⎈ homelab</span>
    </span>
    <span className="pl-cmd">{cmd}</span>
  </div>
)

const Hero = ({ name = 'Jonathan Ng', label = 'Site Reliability Engineer' }) => {
  return (
    <section className="hero">
      {/* animated gradient mesh backdrop */}
      <div className="mesh" aria-hidden="true">
        <span className="blob a" />
        <span className="blob b" />
        <span className="blob c" />
      </div>

      <div className="wrap">
        <Reveal variant="scale">
          <div className="term term-hero">
            <div className="term-bar">
              <span />
              <span />
              <span />
            </div>
            <div className="term-body term-hero-body">
              <Reveal delay={120}>
                <Prompt cmd="whoami" />
              </Reveal>

              <div className="term-hero-grid">
                <div>
                  <Reveal delay={200}>
                    <h1 className="sr-only">{name}</h1>
                    <pre className="term-name gradient-text" aria-hidden="true">
                      {ASCII_NAME}
                    </pre>
                  </Reveal>

                  <Reveal delay={280}>
                    <p className="term-line">
                      {label.toLowerCase()}
                      <span className="sep">/</span>
                      maker-of-things
                    </p>
                  </Reveal>

                  <Reveal delay={360}>
                    <p className="term-text">
                      I build and keep distributed systems healthy — observability,
                      internal platforms, and the automation that makes shipping calm.
                      Based in Toronto, deep into homelab, metrics, and custom keyboards.
                    </p>
                  </Reveal>

                  <Reveal delay={440}>
                    <div className="term-links">
                      <a href="./resume" target="_blank" rel="noreferrer">resume</a>
                      <a href="https://blog.j6n.ca">blog</a>
                      <a href="https://meow.j6n.dev">homelab</a>
                    </div>
                  </Reveal>
                </div>

                <Reveal variant="right" delay={320}>
                  <pre className="term-art" aria-hidden="true">{`⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⠠⣤⣐⣒⣒⣤⠤⢀⢠⢪⣿⣫⣮⡷⠤⣀⠀
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
                </Reveal>
              </div>
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
