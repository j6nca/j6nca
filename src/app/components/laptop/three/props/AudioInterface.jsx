import React, { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import { canvasTexture } from './shapes'

/*
 * Universal Audio Volt 2-style USB audio interface (~19 × 13.5 × 5cm):
 * brushed-silver case; the front splits into a silver input section
 * ("VOLT 2", two combo XLR/¼" jacks) and a dark slate control section —
 * gain knobs, lit Vintage / Inst / 48V / Direct buttons, the big Monitor
 * knob, headphone level and jack. Labels and jack faces are a canvas
 * texture; knobs and buttons are real geometry on top of it. A small badge
 * sits on the lid. Local origin: bottom centre; the front faces +z.
 */

const W = 250
const H = 65
const D = 175
const PX = 4 // texture px per unit

// front-panel layout, in panel units (x from the left edge, y from the bottom)
const DARK_X0 = 118
const KNOBS = [
  { x: 128, y: 45, r: 7 }, // gain 1
  { x: 128, y: 20, r: 7 }, // gain 2
  { x: 203, y: 31, r: 12 }, // monitor
  { x: 231, y: 45, r: 6 }, // headphone level
]
const BUTTONS = [
  { x: 146, y: 45, c: '#ff8f1f' }, // vintage 1
  { x: 146, y: 20, c: '#ff8f1f' }, // vintage 2
  { x: 163, y: 45, c: '#5df59a' }, // inst 1
  { x: 163, y: 20, c: '#5df59a' }, // inst 2
  { x: 181, y: 45, c: '#ff5b4a' }, // 48V
  { x: 181, y: 20, c: '#ff8f1f' }, // direct
]
const JACKS = [
  { x: 30, y: 28 },
  { x: 74, y: 28 },
]

const makeFront = () =>
  canvasTexture(W * PX, H * PX, (g, w, h) => {
    const X = (x) => x * PX
    const Y = (y) => h - y * PX
    // silver face
    const s = g.createLinearGradient(0, 0, 0, h)
    s.addColorStop(0, '#e6e8ea')
    s.addColorStop(1, '#c4c7cb')
    g.fillStyle = s
    g.fillRect(0, 0, w, h)
    // dark control section
    g.fillStyle = '#3c4249'
    g.beginPath()
    g.roundRect(X(DARK_X0), Y(59), X(245 - DARK_X0), X(53), 10)
    g.fill()

    // "VOLT 2" with the boxed 2
    g.fillStyle = '#3a3d42'
    g.font = `500 ${11 * PX}px "Helvetica Neue", Helvetica, Arial, sans-serif`
    g.textBaseline = 'middle'
    g.fillText('VOLT', X(12), Y(51))
    g.fillRect(X(46), Y(56), X(10), X(10))
    g.fillStyle = '#e6e8ea'
    g.font = `700 ${8 * PX}px "Helvetica Neue", Helvetica, Arial, sans-serif`
    g.textAlign = 'center'
    g.fillText('2', X(51), Y(51))

    // combo jacks: dark well, XLR pin holes, ¼" centre
    JACKS.forEach(({ x, y }, i) => {
      g.fillStyle = '#7b8086'
      g.beginPath()
      g.arc(X(x), Y(y), X(15), 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#16181b'
      g.beginPath()
      g.arc(X(x), Y(y), X(12.5), 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#2e3236'
      g.beginPath()
      g.arc(X(x), Y(y), X(5), 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#060607'
      g.beginPath()
      g.arc(X(x), Y(y), X(2.6), 0, Math.PI * 2)
      g.fill()
      ;[[-7, 4], [7, 4], [0, -8]].forEach(([dx, dy]) => {
        g.beginPath()
        g.arc(X(x + dx), Y(y + dy), X(1.6), 0, Math.PI * 2)
        g.fill()
      })
      g.fillStyle = '#4a4e54'
      g.font = `600 ${3.4 * PX}px "Helvetica Neue", Helvetica, Arial, sans-serif`
      g.fillText(`INPUT ${i + 1}`, X(x), Y(8))
    })

    // control-section labels
    g.fillStyle = '#d9dde2'
    g.font = `600 ${3 * PX}px "Helvetica Neue", Helvetica, Arial, sans-serif`
    ;[
      ['GAIN', 128, 55],
      ['GAIN', 128, 30],
      ['VINTAGE', 146, 54],
      ['VINTAGE', 146, 29],
      ['INST', 163, 54],
      ['INST', 163, 29],
      ['48V', 181, 54],
      ['HOST', 181, 34],
      ['DIRECT', 181, 29],
      ['MONITOR', 203, 51],
      ['HP', 231, 8],
    ].forEach(([t, x, y]) => g.fillText(t, X(x), Y(y)))
    // headphone jack
    g.fillStyle = '#9aa0a7'
    g.beginPath()
    g.arc(X(231), Y(20), X(5.5), 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#060607'
    g.beginPath()
    g.arc(X(231), Y(20), X(3.2), 0, Math.PI * 2)
    g.fill()
    // green level LEDs above gain + headphone knobs
    g.fillStyle = '#5df59a'
    ;[[128, 54.5], [128, 29.5], [221, 50]].forEach(([x, y]) => g.fillRect(X(x - 0.5), Y(y + 1), X(1), X(3)))
  })

const makeBadge = () =>
  canvasTexture(128, 128, (g, w) => {
    g.fillStyle = '#9aa0a7'
    g.fillRect(0, 0, w, w)
    g.strokeStyle = '#5c6168'
    g.lineWidth = 8
    g.strokeRect(10, 10, w - 20, w - 20)
    g.fillStyle = '#5c6168'
    g.font = '700 54px "Helvetica Neue", Helvetica, Arial, sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText('UA', w / 2, w / 2 + 3)
  })

const AudioInterface = (props) => {
  const { front, badge } = useMemo(() => ({ front: makeFront(), badge: makeBadge() }), [])
  const fz = D / 2 + 0.6 // just proud of the case front
  const px = (x) => x - W / 2 // panel → local x
  return (
    <group {...props}>
      {/* brushed-silver case */}
      <RoundedBox args={[W, H, D]} radius={5} smoothness={3} position={[0, H / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#cdd0d4" roughness={0.38} metalness={0.3} />
      </RoundedBox>
      {/* rubber feet */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * (W / 2 - 22), -2, sz * (D / 2 - 22)]}>
            <cylinderGeometry args={[9, 9, 4, 12]} />
            <meshStandardMaterial color="#111" roughness={0.9} />
          </mesh>
        )),
      )}

      {/* front panel */}
      <mesh position={[0, H / 2, fz]}>
        <planeGeometry args={[W - 4, H - 4]} />
        <meshStandardMaterial map={front} roughness={0.45} />
      </mesh>

      {/* knobs: dark charcoal, white pointer line */}
      {KNOBS.map(({ x, y, r }) => (
        <group key={`${x}${y}`} position={[px(x), y, fz]}>
          <mesh position={[0, 0, r * 0.45]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[r * 0.92, r, r * 0.9, 24]} />
            <meshStandardMaterial color="#1f2226" roughness={0.5} />
          </mesh>
          <mesh position={[r * 0.35, r * 0.35, r * 0.92]} rotation={[0, 0, -Math.PI / 4]}>
            <planeGeometry args={[r * 0.14, r * 0.7]} />
            <meshBasicMaterial color="#f2f2f2" />
          </mesh>
        </group>
      ))}

      {/* lit buttons */}
      {BUTTONS.map(({ x, y, c }) => (
        <mesh key={`${x}${y}`} position={[px(x), y, fz + 1.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[5.2, 5.4, 3, 20]} />
          <meshStandardMaterial color={c} emissive={c} emissiveIntensity={1.1} roughness={0.35} toneMapped={false} />
        </mesh>
      ))}

      {/* lid badge */}
      <mesh position={[0, H + 0.6, -10]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial map={badge} roughness={0.4} metalness={0.3} />
      </mesh>
    </group>
  )
}

export default AudioInterface
