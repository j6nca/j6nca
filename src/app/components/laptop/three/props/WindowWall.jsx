import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SUN_DIR, WINDOW_CENTRE } from '../Sky'

/*
 * The room's left wall, now a solid slab with a window cut in its middle:
 * black frame with a cross mullion, a sill, faint glass, and a soft shaft
 * of light from the opening down to the floor (warm by day, a whisper of
 * blue by night). The wall casts shadows, so the sun/moon light in Sky.jsx
 * only reaches the room through the opening.
 */

const WALL_X = -2800 // inner face
const WALL_T = 60
const WALL_Y = [-960, 2340]
const WALL_Z = [-2100, 2100]
const WIN_W = 1500 // along z
const WIN_H = 1950
const SILL_Y = -100 // bottom of the opening; the window grows upward from here
const FRAME = 44
const FLOOR = -960

const frameMat = <meshStandardMaterial color="#1a1c20" roughness={0.5} metalness={0.3} />

const SHAFT_DAY = new THREE.Color('#ffd9a0')
const SHAFT_NIGHT = new THREE.Color('#7f95d6')

const WindowWall = ({ mood }) => {
  const cy = SILL_Y + WIN_H / 2
  const cz = WINDOW_CENTRE.z
  const y0 = cy - WIN_H / 2
  const y1 = cy + WIN_H / 2
  const z0 = cz - WIN_W / 2
  const z1 = cz + WIN_W / 2

  const wallGeo = useMemo(() => {
    // outline in (−z, y) so the extrusion's +z maps to world +x
    const s = new THREE.Shape()
    s.moveTo(-WALL_Z[1], WALL_Y[0])
    s.lineTo(-WALL_Z[0], WALL_Y[0])
    s.lineTo(-WALL_Z[0], WALL_Y[1])
    s.lineTo(-WALL_Z[1], WALL_Y[1])
    s.closePath()
    const hole = new THREE.Path()
    hole.moveTo(-z1, y0)
    hole.lineTo(-z1, y1)
    hole.lineTo(-z0, y1)
    hole.lineTo(-z0, y0)
    hole.closePath()
    s.holes.push(hole)
    const geo = new THREE.ExtrudeGeometry(s, { depth: WALL_T, bevelEnabled: false })
    geo.rotateY(Math.PI / 2) // shape x → −z (so −(−z) = z), extrusion z → +x
    geo.translate(WALL_X - WALL_T, 0, 0)
    return geo
  }, [y0, y1, z0, z1])

  // light shaft: the opening's four corners and where each lands on the
  // floor along the light, as a tapered prism. Per-vertex alpha fades it
  // from the window to the floor. Normal (not additive) blending: additive
  // writes colour without alpha, and where the canvas is see-through (the
  // window opening onto the CSS sky) that composites as a muddy brown.
  const shaftGeo = useMemo(() => {
    const corners = [
      [z0, y0], [z1, y0], [z1, y1], [z0, y1],
    ].map(([z, y]) => new THREE.Vector3(WALL_X - WALL_T / 2, y, z))
    const floor = corners.map((c) => c.clone().addScaledVector(SUN_DIR, (FLOOR + 2 - c.y) / SUN_DIR.y))
    const pos = []
    const col = []
    const push = (p, a) => {
      pos.push(p.x, p.y, p.z)
      col.push(1, 1, 1, a)
    }
    // four side quads (window edge → floor edge)
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4
      const quad = [
        [corners[i], 1], [corners[j], 1], [floor[j], 0.1],
        [corners[i], 1], [floor[j], 0.1], [floor[i], 0.1],
      ]
      quad.forEach(([p, a]) => push(p, a))
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4))
    return geo
  }, [y0, y1, z0, z1])

  const shaftMat = useRef(null)
  const shown = useRef(-1)
  useFrame(() => {
    const t = mood.current.t
    if (!shaftMat.current || t === shown.current) return
    shown.current = t
    shaftMat.current.color.lerpColors(SHAFT_DAY, SHAFT_NIGHT, t)
    shaftMat.current.opacity = 0.16 * (1 - 0.65 * t)
  })

  const mx = WALL_X - WALL_T / 2 // frame sits mid-wall

  return (
    <group>
      <mesh geometry={wallGeo} castShadow receiveShadow>
        <meshStandardMaterial color="#b0aca3" roughness={1} />
      </mesh>

      {/* frame: four sides inside the opening, plus a cross mullion */}
      <mesh position={[mx, y1 - FRAME / 2, cz]} castShadow>
        <boxGeometry args={[WALL_T + 10, FRAME, WIN_W]} />
        {frameMat}
      </mesh>
      <mesh position={[mx, y0 + FRAME / 2, cz]} castShadow>
        <boxGeometry args={[WALL_T + 10, FRAME, WIN_W]} />
        {frameMat}
      </mesh>
      {[z0 + FRAME / 2, z1 - FRAME / 2, cz].map((z) => (
        <mesh key={z} position={[mx, cy, z]} castShadow>
          <boxGeometry args={[WALL_T + 10, WIN_H, z === cz ? 30 : FRAME]} />
          {frameMat}
        </mesh>
      ))}
      <mesh position={[mx, cy + 120, cz]} castShadow>
        <boxGeometry args={[WALL_T, 30, WIN_W]} />
        {frameMat}
      </mesh>

      {/* sill, proud of the wall on the room side */}
      <mesh position={[WALL_X + 30, y0 - 14, cz]} castShadow receiveShadow>
        <boxGeometry args={[120, 28, WIN_W + 120]} />
        <meshStandardMaterial color="#d8d4cb" roughness={0.8} />
      </mesh>

      {/* glass: barely-there tint, never blocks the light */}
      <mesh position={[mx, cy, cz]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[WIN_W - FRAME * 2, WIN_H - FRAME * 2]} />
        <meshStandardMaterial color="#cfe6ff" transparent opacity={0.1} roughness={0.05} metalness={0.2} depthWrite={false} />
      </mesh>

      {/* light shaft */}
      <mesh geometry={shaftGeo}>
        <meshBasicMaterial
          ref={shaftMat}
          vertexColors
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

export default WindowWall
