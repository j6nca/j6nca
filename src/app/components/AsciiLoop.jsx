import React from 'react'

// Frame count of public/images/ascii-sprite.webp (vertical strip, generated
// from public/images/ascii.gif — every 2nd frame at 420px wide, 1.5x gain).
const FRAMES = 14
const SPRITE = './images/ascii-sprite.webp'

// Free-running sprite loop: the `ascii-frames` keyframes in globals.css step
// through the strip indefinitely; reduced-motion users get a static frame.
const AsciiLoop = () => (
  <div
    className="term-loop"
    aria-hidden="true"
    style={{
      backgroundImage: `url(${SPRITE})`,
      backgroundSize: `100% ${FRAMES * 100}%`,
    }}
  >
    {/* eager-fetch the sprite so the first frame is painted immediately
        (background-image alone loads too lazily on mobile) */}
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

export default AsciiLoop
