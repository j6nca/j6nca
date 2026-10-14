import * as THREE from 'three'

/* Shared helpers for the procedural props. */

export const DEG = Math.PI / 180

// A smooth closed outline through `pts` ([x, y] pairs) — a closed
// Catmull-Rom spline, so sharp-ish features (guitar horns, chair corners)
// come out rounded without hand-placing bezier handles.
export const smoothPoints = (pts, segments = 96, tension = 0.5) => {
  const curve = new THREE.CatmullRomCurve3(
    pts.map(([x, y]) => new THREE.Vector3(x, y, 0)),
    true,
    'catmullrom',
    tension,
  )
  return curve.getPoints(segments).map((p) => new THREE.Vector2(p.x, p.y))
}

export const smoothShape = (pts, segments, tension) => new THREE.Shape(smoothPoints(pts, segments, tension))

// The same outline shrunk toward its centroid by `inset` units — good enough
// to cut a frame ring (chair seat/back) out of a convex-ish outline.
export const insetPath = (pts, inset, segments, tension) => {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length
  const shrunk = pts.map(([x, y]) => {
    const dx = x - cx
    const dy = y - cy
    const d = Math.hypot(dx, dy) || 1
    return [x - (dx / d) * inset, y - (dy / d) * inset]
  })
  return new THREE.Path(smoothPoints(shrunk, segments, tension).reverse())
}

// Displace a geometry's vertices in place: fn(x, y, z) → [x, y, z].
export const warp = (geo, fn) => {
  const p = geo.attributes.position
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = fn(p.getX(i), p.getY(i), p.getZ(i))
    p.setXYZ(i, x, y, z)
  }
  p.needsUpdate = true
  geo.computeVertexNormals()
  return geo
}

// Planar UVs from world-space x/z (or x/y) bounds, so canvas textures map
// once across a whole extruded slab instead of per-unit.
export const planarUV = (geo, axisU, axisV, [u0, u1], [v0, v1]) => {
  const p = geo.attributes.position
  const uv = geo.attributes.uv
  const get = { x: (i) => p.getX(i), y: (i) => p.getY(i), z: (i) => p.getZ(i) }
  for (let i = 0; i < p.count; i++) {
    uv.setXY(i, (get[axisU](i) - u0) / (u1 - u0), (get[axisV](i) - v0) / (v1 - v0))
  }
  uv.needsUpdate = true
  return geo
}

export const canvasTexture = (w, h, draw, srgb = true) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

// Deterministic PRNG so the procedural textures are stable across loads.
export const rng = (seed) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
