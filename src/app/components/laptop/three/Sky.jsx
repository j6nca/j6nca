import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { createPortal, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { canvasTexture, rng } from './props/shapes'
import { FOV, DEG, pointInOpeningShot, roomDistance } from './pose'

/*
 * Outdoor half of the day/night mood (World3D's MOOD has the indoor
 * lights): a backdrop of 3D clouds drifting behind the floating room, the
 * sun — or by night the moon — in the sky up-left of the room, and the
 * directional light that comes in through the window. Everything reads
 * `mood.current.t` (0 day → 1 night) in its own useFrame.
 */

// The light: from up and out past the left wall, on a line through the
// window to a spot on the floor, so the window throws its patch of light.
// The visible sun/moon disc is placed separately (see SunMoon): from the
// opening shot's corner-on angle anything out past the left wall would be
// hidden behind the room, and the disc doubles as the day/night toggle.
export const SUN_TARGET = new THREE.Vector3(-1000, -960, -200)
// the point in the window opening the sun shines through (its lower part)
export const WINDOW_CENTRE = new THREE.Vector3(-2800, 550, 0)
export const SUN_DIR = new THREE.Vector3().subVectors(SUN_TARGET, WINDOW_CENTRE).normalize() // light travel
export const SUN_POS = new THREE.Vector3().copy(SUN_TARGET).addScaledVector(SUN_DIR, -4800)

const lerp = (a, b, t) => a + (b - a) * t
const DAY_LIGHT = new THREE.Color('#ffe7bf')
const NIGHT_LIGHT = new THREE.Color('#a9bcff')

// soft radial glow for the sun/moon halo
const makeGlow = () =>
  canvasTexture(256, 256, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2)
    r.addColorStop(0, 'rgba(255,255,255,1)')
    r.addColorStop(0.18, 'rgba(255,255,255,0.55)')
    r.addColorStop(0.45, 'rgba(255,255,255,0.12)')
    r.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = r
    g.fillRect(0, 0, w, w)
  })

/* ------------------------------------------------------------------ *
 * Sun / moon + the light through the window
 * ------------------------------------------------------------------ */
// is a solid room object (walls, furniture: renderOrder >= 0) in front of
// the sky along this click's ray? R3F only raycasts objects with handlers,
// so it can't tell us — check the whole scene ourselves.
const occludedSkyClick = (e, scene) => {
  const rc = new THREE.Raycaster(e.ray.origin, e.ray.direction, 0, e.distance - 1)
  return rc
    .intersectObjects(scene.children, true)
    .some(({ object }) => object.isMesh && object.visible && object.renderOrder >= 0 && object.material?.depthWrite !== false)
}

// where the disc sits in the opening shot (NDC), and how big it looks
const DISC_AT = { wide: [-0.62, 0.6], tall: [-0.55, 0.5] }
const DISC_BEYOND = 20000 // past the look target, well behind the room
const DISC_NDC_R = 0.035 // apparent radius, as a fraction of the half-height

