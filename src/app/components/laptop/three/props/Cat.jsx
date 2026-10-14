import React, { useMemo } from 'react'
import * as THREE from 'three'
import { canvasTexture, rng, warp } from './shapes'

/*
 * A tortoiseshell cat in a loaf: paws tucked, tail wrapped along one side,
 * big upright ears, wide green eyes. Mottled black / ginger / brown coat,
 * with the split face from the reference photo — a ginger blaze over her
 * right eye running up the forehead, the left side of the face mostly
 * black. World units (~13/cm), origin at the bottom centre, facing +z.
 */

// mottled tortie coat: dark base, ginger + brown blotches and flecks
const makeCoat = (seed, ginger = 1) =>
  canvasTexture(512, 256, (g, w, h) => {
    const r = rng(seed)
    g.fillStyle = '#17110e'
    g.fillRect(0, 0, w, h)
    const blot = (c, n, rMin, rMax, a) => {
      for (let i = 0; i < n; i++) {
        const x = r() * w
        const y = r() * h
        const rad = rMin + r() * (rMax - rMin)
        const grd = g.createRadialGradient(x, y, 0, x, y, rad)
        grd.addColorStop(0, c.replace('A', a))
        grd.addColorStop(1, c.replace('A', '0'))
        g.fillStyle = grd
        g.beginPath()
        g.ellipse(x, y, rad * (1 + r()), rad, r() * 3, 0, Math.PI * 2)
        g.fill()
      }
    }
    blot('rgba(110,72,44,A)', 40, 14, 40, '0.55') // brown wash
    blot('rgba(196,132,70,A)', Math.round(26 * ginger), 8, 30, '0.7') // ginger patches
    // fine fur: thin, faint, slightly blurred strands
    g.filter = 'blur(0.6px)'
    g.lineWidth = 0.8
    for (let i = 0; i < 6000; i++) {
      const x = r() * w
      const y = r() * h
      const len = 2 + r() * 4
      g.strokeStyle = r() < 0.5 ? `rgba(205,145,85,${0.1 + r() * 0.15})` : `rgba(80,52,34,${0.12 + r() * 0.15})`
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + (r() - 0.5) * 1.5, y + len)
      g.stroke()
    }
    g.filter = 'none'
  })

// head: same coat, plus the split face. SphereGeometry UVs: u = 0.25 faces
// +z (the front); u < 0.25 is the cat's right side (−x), v = 0.5 is the
// equator (eye height ≈ v 0.55).
const makeHead = () => {
  const t = makeCoat(7, 0.35)
  const g = t.image.getContext('2d')
  const w = 512
  const h = 256
  const U = (u) => u * w
  const V = (v) => (1 - v) * h
  const patch = (u, v, ru, rv, a = 0.95) => {
    const grd = g.createRadialGradient(U(u), V(v), 0, U(u), V(v), Math.max(ru, rv) * w)
    grd.addColorStop(0, `rgba(205,140,78,${a})`)
    grd.addColorStop(0.7, `rgba(190,125,66,${a * 0.8})`)
    grd.addColorStop(1, 'rgba(190,125,66,0)')
    g.fillStyle = grd
    g.beginPath()
    g.ellipse(U(u), V(v), ru * w, rv * w, 0, 0, Math.PI * 2)
    g.fill()
  }
  patch(0.2, 0.56, 0.05, 0.05) // around her right eye
  patch(0.235, 0.7, 0.018, 0.06) // forehead blaze, up toward the ears
  patch(0.215, 0.38, 0.04, 0.035, 0.85) // cheek / chin, her right side
  patch(0.13, 0.5, 0.03, 0.04, 0.6) // side of the face
  // the left side of the face stays dark: knock back any stray ginger there
  g.fillStyle = 'rgba(23,17,14,0.75)'
  g.beginPath()
  g.ellipse(U(0.3), V(0.55), 0.05 * w, 0.09 * w, 0, 0, Math.PI * 2)
  g.fill()
  t.needsUpdate = true
  return t
}

const BODY_SCALE = 1.5

const coatMat = (map) => <meshStandardMaterial map={map} roughness={0.9} />

