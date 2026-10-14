import React, { useMemo } from 'react'
import * as THREE from 'three'
import { canvasTexture } from './shapes'

/*
 * Sony WH-1000XM4-style over-ear headphones lying flat on the desk: both
 * cups swivelled flat (pads down), the headband lying in a U behind them,
 * matte black with the copper SONY mark and mic dots. World units (~13/cm),
 * origin on the desk between the cups; the band points toward −z.
 */

const CUP_X = 150 // cup centres, ± along x
const CUP_RX = 72
const CUP_RZ = 88
const PAD_H = 38 // thick, plush pads
const SHELL_H = 46

const matte = (c = '#1b1c1f', r = 0.75) => <meshStandardMaterial color={c} roughness={r} metalness={0.05} />
const COPPER = '#c48a52'

const makeLogo = () =>
  canvasTexture(256, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h)
    g.fillStyle = COPPER
    g.font = '700 46px Georgia, "Times New Roman", serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText('SONY', w / 2, h / 2 + 2)
  })

const Cup = ({ side, logo }) => (
  <group position={[side * CUP_X, 0, 0]}>
    {/* ear pad (down on the desk) */}
    <mesh position={[0, PAD_H / 2, 0]} scale={[CUP_RX, PAD_H / 2, CUP_RZ]} castShadow receiveShadow>
      <sphereGeometry args={[1, 32, 12]} />
      {matte('#141518', 0.9)}
    </mesh>
    {/* housing: an elliptical shell with a domed top */}
    <mesh position={[0, PAD_H + SHELL_H * 0.35, 0]} scale={[CUP_RX * 0.97, SHELL_H * 0.7, CUP_RZ * 0.97]} castShadow>
      <cylinderGeometry args={[1, 1, 1, 40]} />
      {matte()}
    </mesh>
    <mesh position={[0, PAD_H + SHELL_H * 0.7, 0]} scale={[CUP_RX * 0.97, SHELL_H * 0.45, CUP_RZ * 0.97]} castShadow>
      <sphereGeometry args={[1, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      {matte()}
    </mesh>
    {/* copper mic dot on the housing top */}
    <mesh position={[side * 14, PAD_H + SHELL_H * 1.16, -CUP_RZ * 0.55]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[12, 4]} />
      <meshStandardMaterial color={COPPER} metalness={0.6} roughness={0.35} />
    </mesh>
    {/* yoke arm rising from the cup toward the band */}
    <mesh position={[0, PAD_H + 8, -CUP_RZ - 8]} castShadow>
      <boxGeometry args={[52, 34, 46]} />
      {matte('#1e1f22', 0.6)}
    </mesh>
    {/* SONY on the yoke */}
    <mesh position={[0, PAD_H + 25.2, -CUP_RZ - 8]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[34, 8.5]} />
      <meshBasicMaterial map={logo} transparent />
    </mesh>
  </group>
)

const Headphones = (props) => {
  const { band, logo } = useMemo(() => {
    // headband lying flat in a U from one yoke round to the other
    const y = PAD_H + 8
    const pts = [
      [-CUP_X, y, -CUP_RZ - 26],
      [-CUP_X - 18, y, -CUP_RZ - 110],
      [-CUP_X * 0.55, y, -CUP_RZ - 205],
      [0, y, -CUP_RZ - 225],
      [CUP_X * 0.55, y, -CUP_RZ - 205],
      [CUP_X + 18, y, -CUP_RZ - 110],
      [CUP_X, y, -CUP_RZ - 26],
    ].map((p) => new THREE.Vector3(...p))
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 32, 16)
    // flatten the band's cross-section (it's a wide, thin strap)
    const p = geo.attributes.position
    for (let i = 0; i < p.count; i++) p.setY(i, y + (p.getY(i) - y) * 0.8)
    geo.computeVertexNormals()
    return { band: geo, logo: makeLogo() }
  }, [])
  return (
    <group {...props}>
      <Cup side={-1} logo={logo} />
      <Cup side={1} logo={logo} />
      <mesh geometry={band} castShadow receiveShadow>
        {matte('#1a1b1e', 0.7)}
      </mesh>
    </group>
  )
}

export default Headphones
