'use client'

import React, { useMemo } from 'react'
import useSplitFlap from './useSplitFlap'

const CHARSET = ' abcdefghijklmnopqrstuvwxyz0123456789·-'
const NBSP = '\u00A0'

/**
 * Split-flap (Solari board) text. Each character sits in a cell sized by its
 * FINAL glyph — an invisible sizer holds the width while the visible face
 * flips through the alphabet on top — so the line never changes width while
 * spinning, even in a proportional font. Settled text renders pixel-identical
 * to a plain string.
 */
const SplitFlap = ({ text, startDelay = 0, tickMs = 50, settleMs = 1500 }) => {
  const lines = useMemo(() => [text], [text])
  const [display] = useSplitFlap(lines, CHARSET, {
    startDelay,
    tickMs,
    settleMs,
  })

  return (
    <>
      {Array.from(text, (target, i) => {
        const ch = display[i]
        const spinning = ch !== target
        return (
          <span key={i} className={spinning ? 'flap-cell spin' : 'flap-cell'}>
            <span className="flap-sizer">{target === ' ' ? NBSP : target}</span>
            <span className="flap-face">{ch === ' ' ? NBSP : ch}</span>
          </span>
        )
      })}
    </>
  )
}

export default SplitFlap
