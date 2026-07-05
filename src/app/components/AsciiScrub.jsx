'use client'

import React, { useEffect, useRef } from 'react'

// Frame count of public/images/ascii-sprite.webp (vertical strip, generated
// from public/images/ascii.gif — every 2nd frame at 420px wide).
const FRAMES = 14

// Scroll-scrubbed animation: the sprite sheet's frames map onto the first
// ~80vh of page scroll, so the art animates as you scroll away from the hero
// (and plays backwards on the way up).
const AsciiScrub = () => {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0

    const update = () => {
      raf = 0
      const p = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.8)))
      const frame = Math.round(p * (FRAMES - 1))
      el.style.backgroundPositionY = `${((frame / (FRAMES - 1)) * 100).toFixed(3)}%`
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      className="term-scrub"
      ref={ref}
      aria-hidden="true"
      style={{
        backgroundImage: 'url(./images/ascii-sprite.webp)',
        backgroundSize: `100% ${FRAMES * 100}%`,
      }}
    />
  )
}

export default AsciiScrub
