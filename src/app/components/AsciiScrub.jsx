'use client'

import React, { useEffect, useRef } from 'react'

// Frame count of public/images/ascii-sprite.webp (vertical strip, generated
// from public/images/ascii.gif — every 2nd frame at 420px wide).
const FRAMES = 14
// Viewport-heights of scroll per full animation loop. One loop every ~60vh:
// the animation cycles ~2× while the hero is pinned, and keeps looping on
// pages/screens where the hero scrolls normally.
const CYCLE_VH = 0.6
const SPRITE = './images/ascii-sprite.webp'

// Scroll-scrubbed animation: frames advance with page scroll and wrap
// around, playing backwards when scrolling up.
const AsciiScrub = () => {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0

    const update = () => {
      raf = 0
      const frame =
        Math.floor((window.scrollY / (window.innerHeight * CYCLE_VH)) * FRAMES) % FRAMES
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
        backgroundImage: `url(${SPRITE})`,
        backgroundSize: `100% ${FRAMES * 100}%`,
      }}
    >
      {/* eager-fetch the sprite so the first frame is painted before any
          scrolling happens (background-image alone loads too lazily on
          mobile) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={SPRITE}
        alt=""
        loading="eager"
        fetchPriority="high"
        decoding="async"
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0 }}
      />
    </div>
  )
}

export default AsciiScrub
