import React from 'react'

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export function monthLabels(weeks) {
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
  // The first week is usually a partial month, leaving its label crammed
  // against the next one (and duplicating the trailing month, since the
  // window is a year) — drop it when it has fewer than 3 columns of room.
  if (labels.length > 1 && labels[1].col - labels[0].col < 3) labels.shift()
  return labels
}

// GitHub-style contribution grid (months · 7×N cells · legend), styled by the
// .contrib-* rules in globals.css. Cells carry their real level in data attrs
// so the desktop browser pane can scramble and decode them.
const ContribGraph = ({ weeks }) => {
  const labels = monthLabels(weeks)
  return (
    <>
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
    </>
  )
}

export default ContribGraph
