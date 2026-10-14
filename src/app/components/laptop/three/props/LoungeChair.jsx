import React, { useMemo } from 'react'
import * as THREE from 'three'

/*
 * Togo-style lounge chair in mustard velvet. The whole chair is one thick
 * cushion folded into an L: a long low seat, a soft fold, and a tall back
 * leaning slightly away — same full width throughout, no arms. Each end
 * rounds off into a pillow seam (the mid-height seam across the seat front,
 * the ridge along the top of the back), and the corners run out past the
 * middle into soft dog-ear points.
 *
 * Built as a superellipse cross-section (width × thickness) swept along the
 * fold's side-profile centreline. Local origin: floor centre; the seat
 * faces +z.
 */

const W = 1130 // width (~87cm)
const T_SEAT = 420 // seat thickness = seat height (~32cm)
const T_BACK = 380
const DOG = 75 // how far the corners run out past the middle of each end

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const smooth = (v) => {
  v = clamp01(v)
  return v * v * (3 - 2 * v)
}
const lerp = (a, b, t) => a + (b - a) * t
const spow = (v, p) => Math.sign(v) * Math.pow(Math.abs(v), p)

// side-profile centreline as (z, y): seat front → back along the seat,
// round the fold, up the back (leaning ~18° away) to the top seam
const SPINE = [
  [600, 222], [300, 212], [-100, 208], [-290, 232], [-410, 298],
  [-470, 400], [-500, 540], [-540, 700], [-580, 860], [-596, 925],
]

const makeChair = () => {
  const path = new THREE.CatmullRomCurve3(
    SPINE.map(([z, y]) => new THREE.Vector3(0, y, z)),
    false,
    'centripetal',
  )
  const L = path.getLength()
  const t0 = path.getTangentAt(0)
  const t1 = path.getTangentAt(1)
  const start = path.getPointAt(0)
  const end = path.getPointAt(1)
  const p = new THREE.Vector3()
  const tan = new THREE.Vector3()

  const NT = 160 // along the fold
  const NP = 72 // around the cross-section
  const pos = []
  for (let i = 0; i <= NT; i++) {
    const t = i / NT
    for (let j = 0; j < NP; j++) {
      const phi = (j / NP) * Math.PI * 2
      const cx = spow(Math.cos(phi), 0.45) // -1 … 1 across the width
      const xn = Math.abs(cx)
      // corners run further than the middle → dog-ears at both ends
      const ext = DOG * xn ** 6
      const s = lerp(-ext, L + ext, t)
      // centreline point + tangent, extrapolated straight past the ends
      if (s < 0) {
        p.copy(start).addScaledVector(t0, s)
        tan.copy(t0)
      } else if (s > L) {
        p.copy(end).addScaledVector(t1, s - L)
        tan.copy(t1)
      } else {
        path.getPointAt(s / L, p)
        path.getTangentAt(s / L, tan)
      }
      // normal in the side plane: up along the seat, forward on the back
      const ny = -tan.z
      const nz = tan.y
      // thickness: seat → back across the fold
      const th = lerp(T_SEAT, T_BACK, smooth((p.y - 230) / 240))
      // round each end off into a seam: thickness → 0 at the very end
      const capLen = th * 0.55
      const d = Math.min(s + ext, L + ext - s)
      const cap = Math.sqrt(1 - (1 - clamp01(d / capLen)) ** 2)
      // stuffed: faces dome up in the middle of the width, and the sides
      // bulge out at mid-thickness like a pillow's
      const sn = spow(Math.sin(phi), 0.6)
      const puff = 1 + 0.1 * (1 - xn ** 2) - 0.1 * xn ** 6
      const n = (th / 2) * sn * cap * puff
      const bulge = 1 + 0.045 * (1 - sn * sn) * cap
      // ends pull in slightly at the sides as they pinch to the seam
      const x = (W / 2) * cx * bulge * (1 - 0.05 * (1 - cap))
      pos.push(x, p.y + ny * n, p.z + nz * n)
    }
  }
  const idx = []
  for (let i = 0; i < NT; i++) {
    for (let j = 0; j < NP; j++) {
      const a = i * NP + j
      const b = i * NP + ((j + 1) % NP)
      const c = (i + 1) * NP + j
      const d = (i + 1) * NP + ((j + 1) % NP)
      idx.push(a, b, c, b, d, c)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

const LoungeChair = (props) => {
  const geo = useMemo(() => makeChair(), [])
  return (
    <group {...props}>
      {/* velvet: fabric sheen picks up grazing light along the curves */}
      <mesh geometry={geo} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#d4a72a"
          roughness={0.95}
          sheen={1}
          sheenColor="#ffe28a"
          sheenRoughness={0.45}
          // the flat side faces come out wound inward; render both sides
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

export default LoungeChair
