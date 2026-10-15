import React, { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, RoundedBox, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import TerminalApp from '../TerminalApp'
import BrowserApp from '../BrowserApp'
import WaypointApp from '../WaypointApp'
import GetbudApp from '../GetbudApp'
import ObsidianApp from '../ObsidianApp'
import StandingDesk from './props/StandingDesk'
import OfficeChair from './props/OfficeChair'
import FloorLamp from './props/FloorLamp'
import HeadlessGuitar from './props/HeadlessGuitar'
import LoungeChair from './props/LoungeChair'
import WindowWall from './props/WindowWall'
import FlipClock from './props/FlipClock'
import AudioInterface from './props/AudioInterface'
import Cat from './props/Cat'
import Headphones from './props/Headphones'
import { Clouds, SunMoon } from './Sky'
import { DEG, DEFAULT_ZOOM, FOV, POSE_ROOM, roomDistance, roomScale, viewH } from './pose'
import Interactive from './Interactive'

/*
 * The three.js world behind the story: the room (standing desk, rack,
 * peripherals) and the laptop, all in world units where 1 unit = 1 "CSS px"
 * of the old set, y-up, z toward the viewer, the laptop hinge at the origin
 * and the desk surface at y=0. The floor sits at y=-960 (desk height).
 *
 * The desk, chair, floor lamp, guitar and lounge chair are procedural, modelled from
 * reference photos (see ./props). The keyboard, mouse and speakers
 * are still CC0 placeholder models from Kenney's furniture kit
 * (https://kenney.nl, mirrored at github.com/shorepine/kenney), fetched
 * from /public/models and scaled ×2500. The rack and
 * mousepad are procedural too.
 *
 * LaptopScene still owns the beat stepper and publishes frame state through
 * `subscribe`; World3D stores the latest state in a ref and drives the
 * camera, the lid hinge and the rack LEDs from it inside useFrame — no
 * React re-renders per frame. The screen content stays real DOM (drei's
 * <Html transform>), so every app keeps working unchanged.
 */

const K = 2500 // kenney metres → world units

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const seg = (v, a, b) => clamp((v - a) / (b - a))
const smooth = (u) => {
  u = clamp(u)
  return u * u * (3 - 2 * u)
}
const lerp = (a, b, u) => a + (b - a) * u

/* Camera poses as { look, dir } — dir is the unit vector *from* the camera
 * *to* the look target; distance is derived per-frame from the viewport.
 * The opening pose (POSE_ROOM) lives in ./pose, shared with Sky. */
// keyboard detail dives onto the external keyboard on the desk
const POSE_KEYS = { look: [0, 30, -1100], dir: [0, -0.88, -0.475] }

/* ------------------------------------------------------------------ *
 * Textures: the wood floor is procedural (canvas → CanvasTexture); the
 * monitor wallpaper is an image from /public/textures.
 * ------------------------------------------------------------------ */
const makeWoodFloor = () => {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 1024
  const g = c.getContext('2d')
  // planks run along canvas y (→ world z, toward the viewer)
  const plank = 128
  for (let x = 0; x < 1024; x += plank) {
    const tone = 38 + ((x * 13) % 23)
    g.fillStyle = `rgb(${tone + 62}, ${tone + 38}, ${tone + 14})`
    g.fillRect(x, 0, plank, 1024)
    // grain streaks
    for (let i = 0; i < 14; i++) {
      g.strokeStyle = `rgba(40, 24, 10, ${0.05 + ((i * 7) % 10) / 90})`
      g.lineWidth = 1 + ((i * 5) % 3)
      g.beginPath()
      const gx = x + ((i * 29) % plank)
      g.moveTo(gx, 0)
      g.bezierCurveTo(gx + 6, 256, gx - 6, 512, gx + 4, 1024)
      g.stroke()
    }
    // random plank-end joints
    for (let j = 0; j < 2; j++) {
      const jy = ((x * 31 + j * 467) % 900) + 60
      g.fillStyle = 'rgba(30, 18, 8, 0.5)'
      g.fillRect(x, jy, plank, 3)
    }
    // seam between planks
    g.fillStyle = 'rgba(25, 15, 6, 0.75)'
    g.fillRect(x, 0, 2, 1024)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.RepeatWrapping
  t.repeat.set(4, 3)
  t.anisotropy = 4
  return t
}

// Night desert dunes, cropped to the ultrawide's 2.44:1 panel. Loaded
// without suspending, so the scene doesn't wait on it — the panel shows
// its dark base colour for a moment, then the image fills in.
const WALLPAPER_URL = '/textures/wallpaper-desert-night.jpg'
const loadWallpaper = () => {
  const t = new THREE.TextureLoader().load(WALLPAPER_URL)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

/* ------------------------------------------------------------------ *
 * Kenney placeholder models
 * ------------------------------------------------------------------ */
// `dark`: a black finish that keeps each part's relative shade (cones vs
// cabinet, keys vs case) instead of flattening everything to one colour
// (in sRGB: in three's linear working space a "dark" lightness still
// displays as mid-grey)
const darken = (c) => {
  const hsl = {}
  c.getHSL(hsl, THREE.SRGBColorSpace)
  c.setHSL(hsl.h, hsl.s * 0.25, 0.05 + hsl.l * 0.1, THREE.SRGBColorSpace)
}

const useKenney = (name, color, dark) => {
  const { scene } = useGLTF(`/models/${name}.glb`)
  return useMemo(() => {
    const o = scene.clone(true)
    o.traverse((m) => {
      if (m.isMesh) {
        m.castShadow = true
        m.receiveShadow = true
        if (color || dark) {
          m.material = m.material.clone()
          if (color) m.material.color.set(color)
          if (dark) darken(m.material.color)
        }
      }
    })
    return o
  }, [scene, color, dark])
}

const Kenney = ({ name, position, rotation, color, dark, sx = K, sy = K, sz = K }) => {
  const obj = useKenney(name, color, dark)
  return <primitive object={obj} position={position} rotation={rotation} scale={[sx, sy, sz]} />
}

/* Speaker on a wedge riser that tilts it back so the drivers aim up by
 * `tilt`. The model's own bounds (measured once) size the riser and find
 * its footprint, so `position` stays the model origin it always was. */
const RISER_BACK = 34 // riser height at the back edge
const Speaker = ({ position, tilt = 15 * DEG }) => {
  const obj = useKenney('speakerSmall', null, true)
  const fit = useMemo(() => {
    obj.scale.setScalar(K)
    obj.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(obj)
    obj.scale.setScalar(1)
    const size = box.getSize(new THREE.Vector3())
    // wedge riser in side profile (z, y): low at the back, high at the front
    const D = size.z
    const run = D * Math.cos(tilt)
    const s = new THREE.Shape([
      new THREE.Vector2(-D / 2, 0),
      new THREE.Vector2(-D / 2 + run + 10, 0),
      new THREE.Vector2(-D / 2 + run + 10, RISER_BACK + (run + 10) * Math.tan(tilt)),
      new THREE.Vector2(-D / 2, RISER_BACK),
    ])
    const riser = new THREE.ExtrudeGeometry(s, { depth: size.x + 20, bevelEnabled: false })
    riser.translate(0, 0, -(size.x + 20) / 2)
    riser.rotateY(-Math.PI / 2) // profile z → world z, extrusion → x
    return { box, size, riser }
  }, [obj, tilt])
  const { box, size, riser } = fit
  const cx = (box.min.x + box.max.x) / 2
  const cz = (box.min.z + box.max.z) / 2
  return (
    <group position={[position[0] + cx, position[1], position[2] + cz]}>
      <mesh geometry={riser} castShadow receiveShadow>
        <meshStandardMaterial color="#121316" roughness={0.6} metalness={0.2} />
      </mesh>
      {/* pivot on the riser's back top edge; the speaker leans back by tilt */}
      <group position={[0, RISER_BACK, -size.z / 2]} rotation={[-tilt, 0, 0]}>
        <primitive object={obj} scale={[K, K, K]} position={[-cx, -box.min.y, -box.min.z]} />
      </group>
    </group>
  )
}

;['computerKeyboard', 'computerMouse', 'speakerSmall'].forEach((n) => useGLTF.preload(`/models/${n}.glb`))

/* the ultrawide's display area: the DOM screen (800×500, bezel-free) is
   scaled to fill the display height, letterboxed on the wallpaper */
const DISPLAY = { cx: 0, cy: 580, frontZ: -1739, w: 1560, h: 640 }
const HTML_SCALE = DISPLAY.h / 500

/* ------------------------------------------------------------------ *
 * Networking cables: white runs out of the rack's front face, down to
 * the floor and under the desk (a row of C-curves seen from the side),
 * with little glowing "packets" that travel along them now and then.
 * ------------------------------------------------------------------ */
const CABLE_COUNT = 7
const PACKET_POOL = 12

/* ------------------------------------------------------------------ *
 * Day / night mood (indoor lights; the sun/moon, window light and clouds
 * are in Sky.jsx and read the same value). The lamp toggles it; `mood.t` eases 0 (day) → 1
 * (night) inside useFrame and every mood-driven light reads it. Each row
 * is [day, night]. Day: bright, neutral, a sun-like key and strong cool
 * fill. Night: ambient drops away, the fill turns to moonlight, and the
 * warm key, monitor wash, rack glow and floor lamp carry the room.
 * ------------------------------------------------------------------ */
const MOOD = {
  ambient: [1.0, 0.22],
  hemi: [1.5, 0.35],
  hemiSky: ['#d2e8ff', '#28324f'],
  hemiGround: ['#7a6448', '#0b0906'],
  key: [2.6, 1.6], // the window sun (Sky.jsx) carries daylight now
  keyColor: ['#fff6e8', '#ffbf75'],
  fill: [1.1, 0.14],
  fillColor: ['#e4f0ff', '#7a90d4'],
  wash: [140000, 700000],
  rack: [0.35, 1.35],
  exposure: [1.3, 1.1],
}
const MOOD_COLORS = Object.fromEntries(
  Object.entries(MOOD)
    .filter(([, v]) => typeof v[0] === 'string')
    .map(([k, v]) => [k, v.map((c) => new THREE.Color(c))]),
)
const moodAt = (key, t) => lerp(MOOD[key][0], MOOD[key][1], t)
const moodColor = (out, key, t) => out.lerpColors(MOOD_COLORS[key][0], MOOD_COLORS[key][1], t)

const NetworkCables = ({ mood }) => {
  const cables = useMemo(() => {
    const list = []
    for (let i = 0; i < CABLE_COUNT; i++) {
      const x = -2380 + i * 62
      const y0 = 400
      // identical vertical service loops, evenly spaced along the face,
      // just under the rack's wooden cap
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, y0, -1083),
        new THREE.Vector3(x, y0 - 40, -970),
        new THREE.Vector3(x, y0 - 75, -940),
        new THREE.Vector3(x, y0 - 110, -970),
        new THREE.Vector3(x, y0 - 150, -1082),
      ])
      list.push({ curve, geo: new THREE.TubeGeometry(curve, 48, 7, 8) })
    }
    return list
  }, [])

  const packetMeshes = useRef([])
  const packets = useRef([])
  const v = useRef(new THREE.Vector3())
  const spillRef = useRef(null)

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    // spawn: a few packets in flight at any time, random cable/direction
    if (packets.current.length < PACKET_POOL && Math.random() < 0.05) {
      const mesh = packetMeshes.current.find((m) => !m.visible)
      if (mesh) {
        const dir = Math.random() < 0.5 ? 1 : -1
        packets.current.push({
          mesh,
          cable: cables[(Math.random() * CABLE_COUNT) | 0],
          t: dir > 0 ? 0 : 1,
          dir,
          speed: 0.22 + Math.random() * 0.3,
        })
        mesh.visible = true
        const col = Math.random() < 0.6 ? '#59f0a2' : '#4fc3f7'
        mesh.material.color.set(col)
        mesh.children[0]?.material?.color?.set(col)
      }
    }
    // rack glow tracks packet activity: the light surges as packets arrive
    // at or depart from the rack end of a cable, then eases back down
    if (spillRef.current) {
      let influence = 0
      for (const p of packets.current) {
        influence += p.t < 0.15 ? (0.15 - p.t) / 0.15 : p.t > 0.85 ? (p.t - 0.85) / 0.15 : 0
      }
      const target = (80000 + 400000 * Math.min(1, influence)) * moodAt('rack', mood.current.t)
      spillRef.current.intensity = lerp(spillRef.current.intensity, target, 0.18)
    }
    // advance + recycle
    packets.current = packets.current.filter((p) => {
      p.t += p.dir * p.speed * dt
      if (p.t < 0 || p.t > 1) {
        p.mesh.visible = false
        return false
      }
      p.cable.curve.getPointAt(p.t, v.current)
      p.mesh.position.copy(v.current)
      return true
    })
  })

  return (
    <group>
      {/* rack LED spill, pulsed by packet traffic in useFrame — placed
          behind the rack so the front face stays unlit (no hotspot), while
          the glow still washes the floor and wall around it */}
      <pointLight
        ref={spillRef}
        position={[-2050, 150, -2015]}
        intensity={80000}
        color="#59f0a2"
        distance={2500}
        decay={2}
      />
      {cables.map(({ geo }, i) => (
        <mesh key={i} geometry={geo} castShadow>
          <meshStandardMaterial color="#e8e8ea" roughness={0.55} />
        </mesh>
      ))}
      {/* packet pool: bright core + soft additive glow shell */}
      {Array.from({ length: PACKET_POOL }).map((_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            if (m) packetMeshes.current[i] = m
          }}
          visible={false}
        >
          <sphereGeometry args={[7, 10, 10]} />
          <meshBasicMaterial color="#59f0a2" toneMapped={false} />
          <mesh>
            <sphereGeometry args={[16, 10, 10]} />
            <meshBasicMaterial color="#59f0a2" transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ *
 * Gas-spring monitor arm, in the gap between the monitor and the back
 * wall: a clamp on the desk's back edge, a short pole, a lower arm that
 * swings out level, the angled gas-spring arm (twin rails + the strut),
 * and a tilt head on the monitor's VESA plate.
 * ------------------------------------------------------------------ */
const ARM_Z = -1900
const armMat = <meshStandardMaterial color="#16181c" roughness={0.45} metalness={0.45} />
const Joint = ({ position, r = 34, l = 70 }) => (
  <mesh position={position} rotation={[Math.PI / 2, 0, 0]} castShadow>
    <cylinderGeometry args={[r, r, l, 20]} />
    {armMat}
  </mesh>
)
// a straight segment from a to b (in the x/y plane at ARM_Z + dz)
const Segment = ({ a, b, h = 52, d = 48, dz = 0 }) => {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  return (
    <mesh
      position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, ARM_Z + dz]}
      rotation={[0, 0, Math.atan2(dy, dx)]}
      castShadow
    >
      <boxGeometry args={[Math.hypot(dx, dy), h, d]} />
      {armMat}
    </mesh>
  )
}
const MonitorArm = () => {
  const pole = [-640, 0]
  const shoulder = [-640, 300]
  const elbow = [-320, 300]
  const head = [-40, DISPLAY.cy - 40]
  const springA = [elbow[0] + 40, elbow[1] + 10]
  const springB = [head[0] - 70, head[1] - 60]
  return (
    <group>
      {/* clamp: top plate on the desk + jaw under the back edge */}
      <mesh position={[pole[0], 30, ARM_Z - 20]} castShadow>
        <boxGeometry args={[130, 60, 170]} />
        {armMat}
      </mesh>
      <mesh position={[pole[0], -36 - 50, ARM_Z - 60]} castShadow>
        <boxGeometry args={[110, 40, 120]} />
        {armMat}
      </mesh>
      <mesh position={[pole[0], -36 - 25, ARM_Z - 112]} castShadow>
        <boxGeometry args={[110, 90, 20]} />
        {armMat}
      </mesh>
      {/* pole */}
      <mesh position={[pole[0], 175, ARM_Z]} castShadow>
        <cylinderGeometry args={[24, 26, 290, 20]} />
        {armMat}
      </mesh>
      {/* lower arm, level */}
      <Joint position={[...shoulder, ARM_Z]} r={38} />
      <Segment a={shoulder} b={elbow} h={56} />
      <Joint position={[...elbow, ARM_Z]} />
      {/* gas-spring arm: twin rails with the strut between them */}
      <Segment a={elbow} b={head} h={18} d={14} dz={-20} />
      <Segment a={elbow} b={head} h={18} d={14} dz={20} />
      <Segment a={[elbow[0], elbow[1] - 26]} b={[head[0], head[1] - 26]} h={14} d={54} />
      <mesh
        position={[(springA[0] + springB[0]) / 2, (springA[1] + springB[1]) / 2, ARM_Z]}
        rotation={[0, 0, Math.atan2(springB[1] - springA[1], springB[0] - springA[0]) - Math.PI / 2]}
      >
        <cylinderGeometry args={[11, 11, Math.hypot(springB[0] - springA[0], springB[1] - springA[1]), 12]} />
        <meshStandardMaterial color="#8d939c" roughness={0.3} metalness={0.7} />
      </mesh>
      {/* tilt head + VESA plate on the monitor's back */}
      <Joint position={[...head, ARM_Z]} />
      <mesh position={[0, DISPLAY.cy, -1840]} castShadow>
        <boxGeometry args={[80, 80, 80]} />
        {armMat}
      </mesh>
      <Segment a={head} b={[0, DISPLAY.cy]} h={40} d={40} />
      <mesh position={[0, DISPLAY.cy, -1806]}>
        <boxGeometry args={[150, 150, 12]} />
        {armMat}
      </mesh>
    </group>
  )
}

