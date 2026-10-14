import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { DEG } from './shapes'

/*
 * HEKTAR-style floor lamp: weighted disc base, tall straight pole that
 * hooks over at the top into a tilted bell shade (dark outside, warm cream
 * inside), with the cord and inline switch trailing across the floor.
 * Clicking it calls `onToggle` (the scene's day/night switch); the bulb,
 * shade glow and light follow `mood.current.t` (0 day/off → 1 night/on).
 * Local origin: floor under the pole; the shade leans toward local +x.
 */

const DARK = '#2a2c30'
const darkMat = <meshStandardMaterial color={DARK} roughness={0.55} metalness={0.3} />

// shade profile (radius, y) from the closed top cap down to the rim
const SHADE = [
  [0, 36], [48, 36], [58, 26], [58, -50], [72, -78], [120, -126],
  [165, -178], [196, -248], [212, -318], [218, -350],
]

const BULB_OFF = new THREE.Color('#3a3d44')
const BULB_ON = new THREE.Color('#ffcf9e')

const FloorLamp = ({ mood, onToggle, ...props }) => {
  const lightRef = useRef(null)
  const bulbRef = useRef(null)
  const innerRef = useRef(null)
  const shown = useRef(-1)

  useFrame(() => {
    const t = mood.current.t
    if (t === shown.current) return
    shown.current = t
    if (lightRef.current) {
      lightRef.current.intensity = 850000 * t
      lightRef.current.visible = t > 0.005
    }
    if (bulbRef.current) bulbRef.current.material.color.lerpColors(BULB_OFF, BULB_ON, t)
    if (innerRef.current) innerRef.current.material.emissiveIntensity = 0.8 * t
  })

  const { shadeGeo, crookGeo, cordGeo } = useMemo(() => {
    // (the lathe's profile runs top → rim, so its front faces point inward:
    // the cream interior is FrontSide, the dark exterior BackSide)
    const shadeGeo = new THREE.LatheGeometry(
      SHADE.map(([r, y]) => new THREE.Vector2(r, y)),
      48,
    )
    // pole top hooks over toward +x and turns down into the shade's neck
    const crookGeo = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 2060, 0),
        new THREE.Vector3(8, 2160, 0),
        new THREE.Vector3(60, 2225, 0),
        new THREE.Vector3(130, 2215, 0),
        new THREE.Vector3(168, 2180, 0),
      ]),
      32,
      14,
      12,
    )
    // cord: out of the base, lazy S across the floor
    const cordGeo = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(150, 12, 40),
        new THREE.Vector3(260, 5, 120),
        new THREE.Vector3(420, 5, 90),
        new THREE.Vector3(560, 5, 180),
        new THREE.Vector3(760, 5, 160),
      ]),
      48,
      5,
      6,
    )
    return { shadeGeo, crookGeo, cordGeo }
  }, [])

  const toggle = (e) => {
    e.stopPropagation()
    onToggle?.()
  }
  const hover = (v) => () => {
    const el = document.querySelector('.lp-canvas canvas')
    if (el) el.style.cursor = v ? 'pointer' : 'grab'
  }

  return (
    <group {...props} onClick={toggle} onPointerOver={hover(true)} onPointerOut={hover(false)}>
      {/* weighted base: low domed disc */}
      <mesh position={[0, 18, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[180, 196, 36, 40]} />
        {darkMat}
      </mesh>
      <mesh position={[0, 36, 0]} scale={[1, 0.12, 1]} castShadow>
        <sphereGeometry args={[180, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        {darkMat}
      </mesh>

      {/* pole + crook */}
      <mesh position={[0, 1050, 0]} castShadow>
        <cylinderGeometry args={[14, 15, 2020, 16]} />
        {darkMat}
      </mesh>
      <mesh geometry={crookGeo} castShadow>
        {darkMat}
      </mesh>

      {/* tilted bell shade, hung from the crook */}
      <group position={[200, 2140, 0]} rotation={[0, 0, 38 * DEG]}>
        <mesh geometry={shadeGeo} castShadow>
          <meshStandardMaterial color={DARK} roughness={0.5} metalness={0.3} side={THREE.BackSide} />
        </mesh>
        <mesh ref={innerRef} geometry={shadeGeo}>
          <meshStandardMaterial
            color="#ece4d4"
            emissive="#ffcf9e"
            emissiveIntensity={0.55}
            roughness={0.9}
            side={THREE.FrontSide}
          />
        </mesh>
        {/* switch knob on top of the shade */}
        <mesh position={[0, 52, 0]}>
          <cylinderGeometry args={[18, 18, 30, 16]} />
          {darkMat}
        </mesh>
        {/* bulb */}
        <mesh ref={bulbRef} position={[0, -130, 0]}>
          <sphereGeometry args={[46, 16, 16]} />
          <meshBasicMaterial color="#ffcf9e" toneMapped={false} />
        </mesh>
        <pointLight
          ref={lightRef}
          position={[0, -220, 0]}
          intensity={450000}
          color="#ffb46e"
          distance={5000}
          decay={2}
        />
      </group>

      {/* cord + inline foot switch */}
      <mesh geometry={cordGeo}>
        <meshStandardMaterial color="#1a1b1e" roughness={0.8} />
      </mesh>
      <mesh position={[480, 12, 118]} rotation={[0, -0.3, 0]}>
        <boxGeometry args={[70, 24, 36]} />
        {darkMat}
      </mesh>
    </group>
  )
}

export default FloorLamp
