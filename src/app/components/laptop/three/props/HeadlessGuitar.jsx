import React, { useMemo } from 'react'
import * as THREE from 'three'
import { canvasTexture, rng, smoothShape } from './shapes'

/*
 * Headless electric (Ibanez Ichika-style) on an A-frame stand: sculpted
 * pearl-white body — long sweeping upper horn, short lower horn, pointed
 * lower bout — white pickguard, single + humbucker + chrome-ringed single,
 * roasted-maple neck with dot inlays, and the headless bridge with its six
 * tuning knobs at the tail. No headstock, just the string-lock headpiece.
 *
 * The body outline is traced from a front-on product photo in image pixels
 * (bridge saddles at y≈375, nut at y≈22) and scaled so that span is a
 * 25.5" scale length (~842 world units at 13u/cm).
 */

const S = 2.4 // world units per reference-photo pixel
const CX = 205 // neck centreline in the photo
const BY = 385 // body bottom in the photo
const P = (px, py) => [(px - CX) * S, (BY - py) * S]

const BODY_T = 56 // body thickness
const SCALE = 842
const NUT_Y = P(0, 22)[1]
const BRIDGE_Y = NUT_Y - SCALE

const BODY = [
  [205, 388], [252, 385], [266, 376], [272, 352], [270, 330], [258, 302],
  [248, 280], [252, 262], [258, 246], [250, 238], [238, 248], [224, 262],
  [205, 266], [188, 262], [178, 240], [166, 212], [152, 194], [142, 200],
  [138, 228], [141, 262], [154, 292], [158, 312], [150, 338], [148, 362],
  [166, 384],
].map(([x, y]) => P(x, y))

const GUARD = [
  [180, 262], [174, 286], [178, 306], [196, 316], [228, 314], [246, 300],
  [246, 276], [236, 258], [220, 252], [190, 252],
].map(([x, y]) => P(x, y))

const pearl = <meshStandardMaterial color="#ebe5d2" roughness={0.28} metalness={0.12} />
// the scene has no env map, so keep metalness moderate or chrome reads black
const chrome = <meshStandardMaterial color="#dfe2e6" roughness={0.3} metalness={0.55} />
const cream = <meshStandardMaterial color="#f1ede2" roughness={0.45} />
const standMat = <meshStandardMaterial color="#17191d" roughness={0.5} metalness={0.4} />

// roasted maple: warm caramel with tight grain along the neck
const makeMaple = () =>
  canvasTexture(64, 1024, (g, w, h) => {
    const r = rng(11)
    g.fillStyle = '#b5773f'
    g.fillRect(0, 0, w, h)
    for (let i = 0; i < 70; i++) {
      const x = r() * w
      g.strokeStyle = `rgba(${r() < 0.5 ? '90,46,16' : '220,160,100'}, ${0.08 + r() * 0.12})`
      g.lineWidth = 0.5 + r() * 1.5
      g.beginPath()
      g.moveTo(x, 0)
      g.bezierCurveTo(x + 2, h * 0.3, x - 2, h * 0.7, x + 1, h)
      g.stroke()
    }
  })

// neck width tapers from the nut (53u) to the body (64u)
const NECK_TOP = NUT_Y + 6
const NECK_BOT = P(0, 262)[1]
const neckW = (y) => 53 + ((NUT_Y - y) / (NUT_Y - NECK_BOT)) * 11

