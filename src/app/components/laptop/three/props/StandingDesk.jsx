import React, { useMemo } from 'react'
import * as THREE from 'three'
import { canvasTexture, planarUV, rng } from './shapes'

/*
 * Standing desk: solid light-oak top with softened corners on a black
 * dual-motor T-leg frame — two-stage columns, flat feet with slanted ends
 * and levelling pads, under-top brackets + crossbar, and the height keypad
 * under the front-right edge. Top surface at y=0, centred on (0, -1350).
 */

const W = 2600
const D = 1300
const T = 36 // top thickness (~2.8cm)
const CZ = -1350
const LEG_X = 1050
const LEG_Z = -1380
const FLOOR = -960
const FOOT_L = D // feet run the full depth of the desktop
const FOOT_H = 62
const FOOT_W = 130

const frameMat = <meshStandardMaterial color="#141619" roughness={0.45} metalness={0.45} />

// Oak: two glued boards' worth of long grain, a faint seam, a few knots.
const makeOak = () =>
  canvasTexture(2048, 1024, (g, w, h) => {
    const r = rng(7)
    g.fillStyle = '#c69a66'
    g.fillRect(0, 0, w, h)
    // board-to-board tone shifts
    const seams = [0, 380, 700, h]
    for (let s = 0; s < seams.length - 1; s++) {
      g.fillStyle = `rgba(${s % 2 ? '120,80,40' : '255,230,190'}, ${0.05 + r() * 0.05})`
      g.fillRect(0, seams[s], w, seams[s + 1] - seams[s])
    }
    // long grain: wobbly streaks running along the desk's width
    for (let i = 0; i < 520; i++) {
      const y = r() * h
      const dark = r() < 0.7
      g.strokeStyle = dark
        ? `rgba(110, 70, 34, ${0.04 + r() * 0.12})`
        : `rgba(255, 228, 185, ${0.04 + r() * 0.08})`
      g.lineWidth = 0.6 + r() * 2.2
      g.beginPath()
      const amp = 2 + r() * 7
      const f = 0.002 + r() * 0.004
      const ph = r() * 6.28
      g.moveTo(0, y)
      for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * f + ph) * amp)
      g.stroke()
    }
    // cathedral figure: a few nested arcs per board
    for (let k = 0; k < 6; k++) {
      const cx = r() * w
      const cy = seams[1 + (k % 2)] - 150 + r() * 60
      for (let j = 0; j < 7; j++) {
        g.strokeStyle = `rgba(105, 66, 30, ${0.05 + r() * 0.05})`
        g.lineWidth = 1.5
        g.beginPath()
        g.ellipse(cx, cy, 260 + j * 38, 40 + j * 14, 0, Math.PI * 1.05, Math.PI * 1.95)
        g.stroke()
      }
    }
    // board seams
    seams.slice(1, -1).forEach((y) => {
      g.fillStyle = 'rgba(90, 58, 28, 0.28)'
      g.fillRect(0, y, w, 2)
    })
  })

const StandingDesk = () => {
  const { topGeo, oak } = useMemo(() => {
    const oak = makeOak()
    // rounded-corner slab: outline in (x, -z), extruded up, small bevel
    const r = 40
    const s = new THREE.Shape()
    const hw = W / 2
    const hd = D / 2
    s.moveTo(-hw + r, -hd)
    s.lineTo(hw - r, -hd)
    s.quadraticCurveTo(hw, -hd, hw, -hd + r)
    s.lineTo(hw, hd - r)
    s.quadraticCurveTo(hw, hd, hw - r, hd)
    s.lineTo(-hw + r, hd)
    s.quadraticCurveTo(-hw, hd, -hw, hd - r)
    s.lineTo(-hw, -hd + r)
    s.quadraticCurveTo(-hw, -hd, -hw + r, -hd)
    const bevel = 5
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: T - bevel * 2,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 3,
      curveSegments: 8,
    })
    geo.rotateX(-Math.PI / 2) // shape y → -z, extrusion → +y
    geo.translate(0, -T + bevel, CZ)
    planarUV(geo, 'x', 'z', [-hw, hw], [CZ - hd, CZ + hd])
    return { topGeo: geo, oak }
  }, [])

  const footGeo = useMemo(() => {
    // side profile (along z): flat bottom, slanted ends — long and chunky
    const s = new THREE.Shape([
      new THREE.Vector2(-FOOT_L / 2, 0),
      new THREE.Vector2(FOOT_L / 2, 0),
      new THREE.Vector2(FOOT_L / 2 - 70, FOOT_H),
      new THREE.Vector2(-FOOT_L / 2 + 70, FOOT_H),
    ])
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: FOOT_W,
      bevelEnabled: true,
      bevelThickness: 4,
      bevelSize: 4,
      bevelSegments: 2,
    })
    geo.translate(0, 0, -FOOT_W / 2)
    geo.rotateY(Math.PI / 2)
    return geo
  }, [])

  return (
    <group>
      <mesh geometry={topGeo} castShadow receiveShadow>
        <meshStandardMaterial map={oak} roughness={0.62} metalness={0} />
      </mesh>

      {[-LEG_X, LEG_X].map((x) => (
        <group key={x}>
          {/* under-top bracket running front-to-back */}
          <mesh position={[x, -T - 18, CZ]} castShadow>
            <boxGeometry args={[78, 36, 1060]} />
            {frameMat}
          </mesh>
          {/* motor housing where the column meets the bracket */}
          <mesh position={[x, -T - 60, LEG_Z]} castShadow>
            <boxGeometry args={[130, 60, 176]} />
            {frameMat}
          </mesh>
          {/* outer (upper) column */}
          <mesh position={[x, -330, LEG_Z]} castShadow>
            <boxGeometry args={[112, 500, 150]} />
            {frameMat}
          </mesh>
          {/* inner (lower) column — slimmer, slightly lighter */}
          <mesh position={[x, -740, LEG_Z]} castShadow>
            <boxGeometry args={[96, 340, 132]} />
            <meshStandardMaterial color="#1c1f24" roughness={0.38} metalness={0.5} />
          </mesh>
          {/* foot + levelling pads */}
          <mesh geometry={footGeo} position={[x, FLOOR + 10, CZ]} castShadow receiveShadow>
            {frameMat}
          </mesh>
          {[-FOOT_L / 2 + 70, FOOT_L / 2 - 70].map((dz) => (
            <mesh key={dz} position={[x, FLOOR + 5, CZ + dz]}>
              <cylinderGeometry args={[30, 32, 10, 16]} />
              <meshStandardMaterial color="#0a0b0d" roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}

      {/* crossbar between the motor housings */}
      <mesh position={[0, -T - 62, LEG_Z]} castShadow>
        <boxGeometry args={[2 * LEG_X - 100, 44, 60]} />
        {frameMat}
      </mesh>

      {/* height keypad tucked under the front-right edge */}
      <group position={[900, -T - 14, CZ + D / 2 - 40]}>
        <mesh castShadow>
          <boxGeometry args={[210, 28, 70]} />
          {frameMat}
        </mesh>
        <mesh position={[-40, -2, 36]}>
          <planeGeometry args={[60, 16]} />
          <meshBasicMaterial color="#59f0a2" toneMapped={false} />
        </mesh>
        {[30, 70].map((bx) => (
          <mesh key={bx} position={[bx, -2, 36]}>
            <circleGeometry args={[8, 16]} />
            <meshStandardMaterial color="#3a3e46" roughness={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

export default StandingDesk
