import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { canvasTexture } from './shapes'

/*
 * Retro flip clock showing the visitor's local time — HH MM SS, so a card
 * turns every second. Fully 3D (no DOM overlay), so it's hidden behind
 * whatever's in front of it like any other prop.
 *
 * Each card is two halves split at a hinge, plus two flaps for the turn:
 * the old digit's top half falls forward to edge-on, then the new digit's
 * bottom half lands from edge-on to flat. Underneath, the static top half
 * already shows the new digit and the static bottom half keeps the old one
 * until the flap covers it. All halves share 11 card textures (0–9 +
 * blank) with UVs picking the upper or lower half.
 *
 * 12/24-hour follows the visitor's locale; 12-hour shows an AM/PM tag and a
 * blank leading hour card, like the real thing. Local origin: bottom
 * centre of the case; the face looks down +z.
 */

const CARD_W = 120
const CARD_H = 176
const PAIR_GAP = 12
const GROUP_GAP = 64
const FLIP_S = 0.32 // seconds per card turn
const BLANK = 10

const CASE_W = 1000
const CASE_H = 360
const CASE_D = 250

const hour12 = (() => {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12 === true
  } catch {
    return false
  }
})()

// card faces: digit on a dark rounded card, a touch of top-light shading
const makeCards = () =>
  Array.from({ length: 11 }, (_, d) => {
    const t = canvasTexture(256, 376, (g, w, h) => {
      const r = 26
      g.fillStyle = '#18191d'
      g.beginPath()
      g.roundRect(0, 0, w, h, r)
      g.fill()
      const shade = g.createLinearGradient(0, 0, 0, h)
      shade.addColorStop(0, 'rgba(255,255,255,0.06)')
      shade.addColorStop(0.5, 'rgba(255,255,255,0)')
      shade.addColorStop(0.5, 'rgba(0,0,0,0.12)')
      shade.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = shade
      g.fillRect(0, 0, w, h)
      if (d !== BLANK) {
        g.fillStyle = '#f1ece0'
        g.font = '700 300px "Helvetica Neue", Helvetica, Arial, sans-serif'
        g.textAlign = 'center'
        g.textBaseline = 'middle'
        g.fillText(String(d), w / 2, h / 2 + 14)
      }
    })
    return t
  })

const makeTag = (text) =>
  canvasTexture(128, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h)
    g.fillStyle = '#2a2620'
    g.font = '700 40px "Helvetica Neue", Helvetica, Arial, sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(text, w / 2, h / 2 + 2)
  })

// half-card plane, pivot on the hinge: `top` spans y 0..H/2 and samples the
// texture's upper half, otherwise y -H/2..0 and the lower half
const halfGeo = (top) => {
  const g = new THREE.PlaneGeometry(CARD_W, CARD_H / 2)
  g.translate(0, top ? CARD_H / 4 : -CARD_H / 4, 0)
  const uv = g.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setY(i, top ? 0.5 + uv.getY(i) * 0.5 : uv.getY(i) * 0.5)
  uv.needsUpdate = true
  return g
}

const digitsNow = () => {
  const d = new Date()
  let h = d.getHours()
  if (hour12) h = h % 12 || 12
  const hh = hour12 && h < 10 ? [BLANK, h] : [Math.floor(h / 10), h % 10]
  const m = d.getMinutes()
  const s = d.getSeconds()
  return {
    digits: [...hh, Math.floor(m / 10), m % 10, Math.floor(s / 10), s % 10],
    pm: d.getHours() >= 12,
  }
}

// x centre of each of the six cards
const CARD_X = (() => {
  const xs = []
  let x = -(6 * CARD_W + 3 * PAIR_GAP + 2 * GROUP_GAP) / 2 + CARD_W / 2
  for (let i = 0; i < 6; i++) {
    xs.push(x)
    x += CARD_W + (i % 2 === 0 ? PAIR_GAP : GROUP_GAP)
  }
  return xs
})()

const cardMat = (map) => (
  <meshStandardMaterial map={map} emissiveMap={map} emissive="#ffffff" emissiveIntensity={0.18} roughness={0.55} />
)

