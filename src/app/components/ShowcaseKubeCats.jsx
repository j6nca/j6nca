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
    const startX = node.startX - 8 - rand() * 45
    return {
      name: `pod-${String(i + 1).padStart(2, '0')}`,
      nodeName: node.name,
      cat: (i % 9) + 1,
      top: Math.min(88, Math.max(2, node.top - 8 + rand() * 22)),
      startX,
      travel: 125 - startX + rand() * 50,
      size: 34 + Math.round(rand() * 22),
      bobDur: 3 + rand() * 2.5,
      bobDelay: -rand() * 5,
      flip: rand() > 0.5,
    }
  })

  return { nodes, pods }
}

const ShowcaseKubeCats = () => {
  const ref = useRef(null)
  const { nodes, pods } = useMemo(buildCluster, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0

    const update = () => {
      raf = 0
      const rect = el.getBoundingClientRect()
      const scrollable = rect.height - window.innerHeight
      const p = Math.min(1, Math.max(0, -rect.top / Math.max(1, scrollable)))
      // Title fades in around the midpoint and back out at the end.
      const fadeIn = (p - 0.4) / 0.15
      const fadeOut = (0.97 - p) / 0.12
      el.style.setProperty('--p', p.toFixed(4))
      el.style.setProperty(
        '--title-o',
        Math.min(1, Math.max(0, Math.min(fadeIn, fadeOut))).toFixed(3)
      )
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
      <div className="showcase-stage" aria-hidden="true">
        <div className="sc-caption mono">
          ✦ showcase 001 — $ kubectl get pods -o wide --watch
        </div>

        <div className="sc-title gradient-text">kube-cats</div>

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
              '--sx': p.startX,
              '--dx': p.travel,
              '--bob-dur': `${p.bobDur}s`,
              '--bob-delay': `${p.bobDelay}s`,
              '--flip': p.flip ? -1 : 1,
            }}
          >
            <img
              src={`./kube-cats/cat_${p.cat}.gif`}
              alt=""
              style={{ width: `${p.size}px` }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default ShowcaseKubeCats