const Guitar = () => {
  const geos = useMemo(() => {
    const bevel = 9
    const body = new THREE.ExtrudeGeometry(smoothShape(BODY, 160, 0.5), {
      depth: BODY_T - bevel * 2,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 5,
      curveSegments: 8,
    })
    body.translate(0, 0, -BODY_T / 2 + bevel)

    const guard = new THREE.ExtrudeGeometry(smoothShape(GUARD, 80, 0.5), {
      depth: 3,
      bevelEnabled: false,
    })
    guard.translate(0, 0, BODY_T / 2)

    // neck: tapered slab in front of the body, maple texture along y
    const nb = neckW(NECK_BOT) / 2
    const nt = neckW(NECK_TOP) / 2
    const neckShape = new THREE.Shape([
      new THREE.Vector2(-nb, NECK_BOT - 60),
      new THREE.Vector2(nb, NECK_BOT - 60),
      new THREE.Vector2(nt, NECK_TOP),
      new THREE.Vector2(-nt, NECK_TOP),
    ])
    const neck = new THREE.ExtrudeGeometry(neckShape, {
      depth: 30,
      bevelEnabled: true,
      bevelThickness: 4,
      bevelSize: 3,
      bevelSegments: 2,
    })
    // planar UVs: u across, v along the length
    const pos = neck.attributes.position
    const uv = neck.attributes.uv
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, (pos.getX(i) + nb) / (2 * nb), (pos.getY(i) - NECK_BOT) / (NECK_TOP - NECK_BOT))
    }
    neck.translate(0, 0, BODY_T / 2 - 14)

    // frets: 24, by the rule of 18ths' exact form
    const frets = []
    for (let n = 1; n <= 24; n++) {
      const y = NUT_Y - SCALE * (1 - Math.pow(2, -n / 12))
      if (y < NECK_BOT - 50) break
      frets.push({ n, y, w: neckW(y) - 4 })
    }
    return { body, guard, neck, frets }
  }, [])
  const maple = useMemo(() => makeMaple(), [])

  const fbZ = BODY_T / 2 - 14 + 30 + 4 // fretboard surface
  const dots = [3, 5, 7, 9, 15, 17, 19, 21]
  const fretMid = (n) => {
    const a = NUT_Y - SCALE * (1 - Math.pow(2, -(n - 1) / 12))
    const b = NUT_Y - SCALE * (1 - Math.pow(2, -n / 12))
    return (a + b) / 2
  }

  return (
    <group>
      <mesh geometry={geos.body} castShadow receiveShadow>
        {pearl}
      </mesh>
      <mesh geometry={geos.guard} castShadow>
        <meshStandardMaterial color="#f7f7f4" roughness={0.35} />
      </mesh>

      {/* pickups: neck single, bridge humbucker, angled chrome-ringed single */}
      <mesh position={[0, P(0, 278)[1], BODY_T / 2 + 10]} castShadow>
        <boxGeometry args={[136, 28, 12]} />
        {cream}
      </mesh>
      <mesh position={[0, P(0, 300)[1], BODY_T / 2 + 10]} castShadow>
        <boxGeometry args={[140, 56, 12]} />
        {cream}
      </mesh>
      <group position={[-4, P(0, 323)[1], BODY_T / 2 + 6]} rotation={[0, 0, -0.06]}>
        <mesh scale={[1, 1, 0.36]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[86, 86, 8, 40]} />
          {chrome}
        </mesh>
        <mesh position={[0, 0, 6]} scale={[1, 1, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[70, 70, 8, 40]} />
          <meshStandardMaterial color="#2a2c30" roughness={0.6} />
        </mesh>
      </group>

      {/* volume / tone knobs + 3-way switch */}
      {[P(233, 333), P(248, 372)].map(([x, y]) => (
        <mesh key={y} position={[x, y, BODY_T / 2 + 10]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[20, 22, 20, 20]} />
          {chrome}
        </mesh>
      ))}
      <mesh position={[...P(256, 346), BODY_T / 2 + 14]} rotation={[0.5, 0, 0]}>
        <cylinderGeometry args={[5, 5, 30, 8]} />
        {chrome}
      </mesh>

      {/* headless bridge: base plate, six saddles, tuning knobs at the tail */}
      <group position={[0, BRIDGE_Y - 30, BODY_T / 2 + 6]}>
        <mesh castShadow>
          <boxGeometry args={[118, 120, 12]} />
          {chrome}
        </mesh>
        {Array.from({ length: 6 }).map((_, i) => (
          <group key={i} position={[-45 + i * 18, 0, 0]}>
            <mesh position={[0, 20, 12]}>
              <boxGeometry args={[14, 52, 14]} />
              {chrome}
            </mesh>
            <mesh position={[0, -64, 0]} rotation={[0, 0, 0]}>
              <cylinderGeometry args={[7, 7, 26, 12]} />
              {chrome}
            </mesh>
          </group>
        ))}
      </group>

      {/* neck + frets + inlays */}
      <mesh geometry={geos.neck} castShadow>
        <meshStandardMaterial map={maple} roughness={0.55} />
      </mesh>
      {geos.frets.map(({ n, y, w }) => (
        <mesh key={n} position={[0, y, fbZ]}>
          <boxGeometry args={[w, 3, 3]} />
          {chrome}
        </mesh>
      ))}
      {dots.map((n) => (
        <mesh key={n} position={[0, fretMid(n), fbZ + 0.5]}>
          <circleGeometry args={[5, 16]} />
          <meshStandardMaterial color="#1a1612" roughness={0.6} />
        </mesh>
      ))}
      {[-12, 12].map((dx) => (
        <mesh key={dx} position={[dx, fretMid(12), fbZ + 0.5]}>
          <circleGeometry args={[5, 16]} />
          <meshStandardMaterial color="#1a1612" roughness={0.6} />
        </mesh>
      ))}

      {/* headpiece: string lock at the top of the neck */}
      <mesh position={[0, NECK_TOP + 18, BODY_T / 2 + 6]} castShadow>
        <boxGeometry args={[60, 42, 44]} />
        <meshStandardMaterial color="#e6dfc9" roughness={0.35} metalness={0.15} />
      </mesh>

      {/* strings: fan slightly from nut to saddles */}
      {Array.from({ length: 6 }).map((_, i) => {
        const xt = -22 + i * 8.8
        const xb = -45 + i * 18
        const y0 = BRIDGE_Y
        const y1 = NUT_Y
        const len = Math.hypot(xb - xt, y1 - y0)
        return (
          <mesh
            key={i}
            position={[(xt + xb) / 2, (y0 + y1) / 2, fbZ + 5]}
            rotation={[0, 0, Math.atan2(xb - xt, y1 - y0)]}
          >
            <boxGeometry args={[1.4 + (5 - i) * 0.25, len, 1.4]} />
            {chrome}
          </mesh>
        )
      })}
    </group>
  )
}

