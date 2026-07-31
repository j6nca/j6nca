'use client'

import { useLayoutEffect, useMemo, useState } from 'react'

/**
 * useSplitFlap — Solari-board text animation.
 *
 * Every non-space cell flips through `charset` and locks when its target
 * character comes around, like an airport departure board. Each cell is
 * assigned a random settle tick inside the `settleMs` window and its start
 * phase is derived from that, so cells shimmer out of sync but the whole
 * board is guaranteed to show the finished text `startDelay + settleMs`
 * after mount.
 *
 * Returns the lines to render for the current frame. Before the client
 * mounts (SSR/static HTML) and under prefers-reduced-motion it returns the
 * finished text, so the static export stays readable.
 *
 * `lines` must be referentially stable (module const or memoized) and
 * `charset` is a plain string.
 */
const useSplitFlap = (
  lines,
  charset,
  { startDelay = 0, tickMs = 45, settleMs = 1500 } = {}
) => {
  // null: render finished text (SSR / reduced motion)
  // -1:   board is blank, waiting out startDelay
  // n>=0: animation frame n
  const [tick, setTick] = useState(null)

  const settleTicks = Math.max(1, Math.round(settleMs / tickMs))

  const cells = useMemo(
    () =>
      lines.map((line) =>
        Array.from(line, (ch) => {
          const idx = charset.indexOf(ch)
          if (ch === ' ' || idx === -1) return null // never animates
          const stop = Math.floor(Math.random() * (settleTicks + 1))
          // start the cycle where it lands on the target exactly at `stop`
          const phase =
            (((idx - stop) % charset.length) + charset.length) % charset.length
          return { phase, stop }
        })
      ),
    [lines, charset, settleTicks]
  )

  const lastTick = useMemo(
    () => Math.max(0, ...cells.flat().map((c) => (c ? c.stop : 0))),
    [cells]
  )

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    setTick(-1) // runs before paint, so the finished SSR text never flashes
    let interval
    const timer = setTimeout(() => {
      interval = setInterval(() => {
        setTick((t) => {
          const next = t + 1
          if (next >= lastTick) clearInterval(interval)
          return next
        })
      }, tickMs)
    }, startDelay)

    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [lastTick, startDelay, tickMs])

  return useMemo(() => {
    if (tick === null) return lines
    return lines.map((line, li) =>
      Array.from(line, (ch, ci) => {
        const cell = cells[li][ci]
        if (!cell) return ch
        if (tick < 0) return ' '
        if (tick >= cell.stop) return ch
        return charset[(tick + cell.phase) % charset.length]
      }).join('')
    )
  }, [tick, lines, cells, charset])
}

export default useSplitFlap
