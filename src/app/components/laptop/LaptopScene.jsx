'use client'

import React, { useCallback, useEffect, useRef } from 'react'
import LaptopKeyboard from './LaptopKeyboard'
import TerminalApp from './TerminalApp'
import WaypointApp from './WaypointApp'
import GetbudApp from './GetbudApp'
import ObsidianApp from './ObsidianApp'
import BrowserApp from './BrowserApp'

/*
 * The whole site is one scene: a laptop on a maple desk filling the viewport.
 * The story advances in 8 discrete "beats" — any scroll intent (wheel burst,
 * touch swipe, arrow key) tweens the scene to the next/previous beat. Each
 * beat's 0→1 progress is published as a CSS var (--b1..--b8) that all content
 * animation derives from, while this component lerps a CSS-3D camera between
 * three poses (desk → screen → keyboard → screen) and slides the on-screen
 * app strip (terminal / obsidian / browser).
 *
 *   beat 1   lid opens, whoami + about types into the terminal
 *   beat 2   camera dives to the keyboard, k-e-y-b-o-a-r-d-s ↵ types itself
 *   beat 3   back to the screen, swipe to waypoint — the japan trip replays
 *   beat 4   swipe to getbud — the cash-flow sankey sweeps in
 *   beat 5   swipe to obsidian, the note-galaxy spins
 *   beat 6   swipe back, kubectl get po, kube-cats fly across the terminal
 *   beat 7   cat ~/projects.md
 *   beat 8   cat ~/work_experience.md
 *   beat 9   swipe to the browser, contribution graph decodes
 *   beat 10  swipe back, motd — contact, resume, curl
 *
 * The screen's app strip is laid out in story order — terminal (whoami) ·
 * waypoint · getbud · obsidian · terminal (kubectl/projects/work) · contrib
 * browser · terminal (motd) — so every screen change is a single swipe to
 * the left; --app is the strip index. The terminal appears three times, each
 * pane rendering only its own scrollback pages (see TerminalApp's `pages`).
 */

const BANDS = 10
const SCREEN_W = 800
const SCREEN_H = 500
const LID_H = 560
const BASE_D = 560
const LAP_W = 840

const CAPTIONS = [
  '01 — hello',
  '02 — keyboards',
  '03 — waypoint',
  '04 — getbud',
  '05 — nebula.md',
  '06 — kube-cats',
  '07 — projects',
  '08 — experience',
  '09 — commits',
  '10 — contact',
]

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const seg = (v, a, b) => clamp((v - a) / (b - a))
const smooth = (u) => {
  u = clamp(u)
  return u * u * (3 - 2 * u)
}
const mix = (a, b, u) => a + (b - a) * u
const mixPose = (A, B, u) =>
  u <= 0
    ? A
    : u >= 1
      ? B
      : {
          tx: mix(A.tx, B.tx, u),
          ty: mix(A.ty, B.ty, u),
          s: mix(A.s, B.s, u),
          rx: mix(A.rx, B.rx, u),
          ry: mix(A.ry, B.ry, u),
        }

