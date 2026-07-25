'use client'

import React, { useEffect, useMemo, useRef } from 'react'

// Deterministic PRNG (mulberry32) — geometry must be stable across renders.
const mulberry32 = (seed) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const CLUSTERS = 6
const NODES = 130
const GREEN = [153, 255, 102]
const PURPLE = [153, 102, 255]
const WHITE = [231, 233, 238]

// Same "note graph as galaxy" build as the nebula showcase, drawn inside the
// obsidian-style graph pane and spun by the scene's beat-3 progress.
const buildGraph = () => {
  const rand = mulberry32(0x6e62) // "nb"
  const gauss = () => (rand() + rand() + rand()) / 3 - 0.5

  const centers = Array.from({ length: CLUSTERS }, (_, i) => {
    const angle = (i / CLUSTERS) * Math.PI * 2 + rand() * 0.8
    const radius = 0.25 + rand() * 0.65
    return {
      x: Math.cos(angle) * radius,
      y: gauss() * 0.25,
      z: Math.sin(angle) * radius,
      spread: 0.16 + rand() * 0.16,
    }
  })

  const nodes = Array.from({ length: NODES }, (_, i) => {
    const c = centers[i % CLUSTERS]
    const hub = i < CLUSTERS
    const tint = rand()
    return {
      x: c.x + gauss() * c.spread * 2,
      y: c.y + gauss() * c.spread,
      z: c.z + gauss() * c.spread * 2,
      r: hub ? 7.5 : 2.5 + rand() * 4,
      color: hub ? GREEN : tint < 0.14 ? GREEN : tint < 0.28 ? PURPLE : WHITE,
      twinkle: rand() * Math.PI * 2,
    }
  })

  const edges = []
  for (let i = CLUSTERS; i < NODES; i++) {
    const prior = i - CLUSTERS * (1 + Math.floor(rand() * Math.floor(i / CLUSTERS)))
    edges.push([i, Math.max(0, prior)])
  }
  for (let i = 0; i < 30; i++) {
    const a = Math.floor(rand() * NODES)
    const b = Math.floor(rand() * NODES)
    if (a !== b) edges.push([a, b])
  }
  for (let i = 1; i < CLUSTERS; i++) edges.push([i - 1, i])

  const stars = Array.from({ length: 90 }, (_, i) => {
    const layer = i % 3
    return {
      x: rand(),
      y: rand(),
      a: [0.1, 0.2, 0.35][layer] + rand() * 0.15,
      r: [1, 1.6, 2.4][layer],
      par: [0.015, 0.04, 0.08][layer],
    }
  })

  return { nodes, edges, centers, stars }
}

const NOTES = [
  'homelab.md',
  'observability.md',
  'keyboards.md',
  'kube-cats.md',
  'game-dev.md',
  'cooking.md',
  'fishing.md',
  'todo.md',
]

