'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import AsciiName from '../AsciiName'

// Deterministic PRNG (mulberry32) so the server-rendered sprite layout
// matches the client exactly — Math.random would break hydration.
const mulberry32 = (seed) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// The terminal "scrollback": one page per command scene, active over a range
// of the global beat value (raw = scroll progress * beats). The app strip
// holds three terminal panes (story order — every screen change swipes left),
// each rendering a subset of these pages via the `pages` prop: [0] whoami,
// [1,2,3] kubectl/projects/work, [4] motd. Push transitions only happen
// between pages that share a pane; ranges extend past their resting beat
// (…7.12 instead of …7.0) so a finished scene stays up while idle and only
// pushes away once the next beat's tween is underway.
const PAGE_RANGES = [
  [0, 99], // whoami + about — its pane is only on screen for beats 0–2
  [0, 6.12], // kubectl get po (+ cats)
  [6.12, 7.12], // cat ~/projects.md
  [7.12, 99], // cat ~/work_experience.md
  [0, 99], // motd — own pane, visible only on beat 10
]

const Prompt = ({ children }) => (
  <div className="term-cmd lp-prompt">
    <span className="pl" aria-hidden="true">
      <span className="pl-seg pl-dir">~/j6nca</span>
      <span className="pl-seg pl-git">⎇ main</span>
      <span className="pl-seg pl-k8s">⎈ homelab</span>
    </span>
    <span className="pl-cmd">{children}</span>
  </div>
)

// Command text revealed character-by-character as the page's band variable
// (--bv, set per page) moves from --tf to --tt. Monospace + ch units keep
// the reveal on glyph boundaries.
const Typed = ({ text, from, to }) => (
  <>
    <span
      className="lp-typed"
      style={{ '--tf': from, '--tt': to, '--len': text.length }}
    >
      {text}
    </span>
    <span className="lp-caret" aria-hidden="true" />
  </>
)

// One output line, appearing once --bv crosses --at.
const L = ({ at, className = '', children }) => (
  <div className={`lp-line ${className}`} style={{ '--at': at }}>
    {children}
  </div>
)

const POD_ROWS = [
  'kube-cats-5d9c7f4-mochi     1/1     Running   0          2y41d',
  'kube-cats-5d9c7f4-tofu      1/1     Running   0          2y41d',
  'nebula-md-7c4b9d6-luna      1/1     Running   0          1y02d',
  'blog-6f8d2c-miso            1/1     Running   0          3y77d',
  'homelab-operator-bento      1/1     Running   1          3y12d',
  'free-games-notifier-nori    1/1     Running   0          4y88d',
  'grafana-59fd6b-pickles      1/1     Running   0          2y19d',
]

// The cluster that flies across the terminal while kubectl output streams
// in: node UFOs with labels, pod cats at three-ish depths. Each sprite gets
// its own flight duration/delay — the fleet runs on a time-based animation
// (2–3.2s) once beat 4 is on stage, not on the beat tween.
const NODE_COUNT = 5
const POD_COUNT = 50

const buildCats = () => {
  const rand = mulberry32(0x6a6e)

  const nodes = Array.from({ length: NODE_COUNT }, (_, i) => {
    const x = -180 - rand() * 240
    return {
      name: `node-${i + 1}`,
      top: 5 + i * 17 + rand() * 6,
      x,
      dx: 1080 - x + rand() * 200,
      dur: 2.8 + rand() * 0.8,
      delay: rand() * 0.5,
      bobDur: 5 + rand() * 2,
      bobDelay: -rand() * 6,
    }
  })

  const cats = Array.from({ length: POD_COUNT }, (_, i) => {
    const depth = rand()
    const x = -100 - rand() * 620
    return {
      cat: (i % 9) + 1,
      top: 4 + rand() * 86,
      x,
      dx: (960 - x + rand() * 300) * (0.7 + 0.3 * depth),
      size: 18 + Math.round(depth * 18),
      opacity: 0.45 + 0.55 * depth,
      z: depth > 0.5 ? 3 : 1,
      dur: 2 + rand() * 1.2,
      delay: rand() * 0.7,
      bobDur: 3 + rand() * 2.5,
      bobDelay: -rand() * 5,
    }
  })

  return { nodes, cats }
}

const year = (v) => (v && v !== 'present' ? v.slice(0, 4) : 'now')
const years = (s, e) => {
  const a = year(s)
  const b = year(e || 'present')
  return a === b ? a : `${a}–${b}`
}
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9.]+/g, '-')
// company names minus "(now X)" / "(acquired by X)" — that detail lives on
// the full resume
const coSlug = (s) => slug(s.replace(/\s*\(.*?\)/g, '').trim())
const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s)
const pad = (s, n) => ' '.repeat(Math.max(2, n - s.length))