export const SunMoon = ({ mood, onToggle, shadowSize = 2048 }) => {
  const { scene, size } = useThree()
  // park the disc in open sky for this viewport's opening framing, sized
  // so it looks the same however far out that puts it
  const disc = useMemo(() => {
    const [nx, ny] = size.width < size.height ? DISC_AT.tall : DISC_AT.wide
    const pos = pointInOpeningShot(size.width, size.height, nx, ny, DISC_BEYOND)
    const dist = roomDistance(size.width, size.height) + DISC_BEYOND
    const r = DISC_NDC_R * dist * Math.tan((FOV / 2) * DEG)
    return { pos: pos.toArray(), scale: r / 240 }
  }, [size.width, size.height])
  const glow = useMemo(() => makeGlow(), [])
  const light = useRef(null)
  const sun = useRef(null)
  const sunGlow = useRef(null)
  const moon = useRef(null)
  const moonGlow = useRef(null)
  const target = useMemo(() => new THREE.Object3D(), [])
  const shown = useRef(-1)

  useLayoutEffect(() => {
    if (light.current) light.current.target = target
  }, [target])

  useFrame(() => {
    const t = mood.current.t
    if (t === shown.current) return
    shown.current = t
    const day = 1 - t
    if (light.current) {
      // warm sun by day, a faint blue moonbeam by night
      light.current.intensity = lerp(3.4, 0.55, t)
      light.current.color.lerpColors(DAY_LIGHT, NIGHT_LIGHT, t)
    }
    // the sun sinks and fades as the moon rises in its place
    if (sun.current) {
      sun.current.visible = day > 0.01
      sun.current.scale.setScalar(Math.max(0.01, day))
    }
    if (sunGlow.current) sunGlow.current.material.opacity = 0.9 * day
    if (moon.current) {
      moon.current.visible = t > 0.01
      moon.current.scale.setScalar(Math.max(0.01, t))
    }
    if (moonGlow.current) moonGlow.current.material.opacity = 0.35 * t
  })

  return (
    <group>
      <primitive object={target} position={SUN_TARGET.toArray()} />
      <directionalLight
        ref={light}
        position={SUN_POS.toArray()}
        castShadow
        shadow-mapSize-width={shadowSize}
        shadow-mapSize-height={shadowSize}
        shadow-camera-left={-3600}
        shadow-camera-right={3600}
        shadow-camera-top={3600}
        shadow-camera-bottom={-3600}
        shadow-camera-near={100}
        shadow-camera-far={14000}
        shadow-bias={-0.0004}
        shadow-normalBias={2}
      />
      {/* sky pass, drawn in renderOrder: sun/moon discs, their glows, then
          the clouds (see Clouds). None of them write depth, so a cloud
          drifting past paints over the sun/moon, while the room (opaque,
          drawn earlier, depth-written) still hides all three behind it. */}
      <group
        position={disc.pos}
        scale={disc.scale}
        // click the sun or moon to switch day ↔ night, like the lamp — a
        // deliberately unmarked easter egg (no outline/marker, just the cursor)
        onClick={(e) => {
          if (occludedSkyClick(e, scene)) return
          e.stopPropagation()
          onToggle?.()
        }}
        onPointerOver={(e) => {
          const el = document.querySelector('.lp-canvas canvas')
          if (el && !occludedSkyClick(e, scene)) el.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          const el = document.querySelector('.lp-canvas canvas')
          if (el) el.style.cursor = 'grab'
        }}
      >
        {/* invisible hit target, a little larger than the disc so the sun
            and moon are easy to click */}
        <mesh renderOrder={-30}>
          <sphereGeometry args={[420, 16, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
        <mesh ref={sun} renderOrder={-30}>
          <sphereGeometry args={[240, 32, 16]} />
          <meshBasicMaterial color="#fff2c2" toneMapped={false} transparent depthWrite={false} />
        </mesh>
        <sprite ref={sunGlow} scale={[2600, 2600, 1]} renderOrder={-25} raycast={() => null}>
          <spriteMaterial map={glow} color="#ffd27a" transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
        <mesh ref={moon} renderOrder={-30}>
          <sphereGeometry args={[190, 32, 16]} />
          <meshBasicMaterial color="#e9eef8" toneMapped={false} transparent depthWrite={false} />
        </mesh>
        <sprite ref={moonGlow} scale={[1500, 1500, 1]} renderOrder={-25} raycast={() => null}>
          <spriteMaterial map={glow} color="#9fb6ff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ *
 * Clouds: a backdrop, not part of the room. The layer is parented to the
 * camera and parked far out ahead of it, so whatever the camera does
 * (orbit, zoom, dolly) the room stays in front, like a sky. It renders in
 * the transparent pass right after the sun/moon (renderOrder) without
 * writing depth — passing clouds cover the sun/moon, the room covers both.
 * One InstancedMesh holds every puff; clouds drift across the view and
 * wrap, shrinking away at the wrap so nothing pops.
 * ------------------------------------------------------------------ */
const CLOUD_DIST = 17000 // layout depth in front of the camera, before DEPTH_K
const DEPTH_K = 7
const SPAN = 30000 // drift wrap width — wider than the view at that depth
const DAY_CLOUD = new THREE.Color('#ffffff')
const NIGHT_CLOUD = new THREE.Color('#5d6a8c')

const buildClouds = () => {
  const r = rng(42)
  const clouds = []
  for (let c = 0; c < 14; c++) {
    // spread over the view at the backdrop's depth (camera looks down -z)
    const home = new THREE.Vector3((r() - 0.5) * SPAN, -6200 + r() * 12400, -CLOUD_DIST + (r() - 0.5) * 2400)
    const size = 700 + r() * 1300
    const stretch = 1 + r() * 0.9 // some long and wispy, some round and tall
    const puffs = []
    const n = 5 + Math.floor(r() * 8)
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1) - 0.5
      const rad = size * (0.32 + r() * 0.32) * (1 - Math.abs(u) * 0.6)
      puffs.push({
        x: u * size * 2.1 * stretch + (r() - 0.5) * size * 0.3,
        // puffs rise toward the middle; the bottom stays flat-ish
        y: rad * 0.35 + (1 - Math.abs(u) * 2) * size * 0.18 * r(),
        z: (r() - 0.5) * size * 0.7,
        rad,
      })
    }
    // far puffs first: with no depth writes, draw order is what layers them
    puffs.sort((a, b) => a.z - b.z)
    // ~1–2 minutes to cross the view
    clouds.push({ home, puffs, speed: 160 + r() * 160, phase: r() * SPAN })
  }
  return clouds.sort((a, b) => a.home.z - b.home.z)
}

export const Clouds = ({ mood }) => {
  const { camera, scene } = useThree()
  const clouds = useMemo(() => buildClouds(), [])
  const count = clouds.reduce((s, c) => s + c.puffs.length, 0)
  const ref = useRef(null)
  const mat = useRef(null)
  const m = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const v = useMemo(() => new THREE.Vector3(), [])
  const sc = useMemo(() => new THREE.Vector3(), [])
  const shown = useRef(-1)

  // the default camera isn't in the scene graph; add it so its children
  // (the cloud layer, portalled below) render and get lit
  useEffect(() => {
    scene.add(camera)
    return () => {
      scene.remove(camera)
    }
  }, [camera, scene])

  useFrame((state) => {
    const time = state.clock.elapsedTime
    let k = 0
    for (const c of clouds) {
      const off = ((time * c.speed + c.phase) % SPAN) - SPAN / 2
      const edge = Math.min(1, (SPAN / 2 - Math.abs(off)) / 3000) // fade at the wrap
      for (const pf of c.puffs) {
        v.set(c.home.x + off + pf.x * edge, c.home.y + pf.y * edge, c.home.z + pf.z * edge)
        sc.set(pf.rad * 1.15, pf.rad * 0.78, pf.rad).multiplyScalar(edge)
        m.compose(v, q, sc)
        ref.current.setMatrixAt(k++, m)
      }
    }
    ref.current.instanceMatrix.needsUpdate = true

    const t = mood.current.t
    if (mat.current && t !== shown.current) {
      shown.current = t
      mat.current.color.lerpColors(DAY_CLOUD, NIGHT_CLOUD, t)
      // a touch of self-light keeps daytime clouds white, not grey
      mat.current.emissiveIntensity = lerp(0.42, 0.04, t)
    }
  })

  return createPortal(
    // the whole layer scaled up about the camera: same look on screen, but
    // ~120000 out, so it stays behind the room even when the opening shot
    // pulls far back (far plane: 150000)
    <group scale={DEPTH_K}>
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false} renderOrder={-10}>
      <sphereGeometry args={[1, 22, 14]} />
      <meshStandardMaterial
        ref={mat}
        color="#ffffff"
        emissive="#ffffff"
        emissiveIntensity={0.42}
        roughness={1}
        transparent
        depthWrite={false}
      />
    </instancedMesh>
    </group>,
    camera,
  )
}
