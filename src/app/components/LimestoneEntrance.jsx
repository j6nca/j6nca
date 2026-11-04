'use client'

import { useEffect, useRef, useState } from 'react'
import './LimestoneEntrance.css'

const clamp = value => Math.max(0, Math.min(1, value))

export default function LimestoneEntrance() {
  const section = useRef(null)
  const [progress, setProgress] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotion = () => setReducedMotion(motion.matches)
    updateMotion()
    motion.addEventListener('change', updateMotion)
    return () => motion.removeEventListener('change', updateMotion)
  }, [])

  useEffect(() => {
    if (reducedMotion) return
    let frame = 0
    const update = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        const node = section.current
        if (!node) return
        const distance = Math.max(1, node.offsetHeight - window.innerHeight)
        setProgress(clamp(-node.getBoundingClientRect().top / distance))
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
  }, [reducedMotion])

  if (reducedMotion) return null

  const approach = clamp(progress / 0.83)
  const scale = 1 + approach * approach * 9
  const fade = clamp((progress - 0.76) / 0.22)
  const reveal = clamp((progress - 0.54) / 0.38)

  return (
    <section className="limestone-scroll" ref={section} aria-label="Enter the portfolio">
      <div className="limestone-stage" style={{ opacity: 1 - fade, pointerEvents: 'none' }}>
        <div className="limestone-destination" style={{ opacity: reveal }}>
          <span>BUILT OUT OF CURIOSITY.</span>
        </div>
        <svg className="limestone-monument" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" role="img" aria-label="The letters j6n carved all the way through a weathered limestone wall" style={{ transform: `scale(${scale}) translateX(${-approach * 4}%)` }}>
          <defs>
            <filter id="limestone-grain" x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.018 0.028" numOctaves="4" seed="12" stitchTiles="stitch" result="grain" />
              <feColorMatrix in="grain" type="saturate" values="0" />
            </filter>
            <linearGradient id="limestone-light" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--limestone-bright)" />
              <stop offset="58%" stopColor="var(--limestone-base)" />
              <stop offset="100%" stopColor="var(--limestone-shadow)" />
            </linearGradient>
            <mask id="limestone-cutout" maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="900">
              <rect width="1600" height="900" fill="white" />
              <text x="800" y="665" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="790" letterSpacing="-58" fill="black">j6n</text>
            </mask>
          </defs>
          <rect width="1600" height="900" fill="url(#limestone-light)" mask="url(#limestone-cutout)" />
          <rect width="1600" height="900" fill="var(--limestone-grain)" filter="url(#limestone-grain)" opacity=".20" mask="url(#limestone-cutout)" />
          <text x="800" y="665" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="790" letterSpacing="-58" fill="none" stroke="var(--limestone-edge)" strokeWidth="12" opacity=".8">j6n</text>
        </svg>
        <div className="limestone-caption" style={{ opacity: 1 - clamp(progress * 5) }}>SCROLL TO ENTER <span aria-hidden="true">↓</span></div>
      </div>
    </section>
  )
}