const LaptopScene = ({ data, contributions }) => {
  const rootRef = useRef(null)
  const worldRef = useRef(null)
  const rigRef = useRef(null)
  const subsRef = useRef(new Set())

  // Children (nebula canvas, contribution decode, terminal pages) register a
  // callback and get the frame state after each scroll update — one driver,
  // deterministic ordering.
  const subscribe = useCallback((fn) => {
    subsRef.current.add(fn)
    return () => subsRef.current.delete(fn)
  }, [])

  useEffect(() => {
    const root = rootRef.current
    const world = worldRef.current
    const rig = rigRef.current
    if (!root || !world || !rig) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Static fallback: CSS flattens the scene; tell subscribers to render
      // their finished states once.
      const state = { raw: BANDS, t: 1, bands: Array(BANDS + 1).fill(1), reduced: true }
      subsRef.current.forEach((fn) => fn(state))
      return
    }

    let raf = 0
    let vw = window.innerWidth
    let vh = window.innerHeight

    // Camera poses. The world transform is translate+scale (outer), the rig
    // is rotateX/rotateY (inner), both relative to an anchor at the hinge.
    const poses = () => {
      const anchorY = vh * 0.58
      const cy = vh * 0.5 - anchorY
      const sScreen = Math.min((vw * 0.94) / SCREEN_W, (vh * 0.86) / SCREEN_H)
      const sDesk = Math.min(vw / 1200, vh / 1150, 0.72)
      const sKeys = Math.min((vw * 0.86) / LAP_W, (vh * 0.95) / BASE_D)
      // negative pitch = camera above the desk looking down at it
      const rxDesk = -26
      const rxKeys = -64
      return {
        desk: {
          tx: 0,
          ty: cy - Math.sin((-rxDesk * Math.PI) / 180) * (BASE_D / 2) * sDesk + vh * 0.03,
          s: sDesk,
          rx: rxDesk,
          ry: -18,
        },
        screen: { tx: 0, ty: cy + (LID_H / 2 + 6) * sScreen, s: sScreen, rx: 0, ry: 0 },
        keys: {
          tx: 0,
          ty: cy - Math.sin((-rxKeys * Math.PI) / 180) * (BASE_D / 2) * sKeys,
          s: sKeys,
          rx: rxKeys,
          ry: 0,
        },
      }
    }
    let P = poses()

    // Discrete beat stepper: raw tweens between integers; render() derives
    // everything else exactly as the scroll-driven version did.
    const BEAT_MS = 1500
    const easeBeat = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2)

    let raw = 0
    let from = 0
    let target = 0
    let animStart = 0
    let animating = false
    let resetting = false
    // gesture segmentation state (see onWheel)
    let acc = 0
    let gestureUsed = false
    let lastWheelT = 0
    let lastMag = 0
    let lastStepT = 0
    let touchY = null
    let touchDone = false

    // Custom-property writes invalidate style for the whole subtree, so only
    // touch a var when its value actually changed — at any given moment a
    // beat tween moves one or two of them, not all ten.
    const varCache = {}
    const setVar = (el, name, val) => {
      if (varCache[name] === val) return
      varCache[name] = val
      el.style.setProperty(name, val)
    }

    const applyCam = (c) => {
      world.style.transform = `translate3d(${c.tx.toFixed(1)}px, ${c.ty.toFixed(1)}px, 0) scale3d(${c.s.toFixed(4)}, ${c.s.toFixed(4)}, ${c.s.toFixed(4)})`
      rig.style.transform = `rotateX(${c.rx.toFixed(2)}deg) rotateY(${c.ry.toFixed(2)}deg)`
    }

    const render = (r) => {
      const b = [0]
      for (let i = 1; i <= BANDS; i++) {
        b[i] = clamp(r - (i - 1))
        setVar(root, `--b${i}`, b[i].toFixed(4))
      }
      // top progress bar (the CSS scroll-timeline can't see beat progress)
      setVar(document.documentElement, '--scene-p', (r / BANDS).toFixed(4))

      // lid opens through the first half of beat 1 (closed -90° → open +8°)
      const lid = smooth(seg(b[1], 0.05, 0.55))
      setVar(root, '--lid', `${(-90 + lid * 98).toFixed(2)}deg`)

      // app strip index — story order, every transition swipes left by one
      const app =
        smooth(seg(b[3], 0.32, 0.6)) + // → waypoint
        smooth(seg(b[4], 0.02, 0.3)) + // → getbud
        smooth(seg(b[5], 0.02, 0.3)) + // → obsidian
        smooth(seg(b[6], 0, 0.26)) + // → terminal (kubectl)
        smooth(seg(b[9], 0.02, 0.3)) + // → contribution browser
        smooth(seg(b[10], 0, 0.26)) // → terminal (motd)
      setVar(root, '--app', app.toFixed(4))

      // camera
      let c = P.desk
      c = mixPose(c, P.screen, smooth(seg(b[1], 0.25, 0.9)))
      c = mixPose(c, P.keys, smooth(seg(b[2], 0.04, 0.46)))
      c = mixPose(c, P.screen, smooth(seg(b[3], 0, 0.36)))
      applyCam(c)

      const beat = Math.min(BANDS, Math.floor(r + 0.5))
      if (root.dataset.beat !== String(beat)) root.dataset.beat = String(beat)

      const state = { raw: r, t: r / BANDS, bands: b, reduced: false }
      subsRef.current.forEach((fn) => fn(state))
    }

    const tick = (now) => {
      raf = 0
      const u = Math.min(1, (now - animStart) / BEAT_MS)
      raw = from + (target - from) * easeBeat(u)
      render(raw)
      if (u < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        animating = false
      }
    }

    // End of the story: power the screen down, close the lid, dolly back to
    // the opening shot, then reset to beat 0 so the journey can replay.
    const RESET_MS = 2200
    const resetTick = (now) => {
      raf = 0
      const u = Math.min(1, (now - animStart) / RESET_MS)
      const e = easeBeat(u)
      applyCam(mixPose(P.screen, P.desk, e))
      setVar(root, '--lid', `${(-90 + (1 - e) * 98).toFixed(2)}deg`)
      // --b1 gates the panel-boot overlay + intro title: screen goes dark
      // (and the title fades back in) over the first stretch of the close
      setVar(root, '--b1', (1 - seg(u, 0, 0.4)).toFixed(4))
      setVar(document.documentElement, '--scene-p', (1 - e).toFixed(4))
      if (u < 1) {
        raf = requestAnimationFrame(resetTick)
      } else {
        raw = 0
        animating = false
        resetting = false
        render(0)
      }
    }

    // A fresh gesture mid-tween retargets the animation to the next beat
    // from wherever the scene currently is — input is never blocked, so
    // consecutive scrolls feel immediate. The outro only fires from rest.
    const step = (dir) => {
      if (resetting) return
      const base = animating ? target : Math.round(raw)
      if (dir > 0 && base >= BANDS) {
        if (animating) return
        animating = true
        resetting = true
        root.dataset.beat = '0'
        animStart = performance.now()
        if (raf) cancelAnimationFrame(raf)
        raf = requestAnimationFrame(resetTick)
        return
      }
      const next = clamp(base + dir, 0, BANDS)
      if (next === base && !animating) return
      if (animating && next === target) return
      from = raw
      target = next
      animating = true
      animStart = performance.now()
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(tick)
    }

    // One flick = one beat, without a blanket cooldown. Trackpads stream
    // events every ~10ms with a decaying momentum tail, so a gesture is
    // consumed after one step and a NEW gesture is recognized by either a
    // pause between bursts or a sharp re-acceleration mid-tail. Sparse
    // large-delta events (discrete mouse-wheel notches, or the hard first
    // event of a strong flick) step directly on a short time floor.
    const onWheel = (e) => {
      e.preventDefault()
      const now = performance.now()
      const gap = now - lastWheelT
      lastWheelT = now
      const mag = Math.abs(e.deltaY)

      if (gap > 40 && mag > 50) {
        // discrete notch / hard flick head
        lastMag = mag
        gestureUsed = true
        acc = 0
        if (now - lastStepT > 160) {
          lastStepT = now
          step(e.deltaY > 0 ? 1 : -1)
        }
        return
      }

      // continuous (trackpad) stream: segment into gestures
      if (gap > 110 || mag > lastMag * 1.7 + 6) {
        gestureUsed = false
        acc = 0
      }
      lastMag = mag
      if (gestureUsed) return
      acc += e.deltaY
      if (Math.abs(acc) > 50) {
        const dir = acc > 0 ? 1 : -1
        gestureUsed = true
        acc = 0
        lastStepT = now
        step(dir)
      }
    }

    const onTouchStart = (e) => {
      touchY = e.touches[0].clientY
      touchDone = false
    }
    const onTouchMove = (e) => {
      e.preventDefault()
      if (touchDone || touchY == null) return
      const dy = touchY - e.touches[0].clientY
      if (Math.abs(dy) > 45) {
        touchDone = true
        step(dy > 0 ? 1 : -1)
      }
    }

    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (['ArrowDown', 'PageDown', ' ', 'j'].includes(e.key)) {
        e.preventDefault()
        step(1)
      } else if (['ArrowUp', 'PageUp', 'k'].includes(e.key)) {
        e.preventDefault()
        step(-1)
      }
    }

    const onResize = () => {
      vw = window.innerWidth
      vh = window.innerHeight
      P = poses()
      if (!animating) render(raw)
    }

    render(0)
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section className="lp-scroll" ref={rootRef} data-beat="0" aria-label="Jonathan Ng — portfolio">
      <h1 className="sr-only">{data.basics.name} — {data.basics.label}</h1>

      <div className="lp-stage">
        <div className="lp-room" aria-hidden="true" />

        <div className="lp-anchor">
          <div className="lp-world" ref={worldRef}>
            <div className="lp-rig" ref={rigRef}>
              <div className="lp-desk" aria-hidden="true">
                <div className="lp-shadow" />
              </div>

              <div className="lp-laptop">
                <div className="lp-base">
                  <i className="lp-wall lp-wall-l" aria-hidden="true" />
                  <i className="lp-wall lp-wall-r" aria-hidden="true" />
                  <div className="lp-deck">
                    <LaptopKeyboard />
                    <div className="lp-trackpad" aria-hidden="true" />
                  </div>
                </div>

                <div className="lp-lid">
                  <div className="lp-lid-back" aria-hidden="true">
                    <span className="lp-logo">j6n</span>
                  </div>
                  <div className="lp-lid-front">
                    <div className="lp-screen">
                      <div className="lp-apps">
                        <TerminalApp basics={data.basics} subscribe={subscribe} pages={[0]} />
                        <WaypointApp />
                        <GetbudApp />
                        <ObsidianApp subscribe={subscribe} />
                        <TerminalApp
                          basics={data.basics}
                          projects={data.projects}
                          work={data.work}
                          subscribe={subscribe}
                          pages={[1, 2, 3]}
                        />
                        <BrowserApp data={contributions} subscribe={subscribe} />
                        <TerminalApp basics={data.basics} subscribe={subscribe} pages={[4]} />
                      </div>
                    </div>
                    <div className="lp-chin" aria-hidden="true">j6n</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* screen-space overlays */}
        <div className="lp-intro" aria-hidden="true">
          <div className="lp-intro-name">jonathan ng</div>
          <div className="lp-intro-sub mono">site reliability engineer · toronto</div>
        </div>

        <div className="lp-caps mono" aria-hidden="true">
          {CAPTIONS.map((c, i) => (
            <span className="lp-cap" data-i={i + 1} key={c}>
              ✦ {c}
            </span>
          ))}
        </div>

        <div className="lp-cta-kb mono">
          <a href="https://blog.j6n.ca/keyboards/index" target="_blank" rel="noreferrer">
            view my keyboards <span className="card-arrow">↗</span>
          </a>
        </div>

        <div className="lp-hint" aria-hidden="true">
          <span className="mouse" />
          scroll
        </div>

        <div className="lp-foot mono">© {data.basics.name}</div>
      </div>
    </section>
  )
}

export default LaptopScene