const Cat = (props) => {
  const { coat, head, bodyGeo, tailGeo } = useMemo(() => {
    // loaf body: an ellipsoid with a flat, slightly spread bottom
    const bodyGeo = warp(new THREE.SphereGeometry(1, 40, 24), (x, y, z) => {
      const yy = y < -0.35 ? -0.35 - (y + 0.35) * 0.15 : y
      const spread = 1 + Math.max(0, -yy) * 0.25
      return [x * 135 * spread, (yy + 0.38) * 120, z * 260]
    })
    const tailGeo = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(
        [
          [-40, 30, -270],
          [-130, 26, -200],
          [-160, 22, -40],
          [-140, 20, 120],
          [-80, 20, 220],
        ].map((p) => new THREE.Vector3(...p)),
      ),
      40,
      26,
      12,
    )
    return { coat: makeCoat(3), head: makeHead(), bodyGeo, tailGeo }
  }, [])

  return (
    <group {...props}>
      {/* body + chest + tucked front paws + tail, at 1.5× (the head keeps
          its size — a big, round loaf) */}
      <group scale={BODY_SCALE}>
      <mesh geometry={bodyGeo} position={[0, 0, -30]} castShadow receiveShadow>
        {coatMat(coat)}
      </mesh>
      {/* chest: low and broad so the head sinks into it (a loaf, not a
          snowman) */}
      <mesh position={[0, 105, 150]} scale={[1.05, 0.92, 0.9]} castShadow>
        <sphereGeometry args={[125, 28, 20]} />
        {coatMat(coat)}
      </mesh>
      {[-52, 52].map((x) => (
        <mesh key={x} position={[x, 26, 245]} scale={[1, 0.6, 1.2]} castShadow>
          <sphereGeometry args={[40, 16, 12]} />
          {coatMat(coat)}
        </mesh>
      ))}
      <mesh geometry={tailGeo} castShadow>
        {coatMat(coat)}
      </mesh>
      </group>

      {/* head */}
      {/* head sits low on the front of the (scaled) chest */}
      <group position={[0, 222 * BODY_SCALE - 40, 218 * BODY_SCALE]}>
        <mesh scale={[1.1, 0.98, 1]} castShadow>
          <sphereGeometry args={[112, 40, 28]} />
          {coatMat(head)}
        </mesh>
        {/* muzzle + chin */}
        <mesh position={[0, -38, 88]} scale={[1.25, 0.8, 0.9]}>
          <sphereGeometry args={[44, 20, 14]} />
          {coatMat(head)}
        </mesh>
        {/* nose */}
        <mesh position={[0, -22, 128]} scale={[1.3, 0.8, 0.8]}>
          <sphereGeometry args={[10, 12, 10]} />
          <meshStandardMaterial color="#2a1c18" roughness={0.5} />
        </mesh>
        {/* eyes: big, green, dark pupils */}
        {[-44, 44].map((x) => (
          <group key={x} position={[x, 14, 92]} rotation={[0, x * 0.006, 0]}>
            <mesh scale={[1, 1, 0.55]}>
              <sphereGeometry args={[23, 20, 16]} />
              <meshStandardMaterial color="#b8c56a" emissive="#4f5a1c" emissiveIntensity={0.35} roughness={0.15} />
            </mesh>
            <mesh position={[0, 0, 11]} scale={[1, 1, 0.3]}>
              <sphereGeometry args={[11, 16, 12]} />
              <meshStandardMaterial color="#050505" roughness={0.1} />
            </mesh>
            {/* catchlight */}
            <mesh position={[6, 7, 14]}>
              <sphereGeometry args={[3, 8, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        ))}
        {/* ears: upright, tipped out, pink inside */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 68, 96, -8]} rotation={[-0.12, 0, s * -0.36]}>
            <mesh castShadow>
              <coneGeometry args={[54, 122, 16]} />
              {coatMat(head)}
            </mesh>
            <mesh position={[0, -8, 20]} scale={[1, 1, 0.4]}>
              <coneGeometry args={[38, 94, 12]} />
              <meshStandardMaterial color="#b98a86" roughness={0.8} />
            </mesh>
          </group>
        ))}
        {/* whiskers */}
        {[-1, 1].flatMap((s) =>
          [-6, 2, 10].map((dy) => (
            <mesh key={`${s}${dy}`} position={[s * 75, -40 + dy, 105]} rotation={[0, 0, s * (dy * 0.012)]}>
              <boxGeometry args={[80, 1.2, 1.2]} />
              <meshBasicMaterial color="#e8e2d8" />
            </mesh>
          )),
        )}
      </group>
    </group>
  )
}

export default Cat
