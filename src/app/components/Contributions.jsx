import React from 'react'
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
        <div className="contrib-card">
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
