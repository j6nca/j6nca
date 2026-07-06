'use client'

import React, { useEffect, useMemo, useRef } from 'react'

// Deterministic PRNG (mulberry32) — layout must be stable across renders.
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

// A note graph shaped like a galaxy: clusters of linked notes on a thin
// disc, a spanning tree inside each cluster, plus a few cross-links.
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
    const hub = i < CLUSTERS // first node of each cluster is its hub note
    const tint = rand()
    return {
      cluster: i % CLUSTERS,
      x: c.x + gauss() * c.spread * 2,
      y: c.y + gauss() * c.spread,
      z: c.z + gauss() * c.spread * 2,
      r: hub ? 3.2 : 1 + rand() * 1.6,
      color: hub ? GREEN : tint < 0.14 ? GREEN : tint < 0.28 ? PURPLE : WHITE,
      twinkle: rand() * Math.PI * 2,
    }
  })

  const edges = []
  // spanning links within each cluster (every note links to an earlier one)
  for (let i = CLUSTERS; i < NODES; i++) {
    const prior = i - CLUSTERS * (1 + Math.floor(rand() * Math.floor(i / CLUSTERS)))
    edges.push([i, Math.max(0, prior)])
  }
  // a few extra intra-cluster and cross-cluster links
  for (let i = 0; i < 30; i++) {
    const a = Math.floor(rand() * NODES)
    const b = Math.floor(rand() * NODES)
    if (a !== b) edges.push([a, b])
  }
  // hub notes reference each other
  for (let i = 1; i < CLUSTERS; i++) edges.push([i - 1, i])

  // three star layers; `par` is each layer's parallax factor against the orbit
  const stars = Array.from({ length: 130 }, (_, i) => {
    const layer = i % 3
    return {
      x: rand(),
      y: rand(),
      a: [0.1, 0.2, 0.35][layer] + rand() * 0.15,
      r: [1.2, 2, 3][layer],
      par: [0.015, 0.04, 0.08][layer],
    }
  })

  // cloudy haze blobs: large, dim, slowly drifting against the orbit
  const hazes = Array.from({ length: 7 }, (_, i) => ({
    x: rand(),
    y: 0.15 + rand() * 0.7,
    w: 0.35 + rand() * 0.4, // width as a fraction of the viewport
    squash: 0.45 + rand() * 0.25, // clouds are wider than tall
    color: i % 3 === 0 ? PURPLE : i % 3 === 1 ? GREEN : WHITE,
    par: 0.02 + rand() * 0.05,
    alpha: 0.05 + rand() * 0.05,
    phase: rand() * Math.PI * 2,
  }))

  return { nodes, edges, centers, stars, hazes }
}

