import React, { useMemo } from 'react'
import * as THREE from 'three'
import { canvasTexture, insetPath, smoothPoints, smoothShape, warp } from './shapes'

/*
 * Aeron-style task chair in graphite: five-star base on twin-wheel casters,
 * gas column, tilt mechanism, and the signature suspended mesh — a framed
 * seat and a tall back that's narrow at the lumbar, wide at the shoulders
 * and curved to wrap the sitter, with a PostureFit pad behind it and arms
 * on curved stalks. Local origin: floor, under the column; front is -z.
 */

const FRAME = '#262a31'
const frameMat = <meshStandardMaterial color={FRAME} roughness={0.5} metalness={0.25} />

// woven mesh: a fine diamond weave on transparent, alpha-tested
const makeWeave = () => {
  const t = canvasTexture(64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h)
    g.strokeStyle = '#3a4150'
    g.lineWidth = 9
    g.beginPath()
    g.moveTo(0, 0)
    g.lineTo(w, h)
    g.moveTo(w, 0)
    g.lineTo(0, h)
    g.stroke()
  })
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.RepeatWrapping
  t.repeat.set(1 / 13, 1 / 13) // shape coords are world units: one diamond / 13u
  return t
}

const SEAT = [
  [-300, 280], [0, 300], [300, 280], // front (waterfall edge)
  [290, 0], [250, -230], [0, -270], [-250, -230], [-290, 0],
]
// back outline in its own plane: x across, y up from the bottom edge
const BACK = [
  [0, -10], [180, 10], [205, 200], [250, 470], [285, 640], [230, 735],
  [0, 760], [-230, 735], [-285, 640], [-250, 470], [-205, 200], [-180, 10],
]

// a framed mesh panel: extruded ring + mesh membrane spanning the hole
const makePanel = (pts, ring, depth, bend) => {
    const outer = smoothShape(pts, 96, 0.5)
    outer.holes.push(insetPath(pts, ring, 96, 0.5))
    const frame = new THREE.ExtrudeGeometry(outer, {
      depth,
      bevelEnabled: true,
      bevelThickness: 6,
      bevelSize: 6,
      bevelSegments: 3,
      curveSegments: 12,
    })
    const membrane = new THREE.ShapeGeometry(new THREE.Shape(smoothPoints(pts, 96, 0.5)), 12)
    membrane.translate(0, 0, depth / 2)
    if (bend) {
      warp(frame, bend)
      warp(membrane, bend)
    }
    return { frame, membrane }
}

const Caster = ({ angle, r }) => (
  <group rotation={[0, angle, 0]}>
    <group position={[r, 0, 0]}>
      {/* stem + fork */}
      <mesh position={[0, 78, 0]} castShadow>
        <boxGeometry args={[46, 30, 54]} />
        {frameMat}
      </mesh>
      {/* twin wheels, axle across the spoke */}
      {[-14, 14].map((dz) => (
        <mesh key={dz} position={[-12, 36, dz]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[36, 36, 22, 20]} />
          <meshStandardMaterial color="#101215" roughness={0.6} />
        </mesh>
      ))}
    </group>
  </group>
)

const Arm = ({ side }) => {
  const geo = useMemo(() => {
    const x = side * 1
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x * 200, 545, 150),
      new THREE.Vector3(x * 285, 600, 190),
      new THREE.Vector3(x * 320, 700, 150),
      new THREE.Vector3(x * 322, 780, 40),
    ])
    return new THREE.TubeGeometry(curve, 32, 20, 10)
  }, [side])
  return (
    <group>
      <mesh geometry={geo} castShadow>
        {frameMat}
      </mesh>
      {/* armpad */}
      <mesh position={[side * 322, 800, -20]} castShadow>
        <boxGeometry args={[90, 30, 300]} />
        <meshStandardMaterial color="#1a1d22" roughness={0.75} />
      </mesh>
    </group>
  )
}

