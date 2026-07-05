'use client'

import React, { useEffect, useMemo, useRef } from 'react'

// Deterministic PRNG (mulberry32) so the server-rendered sprite layout
// matches the client exactly — Math.random would break hydration.
const mulberry32 = (seed) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const NODE_COUNT = 3
const POD_COUNT = 50

const buildCluster = () => {
  const rand = mulberry32(0x6a6e) // "jn"

  const nodes = Array.from({ length: NODE_COUNT }, (_, i) => {
    const startX = -35 - rand() * 25
    return {
      name: `node-${i + 1}`,
      top: 14 + i * 24 + rand() * 6,
      startX,
      // ends between 120vw and 160vw so every sprite fully exits stage right
      travel: 120 - startX + rand() * 40,
      bobDur: 5 + rand() * 2,
      bobDelay: -rand() * 6,
    }
  })

  const pods = Array.from({ length: POD_COUNT }, (_, i) => {
    const node = nodes[i % NODE_COUNT]
    // depth drives the parallax: far cats are smaller, slower, and dimmer
    const depth = rand()
    const startX = node.startX - 8 - rand() * 45
    return {
      name: `pod-${String(i + 1).padStart(2, '0')}`,
      nodeName: node.name,
      cat: (i % 9) + 1,
      top: Math.min(88, Math.max(2, node.top - 8 + rand() * 22)),
      startX,
      travel: (125 - startX + rand() * 50) * (0.55 + 0.45 * depth),
      size: 30 + Math.round(depth * 28),
      opacity: 0.55 + 0.45 * depth,
      z: depth > 0.5 ? 3 : 1,
      bobDur: 3 + rand() * 2.5,
      bobDelay: -rand() * 5,
    }
  })

  // Starfield layers (near → far) as box-shadow point clouds; each layer
  // drifts left at its own rate for depth.
  const starLayers = [
    { count: 60, size: 1, alphaMax: 0.5, drift: -8 },
    { count: 40, size: 1.5, alphaMax: 0.7, drift: -18 },
    { count: 22, size: 2, alphaMax: 0.9, drift: -32 },
  ].map((layer) => ({
    ...layer,
    shadow: Array.from({ length: layer.count }, () => {
      const a = (0.25 + rand() * 0.75) * layer.alphaMax
      // spread stars across the drift distance too, so the right edge
      // stays populated as the layer slides left
      const x = rand() * (100 + Math.abs(layer.drift))
      return `${x.toFixed(2)}vw ${(rand() * 100).toFixed(2)}vh 0 0 rgba(255,255,255,${a.toFixed(2)})`
    }).join(', '),
  }))

  return { nodes, pods, starLayers }
}

const ShowcaseKubeCats = () => {
  const ref = useRef(null)
  const { nodes, pods, starLayers } = useMemo(buildCluster, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0

    const update = () => {
      raf = 0
      const rect = el.getBoundingClientRect()
      // p=0 the moment the section enters the viewport bottom, p=1 when the
      // sticky stage unpins — so the fleet is already moving as it scrolls in.
      const p = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / Math.max(1, rect.height)))
      // Title fades in after the first quarter and out after the third.
      const fadeIn = (p - 0.25) / 0.12
      const fadeOut = (0.87 - p) / 0.12
      const titleO = Math.min(1, Math.max(0, Math.min(fadeIn, fadeOut)))
      el.style.setProperty('--p', p.toFixed(4))
      el.style.setProperty('--title-o', titleO.toFixed(3))
      el.classList.toggle('sc-title-on', titleO > 0.05)
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
    <div className="showcase" ref={ref}>
      <div className="showcase-stage">
        <div className="sc-sprites" aria-hidden="true">
          {starLayers.map((layer, i) => (
            <span
              key={i}
              className="sc-stars"
              style={{
                width: `${layer.size}px`,
                height: `${layer.size}px`,
                boxShadow: layer.shadow,
                '--drift': layer.drift,
              }}
            />
          ))}

          <div className="sc-caption mono">
            ✦ showcase 001 — $ kubectl get pods -o wide --watch
          </div>

          {nodes.map((n) => (
            <div
              key={n.name}
              className="sc-sprite sc-node"
              style={{
                top: `${n.top}%`,
                '--sx': n.startX,
                '--dx': n.travel,
                '--bob-dur': `${n.bobDur}s`,
                '--bob-delay': `${n.bobDelay}s`,
              }}
            >
              <img src="./kube-cats/ufo.gif" alt="" />
              <span className="sc-label mono">{n.name}</span>
            </div>
          ))}

          {pods.map((p) => (
            <div
              key={p.name}
              className="sc-sprite sc-pod"
              title={`${p.name} · ${p.nodeName}`}
              style={{
                top: `${p.top}%`,
                zIndex: p.z,
                opacity: p.opacity,
                '--sx': p.startX,
                '--dx': p.travel,
                '--bob-dur': `${p.bobDur}s`,
                '--bob-delay': `${p.bobDelay}s`,
              }}
            >
              <img
                src={`./kube-cats/cat_${p.cat}.gif`}
                alt=""
                style={{ width: `${p.size}px` }}
              />
              <span className="sc-label sc-label-sm mono">{p.name}</span>
            </div>
          ))}
        </div>

        <div className="sc-title-box">
          <div className="sc-title gradient-text">kube-cats</div>
          <a
            className="sc-cta mono"
            href="https://github.com/j6nca/kube-cats"
            target="_blank"
            rel="noreferrer"
          >
            github.com/j6nca/kube-cats <span className="card-arrow">↗</span>
          </a>
        </div>
      </div>
    </div>
  )
}

export default ShowcaseKubeCats