const ObsidianApp = ({ subscribe }) => {
  const canvasRef = useRef(null)
  const graph = useMemo(buildGraph, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { nodes, edges, centers, stars } = graph
    let width = 0
    let height = 0

    const makeHalo = ([r, g, b]) => {
      const c = document.createElement('canvas')
      c.width = c.height = 64
      const g2 = c.getContext('2d')
      const grad = g2.createRadialGradient(32, 32, 0, 32, 32, 32)
      grad.addColorStop(0, `rgba(${r},${g},${b},0.55)`)
      grad.addColorStop(0.4, `rgba(${r},${g},${b},0.16)`)
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      g2.fillStyle = grad
      g2.fillRect(0, 0, 64, 64)
      return c
    }
    const halos = new Map([GREEN, PURPLE, WHITE].map((c) => [c, makeHalo(c)]))

    const resize = () => {
      const dpr = 2
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const TILT = 0.5
    const draw = (p) => {
      if (!width) resize()
      const theta = p * Math.PI * 2 + 0.6
      const sinT = Math.sin(theta)
      const cosT = Math.cos(theta)
      const sinX = Math.sin(TILT)
      const cosX = Math.cos(TILT)
      const unit = Math.min(width, height) * 0.62
      const cx = width / 2
      const cy = height / 2
      const F = 1.7

      const project = (n) => {
        const x = n.x * cosT - n.z * sinT
        const z = n.x * sinT + n.z * cosT
        const y = n.y * cosX - z * sinX
        const depth = n.y * sinX + z * cosX
        const s = F / Math.max(0.4, F + depth)
        const fade = Math.min(1, Math.max(0, (F + depth - 0.3) / 0.35))
        return { sx: cx + x * unit * s, sy: cy + y * unit * s, s, depth, fade }
      }

      ctx.clearRect(0, 0, width, height)

      stars.forEach((st) => {
        let x = (st.x * width - theta * st.par * width) % width
        if (x < 0) x += width
        ctx.fillStyle = `rgba(255,255,255,${st.a})`
        ctx.beginPath()
        ctx.arc(x, st.y * height, st.r, 0, Math.PI * 2)
        ctx.fill()
      })

      centers.slice(0, 3).forEach((c, i) => {
        const pr = project(c)
        if (!pr.fade) return
        const radius = unit * 0.55 * pr.s
        const [r, g, b] = i % 2 ? PURPLE : GREEN
        const grad = ctx.createRadialGradient(pr.sx, pr.sy, 0, pr.sx, pr.sy, radius)
        grad.addColorStop(0, `rgba(${r},${g},${b},${(0.07 * pr.s * pr.fade).toFixed(3)})`)
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = grad
        ctx.fillRect(pr.sx - radius, pr.sy - radius, radius * 2, radius * 2)
      })

      const proj = nodes.map(project)

      edges.forEach(([a, b]) => {
        const pa = proj[a]
        const pb = proj[b]
        const alpha = Math.min(0.45, 0.16 * Math.min(pa.s, pb.s) ** 2) * pa.fade * pb.fade
        if (alpha < 0.01) return
        ctx.strokeStyle = `rgba(154,160,173,${alpha.toFixed(3)})`
        ctx.lineWidth = 0.7
        ctx.beginPath()
        ctx.moveTo(pa.sx, pa.sy)
        ctx.lineTo(pb.sx, pb.sy)
        ctx.stroke()
      })

      const byDepth = nodes.map((_, i) => i).sort((a, b) => proj[b].depth - proj[a].depth)
      byDepth.forEach((i) => {
        const n = nodes[i]
        const pr = proj[i]
        if (!pr.fade) return
        const [r, g, b] = n.color
        const tw = 0.75 + 0.25 * Math.sin(n.twinkle + p * 12)
        const alpha = Math.min(1, (0.35 + 0.65 * Math.min(1.5, pr.s) ** 2) * tw) * pr.fade
        const core = n.r * pr.s
        const haloR = core * 4.5
        ctx.globalAlpha = alpha * 0.7
        ctx.drawImage(halos.get(n.color), pr.sx - haloR, pr.sy - haloR, haloR * 2, haloR * 2)
        ctx.globalAlpha = 1
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(pr.sx, pr.sy, core, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    resize()
    draw(0.35) // first frame so the swipe-in never shows an empty pane

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion || !subscribe) return

    // The galaxy spins on its own clock (one revolution ≈ 26s) whenever the
    // obsidian pane is anywhere on screen — including while idle on the beat.
    let vis = false
    let raf = 0
    const loop = (now) => {
      if (vis) draw((now / 26000) % 1)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const unsub = subscribe(({ bands, reduced }) => {
      if (reduced) {
        vis = false
        draw(0.35)
        return
      }
      vis = bands[3] > 0.3 && bands[4] < 0.3
    })
    return () => {
      cancelAnimationFrame(raf)
      if (unsub) unsub()
    }
  }, [graph, subscribe])

  return (
    <div className="lp-app lp-obsidian">
      <div className="lp-appbar">
        <span className="lp-dots" aria-hidden="true">
          <i /><i /><i />
        </span>
        <span className="lp-apptitle">nebula-vault — graph view</span>
      </div>
      <div className="ob-body">
        <aside className="ob-side" aria-hidden="true">
          <div className="ob-side-head">nebula-vault</div>
          <ul>
            {NOTES.map((n) => (
              <li key={n} className={n === 'kube-cats.md' ? 'ob-active' : ''}>
                {n}
              </li>
            ))}
          </ul>
        </aside>
        <div className="ob-main">
          <canvas ref={canvasRef} className="ob-canvas" aria-hidden="true" />
          <div className="ob-cta">
            <span className="lp-accent">nebula.md</span>
            <span className="lp-dim"> — render your notes as an interactive galaxy · </span>
            <a href="https://nebula-md.j6n.dev/" target="_blank" rel="noreferrer">
              nebula-md.j6n.dev <span className="card-arrow">↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ObsidianApp
