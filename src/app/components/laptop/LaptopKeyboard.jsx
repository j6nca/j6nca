import React from 'react'

// ANSI 60% layout, same table as the keyboards showcase: [legend, width in u],
// every row sums to 15u, laid out on a 60-column grid (4 cols per u).
const ROWS = [
  [['esc', 1], ['1', 1], ['2', 1], ['3', 1], ['4', 1], ['5', 1], ['6', 1], ['7', 1], ['8', 1], ['9', 1], ['0', 1], ['-', 1], ['=', 1], ['⌫', 2]],
  [['tab', 1.5], ['q', 1], ['w', 1], ['e', 1], ['r', 1], ['t', 1], ['y', 1], ['u', 1], ['i', 1], ['o', 1], ['p', 1], ['[', 1], [']', 1], ['\\', 1.5]],
  [['caps', 1.75], ['a', 1], ['s', 1], ['d', 1], ['f', 1], ['g', 1], ['h', 1], ['j', 1], ['k', 1], ['l', 1], [';', 1], ["'", 1], ['enter', 2.25]],
  [['shift', 2.25], ['z', 1], ['x', 1], ['c', 1], ['v', 1], ['b', 1], ['n', 1], ['m', 1], [',', 1], ['.', 1], ['/', 1], ['shift', 2.75]],
  [['ctrl', 1.25], ['fn', 1.25], ['alt', 1.25], ['', 6.25], ['alt', 1.25], ['ctrl', 1.25], ['◂', 1.25], ['▸', 1.25]],
]
const COLS_PER_U = 4

// While the camera hovers over the deck (beat 2), these keys "type" in
// sequence — each lights up as --b2 crosses its --kt threshold and stays lit.
const TYPE_SEQ = [...'keyboards', 'enter']
const TYPE_START = 0.52
const TYPE_STEP = 0.045

const build = () => {
  const keys = []
  ROWS.forEach((row, r) => {
    let col = 1
    row.forEach(([legend, w]) => {
      const span = Math.round(w * COLS_PER_U)
      keys.push({ legend, row: r + 1, col, span })
      col += span
    })
  })
  TYPE_SEQ.forEach((legend, n) => {
    const key = keys.find((k) => k.legend === legend)
    if (key) key.kt = TYPE_START + n * TYPE_STEP
  })
  return keys
}

const KEYS = build()

const LaptopKeyboard = () => (
  <div className="lpk" aria-hidden="true">
    {KEYS.map((k, i) => (
      <span
        key={i}
        className={`lpk-key${k.kt != null ? ' lpk-type' : ''}${k.kt != null && k.legend === 'enter' ? ' lpk-type-enter' : ''}`}
        style={{
          gridRow: k.row,
          gridColumn: `${k.col} / span ${k.span}`,
          '--kt': k.kt,
        }}
      >
        {k.legend}
      </span>
    ))}
  </div>
)

export default LaptopKeyboard
