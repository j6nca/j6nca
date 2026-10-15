import * as THREE from 'three'

/*
 * The opening shot, shared by World3D (which flies the camera) and Sky
 * (which hangs the sun/moon where that shot can see it).
 *
 * The camera looks at the floor's centre along the line from there to the
 * room's back-left corner — the vertical edge where the left and back walls
 * meet — so that edge sits dead centre on screen: a symmetric diorama view,
 * pitched ~27° down.
 */

export const DEG = Math.PI / 180
export const FOV = 42
// opening-shot framing: a distance multiplier, 0.8 = 20% closer than "fit"
export const DEFAULT_ZOOM = 0.8

const CORNER = [-2800, -2050] // inner faces of the left + back walls (x, z)
const PITCH = -0.452 // dir.y
const H = Math.sqrt(1 - PITCH * PITCH)
const CL = Math.hypot(CORNER[0], CORNER[1])

/* { look, dir }: dir is the unit vector from the camera to the look target */
export const POSE_ROOM = {
  look: [0, 300, 0],
  dir: [(CORNER[0] / CL) * H, PITCH, (CORNER[1] / CL) * H],
}

// view height in world units at a given camera distance (fov is fixed)
export const viewH = (d) => 2 * d * Math.tan((FOV / 2) * DEG)

// opening-shot scale: fit ~15600 world units across, or ~12000 down. On a
// portrait screen the width fit alone would park the camera far past the
// far plane; there, frame ~12000 across instead.
export const roomScale = (vw, vh) => Math.min(vw / (vw < vh ? 12000 : 15600), vh / 12000)

// camera distance for the opening shot at a zoom multiplier
export const roomDistance = (vw, vh, zoom = DEFAULT_ZOOM) => (vh / roomScale(vw, vh) / viewH(1)) * zoom

/* A world point that the default opening shot shows at screen position
 * (nx, ny) in NDC (-1…1), `beyond` units past the look target — used to
 * park the sun/moon in open sky for this viewport's framing. */
export const pointInOpeningShot = (vw, vh, nx, ny, beyond) => {
  const d = roomDistance(vw, vh)
  const look = new THREE.Vector3(...POSE_ROOM.look)
  const dir = new THREE.Vector3(...POSE_ROOM.dir)
  const cam = new THREE.PerspectiveCamera(FOV, vw / vh, 20, 150000)
  cam.position.copy(look).addScaledVector(dir, -d)
  cam.lookAt(look)
  cam.updateMatrixWorld()
  const p = new THREE.Vector3(nx, ny, 0.5).unproject(cam)
  const ray = p.sub(cam.position).normalize()
  return cam.position.clone().addScaledVector(ray, d + beyond)
}