const TerminalApp = ({ basics, projects, work, subscribe, pages = [0, 1, 2, 3, 4] }) => {
  const ref = useRef(null)
  const { nodes, cats } = useMemo(buildCats, [])
  // accordion: at most one work entry expanded at a time
  const [openWork, setOpenWork] = useState(-1)

  // Toggle page visibility from the scene's frame state.
  useEffect(() => {
    const el = ref.current
    if (!el || !subscribe) return
    const els = Array.from(el.querySelectorAll('.lp-page'))
    return subscribe(({ raw }) => {
      els.forEach((page) => {
        const [from, to] = PAGE_RANGES[Number(page.dataset.pi)]
        page.classList.toggle('on', raw >= from && raw < to)
        page.classList.toggle('past', raw >= to)
      })
    })
  }, [subscribe])

  const has = (i) => pages.includes(i)

  return (
    <div className="lp-app lp-terminal" ref={ref}>
      <div className="lp-appbar">
        <span className="lp-dots" aria-hidden="true">
          <i /><i /><i />
        </span>
        <span className="lp-apptitle">zsh — j6n@homelab</span>
      </div>

      <div className="lp-appbody">
        {/* page 0 — whoami + about (beat 1) */}
        {has(0) && (
        <div className="lp-page on" data-pi="0" style={{ '--bv': 'var(--b1, 0)' }}>
          <Prompt>
            <Typed text="whoami" from={0.5} to={0.68} />
          </Prompt>
          <L at={0.7} className="lp-ascii">
            <AsciiName />
          </L>
          <L at={0.76} className="lp-dim">
            site reliability engineer <span className="lp-sep">/</span>{' '}
            maker-of-things <span className="lp-sep">/</span> toronto, ca
          </L>
          <L at={0.82} className="lp-para">
            I build and keep distributed systems healthy — observability,
            internal platforms, and the automation that makes shipping calm.
            Off the clock it&apos;s homelab, custom keyboards, cooking, fishing,
            and far too many video games. See what I&apos;m working on{' '}
            <a href="https://trello.com/b/7yMlHI5q/todos" target="_blank" rel="noreferrer">here</a>,
            read the <a href="https://blog.j6n.ca">blog</a>, or poke around the{' '}
            <a href="https://meow.j6n.dev">homelab</a>.
          </L>
          <L at={0.88} className="lp-linkrow">
            <a href="./resume" target="_blank" rel="noreferrer">resume</a>
            <a href="https://blog.j6n.ca">blog</a>
            <a href="https://meow.j6n.dev">homelab</a>
          </L>
          <L at={0.93} className="lp-tags lp-dim">
            [toronto] [observability] [homelab] [keyboards] [game-dev]
          </L>
        </div>
        )}

        {/* page 1 — kubectl get po + kube-cats (beat 6) */}
        {has(1) && (
        <div className="lp-page" data-pi="1" style={{ '--bv': 'var(--b6, 0)' }}>
          <Prompt>
            <Typed text="kubectl get po" from={0.28} to={0.52} />
          </Prompt>
          <L at={0.56} className="lp-pre lp-dim">
            {'NAME                        READY   STATUS    RESTARTS   AGE'}
          </L>
          {POD_ROWS.map((row, i) => (
            <L key={i} at={0.6 + i * 0.028} className="lp-pre">
              {row}
            </L>
          ))}
          <L at={0.86} className="lp-cta-line">
            kube-cats <span className="lp-sep">—</span> visualizing your k8s
            workloads as cats{' '}
            <a href="https://github.com/j6nca/kube-cats" target="_blank" rel="noreferrer">
              github.com/j6nca/kube-cats <span className="card-arrow">↗</span>
            </a>
          </L>

          <div className="lp-cats" aria-hidden="true">
            {nodes.map((n) => (
              <span
                key={n.name}
                className="lp-cat lp-ufo"
                style={{
                  top: `${n.top}%`,
                  '--sx': n.x,
                  '--dx': n.dx,
                  '--dur': `${n.dur}s`,
                  '--delay': `${n.delay}s`,
                  '--bob-dur': `${n.bobDur}s`,
                  '--bob-delay': `${n.bobDelay}s`,
                }}
              >
                <img src="./kube-cats/ufo.gif" alt="" />
                <span className="lp-cat-label">{n.name}</span>
              </span>
            ))}
            {cats.map((c, i) => (
              <span
                key={i}
                className="lp-cat"
                style={{
                  top: `${c.top}%`,
                  opacity: c.opacity,
                  zIndex: c.z,
                  '--sx': c.x,
                  '--dx': c.dx,
                  '--dur': `${c.dur}s`,
                  '--delay': `${c.delay}s`,
                  '--bob-dur': `${c.bobDur}s`,
                  '--bob-delay': `${c.bobDelay}s`,
                }}
              >
                <img src={`./kube-cats/cat_${c.cat}.gif`} alt="" style={{ width: `${c.size}px` }} />
              </span>
            ))}
          </div>
        </div>
        )}

        {/* page 2 — cat ~/projects.md (beat 7) */}
        {has(2) && (
        <div className="lp-page" data-pi="2" style={{ '--bv': 'var(--b7, 0)' }}>
          <Prompt>
            <Typed text="cat ~/projects.md" from={0.18} to={0.42} />
          </Prompt>
          <L at={0.46} className="lp-manlabel">PROJECTS</L>
          <L at={0.52} className="lp-pre lp-indent lp-faint">
            {'DATE' + pad('DATE', 11) + 'PROJECT' + pad('PROJECT', 23) + 'DESCRIPTION'}
          </L>
          {projects.slice(0, 10).map((p, i) => {
            const range = years(p.startDate, p.endDate)
            const name = slug(p.name)
            return (
              <L key={p.name} at={0.585 + i * 0.024} className="lp-pre lp-indent">
                <span className="lp-faint">{range}</span>
                {pad(range, 11)}
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noreferrer">{name}</a>
                ) : (
                  name
                )}
                {pad(name, 23)}
                <span className="lp-dim">{trunc(p.description.toLowerCase(), 62)}</span>
              </L>
            )
          })}
          <L at={0.86} className="lp-cta-line">
            {projects.length > 10 && (
              <span className="lp-faint">+{projects.length - 10} more · </span>
            )}
            view the full resume:{' '}
            <a href="./resume" target="_blank" rel="noreferrer">
              j6n.ca/resume <span className="card-arrow">↗</span>
            </a>
          </L>
        </div>
        )}

        {/* page 3 — cat ~/work_experience.md (beat 8) */}
        {has(3) && (
        <div className="lp-page" data-pi="3" style={{ '--bv': 'var(--b8, 0)' }}>
          <Prompt>
            <Typed text="cat ~/work_experience.md" from={0.18} to={0.46} />
          </Prompt>
          <L at={0.5} className="lp-manlabel">WORK</L>
          <L at={0.56} className="lp-pre lp-indent lp-faint">
            {'  DATE' + pad('DATE', 11) + 'COMPANY' + pad('COMPANY', 17) + 'ROLE'}
          </L>
          {work.map((w, i) => {
            const range = years(w.startDate, w.endDate)
            const name = coSlug(w.name)
            const open = openWork === i
            const highlights = w.highlights || []
            return (
              <L key={`${w.name}-${w.startDate}`} at={0.62 + i * 0.03} className="lp-work">
                <button
                  type="button"
                  className="lp-workrow lp-pre lp-indent"
                  aria-expanded={open}
                  onClick={() => setOpenWork(open ? -1 : i)}
                >
                  <span className="lp-faint">{open ? '▾ ' : '▸ '}{range}</span>
                  {pad(range, 11)}
                  <span className="lp-accent">{name}</span>
                  {pad(name, 17)}
                  <span className="lp-dim">{trunc(w.position.toLowerCase(), 56)}</span>
                </button>
                <div className={`lp-workdetail${open ? ' open' : ''}`}>
                  <div className="lp-workdetail-in">
                    {highlights.slice(0, 3).map((h) => (
                      <div className="lp-hl" key={h}>
                        · {h}
                      </div>
                    ))}
                    {highlights.length > 3 && (
                      <div className="lp-hl lp-faint">
                        +{highlights.length - 3} more on the{' '}
                        <a href="./resume" target="_blank" rel="noreferrer">full resume ↗</a>
                      </div>
                    )}
                  </div>
                </div>
              </L>
            )
          })}
          <L at={0.9} className="lp-cta-line">
            full detail:{' '}
            <a href="./resume" target="_blank" rel="noreferrer">
              j6n.ca/resume <span className="card-arrow">↗</span>
            </a>
          </L>
        </div>
        )}

        {/* page 4 — motd (beat 10) */}
        {has(4) && (
        <div className="lp-page" data-pi="4" style={{ '--bv': 'var(--b10, 0)' }}>
          <Prompt>
            <Typed text="motd" from={0.3} to={0.42} />
          </Prompt>
          <L at={0.5} className="lp-para lp-motd-head">
            welcome — {basics.name.toLowerCase()} · site reliability engineer · toronto
          </L>
          <L at={0.58} className="lp-pre lp-indent">
            <span className="lp-faint">email    </span>
            <a href={`mailto:${basics.email}`}>{basics.email}</a>
          </L>
          <L at={0.64} className="lp-pre lp-indent">
            <span className="lp-faint">resume   </span>
            <a href="./resume" target="_blank" rel="noreferrer">j6n.ca/resume</a>
          </L>
          <L at={0.7} className="lp-pre lp-indent">
            <span className="lp-faint">fetch    </span>
            <span className="lp-dollar">$</span> curl https://j6n.ca/resume.json
          </L>
          <L at={0.76} className="lp-pre lp-indent">
            <span className="lp-faint">elsewhere</span>{' '}
            <a href="https://github.com/j6nca" target="_blank" rel="noreferrer">github/j6nca</a>
            {' · '}
            <a href="https://www.linkedin.com/in/j6n" target="_blank" rel="noreferrer">linkedin/j6n</a>
            {' · '}
            <a href="https://blog.j6n.ca">blog.j6n.ca</a>
            {' · '}
            <a href="https://monkeytype.com/profile/j6n" target="_blank" rel="noreferrer">monkeytype/j6n</a>
          </L>
          <L at={0.86} className="lp-dim">
            thanks for scrolling — my inbox is open. ✉
          </L>
        </div>
        )}
      </div>
    </div>
  )
}

export default TerminalApp