const World3D = ({ subscribe, panRef, data, contributions, onOpen, onClose, night, onToggleMood, lowPower, onEnter, isAtRoom }) => {
  // phones/tablets: smaller shadow maps (each 2048² map is ~22MB of GPU memory)
  const shadowSize = lowPower ? 1024 : 2048
  // day/night: `t` eases toward `night` each frame (see MOOD)
  const mood = useRef({ t: night ? 1 : 0 })
  const nightRef = useRef(night)
  nightRef.current = night
  const lights = useRef({})
  // pointer is over the monitor's live DOM screen (see Interactive hoverRef)
  const screenHover = useRef(false)
  const setLight = (k) => (l) => {
    if (l) lights.current[k] = l
  }
  const stateRef = useRef(null)
  const ledRefs = useRef([])
  const { camera, size, gl } = useThree()
  // drag-to-pan state is shared with LaptopScene (horizontal trackpad
  // swipes feed it too); yaw eases toward target here each frame
  const pan = panRef

  const wallpaper = useMemo(() => loadWallpaper(), [])
  const woodFloor = useMemo(() => makeWoodFloor(), [])

  // pointer drag on the canvas pans the view (horizontal only — vertical
  // gestures stay reserved for the story stepper)
  useEffect(() => {
    const el = gl.domElement
    let dragging = false
    let lastX = 0
    const onDown = (e) => {
      // only the room view pans; in the terminal a stray drag would leave a
      // stale angle behind for the camera to swing back out to
      if (!isAtRoom()) return
      dragging = true
      lastX = e.clientX
      el.setPointerCapture?.(e.pointerId)
      el.style.cursor = 'grabbing'
    }
    const onMove = (e) => {
      if (!dragging) return
      const dx = e.clientX - lastX
      lastX = e.clientX
      pan.current.target = Math.max(-60, Math.min(60, pan.current.target - dx * 0.15))
    }
    const onUp = () => {
      dragging = false
      el.style.cursor = 'grab'
    }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.style.cursor = 'grab'
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
    }
  }, [gl, isAtRoom])

  useEffect(() => subscribe((s) => {
    stateRef.current = s
  }), [subscribe])

  // Match the opening pose before the first painted frame, so a refresh
  // never flashes the (stale, closer) default camera position.
  useLayoutEffect(() => {
    const pose = POSE_ROOM
    // include the default opening framing so the first painted frame matches
    const dRoom = roomDistance(size.width, size.height, DEFAULT_ZOOM)
    camera.position.set(
      pose.look[0] - pose.dir[0] * dRoom,
      pose.look[1] - pose.dir[1] * dRoom,
      pose.look[2] - pose.dir[2] * dRoom,
    )
    camera.lookAt(pose.look[0], pose.look[1], pose.look[2])
  }, [])

  useFrame((_, delta) => {
    // ---- mood: ease toward the target, then push it into the lights ----
    const m = mood.current
    const goal = nightRef.current ? 1 : 0
    if (m.applied !== m.t || m.t !== goal) {
      m.t += (goal - m.t) * Math.min(1, delta * 2.2)
      if (Math.abs(goal - m.t) < 1e-3) m.t = goal
      const t = m.t
      const L = lights.current
      if (L.ambient) L.ambient.intensity = moodAt('ambient', t)
      if (L.hemi) {
        L.hemi.intensity = moodAt('hemi', t)
        moodColor(L.hemi.color, 'hemiSky', t)
        moodColor(L.hemi.groundColor, 'hemiGround', t)
      }
      if (L.key) {
        L.key.intensity = moodAt('key', t)
        moodColor(L.key.color, 'keyColor', t)
      }
      if (L.fill) {
        L.fill.intensity = moodAt('fill', t)
        moodColor(L.fill.color, 'fillColor', t)
      }
      if (L.wash) L.wash.intensity = moodAt('wash', t)
      gl.toneMappingExposure = moodAt('exposure', t)
      m.applied = t
    }

    const s = stateRef.current
    if (!s) return
    const vw = size.width
    const vh = size.height
    const aspect = vw / vh

    const b0 = s.bands[0] ?? 0
    const kb = s.detail === 'keyboards' ? s.dp : 0

    // rack LEDs idle-blink
    const t = performance.now() / 1000
    ledRefs.current.forEach((m, i) => {
      const phase = Math.sin(t * (0.9 + (i % 5) * 0.35) + i * 2.1)
      m.material.emissiveIntensity = 0.35 + Math.max(0, phase) * 1.6
    })

    // ---- camera: room → screen (→ keys dive), one continuous dolly -----
    const mix3 = (a, b, u) => a.map((v, i) => lerp(v, b[i], u))

    // distances mirror the old scale formulas: the camera should see
    // (viewport height / scale) world units of view height, and viewH(d) is
    // proportional to d — so d = (vh / s) / viewH(1)
    const sRoom = roomScale(vw, vh)
    const dRoom = vh / sRoom / viewH(1)
    const sKeys = Math.min((vw * 0.86) / 840, (vh * 0.95) / 560)
    const dKeys = vh / sKeys / viewH(1)
    // screen pose: fill 94% × 86% of the viewport with the monitor's DOM
    // screen (840×500 content at HTML_SCALE, centred on the display)
    const tanY = Math.tan((FOV / 2) * DEG)
    const dW = (400 * HTML_SCALE) / 0.94 / (tanY * aspect)
    const dH = (250 * HTML_SCALE) / 0.86 / tanY
    const dScreen = Math.max(dW, dH) * 0.61

    // position for a look/dir pose: look - dir*d
    const posOf = (pose, d) => [
      pose.look[0] - pose.dir[0] * d,
      pose.look[1] - pose.dir[1] * d,
      pose.look[2] - pose.dir[2] * d,
    ]
    // the monitor stands upright, so the screen pose rides its +z normal
    const screenLook = [DISPLAY.cx, DISPLAY.cy, DISPLAY.frontZ]
    const posScreen = [screenLook[0], screenLook[1], screenLook[2] + dScreen]

    const u0 = smooth(seg(b0, 0.06, 0.94))
    const uk = smooth(seg(kb, 0.04, 0.46))

    // pan + zoom are opening-shot only: both fade out once the dolly starts
    pan.current.yaw = lerp(pan.current.yaw, pan.current.target, 0.12)
    pan.current.zoom = lerp(pan.current.zoom, pan.current.zoomTarget, 0.1)
    const fade = 1 - smooth(seg(b0, 0.1, 0.75))
    const zScale = 1 + (pan.current.zoom - 1) * fade

    const poseRoom = POSE_ROOM
    let pos = mix3(posOf(poseRoom, dRoom * zScale), posScreen, u0)
    let look = mix3(poseRoom.look, screenLook, u0)
    pos = mix3(pos, posOf(POSE_KEYS, dKeys), uk)
    look = mix3(look, POSE_KEYS.look, uk)

    // drag pan: orbit the camera around the look point
    const th = pan.current.yaw * DEG * fade
    if (th !== 0) {
      const vx = pos[0] - look[0]
      const vz = pos[2] - look[2]
      const c = Math.cos(th)
      const s = Math.sin(th)
      pos = [look[0] + vx * c + vz * s, pos[1], look[2] - vx * s + vz * c]
    }

    camera.position.set(pos[0], pos[1], pos[2])
    camera.lookAt(look[0], look[1], look[2])
  })

  const darkMat = (c = '#15181f', r = 0.6) => <meshStandardMaterial color={c} roughness={r} metalness={0.35} />

  return (
    <Suspense fallback={null}>
      {/* ---------------- lighting (intensities/colours: see MOOD) ------ */}
      <ambientLight ref={setLight('ambient')} intensity={0.7} />
      <hemisphereLight ref={setLight('hemi')} args={['#4a566e', '#141008', 1.0]} />
      {/* key light, from above-right: sun by day, warm lamp glow by night */}
      <spotLight
        ref={setLight('key')}
        position={[420, 1600, 1000]}
        angle={0.75}
        penumbra={1}
        intensity={3.2}
        color="#ffd9a8"
        castShadow
        shadow-mapSize-width={shadowSize}
        shadow-mapSize-height={shadowSize}
      />
      {/* cool fill so the shadows aren't crushed: daylight → moonlight */}
      <directionalLight ref={setLight('fill')} position={[-300, 800, 2600]} intensity={0.35} color="#cfe0ff" />

      {/* monitor LED wash (physical units: ~0.9 at the wall behind it) */}
      <pointLight ref={setLight('wash')} position={[0, 420, -1350]} intensity={500000} color="#4a90d9" distance={3000} decay={2} />

      {/* ---------------- outside: sun/moon + light, drifting clouds ---- */}
      <SunMoon mood={mood} onToggle={onToggleMood} shadowSize={shadowSize} />
      <Clouds mood={mood} />

      {/* ---------------- shell ---------------- */}
      {/* floor surface; polygonOffset pulls it ahead of the slab's top face
          below (same height) so the two never z-fight */}
      <mesh position={[0, -960, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5600, 4200]} />
        <meshStandardMaterial
          map={woodFloor}
          roughness={0.55}
          metalness={0.05}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>
      {/* floor slab: 120 thick, running out under both walls (x to -2860,
          z to -2110) so the room sits on one solid base */}
      <mesh position={[-30, -960 - 60, -5]} castShadow receiveShadow>
        <boxGeometry args={[5660, 120, 4210]} />
        <meshStandardMaterial color="#4a3220" roughness={0.8} />
      </mesh>
      {/* back wall: a 60-thick slab like the left wall (WindowWall) — inner
          face at z=-2050, running out over the left wall's thickness
          (x=-2860) so the corner closes; same floor-to-top span as the
          left wall (y -960 → 2340) so the tops line up */}
      <mesh position={[-30, 690, -2080]} castShadow receiveShadow>
        <boxGeometry args={[5660, 3300, 60]} />
        <meshStandardMaterial color="#b0aca3" roughness={1} />
      </mesh>
      {/* left wall, with the window the sun/moon shines through */}
      <WindowWall mood={mood} />

      {/* ---------------- standing desk ---------------- */}
      <StandingDesk />

      {/* ---------------- server rack (left, a touch taller) ------------ */}
      <mesh position={[-2050, -232, -1545]} castShadow receiveShadow>
        <boxGeometry args={[1170, 1456, 910]} />
        {darkMat('#0c0e13', 0.55)}
      </mesh>
      {/* vented glass door */}
      <mesh position={[-2050, -232, -1089]}>
        <planeGeometry args={[1144, 1430]} />
        <meshStandardMaterial color="#10131a" roughness={0.35} metalness={0.5} />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            if (m) ledRefs.current[i] = m
          }}
          position={[-2600 + (i % 4) * 34, -140 + Math.floor(i / 4) * 40, -1087]}
        >
          <boxGeometry args={[6, 6, 2]} />
          <meshStandardMaterial color="#0a2015" emissive={i % 3 === 2 ? '#f0c359' : '#59f0a2'} emissiveIntensity={1} />
        </mesh>
      ))}

      <NetworkCables mood={mood} />

      {/* wooden cap on top of the rack — the tablet sits on it */}
      <mesh position={[-2050, 511, -1545]} castShadow receiveShadow>
        <boxGeometry args={[1250, 30, 990]} />
        <meshStandardMaterial color="#7c5730" roughness={0.75} metalness={0.05} />
      </mesh>

      {/* retro flip clock centred on the rack's wooden top, turned a little toward
          the room; shows the visitor's local time */}
      <FlipClock position={[-2050, 542, -1545]} rotation={[0, 0.25, 0]} />

      {/* ---------------- ultrawide on a gas-spring arm --------------- */}
      <MonitorArm />
      {/* cabinet + display: hosts the story's DOM screen. In the room view,
          clicking the monitor flies the camera in to the terminal (and it's
          outlined as clickable there). */}
      <Interactive active={isAtRoom} hoverRef={screenHover}>
      <group
        onClick={(e) => {
          if (!isAtRoom()) return
          e.stopPropagation()
          onEnter()
        }}
        onPointerOver={() => {
          const el = document.querySelector('.lp-canvas canvas')
          if (el && isAtRoom()) el.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          const el = document.querySelector('.lp-canvas canvas')
          if (el) el.style.cursor = 'grab'
        }}
      >
      <mesh position={[DISPLAY.cx, DISPLAY.cy, -1770]} castShadow>
        <boxGeometry args={[1600, 760, 60]} />
        {darkMat('#0b0d12', 0.45)}
      </mesh>
      <mesh position={[DISPLAY.cx, DISPLAY.cy, DISPLAY.frontZ]}>
        <planeGeometry args={[DISPLAY.w, DISPLAY.h]} />
        <meshBasicMaterial map={wallpaper} toneMapped={false} />
      </mesh>
      <mesh position={[DISPLAY.cx + 760, DISPLAY.cy - 340, DISPLAY.frontZ]}>
        <circleGeometry args={[6, 12]} />
        <meshBasicMaterial color="#59f0a2" />
      </mesh>
      </group>
      </Interactive>

      {/* ---------------- audio interface (Volt 2), centred under the
          monitor ---------------- */}
      <AudioInterface position={[0, 2, -1640]} />

      {/* ---------------- keyboard · mouse (kenney) · mousepad · headphones --------------- */}
      <Kenney name="computerKeyboard" position={[-352, 0, -953]} dark />
      {/* mousepad: desk-mat size, from just right of the keyboard out
          toward the desk's right edge; the mouse rests on it */}
      <RoundedBox args={[800, 5, 540]} radius={2.4} smoothness={2} position={[845, 2.5, -1050]} receiveShadow>
        <meshStandardMaterial color="#17181b" roughness={0.95} />
      </RoundedBox>
      <Kenney name="computerMouse" position={[600, 5, -993]} dark />
      {/* headphones lying flat to the left of the keyboard */}
      <Headphones position={[-820, 0, -1000]} rotation={[0, 0.35, 0]} />

      {/* ---------------- speakers flanking the monitor, on 15° risers -- */}
      <Speaker position={[-1235, 0, -1433]} />
      <Speaker position={[865, 0, -1433]} />

      {/* ---------------- room dressing (kenney) ------------------------ */}
      {/* click the lamp to switch day ↔ night */}
      <Interactive>
        <FloorLamp position={[-2520, -960, 1780]} rotation={[0, 0.68, 0]} mood={mood} onToggle={onToggleMood} />
      </Interactive>
      {/* 1.5×, pulled off the back wall so the stand's rear leg clears it */}
      <HeadlessGuitar position={[2350, -960, -1450]} rotation={[0, -0.65, 0]} scale={1.5} />
      {/* Togo-style lounge chair at 1.5×, set diagonally in the front-left
          of the room facing across toward the desk side — pushed as far
          forward as the floor's front edge allows, clear of the left wall,
          lamp and desk chair */}
      <group position={[-1370, -960, 760]} rotation={[0, 2.115, 0]} scale={1.5}>
        <LoungeChair />
        {/* the cat, loafing on the seat (couch-local units, so undo the
            couch's 1.5× to keep her cat-sized) */}
        {/* turned across the seat to face the opening camera */}
        <Cat position={[0, 445, -90]} rotation={[0, -1.75, 0]} scale={1 / 1.5} />
      </group>
      {/* desk chair at 1.5× — set back so the raised armrests clear the
          desk's front edge (z=-700) */}
      <OfficeChair position={[140, -960, -120]} scale={1.5} />

      {/* the story's screen: real DOM, attached to the ultrawide's display */}
      <Html
        transform
        distanceFactor={400 / HTML_SCALE}
        occlude="raycast"
        position={[DISPLAY.cx, DISPLAY.cy, DISPLAY.frontZ + 1]}
        zIndexRange={[5, 0]}
      >
          <div
            className="lp-screen-html"
            onPointerEnter={() => {
              screenHover.current = true
            }}
            onPointerLeave={() => {
              screenHover.current = false
            }}
            // the live screen covers the display: in the room view a click
            // anywhere on it (links included) flies in instead
            onClickCapture={(e) => {
              if (!isAtRoom()) return
              e.preventDefault()
              e.stopPropagation()
              onEnter()
            }}
          >
            <div className="lp-screen">
              <div className="lp-apps">
                <TerminalApp
                  basics={data.basics}
                  projects={data.projects}
                  work={data.work}
                  subscribe={subscribe}
                  pages={[0, 2, 3]}
                  onOpen={onOpen}
                />
                <BrowserApp data={contributions} subscribe={subscribe} />
                <TerminalApp basics={data.basics} subscribe={subscribe} pages={[4]} />
              </div>
              <div className="lp-detail">
                <div className="lp-detail-pane" data-d="waypoint">
                  <WaypointApp onReturn={onClose} />
                </div>
                <div className="lp-detail-pane" data-d="getbud">
                  <GetbudApp onReturn={onClose} />
                </div>
                <div className="lp-detail-pane" data-d="nebula">
                  <ObsidianApp subscribe={subscribe} onReturn={onClose} />
                </div>
                <div className="lp-detail-pane" data-d="kube-cats">
                  <TerminalApp basics={data.basics} subscribe={subscribe} pages={[1]} onReturn={onClose} />
                </div>
              </div>
            </div>
          </div>
      </Html>
    </Suspense>
  )
}

export default World3D