const ShowcaseNebula = () => {
  const ref = useRef(null)
  const canvasRef = useRef(null)
  const graph = useMemo(buildGraph, [])

  useEffect(() => {
    const el = ref.current
    const canvas = canvasRef.current
    if (!el || !canvas) return
    const ctx = canvas.getContext('2d')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const { nodes, edges, centers, stars, hazes } = graph
    let raf = 0
    let width = 0
    let height = 0

    // Pre-rendered halo sprites (radial gradients are too slow per-node).
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
    const halos = new Map(
      [GREEN, PURPLE, WHITE].map((color) => [color, makeHalo(color)])
    )

    // Softer, larger sprite for the haze clouds.
    const makeHaze = ([r, g, b]) => {
      const c = document.createElement('canvas')
      c.width = c.height = 256
      const g2 = c.getContext('2d')
      const grad = g2.createRadialGradient(128, 128, 0, 128, 128, 128)
      grad.addColorStop(0, `rgba(${r},${g},${b},0.28)`)
      grad.addColorStop(0.5, `rgba(${r},${g},${b},0.1)`)
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      g2.fillStyle = grad
      g2.fillRect(0, 0, 256, 256)
      return c
    }
    const hazeSprites = new Map(
      [GREEN, PURPLE, WHITE].map((color) => [color, makeHaze(color)])
    )

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const TILT = 0.5 // fixed camera pitch so the disc reads as a galaxy
    const draw = (p) => {
      const theta = p * Math.PI * 2 + 0.6 // one full revolution per scroll
      const sinT = Math.sin(theta)
      const cosT = Math.cos(theta)
      const sinX = Math.sin(TILT)
      const cosX = Math.cos(TILT)
      // Camera sits inside the cloud: notes constantly swing past the lens
      // and pop out of the screen before fading as they cross it.
      const unit = Math.min(width, height) * 1.86
      const cx = width / 2
      const cy = height / 2
      const F = 1.7 // perspective distance (small = aggressive pop)

      const project = (n) => {
        const x = n.x * cosT - n.z * sinT
        const z = n.x * sinT + n.z * cosT
        const y = n.y * cosX - z * sinX
        const depth = n.y * sinX + z * cosX
        const s = F / Math.max(0.4, F + depth)
        // fade out anything flying past the camera instead of blowing up
        const fade = Math.min(1, Math.max(0, (F + depth - 0.3) / 0.35))
        return { sx: cx + x * unit * s, sy: cy + y * unit * s, s, depth, fade }
      }

      ctx.clearRect(0, 0, width, height)

      // backdrop stars, three layers drifting against the orbit (parallax)
      stars.forEach((st) => {
        let x = (st.x * width - theta * st.par * width) % width
        if (x < 0) x += width
        ctx.fillStyle = `rgba(255,255,255,${st.a})`
        ctx.fillRect(x, st.y * height, st.r, st.r)
      })

      // cloudy haze layer, drifting with the star parallax and gently bobbing
      hazes.forEach((h) => {
        const w = h.w * width
        const span = width + w
        let x = ((h.x * span - theta * h.par * width) % span + span) % span - w / 2
        const y = h.y * height + Math.sin(theta * 2 + h.phase) * height * 0.02
        ctx.globalAlpha = h.alpha
        ctx.drawImage(hazeSprites.get(h.color), x - w / 2, y - (w * h.squash) / 2, w, w * h.squash)
        ctx.globalAlpha = 1
      })

      // nebula glow around the three largest clusters
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

      // far-to-near so nodes popping out draw over everything behind them
      const byDepth = nodes
        .map((_, i) => i)
        .sort((a, b) => proj[b].depth - proj[a].depth)
      byDepth.forEach((i) => {
        const n = nodes[i]
        const pr = proj[i]
        if (!pr.fade) return
        const [r, g, b] = n.color
        const tw = 0.75 + 0.25 * Math.sin(n.twinkle + p * 12)
        const alpha = Math.min(1, (0.35 + 0.65 * Math.min(1.5, pr.s) ** 2) * tw) * pr.fade
        const core = n.r * pr.s
        // halo
        const haloR = core * 6
        ctx.globalAlpha = alpha * 0.7
        ctx.drawImage(halos.get(n.color), pr.sx - haloR, pr.sy - haloR, haloR * 2, haloR * 2)
        ctx.globalAlpha = 1
        // core
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(pr.sx, pr.sy, core, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    const update = () => {
      raf = 0
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight
      const lead = vh * 0.5
      const p = Math.min(1, Math.max(0, (vh + lead - rect.top) / Math.max(1, rect.height + lead)))
      const fadeIn = (p - 0.25) / 0.12
      const fadeOut = (0.87 - p) / 0.12
      const titleO = Math.min(1, Math.max(0, Math.min(fadeIn, fadeOut)))
      el.style.setProperty('--title-o', titleO.toFixed(3))
      el.classList.toggle('sc-title-on', titleO > 0.05)
      if (rect.top < vh + 200 && rect.bottom > -200) draw(p)
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    const onResize = () => {
      resize()
      onScroll()
    }

    resize()
    if (reduced) {
      draw(0.35) // static three-quarter view
      return
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [graph])

  return (
    <div className="showcase nb-showcase" ref={ref}>
      <div className="showcase-stage nb-stage">
        <canvas ref={canvasRef} className="nb-canvas" aria-hidden="true" />
        <div className="sc-caption mono">✦ showcase 002 — nebula-md</div>

        <div className="sc-title-box">
          <div className="sc-title gradient-text">nebula-md</div>
          <p className="sc-tag">render your notes as an interactive galaxy</p>
          <a
            className="sc-cta mono"
            href="https://nebula-md.j6n.dev/"
            target="_blank"
            rel="noreferrer"
          >
            nebula-md.j6n.dev <span className="card-arrow">↗</span>
          </a>
        </div>
      </div>
    </div>
  )
}

export default ShowcaseNebula
