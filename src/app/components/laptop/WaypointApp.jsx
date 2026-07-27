import React from 'react'

/*
 * Waypoint (travel.j6n.dev) — a browser window replaying the classic
 * "golden route" first-timer Japan trip: tokyo → hakone → kyoto → nara →
 * osaka. Everything runs on one shared 9s cycle, gated by the scene being
 * on beat 3 ([data-beat="3"] in laptop.css): the route draws over ~6s, each
 * stop pops as the dot reaches it, the matching itinerary row highlights in
 * sync, then a short hold and the replay loops. Delays phase-shift the
 * shared cycle, so everything stays in sync across iterations.
 */

// Serpentine west-bound route in map-pane user units: tokyo (top right) →
// hakone → kyoto → nara (dip back east) → osaka (bottom left).
const ROUTE =
  'M 548 60 C 535 78, 524 86, 512 96 C 470 125, 440 140, 408 158 ' +
  'C 394 168, 384 176, 372 186 C 320 205, 270 192, 222 196 ' +
  'C 210 200, 204 212, 198 226 C 210 255, 240 270, 262 296 ' +
  'C 245 320, 190 322, 150 330'

// delay = when the dot passes the stop (draw runs 0.5s → 6.5s of the cycle);
// `end` anchors the label to the left of pins near the right map edge
const STOPS = [
  { x: 548, y: 60, name: 'sensō-ji', d: 0.5, end: true },
  { x: 512, y: 96, name: 'shibuya', d: 1.0, end: true },
  { x: 408, y: 158, name: 'lake ashi', d: 2.2 },
  { x: 372, y: 186, name: 'onsen', d: 2.7 },
  { x: 222, y: 196, name: 'kiyomizu-dera', d: 4.2 },
  { x: 198, y: 226, name: 'fushimi inari', d: 4.5 },
  { x: 262, y: 296, name: 'tōdai-ji', d: 5.3 },
  { x: 150, y: 330, name: 'dōtonbori', d: 6.5 },
]

const DAYS = [
  {
    label: 'day 1 — tokyo',
    stops: [
      { time: '09:00', name: 'sensō-ji temple', d: 0.5 },
      { time: '15:00', name: 'shibuya crossing', d: 1.0 },
    ],
  },
  {
    label: 'day 2 — hakone',
    stops: [
      { time: '10:00', name: 'lake ashi cruise', d: 2.2 },
      { time: '16:00', name: 'ryokan + onsen', d: 2.7 },
    ],
  },
  {
    label: 'day 3 — kyoto',
    stops: [
      { time: '09:00', name: 'kiyomizu-dera', d: 4.2 },
      { time: '14:00', name: 'fushimi inari', d: 4.5 },
    ],
  },
  {
    label: 'day 4 — nara',
    stops: [{ time: '10:00', name: 'tōdai-ji + deer park', d: 5.3 }],
  },
  {
    label: 'day 5 — osaka',
    stops: [{ time: '18:00', name: 'dōtonbori', d: 6.5 }],
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
        <div className="wp-trip">japan · golden route</div>
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
              <text
                x={s.end ? s.x - 14 : s.x + 14}
                y={s.y + 4}
                textAnchor={s.end ? 'end' : 'start'}
                className="wp-label"
              >
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
