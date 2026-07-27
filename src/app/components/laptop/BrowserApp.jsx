'use client'

import React, { useEffect, useRef } from 'react'

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

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

// Browser window showing the contribution graph; the matrix-rain decode from
// the live site's Contributions component, re-driven by the scene's beat 7.
const BrowserApp = ({ data, subscribe }) => {
  const ref = useRef(null)

  useEffect(() => {
    const card = ref.current
    if (!card || !subscribe) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const cells = Array.from(card.querySelectorAll('.contrib-day[data-lvl]'))
    if (!cells.length) return
    const weekOf = cells.map((el) => Number(el.dataset.week))
    const rowOf = cells.map((el) => Number(el.dataset.row))
    const realLvl = cells.map((el) => Number(el.dataset.lvl))
    const jitter = cells.map(() => Math.random())
    const totalWeeks = Math.max(1, ...weekOf) + 1

    const CYCLE = 16
    const colSpeed = Array.from({ length: totalWeeks }, () => 0.25 + Math.random() * 0.55)
    const colPhase = Array.from({ length: totalWeeks }, () => Math.random() * CYCLE)

    // The decode runs on its own clock once the browser swipes in — the beat
    // tween is only 1.5s, this sweep takes DECODE_MS.
    const DECODE_MS = 2600
    let started = 0 // timestamp when the sweep began; 0 = still raining
    let visible = false
    let resolvedAll = false
    let tick = 0

    const paint = () => {
      const resolveFrac = started
        ? Math.min(1, (performance.now() - started) / DECODE_MS)
        : 0
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

    // one 90ms ticker drives both the rain and the timed resolve sweep
    const rain = setInterval(() => {
      if (!visible || resolvedAll) return
      tick += 1
      paint()
    }, 90)

    paint()
    const unsub = subscribe(({ bands, reduced }) => {
      if (reduced) {
        cells.forEach((el, i) => {
          el.className = `contrib-day lvl-${realLvl[i]}`
        })
        return
      }
      visible = bands[9] > 0.02 && bands[10] < 0.6
      // start the sweep once the swipe-in has mostly landed
      if (bands[9] >= 0.3 && !started) started = performance.now()
      // scrolled back out of the beat: reset so a revisit replays the decode
      if (bands[9] < 0.05 && started) {
        started = 0
        resolvedAll = false
        paint()
      }
    })
    return () => {
      clearInterval(rain)
      if (unsub) unsub()
    }
  }, [subscribe])

  const weeks = data?.weeks || []
  const labels = monthLabels(weeks)

  return (
    <div className="lp-app lp-browser" ref={ref}>
      <div className="lp-appbar">
        <span className="lp-dots" aria-hidden="true">
          <i /><i /><i />
        </span>
        <span className="br-url" aria-hidden="true">
          <span className="lp-faint">https://</span>github.com/j6nca
        </span>
      </div>
      <div className="br-body">
        {weeks.length ? (
          <>
            <div className="br-head">
              <img className="br-avatar" src="./images/gh-avatar.jpg" alt="" />
              <div>
                <div className="br-name">j6nca</div>
                <div className="lp-dim">
                  {data.totalContributions.toLocaleString()} contributions in
                  the last year
                </div>
              </div>
            </div>
            <div className="br-graph">
              <div className="contrib-months">
                {labels.map((l) => (
                  <span key={`${l.text}-${l.col}`} className="contrib-month" style={{ gridColumn: l.col }}>
                    {l.text}
                  </span>
                ))}
              </div>
              <div className="contrib-grid">
                {weeks.map((week, wi) => (
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
                        />
                      )
                    })}
                  </div>
                ))}
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
            <div className="br-cta">
              a year of commits ·{' '}
              <a href="https://github.com/j6nca" target="_blank" rel="noreferrer">
                github.com/j6nca <span className="card-arrow">↗</span>
              </a>
            </div>
          </>
        ) : (
          <div className="br-head lp-dim">github.com/j6nca — contribution snapshot unavailable</div>
        )}
      </div>
    </div>
  )
}

export default BrowserApp