const OfficeChair = (props) => {
  const { weave, seat, back } = useMemo(
    () => ({
      weave: makeWeave(),
      // seat panel: lies flat (shape y → front/-z after the -90° x rotation)
      seat: makePanel(SEAT, 34, 26, null),
      // back panel: wraps around the sitter (edges forward) and pushes the
      // lumbar zone forward a touch
      back: makePanel(BACK, 30, 20, (x, y, z) => [
        x,
        y,
        z - 0.00036 * x * x - 36 * Math.exp(-(((y - 210) / 170) ** 2)),
      ]),
    }),
    [],
  )

  const meshMat = (
    <meshStandardMaterial
      map={weave}
      color="#ffffff"
      alphaTest={0.35}
      side={THREE.DoubleSide}
      roughness={0.85}
    />
  )

  return (
    <group {...props}>
      {/* ---- five-star base ---- */}
      <mesh position={[0, 105, 0]} castShadow>
        <cylinderGeometry args={[62, 70, 80, 24]} />
        {frameMat}
      </mesh>
      {Array.from({ length: 5 }).map((_, i) => {
        const a = (i / 5) * Math.PI * 2 + Math.PI / 2
        return (
          <group key={i}>
            <group rotation={[0, a, 0]}>
              <mesh position={[220, 98, 0]} rotation={[0, 0, -0.08]} castShadow>
                <boxGeometry args={[380, 40, 56]} />
                {frameMat}
              </mesh>
            </group>
            <Caster angle={a} r={410} />
          </group>
        )
      })}

      {/* ---- gas column + tilt mechanism ---- */}
      <mesh position={[0, 300, 0]} castShadow>
        <cylinderGeometry args={[30, 34, 340, 20]} />
        <meshStandardMaterial color="#14161a" roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh position={[0, 505, 30]} castShadow>
        <boxGeometry args={[330, 70, 360]} />
        {frameMat}
      </mesh>
      {/* tension knob up front, height lever on the right */}
      <mesh position={[0, 490, -175]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[30, 30, 50, 20]} />
        {frameMat}
      </mesh>
      <mesh position={[230, 505, -40]} rotation={[0, 0, Math.PI / 2 - 0.15]}>
        <cylinderGeometry args={[8, 8, 150, 10]} />
        {frameMat}
      </mesh>
      <mesh position={[306, 516, -40]}>
        <sphereGeometry args={[16, 12, 12]} />
        {frameMat}
      </mesh>

      {/* ---- seat ---- */}
      <group position={[0, 552, -10]} rotation={[-Math.PI / 2 + 0.05, 0, 0]}>
        <mesh geometry={seat.frame} castShadow receiveShadow>
          {frameMat}
        </mesh>
        <mesh geometry={seat.membrane}>{meshMat}</mesh>
      </group>

      {/* ---- back: spine links from the mechanism, then the panel ---- */}
      {[-1, 1].map((s) => (
        <mesh key={s} castShadow>
          <tubeGeometry
            args={[
              new THREE.CatmullRomCurve3([
                new THREE.Vector3(s * 120, 520, 190),
                new THREE.Vector3(s * 160, 560, 280),
                new THREE.Vector3(s * 175, 650, 310),
              ]),
              20,
              22,
              10,
            ]}
          />
          {frameMat}
        </mesh>
      ))}
      <group position={[0, 640, 300]} rotation={[0.2, 0, 0]}>
        <mesh geometry={back.frame} castShadow>
          {frameMat}
        </mesh>
        <mesh geometry={back.membrane} castShadow>
          {meshMat}
        </mesh>
        {/* PostureFit pad behind the lumbar */}
        <mesh position={[0, 230, 60]} castShadow>
          <boxGeometry args={[250, 110, 18]} />
          {frameMat}
        </mesh>
      </group>

      <Arm side={-1} />
      <Arm side={1} />
    </group>
  )
}

export default OfficeChair
