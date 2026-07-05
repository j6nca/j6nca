'use client'

import React, { useEffect, useMemo, useRef } from 'react'

// Deterministic PRNG (mulberry32) so the server-rendered layout matches the
// client exactly — Math.random would break hydration.
const mulberry32 = (seed) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// ANSI 60% layout: [legend, width in u]. Each row sums to 15u.
const ROWS = [
  [['esc', 1], ['1', 1], ['2', 1], ['3', 1], ['4', 1], ['5', 1], ['6', 1], ['7', 1], ['8', 1], ['9', 1], ['0', 1], ['-', 1], ['=', 1], ['⌫', 2]],
  [['tab', 1.5], ['q', 1], ['w', 1], ['e', 1], ['r', 1], ['t', 1], ['y', 1], ['u', 1], ['i', 1], ['o', 1], ['p', 1], ['[', 1], [']', 1], ['\\', 1.5]],
  [['caps', 1.75], ['a', 1], ['s', 1], ['d', 1], ['f', 1], ['g', 1], ['h', 1], ['j', 1], ['k', 1], ['l', 1], [';', 1], ["'", 1], ['enter', 2.25]],
  [['shift', 2.25], ['z', 1], ['x', 1], ['c', 1], ['v', 1], ['b', 1], ['n', 1], ['m', 1], [',', 1], ['.', 1], ['/', 1], ['shift', 2.75]],
  [['ctrl', 1.25], ['win', 1.25], ['alt', 1.25], ['', 6.25], ['alt', 1.25], ['fn', 1.25], ['menu', 1.25], ['ctrl', 1.25]],
]
const COLS_PER_U = 4 // grid columns per key unit (60 columns total)

const RAIN_GLYPHS = 'qwertyasdfghzxcv⇧⌘⌥⎋↵⌫'
const RAIN_COUNT = 34

const build = () => {
  const rand = mulberry32(0x6b62) // "kb"

  const keys = []
  ROWS.forEach((row, r) => {
    let col = 1
    row.forEach(([legend, w]) => {
      const span = Math.round(w * COLS_PER_U)
      keys.push({ legend, row: r + 1, col, span })
      col += span
    })
  })

  // Random fill order: key i appears when --fill passes its --ki threshold.
  const order = keys.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  order.forEach((keyIdx, pos) => {
    keys[keyIdx].ki = (0.8 * pos) / keys.length
  })

  // Falling keycaps, three parallax layers (far → near).
  const layers = [
    { size: 18, speed: 150, opacity: 0.3, blur: 1.2 },
    { size: 26, speed: 210, opacity: 0.55, blur: 0.4 },
    { size: 36, speed: 290, opacity: 0.85, blur: 0 },
  ]
  const rain = Array.from({ length: RAIN_COUNT }, (_, i) => {
    const layer = layers[i % 3]
    return {
      ...layer,
      x: rand() * 100,
      y0: -150 + rand() * 130,
      speed: layer.speed + rand() * 40,
      rot: (rand() - 0.5) * 320,
      glyph: RAIN_GLYPHS[Math.floor(rand() * RAIN_GLYPHS.length)],
    }
  })

  return { keys, rain }
}

const ShowcaseKeyboards = () => {
  const ref = useRef(null)
  const { keys, rain } = useMemo(build, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0

    const update = () => {
      raf = 0
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight
      const lead = vh * 0.5
      const p = Math.min(1, Math.max(0, (vh + lead - rect.top) / Math.max(1, rect.height + lead)))
      el.style.setProperty('--p', p.toFixed(4))
      el.classList.toggle('kb-done', p > 0.88)
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="showcase kb-showcase" ref={ref}>
      <div className="showcase-stage kb-stage">
        <div className="sc-caption mono">✦ showcase 001 — keyboards</div>

        <div className="kb-rain" aria-hidden="true">
          {rain.map((k, i) => (
            <span
              key={i}
              className="kb-drop mono"
              style={{
                left: `${k.x}vw`,
                width: `${k.size}px`,
                height: `${k.size}px`,
                fontSize: `${k.size * 0.45}px`,
                opacity: k.opacity,
                filter: k.blur ? `blur(${k.blur}px)` : undefined,
                '--y0': k.y0,
                '--spd': k.speed,
                '--rot': k.rot,
              }}
            >
              {k.glyph}
            </span>
          ))}
        </div>

        <div className="kb-scene">
          <div className="kb-board" aria-hidden="true">
            <div className="kb-keys">
              {keys.map((k, i) => (
                <span
                  key={i}
                  className={`kb-key${k.legend === 'enter' ? ' kb-accent-b' : ''}${k.legend === 'esc' ? ' kb-accent-a' : ''}`}
                  style={{
                    gridRow: k.row,
                    gridColumn: `${k.col} / span ${k.span}`,
                    '--ki': k.ki,
                  }}
                >
                  {k.legend}
                </span>
              ))}
            </div>
          </div>
          <div className="kb-plate mono">
            <a href="https://blog.j6n.ca/keyboards/index" target="_blank" rel="noreferrer">
              view my keyboards <span className="card-arrow">↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShowcaseKeyboards
