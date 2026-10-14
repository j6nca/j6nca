import React, { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import TerminalApp from '../TerminalApp'
import BrowserApp from '../BrowserApp'
import WaypointApp from '../WaypointApp'
import GetbudApp from '../GetbudApp'
import ObsidianApp from '../ObsidianApp'

/*
 * The three.js world behind the story: the room (standing desk, rack,
 * peripherals) and the laptop, all in world units where 1 unit = 1 "CSS px"
 * of the old set, y-up, z toward the viewer, the laptop hinge at the origin
 * and the desk surface at y=0. The floor sits at y=-960 (desk height).
 *
 * Furniture props are CC0 placeholder models from Kenney's furniture kit
 * (https://kenney.nl, mirrored at github.com/shorepine/kenney), fetched
 * from /public/models and scaled ×2500 to match the laptop's proportions
 * — swap the .glb files there for final models later. The rack, DAC,
 * headphone stand, mousepad and the laptop itself are procedural.
 *
 * LaptopScene still owns the beat stepper and publishes frame state through
 * `subscribe`; World3D stores the latest state in a ref and drives the
 * camera, the lid hinge and the rack LEDs from it inside useFrame — no
 * React re-renders per frame. The screen content stays real DOM (drei's
 * <Html transform>), so every app keeps working unchanged.
 */

const DEG = Math.PI / 180
const FOV = 42
const K = 2500 // kenney metres → world units

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const seg = (v, a, b) => clamp((v - a) / (b - a))
const smooth = (u) => {
  u = clamp(u)
  return u * u * (3 - 2 * u)
}
const lerp = (a, b, u) => a + (b - a) * u

/* Camera poses as { look, dir } — dir is the unit vector *from* the camera
 * *to* the look target; distance is derived per-frame from the viewport so
 * the framing scales like the old sDesk/sRoom/sKeys formulas did. */
const POSE_ROOM = { look: [-420, 120, -1650], dir: [-0.284, -0.452, -0.838] }
// keyboard detail dives onto the external keyboard on the desk
const POSE_KEYS = { look: [0, 30, -1100], dir: [0, -0.88, -0.475] }

// view height in world units at a given camera distance (fov is fixed)
const viewH = (d) => 2 * d * Math.tan((FOV / 2) * DEG)

/* ------------------------------------------------------------------ *
 * Procedural textures (canvas → CanvasTexture): monitor
 * wallpaper — no binary assets to ship.
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

const makeWallpaper = () => {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 420
  const g = c.getContext('2d')
  const bg = g.createLinearGradient(0, 0, 0, 420)
  bg.addColorStop(0, '#0a0e18')
  bg.addColorStop(1, '#05070c')
  g.fillStyle = bg
  g.fillRect(0, 0, 1024, 420)
  // horizon line + soft glow
  const glow = g.createRadialGradient(512, 470, 40, 512, 470, 420)
  glow.addColorStop(0, 'rgba(66,165,245,0.22)')
  glow.addColorStop(1, 'rgba(66,165,245,0)')
  g.fillStyle = glow
  g.fillRect(0, 0, 1024, 420)
  g.fillStyle = 'rgba(120,180,255,0.25)'
  g.fillRect(0, 231, 1024, 2)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/* ------------------------------------------------------------------ *
 * Kenney placeholder models
 * ------------------------------------------------------------------ */
const Kenney = ({ name, position, rotation, color, sx = K, sy = K, sz = K }) => {
  const { scene } = useGLTF(`/models/${name}.glb`)
  const obj = useMemo(() => {
    const o = scene.clone(true)
    o.traverse((m) => {
      if (m.isMesh) {
        m.castShadow = true
        m.receiveShadow = true
        if (color) {
          m.material = m.material.clone()
          m.material.color.set(color)
        }
      }
    })
    return o
  }, [scene, color])
  return <primitive object={obj} position={position} rotation={rotation} scale={[sx, sy, sz]} />
}

;['computerKeyboard', 'computerMouse', 'lampRoundFloor', 'plantSmall2', 'chairDesk', 'speakerSmall'].forEach((n) => useGLTF.preload(`/models/${n}.glb`))

/* the ultrawide's display area: the DOM screen (800×500, bezel-free) is
   scaled to fill the display height, letterboxed on the wallpaper */
const DISPLAY = { cx: 0, cy: 480, frontZ: -1739, w: 1560, h: 640 }
const HTML_SCALE = DISPLAY.h / 500

/* ------------------------------------------------------------------ *
 * Rack tablet: a small live uptime display mounted on the rack's door
 * ------------------------------------------------------------------ */
const pad = (n, w = 2) => String(n).padStart(w, '0')

const RackTablet = () => {
  const [up, setUp] = useState(null)
  useEffect(() => {
    // uptime since Sept 1998 (day 1 — adjust if you want an exact date)
    const fmt = () => {
      const now = new Date()
      const months = now.getFullYear() * 12 + now.getMonth() - (1998 * 12 + 8)
      const y = Math.floor(months / 12)
      const mo = months % 12
      const d = now.getDate() - 1
      const h = now.getHours()
      const m = now.getMinutes()
      const s = now.getSeconds()
      return `${y}y ${pad(mo)}m ${pad(d)}d ${pad(h)}:${pad(m)}:${pad(s)}`
    }
    setUp(fmt())
    const iv = setInterval(() => setUp(fmt()), 1000)
    return () => clearInterval(iv)
  }, [])
  const prismGeo = useMemo(() => {
    // triangular cross-section in (z, y): front face 260 tall at z=0,
    // back edge at z=-150 mid-height, extruded 840 along x (then centred
    // along the extrusion axis so it sits directly behind the display)
    const shape = new THREE.Shape([
      new THREE.Vector2(0, -130),
      new THREE.Vector2(0, 130),
      new THREE.Vector2(-150, 0),
    ])
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 840, bevelEnabled: false })
    geo.translate(0, 0, -420) // extrusion runs 0..840 in local z; centre it
    return geo
  }, [])

  return (
    <group position={[-2050, 632, -1080]} rotation={[-10 * DEG, 0, 0]}>
      {/* closed triangular-prism body — the display is its front face */}
      <mesh geometry={prismGeo} rotation={[0, -Math.PI / 2, 0]} castShadow>
        <meshStandardMaterial color="#14171c" roughness={0.5} metalness={0.35} />
      </mesh>
      <Html transform distanceFactor={400} zIndexRange={[4, 0]}>
        <div className="rp-tablet mono">
          <div className="rp-tablet-top">
            <span className="rp-tablet-h">uptime</span>
            <span className="rp-tablet-d">since 1998-09</span>
          </div>
          <span className="rp-tablet-t">{up ?? '…'}</span>
        </div>
      </Html>
    </group>
  )
}

/* ------------------------------------------------------------------ *
 * Corner floor lamp — click it to toggle the light
 * ------------------------------------------------------------------ */
const Lamp = () => {
  // imperative toggle: R3F prop-diffing through suspense boundaries proved
  // unreliable here in dev, so refs flip the light + bulb directly
  const lightRef = useRef(null)
  const bulbRef = useRef(null)
  const on = useRef(true)
  const toggle = (e) => {
    e.stopPropagation()
    on.current = !on.current
    if (lightRef.current) lightRef.current.visible = on.current
    if (bulbRef.current) {
      bulbRef.current.material.color.set(on.current ? '#ffcf9e' : '#23262c')
    }
  }
  const hover = (v) => () => {
    const el = document.querySelector('.lp-canvas canvas')
    if (el) el.style.cursor = v ? 'pointer' : 'grab'
  }
  return (
    <group onClick={toggle} onPointerOver={hover(true)} onPointerOut={hover(false)}>
      <Kenney name="lampRoundFloor" position={[-2620, -960, 1850]} color="#5a5e66" />
      {/* bulb */}
      <mesh ref={bulbRef} position={[-2470, 1020, 1700]}>
        <sphereGeometry args={[45, 12, 12]} />
        <meshBasicMaterial color="#ffcf9e" toneMapped={false} />
      </mesh>
      <pointLight
        ref={lightRef}
        position={[-2450, 950, 1780]}
        intensity={450000}
        color="#ffb46e"
        distance={5000}
        decay={2}
      />
    </group>
  )
}

