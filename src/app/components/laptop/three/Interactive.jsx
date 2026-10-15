import React, { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/*
 * Marks its children as interactive: a thin, slowly breathing outline
 * around their silhouette, which on hover brightens, thickens and gains a
 * soft glow halo — plus a small downward-pointing pyramid marker floating
 * over the top of the object, in the outline's colour, bobbing and turning
 * slowly. The marker is kept a constant size on screen.
 *
 * The outline is an inverted hull: each mesh gets a child copy drawn
 * back-face-only and pushed out along its normals — in screen pixels, so
 * it's the same weight at any zoom — and only the rim beyond the mesh's own
 * silhouette shows. No post-processing pass, and walls in front still hide
 * it. Hull normals are welded/smoothed so box corners don't crack open.
 *
 *   active      () => bool, polled per frame: outline fades out when false
 *   hoverTest   (event) => bool: extra gate for hover (e.g. not occluded)
 *   hoverRef    optional ref: true also counts as hovered — for DOM laid
 *               over the object (the monitor's live screen), which keeps
 *               pointer events from reaching the 3D scene
 */

// orange: a softer tone at rest, brighter on hover
const IDLE = new THREE.Color('#f2a35e')
const HOVER = new THREE.Color('#ff8c2a')

const VERT = /* glsl */ `
  uniform float uThickness; // px
  uniform vec2 uRes;        // drawing-buffer px
  void main() {
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    vec2 d = (projectionMatrix * vec4(n, 0.0)).xy * uRes; // normal, in px
    float l = length(d);
    d = l > 1e-5 ? d / l : vec2(0.0);
    clip.xy += d * uThickness * 2.0 / uRes * clip.w;
    gl_Position = clip;
  }
`
const FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() { gl_FragColor = vec4(uColor, uOpacity); }
`
// `flipped`: the twin for inside-out surfaces (see hullGeometry), sharing
// the same uniforms so both animate together
const hullMaterial = (additive, uniforms, flipped = false) =>
  new THREE.ShaderMaterial({
    uniforms: uniforms ?? {
      uThickness: { value: 1 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uColor: { value: new THREE.Color() },
      uOpacity: { value: 0 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: flipped ? THREE.FrontSide : THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    toneMapped: false,
  })

// flat surfaces have no silhouette to outline (and their hull would just
// be a copy of the face)
const FLAT = new Set(['PlaneGeometry', 'CircleGeometry', 'ShapeGeometry', 'RingGeometry'])
// Welded, smoothed normals follow the triangle winding. Most meshes wind
// outward; an inside-out one (drawn BackSide, like the lamp shade's open
// lathe) winds inward, so its hull would shrink into the surface and vanish
// — for those the normals are flipped and the hull is drawn FrontSide.
const hullCache = new WeakMap()
const hullGeometry = (geo, flipped) => {
  const hit = hullCache.get(geo)?.[flipped ? 1 : 0]
  if (hit) return hit
  let g = new THREE.BufferGeometry()
  g.setAttribute('position', geo.attributes.position.clone())
  if (geo.index) g.setIndex(geo.index.clone())
  g = mergeVertices(g, 1e-3)
  g.computeVertexNormals()
  if (flipped) {
    const n = g.attributes.normal
    for (let i = 0; i < n.array.length; i++) n.array[i] = -n.array[i]
  }
  const pair = hullCache.get(geo) ?? []
  pair[flipped ? 1 : 0] = g
  hullCache.set(geo, pair)
  return g
}

const lerp = (a, b, t) => a + (b - a) * t

// marker: a 3-sided pyramid, apex down, base on top
const MARKER_PX = 14 // on-screen height
const MARKER_GAP_PX = 10 // gap above the object's top
const markerGeometry = (() => {
  const g = new THREE.ConeGeometry(0.62, 1, 3)
  g.rotateX(Math.PI) // apex down
  g.translate(0, 0.5, 0) // apex at the origin, so it hangs off its anchor
  return g
})()
// Marker shading: its own light, fixed relative to the camera (up-left,
// toward the viewer), so the faces read as 3D as it spins whatever the
// day/night lighting; per-face (flat) normals come from screen-space
// derivatives. Edges are drawn a step darker to keep the shape crisp.
const markerMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color() }, uOpacity: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec3 vView;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = mv.xyz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec3 vView;
      void main() {
        vec3 n = normalize(cross(dFdx(vView), dFdy(vView)));
        vec3 l = normalize(vec3(-0.45, 0.75, 0.5));
        float k = 0.38 + 0.72 * max(dot(n, l), 0.0);
        gl_FragColor = vec4(uColor * k, uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  })
const markerEdges = new THREE.EdgesGeometry(markerGeometry)
const _v = new THREE.Vector3()
const _s = new THREE.Vector3()

const Interactive = ({ children, active = () => true, hoverTest, hoverRef, thickness = 1.5 }) => {
  const group = useRef(null)
  const { size, gl, camera } = useThree()
  const marker = useRef(null)
  const markerMat = useMemo(() => markerMaterial(), [])
  // marker anchor (top-centre of the object, group-local) — set by scan
  const anchor = useRef(null)
  const mats = useMemo(() => {
    const line = hullMaterial(false)
    const glow = hullMaterial(true)
    return {
      line,
      glow,
      lineFlipped: hullMaterial(false, line.uniforms, true),
      glowFlipped: hullMaterial(true, glow.uniforms, true),
    }
  }, [])
  const s = useRef({ hover: 0, want: 0, fade: 1, scanned: 0 })

  // attach hulls to any mesh under the group that doesn't have them yet —
  // re-scanned for the first couple of seconds, as children mount
  const scan = () => {
    group.current?.traverse((m) => {
      if (!m.isMesh || m.userData.hull || m.userData.isHull || m === marker.current) return
      const mat = m.material
      if (!m.geometry?.attributes?.position || FLAT.has(m.geometry.type)) return
      if (mat && (mat.colorWrite === false || (mat.transparent && mat.opacity === 0))) return
      const flipped = mat?.side === THREE.BackSide
      const geo = hullGeometry(m.geometry, flipped)
      // a mesh that doesn't write depth (the sun/moon discs) can't hide its
      // hull's interior, so draw the hull first and let the mesh cover it
      const order = mat?.depthWrite === false ? m.renderOrder - 2 : m.renderOrder + 1
      for (const [key, dz] of [['line', 0], ['glow', 1]]) {
        const h = new THREE.Mesh(geo, mats[flipped ? `${key}Flipped` : key])
        h.userData.isHull = true
        h.renderOrder = order + (order < m.renderOrder ? -dz : dz)
        h.raycast = () => null
        h.castShadow = false
        h.receiveShadow = false
        m.add(h)
      }
      m.userData.hull = true
    })
    // re-anchor the marker on the top-centre of everything outlined
    if (group.current) {
      const box = new THREE.Box3()
      group.current.traverse((m) => {
        if (m.isMesh && m.userData.hull) box.expandByObject(m, true)
      })
      if (!box.isEmpty()) {
        const c = box.getCenter(new THREE.Vector3())
        anchor.current = group.current.worldToLocal(new THREE.Vector3(c.x, box.max.y, c.z))
      }
    }
  }

  useFrame((state, dt) => {
    const v = s.current
    if (v.scanned < 120) {
      v.scanned++
      if (v.scanned % 10 === 1) scan()
    }
    const on = active()
    v.fade = lerp(v.fade, on ? 1 : 0, Math.min(1, dt * 6))
    const want = v.want || hoverRef?.current ? 1 : 0
    v.hover = lerp(v.hover, on ? want : 0, Math.min(1, dt * 10))
    const breathe = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 1.8)
    const px = gl.getPixelRatio()
    for (const m of [mats.line, mats.glow]) m.uniforms.uRes.value.set(size.width * px, size.height * px)
    const line = mats.line.uniforms
    line.uThickness.value = lerp(thickness, thickness * 1.8, v.hover) * px
    line.uColor.value.lerpColors(IDLE, HOVER, v.hover)
    line.uOpacity.value = lerp(0.38 + 0.22 * breathe, 0.95, v.hover) * v.fade
    const glow = mats.glow.uniforms
    glow.uThickness.value = 7 * px
    glow.uColor.value.copy(HOVER)
    glow.uOpacity.value = 0.32 * v.hover * v.fade

    // marker: constant on-screen size, a little above the object's top
    const mk = marker.current
    if (mk && anchor.current) {
      mk.visible = v.fade > 0.01
      mk.position.copy(anchor.current)
      mk.getWorldPosition(_v)
      const unitsPerPx = (2 * camera.position.distanceTo(_v) * Math.tan((camera.fov / 2) * (Math.PI / 180))) / size.height
      group.current.getWorldScale(_s) // undo any scale the object sits in
      const k = (unitsPerPx / _s.y) * lerp(1, 1.2, v.hover)
      const bob = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 2.2)
      mk.position.y += (MARKER_GAP_PX + bob * 5) * k
      mk.scale.setScalar(MARKER_PX * k)
      mk.rotation.y = state.clock.elapsedTime * 0.8
      mk.material.uniforms.uColor.value.copy(line.uColor.value)
      mk.material.uniforms.uOpacity.value = lerp(0.85, 1, v.hover) * v.fade
      const edge = mk.children[0]?.material
      if (edge) {
        edge.color.copy(line.uColor.value).multiplyScalar(0.45)
        edge.opacity = lerp(0.85, 1, v.hover) * v.fade
      }
    }
  })

  return (
    <group
      ref={group}
      onPointerOver={(e) => {
        if (!active() || (hoverTest && !hoverTest(e))) return
        s.current.want = 1
      }}
      onPointerOut={() => {
        s.current.want = 0
      }}
    >
      {children}
      <mesh ref={marker} geometry={markerGeometry} material={markerMat} visible={false} raycast={() => null} renderOrder={5}>
        <lineSegments geometry={markerEdges} raycast={() => null} renderOrder={6}>
          <lineBasicMaterial transparent toneMapped={false} depthWrite={false} />
        </lineSegments>
      </mesh>
    </group>
  )
}

export default Interactive