/* A-frame stand: two splayed legs and a rear leg meet at the neck yoke,
   behind the guitar; struts off the front feet carry the padded cradle. */
const tube = (pts, r = 11) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 24, r, 10)

const LEAN = 0.24 // guitar lean back toward the wall (rad)
const BODY_LIFT = 150 // body bottom height above the floor

// where the neck rests (local guitar y), mapped through the lean
const YOKE_G = P(0, 150)[1]
const yoke = [0, BODY_LIFT + YOKE_G * Math.cos(LEAN), 110 - YOKE_G * Math.sin(LEAN) - 34]

const HeadlessGuitar = (props) => {

  // legs run from the yoke down behind the body; the cradle reaches
  // forward from the front feet to catch the body's bottom edge
  const legs = useMemo(
    () => [
      tube([[-26, yoke[1], yoke[2] - 6], [-150, 330, -40], [-230, 6, -60]]),
      tube([[26, yoke[1], yoke[2] - 6], [150, 330, -40], [230, 6, -60]]),
      tube([[0, yoke[1] + 8, yoke[2] - 16], [0, 360, -240], [0, 6, -420]]),
      tube([[-220, 30, -55], [-170, 100, 60], [-150, 120, 150]], 9),
      tube([[220, 30, -55], [170, 100, 60], [150, 120, 150]], 9),
    ],
    [],
  )

  return (
    <group {...props}>
      {legs.map((g, i) => (
        <mesh key={i} geometry={g} castShadow>
          {standMat}
        </mesh>
      ))}
      {/* rubber feet */}
      {[[-230, -60], [230, -60], [0, -420]].map(([x, z]) => (
        <mesh key={`${x},${z}`} position={[x, 8, z]}>
          <sphereGeometry args={[22, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#0b0c0e" roughness={0.9} />
        </mesh>
      ))}
      {/* neck yoke: padded U */}
      <mesh position={yoke} rotation={[Math.PI / 2 - LEAN, 0, 0]}>
        <torusGeometry args={[40, 10, 10, 24, Math.PI]} />
        <meshStandardMaterial color="#2a2d33" roughness={0.9} />
      </mesh>
      {/* body cradle: crossbar between the front legs + padded arms */}
      <mesh position={[0, 120, 150]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[11, 11, 300, 10]} />
        {standMat}
      </mesh>
      {[-110, 110].map((x) => (
        <mesh key={x} position={[x, 140, 160]} rotation={[Math.PI / 2 - 0.5, 0, 0]} castShadow>
          <cylinderGeometry args={[16, 16, 90, 10]} />
          <meshStandardMaterial color="#2a2d33" roughness={0.9} />
        </mesh>
      ))}

      <group position={[0, BODY_LIFT, 110]} rotation={[-LEAN, 0, 0]}>
        <Guitar />
      </group>
    </group>
  )
}

export default HeadlessGuitar