/* ------------------------------------------------------------------ *
 * Networking cables: white runs out of the rack's front face, down to
 * the floor and under the desk (a row of C-curves seen from the side),
 * with little glowing "packets" that travel along them now and then.
 * ------------------------------------------------------------------ */
const CABLE_COUNT = 7
const PACKET_POOL = 12

const NetworkCables = () => {
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
      const target = 80000 + 400000 * Math.min(1, influence)
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
 * World
 * ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ *
 * Floor guitar stand holding a strat-style electric: body and pickguard
 * are extruded bezier outlines (proper double-cutaway silhouette), maple
 * neck with fretboard, tilted headstock with tuners.
 * ------------------------------------------------------------------ */
const stratShape = () => {
  // front view: x across, y up; bottom of body at y=0, neck pocket ~y=556
  const sh = new THREE.Shape()
  sh.moveTo(0, 0)
  // right lower bout
  sh.bezierCurveTo(150, 0, 238, 100, 238, 200)
  sh.bezierCurveTo(238, 270, 205, 305, 165, 335)
  // right cutaway horn (small)
  sh.bezierCurveTo(125, 375, 128, 420, 168, 455)
  sh.bezierCurveTo(195, 480, 165, 520, 62, 556)
  // neck pocket
  sh.lineTo(-62, 556)
  // left horn (long)
  sh.bezierCurveTo(-130, 570, -172, 575, -190, 595)
  sh.bezierCurveTo(-202, 602, -186, 540, -160, 470)
  sh.bezierCurveTo(-150, 435, -125, 425, -105, 428)
  // left waist + lower bout
  sh.bezierCurveTo(-130, 360, -205, 305, -238, 270)
  sh.bezierCurveTo(-238, 260, -238, 210, -238, 200)
  sh.bezierCurveTo(-238, 100, -150, 0, 0, 0)
  return sh
}

const GuitarStand = () => {
  const bodyGeo = useMemo(() => {
    const geo = new THREE.ExtrudeGeometry(stratShape(), { depth: 90, bevelEnabled: false, curveSegments: 24 })
    geo.translate(0, 0, -45)
    return geo
  }, [])
  const guardGeo = useMemo(() => {
    const geo = new THREE.ExtrudeGeometry(stratShape(), { depth: 12, bevelEnabled: false, curveSegments: 24 })
    geo.scale(0.76, 0.78, 1)
    geo.translate(0, 70, 44)
    return geo
  }, [])

  return (
    <group position={[2350, -960, -1650]} rotation={[0, -0.65, 0]}>
      {/* A-frame stand: front + back legs meet at the neck yoke */}
      <mesh position={[0, 430, 90]} rotation={[0.3, 0, 0]} castShadow>
        <boxGeometry args={[40, 900, 40]} />
        <meshStandardMaterial color="#1a1d22" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, 430, -90]} rotation={[-0.3, 0, 0]} castShadow>
        <boxGeometry args={[40, 900, 40]} />
        <meshStandardMaterial color="#1a1d22" roughness={0.5} metalness={0.4} />
      </mesh>
      {/* body cradle */}
      <mesh position={[0, 70, 210]} castShadow>
        <boxGeometry args={[300, 30, 140]} />
        <meshStandardMaterial color="#23262c" roughness={0.7} />
      </mesh>
      {/* neck yoke */}
      <mesh position={[0, 870, 0]} castShadow>
        <boxGeometry args={[170, 40, 90]} />
        <meshStandardMaterial color="#23262c" roughness={0.7} />
      </mesh>

      {/* the guitar, leaning back into the yoke */}
      <group rotation={[-0.18, 0, 0]}>
        {/* body + pickguard */}
        <mesh geometry={bodyGeo} position={[0, 20, 0]} castShadow>
          <meshStandardMaterial color="#14161a" roughness={0.35} metalness={0.25} />
        </mesh>
        <mesh geometry={guardGeo} position={[0, 20, 0]}>
          <meshStandardMaterial color="#e8e6df" roughness={0.5} />
        </mesh>
        {/* three single-coil pickups */}
        {[190, 305, 370].map((py) => (
          <mesh key={py} position={[0, py, 60]}>
            <boxGeometry args={[210, 16, 34]} />
            <meshStandardMaterial color="#e8e6df" roughness={0.5} />
          </mesh>
        ))}
        {/* controls */}
        {[150, 225].map((ky) => (
          <mesh key={ky} position={[105, ky, 60]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[22, 22, 20, 16]} />
            <meshStandardMaterial color="#3a3d42" roughness={0.4} metalness={0.6} />
          </mesh>
        ))}
        {/* bridge */}
        <mesh position={[0, 95, 52]}>
          <boxGeometry args={[220, 30, 24]} />
          <meshStandardMaterial color="#787d85" roughness={0.3} metalness={0.8} />
        </mesh>
        {/* maple neck */}
        <mesh position={[0, 1180, -10]} castShadow>
          <boxGeometry args={[80, 50, 1250]} />
          <meshStandardMaterial color="#c9a878" roughness={0.6} />
        </mesh>
        {/* fretboard */}
        <mesh position={[0, 1200, 17]}>
          <planeGeometry args={[68, 1230]} />
          <meshStandardMaterial color="#2a2118" roughness={0.7} />
        </mesh>
        {/* strings */}
        {[-25, -15, -5, 5, 15, 25].map((ix) => (
          <mesh key={ix} position={[ix, 950, 50]}>
            <boxGeometry args={[2.5, 1710, 2]} />
            <meshStandardMaterial color="#c8ccd2" roughness={0.3} metalness={0.9} />
          </mesh>
        ))}
        {/* headstock, tilted back, with 6 tuners */}
        <group position={[0, 1900, -45]} rotation={[-0.18, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[110, 45, 290]} />
            <meshStandardMaterial color="#14161a" roughness={0.4} metalness={0.25} />
          </mesh>
          {[-25, -15, -5, 5, 15, 25].map((tx) => (
            <mesh key={tx} position={[tx, 0, 30]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[9, 9, 40, 12]} />
              <meshStandardMaterial color="#c8ccd2" roughness={0.3} metalness={0.85} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  )
}

const World3D = ({ subscribe, panRef, data, contributions, onOpen, onClose }) => {
  const stateRef = useRef(null)
  const ledRefs = useRef([])
  const { camera, size, gl } = useThree()
  // drag-to-pan state is shared with LaptopScene (horizontal trackpad
  // swipes feed it too); yaw eases toward target here each frame
  const pan = panRef

  const wallpaper = useMemo(() => makeWallpaper(), [])
  const woodFloor = useMemo(() => makeWoodFloor(), [])

  // pointer drag on the canvas pans the view (horizontal only — vertical
  // gestures stay reserved for the story stepper)
  useEffect(() => {
    const el = gl.domElement
    let dragging = false
    let lastX = 0
    const onDown = (e) => {
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
  }, [gl])

  useEffect(() => subscribe((s) => {
    stateRef.current = s
  }), [subscribe])

  // Match the opening pose before the first painted frame, so a refresh
  // never flashes the (stale, closer) default camera position.
  useLayoutEffect(() => {
    const sRoom = Math.min(size.width / 15600, size.height / 12000)
    // include the default opening framing so the first painted frame matches
    const dRoom = (size.height / sRoom / viewH(1)) * 0.8
    camera.position.set(
      POSE_ROOM.look[0] - POSE_ROOM.dir[0] * dRoom,
      POSE_ROOM.look[1] - POSE_ROOM.dir[1] * dRoom,
      POSE_ROOM.look[2] - POSE_ROOM.dir[2] * dRoom,
    )
    camera.lookAt(POSE_ROOM.look[0], POSE_ROOM.look[1], POSE_ROOM.look[2])
  }, [])

  useFrame(() => {
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
    const sRoom = Math.min(vw / 15600, vh / 12000)
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

    let pos = mix3(posOf(POSE_ROOM, dRoom * zScale), posScreen, u0)
    let look = mix3(POSE_ROOM.look, screenLook, u0)
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
      {/* ---------------- cozy lighting ---------------- */}
      <ambientLight intensity={0.7} />
      <hemisphereLight args={['#4a566e', '#141008', 1.0]} />
      {/* warm desk lamp, from above-right */}
      <spotLight
        position={[420, 1600, 1000]}
        angle={0.75}
        penumbra={1}
        intensity={3.2}
        color="#ffd9a8"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      {/* soft cool fill so the shadows aren't crushed */}
      <directionalLight position={[-300, 800, 2600]} intensity={0.35} color="#cfe0ff" />

      {/* monitor LED wash (physical units: ~0.9 at the wall behind it) */}
      <pointLight position={[0, 420, -1350]} intensity={500000} color="#4a90d9" distance={3000} decay={2} />

      {/* ---------------- shell ---------------- */}
      <mesh position={[0, -960, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5600, 4200]} />
        <meshStandardMaterial map={woodFloor} roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh position={[0, 650, -2050]} receiveShadow>
        <planeGeometry args={[5600, 3300]} />
        <meshStandardMaterial color="#b0aca3" roughness={1} />
      </mesh>
      <mesh position={[-2800, 650, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[4200, 3300]} />
        <meshStandardMaterial color="#b0aca3" roughness={1} />
      </mesh>
      {/* rug */}
      <mesh position={[-100, -959, -1050]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2400, 1200]} />
        <meshStandardMaterial color="#2b3040" roughness={1} />
      </mesh>

      {/* ---------------- standing desk: wooden top, black frame -------- */}
      {/* maple top */}
      <mesh position={[0, -10, -1350]} castShadow receiveShadow>
        <boxGeometry args={[2600, 20, 1300]} />
        <meshStandardMaterial color="#7c5730" roughness={0.75} metalness={0.05} />
      </mesh>
      {/* telescoping legs: lower column + slimmer riser + foot */}
      {[-1050, 1050].map((x) => (
        <group key={x}>
          <mesh position={[x, -470, -1410]} castShadow>
            <boxGeometry args={[130, 900, 130]} />
            {darkMat('#101318', 0.45)}
          </mesh>
          <mesh position={[x, -350, -1410]} castShadow>
            <boxGeometry args={[90, 520, 90]} />
            {darkMat('#181c24', 0.4)}
          </mesh>
          <mesh position={[x, -950, -1410]} castShadow>
            <boxGeometry args={[320, 20, 160]} />
            {darkMat('#101318', 0.45)}
          </mesh>
        </group>
      ))}
      {/* crossbar tying the feet together */}
      <mesh position={[0, -890, -1410]} castShadow>
        <boxGeometry args={[1980, 70, 70]} />
        {darkMat('#101318', 0.45)}
      </mesh>

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

      <NetworkCables />

      {/* wooden cap on top of the rack — the tablet sits on it */}
      <mesh position={[-2050, 511, -1545]} castShadow receiveShadow>
        <boxGeometry args={[1250, 30, 990]} />
        <meshStandardMaterial color="#7c5730" roughness={0.75} metalness={0.05} />
      </mesh>

      <RackTablet />

      {/* ---------------- ultrawide on a gas-spring arm --------------- */}
      {/* arm: post on the desk + horizontal spring segment behind the panel */}
      <mesh position={[60, 200, -1830]} castShadow>
        <boxGeometry args={[44, 400, 26]} />
        {darkMat('#14161c', 0.5)}
      </mesh>
      <mesh position={[-120, 485, -1820]} castShadow>
        <boxGeometry args={[480, 26, 24]} />
        {darkMat('#14161c', 0.5)}
      </mesh>
      {/* cabinet + display: hosts the story's DOM screen */}
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

      {/* ---------------- DAC under the monitor (procedural) ------------ */}
      <mesh position={[-450, -35, -1660]} castShadow>
        <boxGeometry args={[360, 70, 90]} />
        {darkMat('#1d2129', 0.35)}
      </mesh>
      <mesh position={[-390, -35, -1615]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[17, 17, 8, 24]} />
        {darkMat('#2a2f3a', 0.3)}
      </mesh>

      {/* ---------------- keyboard · pad · mouse (kenney) --------------- */}
      <mesh position={[140, -1, -1090]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1120, 520]} />
        <meshStandardMaterial color="#111319" roughness={0.9} />
      </mesh>
      <Kenney name="computerKeyboard" position={[-352, 0, -953]} />
      <Kenney name="computerMouse" position={[600, 0, -993]} />

      {/* ---------------- speakers flanking the monitor ---------------- */}
      <Kenney name="speakerSmall" position={[-1235, 0, -1433]} />
      <Kenney name="speakerSmall" position={[865, 0, -1433]} />
      <Kenney name="plantSmall2" position={[1150, 0, -1650]} />

      {/* ---------------- headphone stand (procedural) ------------------- */}
      <mesh position={[840, 8, -1685]} castShadow>
        <cylinderGeometry args={[60, 70, 16, 24]} />
        {darkMat('#15181f', 0.5)}
      </mesh>
      <mesh position={[842, 175, -1690]} castShadow>
        <cylinderGeometry args={[14, 14, 334, 16]} />
        {darkMat('#1c2029', 0.5)}
      </mesh>
      <mesh position={[842, 330, -1690]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[120, 6, 12, 40, Math.PI]} />
        {darkMat('#1c2029', 0.5)}
      </mesh>
      {[745, 939].map((x) => (
        <group key={x} position={[x, 346, -1690]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[38, 38, 76, 24]} />
            {darkMat('#232833', 0.55)}
          </mesh>
          <mesh position={[x < 842 ? 22 : -22, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[26, 26, 74, 24]} />
            {darkMat('#0a0c10', 0.9)}
          </mesh>
        </group>
      ))}

      {/* ---------------- room dressing (kenney) ------------------------ */}
      <Lamp />
      <GuitarStand />
      {/* Togo-style lounge couch: low, slouchy, rolled arms, mustard
          fabric, angled facing diagonally away from the corner lamp */}
      <group position={[-1860, -960, 900]} rotation={[0, 2.5, 0]}>
        {/* deep slouchy seat */}
        <mesh position={[0, 130, 60]} castShadow receiveShadow>
          <boxGeometry args={[1330, 260, 1300]} />
          <meshStandardMaterial color="#c39d2d" roughness={1} />
        </mesh>
        {/* seat cushion */}
        <mesh position={[0, 320, 120]} castShadow>
          <boxGeometry args={[1220, 120, 1080]} />
          <meshStandardMaterial color="#d0ac47" roughness={1} />
        </mesh>
        {/* leaning backrest */}
        <mesh position={[0, 530, -440]} rotation={[-0.35, 0, 0]} castShadow>
          <boxGeometry args={[1330, 640, 330]} />
          <meshStandardMaterial color="#b8922a" roughness={1} />
        </mesh>
        {/* rolled arms along the length */}
        {[-665, 665].map((ax) => (
          <mesh key={ax} position={[ax, 320, -10]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[140, 140, 830, 18]} />
            <meshStandardMaterial color="#b8922a" roughness={1} />
          </mesh>
        ))}
        {/* lumbar pillow */}
        <mesh position={[190, 400, -260]} rotation={[-0.35, 0.2, 0]} castShadow>
          <boxGeometry args={[420, 180, 160]} />
          <meshStandardMaterial color="#8d9aa8" roughness={1} />
        </mesh>
      </group>
      {/* desk chair: centred on the keyboard, pulled up close to the desk
          (the model's own centre is offset, so the position compensates) */}
      <Kenney name="chairDesk" position={[417, -960, -642]} rotation={[0, Math.PI, 0]} color="#5a5e66" />

      {/* the story's screen: real DOM, attached to the ultrawide's display */}
      <Html
        transform
        distanceFactor={400 / HTML_SCALE}
        occlude="raycast"
        position={[DISPLAY.cx, DISPLAY.cy, DISPLAY.frontZ + 1]}
        zIndexRange={[5, 0]}
      >
          <div className="lp-screen-html">
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
