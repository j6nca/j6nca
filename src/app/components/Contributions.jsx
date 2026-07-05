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

// Weighted toward dim cells so the scramble reads like matrix rain.
const randomLevel = () => {
  const r = Math.random()
  if (r < 0.45) return 0
  if (r < 0.7) return 1
  if (r < 0.85) return 2
  if (r < 0.95) return 3
  return 4
}

const Contributions = ({ data }) => {
  const cardRef = useRef(null)

  // Scroll-driven decode: while the card travels up the viewport the grid
  // shows scrambled green "matrix" cells; past ~3/4 progress the card chrome
  // fades in and cells sweep left-to-right into the real data.
  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const cells = Array.from(card.querySelectorAll('.contrib-grid .contrib-day'))
    if (!cells.length) return
    const weekOf = cells.map((el) => Number(el.dataset.week))
    const realLvl = cells.map((el) => Number(el.dataset.lvl))
    const jitter = cells.map(() => Math.random())
    const totalWeeks = Math.max(1, ...weekOf) + 1

    let progress = 0
    let resolvedAll = false
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
          el.className = `contrib-day mx lvl-${randomLevel()}`
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

    // Reshuffle unresolved cells on a timer so the rain flickers even when
    // the user pauses mid-scroll.
    const shuffle = setInterval(() => {
      if (resolvedAll) return
      const rect = card.getBoundingClientRect()
      if (rect.top > window.innerHeight + 200 || rect.bottom < -200) return
      paint()
    }, 110)

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      clearInterval(shuffle)
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
                      {week.days.map((day) => (
                        <span
                          key={day.date}
                          className={`contrib-day lvl-${day.level}`}
                          data-lvl={day.level}
                          data-week={wi}
                          style={{ gridRow: new Date(day.date + 'T00:00:00Z').getUTCDay() + 1 }}
                          title={`${day.count} contribution${day.count === 1 ? '' : 's'} on ${day.date}`}
                          aria-label={`${day.count} contributions on ${day.date}`}
                        />
                      ))}
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
