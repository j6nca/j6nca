import React from 'react'

/*
 * Waypoint (travel.j6n.dev) — a browser window replaying a 3-day Japan trip.
 * Everything runs on one shared 9s cycle, gated by the scene being on beat 3
 * ([data-beat="3"] in laptop.css): the route draws over ~6s, each stop pops
 * as the dot reaches it, the matching itinerary row highlights in sync, then
 * a short hold and the replay loops. Delays phase-shift the shared cycle, so
 * everything stays in sync across iterations.
 */

// Tokyo (top right) → Hakone → Kyoto (bottom left), in map-pane user units.
const ROUTE =
  'M 540 70 C 520 95, 515 100, 500 112 C 460 145, 400 165, 360 190 ' +
  'C 340 203, 332 212, 320 225 C 260 265, 200 285, 150 290 C 125 292, 108 275, 95 255'

// delay = when the dot passes the stop (draw runs 0.5s → 6.5s of the cycle)
const STOPS = [
  { x: 540, y: 70, name: 'sensō-ji', d: 0.5 },
  { x: 500, y: 112, name: 'shibuya', d: 1.1 },
  { x: 360, y: 190, name: 'lake ashi', d: 3.0 },
  { x: 320, y: 225, name: 'onsen', d: 3.6 },
  { x: 150, y: 290, name: 'fushimi inari', d: 5.5 },
  { x: 95, y: 255, name: 'kinkaku-ji', d: 6.5 },
]

const DAYS = [
  {
    label: 'day 1 — tokyo',
    stops: [
      { time: '09:00', name: 'sensō-ji temple', d: 0.5 },
      { time: '15:00', name: 'shibuya crossing', d: 1.1 },
    ],
  },
  {
    label: 'day 2 — hakone',
    stops: [
      { time: '10:00', name: 'lake ashi cruise', d: 3.0 },
      { time: '16:00', name: 'ryokan + onsen', d: 3.6 },
    ],
  },
  {
    label: 'day 3 — kyoto',
    stops: [
      { time: '08:00', name: 'fushimi inari', d: 5.5 },
      { time: '14:00', name: 'kinkaku-ji', d: 6.5 },
    ],
  },
]

const WaypointApp = () => (
  <div className="lp-app lp-waypoint">
    <div className="lp-appbar">
      <span className="lp-dots" aria-hidden="true">
        <i /><i /><i />
      </span>
      <span className="br-url" aria-hidden="true">
        <span className="lp-faint">https://</span>travel.j6n.dev
      </span>
    </div>

    <div className="wp-body">
      <aside className="wp-side" aria-hidden="true">
        <div className="wp-trip">japan · 3 days</div>
        {DAYS.map((day) => (
          <div key={day.label}>
            <div className="wp-day">{day.label}</div>
            {day.stops.map((s) => (
              <div className="wp-row" key={s.name} style={{ '--d': `${s.d}s` }}>
                <span className="lp-faint">{s.time}</span> {s.name}
              </div>
            ))}
          </div>
        ))}
      </aside>

      <div className="wp-map" aria-hidden="true">
        <svg viewBox="0 0 610 424" preserveAspectRatio="xMidYMid slice">
          {/* abstract landmass + water hints */}
          <ellipse cx="430" cy="150" rx="230" ry="150" className="wp-land" />
          <ellipse cx="150" cy="300" rx="190" ry="120" className="wp-land" />
          <path d="M 0 380 C 150 340, 300 400, 610 350" className="wp-coast" />

          <path d={ROUTE} pathLength="100" className="wp-route-base" />
          <path d={ROUTE} pathLength="100" className="wp-route" />

          {STOPS.map((s) => (
            <g key={s.name} className="wp-stop" style={{ '--d': `${s.d}s` }}>
              <circle cx={s.x} cy={s.y} r="6" className="wp-pin" />
              <circle cx={s.x} cy={s.y} r="11" className="wp-ring" />
              <text x={s.x + 14} y={s.y + 4} className="wp-label">
                {s.name}
              </text>
            </g>
          ))}

          <circle r="5" className="wp-dot">
            <animateMotion
              dur="9s"
              repeatCount="indefinite"
              calcMode="linear"
              keyTimes="0;0.055;0.72;1"
              keyPoints="0;0;1;1"
              path={ROUTE}
            />
          </circle>
        </svg>
        <div className="wp-replay">▶ replaying trip</div>
      </div>
    </div>

    <div className="wp-cta">
      <span className="lp-accent">waypoint</span>
      <span className="lp-dim"> — plan · log · track your travels · </span>
      <a href="https://ctrl-research.github.io/waypoint" target="_blank" rel="noreferrer">
        ctrl-research.github.io/waypoint <span className="card-arrow">↗</span>
      </a>
    </div>
  </div>
)

export default WaypointApp