const FlipClock = (props) => {
  const cards = useMemo(() => makeCards(), [])
  const tags = useMemo(() => ({ am: makeTag('AM'), pm: makeTag('PM') }), [])
  const geo = useMemo(() => ({ top: halfGeo(true), bottom: halfGeo(false) }), [])

  // per card: [staticTop, staticBottom, flapTop, flapBottom] meshes
  const meshes = useRef([])
  const tagRef = useRef(null)
  const state = useRef(null)
  if (state.current === null) {
    const { digits } = digitsNow()
    state.current = digits.map((d) => ({ shown: d, from: d, to: d, t0: -1 }))
  }

  const setMap = (mesh, d) => {
    if (mesh && mesh.material.map !== cards[d]) {
      mesh.material.map = cards[d]
      mesh.material.emissiveMap = cards[d]
      mesh.material.needsUpdate = true
    }
  }

  useFrame((s) => {
    const now = s.clock.elapsedTime
    const { digits, pm } = digitsNow()
    if (tagRef.current && hour12) {
      const tex = pm ? tags.pm : tags.am
      if (tagRef.current.material.map !== tex) {
        tagRef.current.material.map = tex
        tagRef.current.material.needsUpdate = true
      }
    }
    digits.forEach((d, i) => {
      const c = state.current[i]
      const m = meshes.current[i]
      if (!m) return
      // a new digit while idle (or mid-turn: finish onto the newest)
      if (d !== c.to) {
        c.from = c.t0 < 0 ? c.to : c.from
        c.to = d
        c.t0 = now
      }
      const [sTop, sBot, fTop, fBot] = m
      if (c.t0 < 0) {
        setMap(sTop, c.to)
        setMap(sBot, c.to)
        fTop.visible = false
        fBot.visible = false
        return
      }
      const u = Math.min(1, (now - c.t0) / FLIP_S)
      setMap(sTop, c.to) // new top already showing behind the falling flap
      setMap(sBot, c.from) // old bottom until the new half lands on it
      setMap(fTop, c.from)
      setMap(fBot, c.to)
      // ease-in fall, ease-out landing
      if (u < 0.5) {
        const k = u / 0.5
        fTop.visible = true
        fTop.rotation.x = (Math.PI / 2) * k * k
        fBot.visible = false
      } else {
        const k = (u - 0.5) / 0.5
        fTop.visible = false
        fBot.visible = true
        fBot.rotation.x = -(Math.PI / 2) * (1 - k) * (1 - k)
      }
      if (u >= 1) {
        c.t0 = -1
        c.from = c.to
        fTop.visible = false
        fBot.visible = false
        setMap(sBot, c.to)
      }
    })
  })

  const faceZ = CASE_D / 2
  // cards sit high in the case, leaving a flat strip below for the tag
  const cardY = CASE_H / 2 + 20

  return (
    <group {...props}>
      {/* case: cream retro plastic, rounded */}
      <RoundedBox args={[CASE_W, CASE_H, CASE_D]} radius={46} smoothness={5} position={[0, CASE_H / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#e3d6bb" roughness={0.45} />
      </RoundedBox>
      {/* dark window the cards sit in */}
      <mesh position={[0, cardY, faceZ - 18]}>
        <boxGeometry args={[CASE_W - 70, CARD_H + 44, 40]} />
        <meshStandardMaterial color="#0c0d10" roughness={0.6} />
      </mesh>
      {/* feet */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * (CASE_W / 2 - 110), -8, 30]} castShadow>
          <boxGeometry args={[120, 16, 120]} />
          <meshStandardMaterial color="#2b2824" roughness={0.8} />
        </mesh>
      ))}

      {/* cards */}
      {CARD_X.map((x, i) => (
        <group key={i} position={[x, cardY, faceZ + 3]}>
          {['top', 'bottom', 'top', 'bottom'].map((half, k) => (
            <mesh
              key={k}
              geometry={geo[half]}
              position={[0, 0, k >= 2 ? 1.5 : 0]}
              ref={(el) => {
                if (!el) return
                meshes.current[i] = meshes.current[i] || []
                meshes.current[i][k] = el
              }}
              visible={k < 2}
            >
              {cardMat(cards[state.current[i].shown])}
            </mesh>
          ))}
          {/* hinge gap */}
          <mesh position={[0, 0, 2.5]}>
            <planeGeometry args={[CARD_W, 3]} />
            <meshBasicMaterial color="#050506" />
          </mesh>
        </group>
      ))}

      {/* colons between the groups */}
      {[1, 3].map((i) => {
        const x = (CARD_X[i] + CARD_X[i + 1]) / 2
        return [-30, 30].map((dy) => (
          <mesh key={`${i}${dy}`} position={[x, cardY + dy, faceZ + 3]}>
            <circleGeometry args={[8, 16]} />
            <meshBasicMaterial color="#d8d2c4" />
          </mesh>
        ))
      })}

      {/* AM/PM tag on the case, 12-hour locales only */}
      {hour12 && (
        <mesh ref={tagRef} position={[CASE_W / 2 - 90, 62, faceZ + 1]}>
          <planeGeometry args={[80, 40]} />
          <meshBasicMaterial map={tags.am} transparent />
        </mesh>
      )}
    </group>
  )
}

export default FlipClock
