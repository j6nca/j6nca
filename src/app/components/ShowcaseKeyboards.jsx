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

// ISO 60% layout, key widths in units. Each row sums to 15u.
// The ISO enter is emitted separately (it spans rows 2–3).
const ROWS = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
  [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75],
  [1.25, 1.25, 1.25, 6.25, 1.25, 1.25, 1.25, 1.25],
]
const COLS_PER_U = 4 // grid columns per key unit (60 columns total)

const RAIN_GLYPHS = 'qwertyasdfghzxcv⇧⌘⌥⎋↵⌫'
const RAIN_COUNT = 34

const build = () => {
  const rand = mulberry32(0x6b62) // "kb"

  // Board keys with grid placement; ISO enter appended last.
  const keys = []
  ROWS.forEach((row, r) => {
    let col = 1
    row.forEach((w) => {
      const span = Math.round(w * COLS_PER_U)
      keys.push({ row: r + 1, col, span })
      col += span
    })
  })
  keys.push({ row: 2, col: 55, span: 6, iso: true }) // ISO enter, rows 2–3

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
      <div className="showcase-stage kb-stage" aria-hidden="true">
        <div className="sc-caption mono">
          ✦ showcase 001 — keyboards
        </div>

        <div className="kb-rain">
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
          <div className="kb-board">
            <div className="kb-keys">
              {keys.map((k, i) => (
                <span
                  key={i}
                  className={`kb-key${k.iso ? ' kb-enter' : ''}${i === 0 ? ' kb-esc' : ''}`}
                  style={{
                    gridRow: k.iso ? '2 / 4' : k.row,
                    gridColumn: `${k.col} / span ${k.span}`,
                    '--ki': k.ki,
                  }}
                />
              ))}
            </div>
          </div>
          <div className="kb-plate mono">iso-60%</div>
        </div>
      </div>
    </div>
  )
}

export default ShowcaseKeyboards
