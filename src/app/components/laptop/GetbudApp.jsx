import React from 'react'

/*
 * getbud — the cash-flow Sankey from the reports page: monthly income on the
 * left flowing into expense/investment categories on the right. The ribbons
 * sweep in left-to-right (clip-path animation gated on [data-beat="4"] in
 * laptop.css) and the category nodes pop in staggered behind the sweep.
 */

const FLOWS = [
  { label: 'rent', amt: 1850, c: 'w' },
  { label: 'groceries', amt: 520, c: 'w' },
  { label: 'dining', amt: 380, c: 'w' },
  { label: 'transit', amt: 160, c: 'w' },
  { label: 'rrsp', amt: 600, c: 'v' },
  { label: 'tfsa', amt: 500, c: 'v' },
  { label: 'keyboards', amt: 290, c: 'g' },
  { label: 'misc', amt: 900, c: 'f' },
]
const INCOME = FLOWS.reduce((sum, f) => sum + f.amt, 0)

// Sankey geometry, all deterministic: left bar is one continuous stack, the
// right nodes get a small gap; ribbons are two mirrored beziers closed into
// a filled shape.
const W = 640
const TOP = 34
const GAP = 8
const CHART_H = 330
const LX = 30
const RX = 508
const BAR = 13
const MIDL = LX + BAR + (RX - LX - BAR) * 0.45
const MIDR = LX + BAR + (RX - LX - BAR) * 0.55

const scale = (CHART_H - GAP * (FLOWS.length - 1)) / INCOME
const leftH = INCOME * scale
const leftTop = TOP + (CHART_H - leftH) / 2

let ly = leftTop
let ry = TOP
const NODES = FLOWS.map((f) => {
  const h = f.amt * scale
  const node = { ...f, h, ly0: ly, ly1: ly + h, ry0: ry, ry1: ry + h }
  ly += h
  ry += h + GAP
  return node
})

const ribbon = (n) =>
  `M ${LX + BAR} ${n.ly0} C ${MIDL} ${n.ly0}, ${MIDR} ${n.ry0}, ${RX} ${n.ry0} ` +
  `L ${RX} ${n.ry1} C ${MIDR} ${n.ry1}, ${MIDL} ${n.ly1}, ${LX + BAR} ${n.ly1} Z`

const money = (v) => `$${v.toLocaleString()}`

const GetbudApp = () => (
  <div className="lp-app lp-getbud">
    <div className="lp-appbar">
      <span className="lp-dots" aria-hidden="true">
        <i /><i /><i />
      </span>
      <span className="lp-apptitle">getbud — reports · cash flow · this month</span>
    </div>

    <div className="gb-body" aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${TOP + CHART_H + 24}`}>
        <g className="gb-flow">
          {NODES.map((n) => (
            <path key={n.label} d={ribbon(n)} className={`gb-link gb-${n.c}`} />
          ))}
        </g>

        <rect x={LX} y={leftTop} width={BAR} height={leftH} rx="3" className="gb-income" />
        <text x={LX} y={leftTop - 10} className="gb-label gb-label-strong">
          income · {money(INCOME)}/mo
        </text>

        {NODES.map((n, i) => (
          <g key={n.label} className="gb-node" style={{ '--i': i }}>
            <rect x={RX} y={n.ry0} width={BAR} height={n.h} rx="3" className={`gb-bar gb-${n.c}`} />
            <text x={RX + BAR + 8} y={(n.ry0 + n.ry1) / 2 + 3.5} className="gb-label">
              {n.label} <tspan className="gb-amt">{money(n.amt)}</tspan>
            </text>
          </g>
        ))}
      </svg>
    </div>

    <div className="wp-cta">
      <span className="lp-accent">getbud</span>
      <span className="lp-dim"> — self-hosted budgeting: cash flow, tfsa/rrsp room, net worth · </span>
      <a href="https://ctrl-research.github.io/getbud" target="_blank" rel="noreferrer">
        ctrl-research.github.io/getbud <span className="card-arrow">↗</span>
      </a>
    </div>
  </div>
)

export default GetbudApp
