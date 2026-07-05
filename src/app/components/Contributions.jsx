'use client'

import React, { useEffect, useRef } from 'react'
import Reveal from './Reveal'

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

// Builds the labels shown above the grid: the month name is placed over the
// first column in which that month appears.
function monthLabels(weeks) {
  const labels = []
  let last = -1
  weeks.forEach((week, i) => {
    const first = week.days[0]
    if (!first) return
    const month = new Date(first.date + 'T00:00:00Z').getUTCMonth()
    if (month !== last) {
      labels.push({ col: i + 1, text: MONTHS[month] })
      last = month
    }
  })
  return labels
}

const Contributions = ({ data }) => {
  const cardRef = useRef(null)

  // Scroll-driven decode: while the card travels up the viewport, matrix-style
  // drops trickle down each column; past ~3/4 progress the card chrome fades
  // in and cells sweep left-to-right into the real data.
  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const cells = Array.from(card.querySelectorAll('.contrib-grid .contrib-day'))
    if (!cells.length) return
    const weekOf = cells.map((el) => Number(el.dataset.week))
    const rowOf = cells.map((el) => Number(el.dataset.row))
    const realLvl = cells.map((el) => Number(el.dataset.lvl))
    const jitter = cells.map(() => Math.random())
    const totalWeeks = Math.max(1, ...weekOf) + 1

    // One rain drop per column: a bright head with a fading 4-cell tail,
    // falling at its own speed/phase and wrapping around.
    const CYCLE = 16 // 7 rows + tail + dark gap before the drop re-enters
    const colSpeed = Array.from({ length: totalWeeks }, () => 0.25 + Math.random() * 0.55)
    const colPhase = Array.from({ length: totalWeeks }, () => Math.random() * CYCLE)

    let progress = 0
    let resolvedAll = false
    let tick = 0
    let raf = 0

    const paint = () => {
      // Resolve begins at p=0.7 (as the border fades in) and sweeps
      // left-to-right, finishing at p=1.
      const resolveFrac = Math.min(1, Math.max(0, (progress - 0.7) / 0.3))
      cells.forEach((el, i) => {
        const threshold = 0.65 * (weekOf[i] / totalWeeks) + 0.35 * jitter[i]
        if (threshold <= resolveFrac) {
          el.className = `contrib-day lvl-${realLvl[i]}`
        } else {
          const w = weekOf[i]
          const head = (colPhase[w] + tick * colSpeed[w]) % CYCLE
          const d = head - rowOf[i]
          const lvl = d >= 0 && d < 4 ? 4 - Math.floor(d) : 0
          el.className = `contrib-day mx lvl-${lvl}`
        }
      })
      resolvedAll = resolveFrac >= 1
    }

    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const rect = card.getBoundingClientRect()
        const vh = window.innerHeight
        if (rect.top > vh + 200 || rect.bottom < -200) return
        progress = Math.min(1, Math.max(0, (vh - rect.top) / (vh * 0.7)))
        const cardO = Math.min(1, Math.max(0, (progress - 0.7) / 0.25))
        card.style.setProperty('--card-o', cardO.toFixed(3))
        card.classList.toggle('is-solid', cardO > 0.5)
        paint()
      })
    }

    // Advance the rain even when the user pauses mid-scroll.
    const rain = setInterval(() => {
      if (resolvedAll) return
      const rect = card.getBoundingClientRect()
      if (rect.top > window.innerHeight + 200 || rect.bottom < -200) return
      tick += 1
      paint()
    }, 90)

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      clearInterval(rain)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  if (!data || !data.weeks?.length) return null

  const labels = monthLabels(data.weeks)

  return (
    <div className="contrib">
      <Reveal>
        <h3 className="contrib-subhead">A year of commits.</h3>
      </Reveal>
      <Reveal delay={60}>
        <p className="contrib-sub">
          {data.totalContributions.toLocaleString()} contributions in the last
          year · Updated {data.updated}
        </p>
      </Reveal>

      <Reveal delay={120}>
        <div className="contrib-card" ref={cardRef}>
            <div className="contrib-scroll">
              <div className="contrib-graph">
                <div className="contrib-months">
                  {labels.map((l) => (
                    <span
                      key={`${l.text}-${l.col}`}
                      className="contrib-month"
                      style={{ gridColumn: l.col }}
                    >
                      {l.text}
                    </span>
                  ))}
                </div>
                <div className="contrib-grid">
                  {data.weeks.map((week, wi) => (
                    <div className="contrib-week" key={wi}>
                      {week.days.map((day) => {
                        const row = new Date(day.date + 'T00:00:00Z').getUTCDay()
                        return (
                          <span
                            key={day.date}
                            className={`contrib-day lvl-${day.level}`}
                            data-lvl={day.level}
                            data-week={wi}
                            data-row={row}
                            style={{ gridRow: row + 1 }}
                            title={`${day.count} contribution${day.count === 1 ? '' : 's'} on ${day.date}`}
                            aria-label={`${day.count} contributions on ${day.date}`}
                          />
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="contrib-legend">
              <span>Less</span>
              <span className="contrib-day lvl-0" />
              <span className="contrib-day lvl-1" />
              <span className="contrib-day lvl-2" />
              <span className="contrib-day lvl-3" />
              <span className="contrib-day lvl-4" />
              <span>More</span>
            </div>
          </div>
        </Reveal>
    </div>
  )
}

export default Contributions
