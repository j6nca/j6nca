'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { DEFAULT_ZOOM } from './three/pose'
import World3D from './three/World3D'
import TerminalApp from './TerminalApp'
import WaypointApp from './WaypointApp'
import GetbudApp from './GetbudApp'
import ObsidianApp from './ObsidianApp'
import BrowserApp from './BrowserApp'
import SplitFlap from '../SplitFlap'

/*
 * The whole site is one scene: a room — standing desk, server rack,
 * ultrawide on an arm, the usual peripheral sprawl — with a laptop on the
 * desk filling the viewport once the camera closes in. The room, the laptop
 * and the camera are three.js (World3D); the laptop screen's content is
 * real DOM attached in 3D, so every app keeps working unchanged.
 *
 * The story advances in 5 discrete "beats". In the room view (beat 0) the
 * wheel / a vertical drag zooms and a horizontal swipe or drag pans; clicking
 * (tapping) the monitor flies in. From there any scroll intent (wheel burst,
 * touch swipe, arrow key) tweens the scene to the next/previous beat, and
 * scrolling back past the first page returns to the room. Each beat's 0→1 progress is published as a CSS var (--b0..--b4)
 * that all content animation derives from; World3D reads the same state
 * through `subscribe` and drives the camera, the lid hinge and the rack
 * LEDs from it.
 *
 *   beat 0   dolly from the room's wide shot into the monitor while
 *            whoami + about types into the idle terminal
 *   beat 1   cat ~/projects.md
 *   beat 2   cat ~/work_experience.md
 *   beat 3   swipe to the browser, contribution graph decodes
 *   beat 4   swipe back, motd — contact, resume, curl
 *
 * Resting on raw = n shows caption n (00 room … 05 contact).
 *
 * The screen's app strip is laid out in story order — terminal (whoami /
 * projects / work) · contrib browser · terminal (motd) — so every screen
 * change is a single swipe to the left; --app is the strip index.
 *
 * Project visualizations live off the main path. Clicking a project row
 * that has one opens a "detail": the screen slides left to reveal the
 * visual pane (waypoint · getbud · obsidian · kube-cats terminal) parked
 * to the right of the strip, or — for keyboards — the camera dives to the
 * deck while k-e-y-b-o-a-r-d-s ↵ types itself. The detail's 0→1 progress
 * is published as --dp (raw), --ds (screen slide) and --kb (keyboard
 * dive); the pane id is mirrored on [data-detail]. A "return to projects"
 * action or any scroll intent closes it and the story resumes on the
 * projects beat.
 *
 * prefers-reduced-motion swaps the canvas for a flat stack of the same
 * app panes, fully revealed.
 */

const BANDS = 5
// opening-shot framing: a distance multiplier, 0.8 = 20% closer than wide

const CAPTIONS = [
  '00 — the room',
  '01 — hello',
  '02 — projects',
  '03 — experience',
  '04 — commits',
  '05 — contact',
]

// detail id → caption; ids are what TerminalApp's project rows open
const DETAILS = {
  keyboards: '02 — projects · keyboards',
  waypoint: '02 — projects · waypoint',
  getbud: '02 — projects · getbud',
  nebula: '02 — projects · nebula.md',
  'kube-cats': '02 — projects · kube-cats',
}

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const smooth = (u) => {
  u = clamp(u)
  return u * u * (3 - 2 * u)
}
const seg = (v, a, b) => clamp((v - a) / (b - a))

// Night outside 7am–6pm local time. Safe to read the clock during the first
// render: the scene only mounts client-side (SiteSwitch swaps it in after
// mount), so there's no server render to mismatch, and starting in the
// right mood means World3D's lights and the CSS sky open on it directly
// rather than fading over from day.
const DAY_START = 7
const NIGHT_START = 18
const isNightNow = () => {
  const h = new Date().getHours()
  return h < DAY_START || h >= NIGHT_START
}

const isLowPower = () =>
  window.matchMedia('(pointer: coarse)').matches || (navigator.deviceMemory ?? 8) <= 4

// Backdrop behind the (transparent) canvas: the day/night sky gradient
// (stars by night), crossfaded by [data-mood] in three.css. The clouds,
// sun and moon are 3D (three/Sky.jsx).
const Sky = () => (
  <div className="lp-sky" aria-hidden="true">
    <div className="lp-sky-day" />
    <div className="lp-sky-night" />
  </div>
)

// `mobileHref`: on phone-sized screens, a link to the text-only site.
const LaptopScene = ({ data, contributions, mobileHref }) => {
  const rootRef = useRef(null)
  const subsRef = useRef(new Set())
  // imperative detail navigation, populated by the scene effect
  const navRef = useRef(null)
  const [reduced, setReduced] = useState(false)
  // day / night — starts from the visitor's local clock (see isNightNow),
  // then the floor lamp in the room toggles it; the CSS sky reads
  // [data-mood] and World3D eases its lights toward it
  const [night, setNight] = useState(isNightNow)
  // touch devices or ≤4GB memory get a lighter render (see Canvas/World3D)
  const [lowPower] = useState(isLowPower)
  const toggleMood = useCallback(() => setNight((n) => !n), [])

  // Children (World3D camera, nebula canvas, contribution decode, terminal
  // pages) register a callback and get the frame state after each scroll
  // update — one driver, deterministic ordering. Canvas children mount on
  // R3F's own schedule, which can land *after* the mount-time render(0), so
  // a late subscriber is immediately caught up with the latest state.
  const latestRef = useRef(null)
  const subscribe = useCallback((fn) => {
    subsRef.current.add(fn)
    if (latestRef.current) fn(latestRef.current)
    return () => subsRef.current.delete(fn)
  }, [])

  const openDetail = useCallback((id) => navRef.current?.open(id), [])
  const closeDetail = useCallback(() => navRef.current?.close(), [])
  // click/tap the monitor in the room view to fly in to the terminal
  const enterScreen = useCallback(() => navRef.current?.enter(), [])
  const isAtRoom = useCallback(() => navRef.current?.atRoom() ?? false, [])
  // opening-shot pan/zoom state (drag, horizontal trackpad swipe, pinch
  // or +/- keys), clamped to sane limits
  const panRef = useRef({ yaw: 0, target: 0, zoom: DEFAULT_ZOOM, zoomTarget: DEFAULT_ZOOM })

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Static fallback: the apps render as a flat stack; tell subscribers
      // to render their finished states once.
      setReduced(true)
      const state = {
        raw: BANDS,
        t: 1,
        bands: Array(BANDS + 1).fill(1),
        reduced: true,
        detail: null,
        dp: 1,
      }
      subsRef.current.forEach((fn) => fn(state))
      return
    }

    let raf = 0

    // Discrete beat stepper: raw tweens between integers; render() derives
    // everything else exactly as the scroll-driven version did. Time is
    // accumulated with a per-frame cap: a late first rAF after a gesture
    // (browser still settling after load) would otherwise skip the tween
    // ahead and read as a jump cut.
    const BEAT_MS = 1500
    const easeBeat = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2)

    // shared tween clock helpers (cap dt so stalls don't skip the animation)
    const makeClock = (ms) => {
      let elapsed = 0
      let last = null
      return {
        reset() {
          elapsed = 0
          last = null
        },
        step(now) {
          const dt = Math.min(now - (last ?? now), 48)
          last = now
          elapsed = Math.min(ms, elapsed + dt)
          return elapsed / ms
        },
      }
    }

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
    let lastStepT = 0
    let touchY = null
    let touchDone = false
    let touchLastY = 0

    // Project detail: `detail` is the open pane id (null when closed), `dp`
    // its 0→1 progress, tweened on its own clock so a beat tween and a detail
    // tween never fight over `raw`.
    const DETAIL_MS = 1800
    let detail = null
    let dp = 0
    let dFrom = 0
    let dTarget = 0
    let dStart = 0
    let dAnimating = false

    // Custom-property writes invalidate style for the whole subtree, so only
    // touch a var when its value actually changed — at any given moment a
    // beat tween moves one or two of them, not all of them.
    const varCache = {}
    const setVar = (el, name, val) => {
      if (varCache[name] === val) return
      varCache[name] = val
      el.style.setProperty(name, val)
    }

    const render = (r) => {
      // beat 0 = the room→desk dolly (+ whoami); beats 1..4 ride on top of it
      const b = [clamp(r)]
      for (let i = 1; i <= BANDS - 1; i++) {
        b[i] = clamp(r - i)
      }
      for (let i = 0; i < BANDS; i++) {
        setVar(root, `--b${i}`, b[i].toFixed(4))
      }
      // top progress bar (the CSS scroll-timeline can't see beat progress)
      setVar(document.documentElement, '--scene-p', (r / BANDS).toFixed(4))

      // app strip index — story order, every transition swipes left by one
      const app =
        smooth(seg(b[3], 0.02, 0.3)) + // → contribution browser
        smooth(seg(b[4], 0, 0.26)) // → terminal (motd)
      setVar(root, '--app', app.toFixed(4))

      // project detail: screen slide for the pane details, camera dive for
      // keyboards — the pane detail's page/typing reveals read --dp directly
      const kb = detail === 'keyboards' ? dp : 0
      const ds = detail && detail !== 'keyboards' ? smooth(seg(dp, 0, 0.4)) : 0
      setVar(root, '--dp', dp.toFixed(4))
      setVar(root, '--ds', ds.toFixed(4))
      setVar(root, '--kb', kb.toFixed(4))

      const beat = Math.min(BANDS, Math.round(r))
      if (root.dataset.beat !== String(beat)) root.dataset.beat = String(beat)

      const state = { raw: r, t: r / BANDS, bands: b, reduced: false, detail, dp }
      latestRef.current = state
      subsRef.current.forEach((fn) => fn(state))
    }

    const beatClock = makeClock(BEAT_MS)
    const tick = (now) => {
      raf = 0
      const u = beatClock.step(now)
      raw = from + (target - from) * easeBeat(u)
      render(raw)
      if (u < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        animating = false
      }
    }

    // Detail tween — same easing as the beats, on its own clock. When a
    // close lands, the pane id is dropped so its CSS animations reset and a
    // revisit replays from the beginning.
    let dRaf = 0
    const detailClock = makeClock(DETAIL_MS)
    const dTick = (now) => {
      dRaf = 0
      const u = detailClock.step(now)
      dp = dFrom + (dTarget - dFrom) * easeBeat(u)
      if (u < 1) {
        dRaf = requestAnimationFrame(dTick)
      } else {
        dAnimating = false
        if (dTarget === 0) {
          detail = null
          delete root.dataset.detail
        }
      }
      render(raw)
    }
    const tweenDetail = (to) => {
      dFrom = dp
      dTarget = to
      dAnimating = true
      dStart = performance.now()
      detailClock.reset()
      if (dRaf) cancelAnimationFrame(dRaf)
      dRaf = requestAnimationFrame(dTick)
    }
    const open = (id) => {
      if (!(id in DETAILS) || animating || resetting) return
      if (detail === id && (dTarget === 1 || dp === 1)) return
      if (detail && detail !== id) {
        // switching panes mid-close: jump straight to the new one
        dp = 0
      }
      detail = id
      root.dataset.detail = id
      tweenDetail(1)
    }
    const close = () => {
      if (!detail || (dAnimating && dTarget === 0)) return
      tweenDetail(0)
    }
    // the room view: at rest on (or heading back to) beat 0, nothing open
    const atRoom = () => !resetting && !detail && (animating ? target === 0 : Math.round(raw) === 0)
    // put the opening shot back to its default angle + zoom — on the way
    // in, so the camera always comes back out to the default view
    const resetPan = () => {
      panRef.current.target = 0
      panRef.current.zoomTarget = DEFAULT_ZOOM
    }
    const enter = () => {
      if (atRoom() && !animating) step(1)
    }
    navRef.current = { open, close, enter, atRoom }

    // End of the story: the camera pulls back over the desk and out to the
    // room's opening shot (World3D follows --b0 down), then the story
    // resets to beat 0 so the journey can replay.
    const RESET_MS = 2600
    const resetClock = makeClock(RESET_MS)
    const resetTick = (now) => {
      raf = 0
      const u = resetClock.step(now)
      const e = easeBeat(u)
      // --b0 drives the camera, the panel-boot overlay and the intro title:
      // the screen dims and the title fades back in as the camera pulls out
      const b0 = 1 - seg(u, 0.1, 0.85)
      setVar(root, '--b0', b0.toFixed(4))
      setVar(document.documentElement, '--scene-p', (1 - e).toFixed(4))
      // subscribers re-derive the camera from the eased vars
      const b = Array.from({ length: BANDS }, (_, i) => (i === 0 ? b0 : 0))
      subsRef.current.forEach((fn) => fn({ raw: 0, t: 0, bands: b, reduced: false, detail: null, dp: 0 }))
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
    // While a project detail is open (or opening), scroll intent in either
    // direction closes it instead of moving the story.
    const step = (dir) => {
      if (resetting) return
      if (detail) {
        close()
        return
      }
      const base = animating ? target : Math.round(raw)
      if (base === 0 && dir > 0) resetPan()
      if (dir > 0 && base >= BANDS) {
        if (animating) return
        animating = true
        resetting = true
        resetPan()
        root.dataset.beat = '0'
        animStart = performance.now()
        resetClock.reset()
        if (raf) cancelAnimationFrame(raf)
        raf = requestAnimationFrame(resetTick)
        return
      }
      const next = clamp(base + dir, 0, BANDS)
      if (next === base && !animating) {
        // scrolling "back" at the very start re-centres the opening shot
        if (dir < 0 && base === 0) {
          panRef.current.target = 0
          panRef.current.zoomTarget = DEFAULT_ZOOM
        }
        return
      }
      if (animating && next === target) return
      from = raw
      target = next
      animating = true
      animStart = performance.now()
      beatClock.reset()
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(tick)
    }

    // Strictly one step per physical gesture. A gesture is an unbroken
    // stream of wheel events: trackpads emit every ~10ms through the whole
    // flick + momentum tail, so only a real pause (>60ms of silence) starts
    // a new gesture — and by the time a decaying tail has gaps that long,
    // its deltas are too small to reach the step threshold before each
    // sparse event resets the accumulator. A discrete mouse-wheel notch is
    // its own gesture (one large delta after a pause) and steps directly.
    const GESTURE_GAP = 60
    const STEP_REFRACTORY = 250
    const onWheel = (e) => {
      e.preventDefault()
      // In the room view the wheel zooms (and horizontal swipes pan) the
      // opening shot; clicking the monitor is what flies in. Once in the
      // terminal, scroll steps through its pages as before.
      if (atRoom()) {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
          panRef.current.target = clamp(panRef.current.target - e.deltaX * 0.12, -60, 60)
        } else {
          panRef.current.zoomTarget = clamp(panRef.current.zoomTarget * Math.exp(e.deltaY * 0.0015), 0.45, 2.4)
        }
        return
      }
      if (resetting) return
      const now = performance.now()
      const gap = now - lastWheelT
      lastWheelT = now

      if (gap > GESTURE_GAP) {
        gestureUsed = false
        acc = 0
      }
      if (gestureUsed) return
      if (now - lastStepT < STEP_REFRACTORY) return
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
      touchLastY = touchY
      touchDone = false
    }
    const onTouchMove = (e) => {
      e.preventDefault()
      if (touchY == null) return
      const y = e.touches[0].clientY
      // room view: a vertical drag zooms (up = closer); tap the monitor to go in
      if (atRoom()) {
        panRef.current.zoomTarget = clamp(panRef.current.zoomTarget * Math.exp((y - touchLastY) * 0.004), 0.45, 2.4)
        touchLastY = y
        return
      }
      if (touchDone) return
      const dy = touchY - y
      if (Math.abs(dy) > 45) {
        touchDone = true
        step(dy > 0 ? 1 : -1)
      }
    }

    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
      // +/− zoom the opening shot (with the pan)
      if (raw < 0.5 && (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '_')) {
        const dir = e.key === '+' || e.key === '=' ? 1 : -1
        // zoom is a distance multiplier: smaller = closer
        panRef.current.zoomTarget = clamp(panRef.current.zoomTarget * Math.exp(-dir * 0.18), 0.45, 2.4)
        return
      }
      if (['ArrowDown', 'PageDown', ' ', 'j'].includes(e.key)) {
        e.preventDefault()
        step(1)
      } else if (['ArrowUp', 'PageUp', 'k'].includes(e.key)) {
        e.preventDefault()
        step(-1)
      } else if (e.key === 'Escape' && detail) {
        close()
      }
    }

    render(0)
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('keydown', onKey)
    return () => {
      navRef.current = null
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('keydown', onKey)
      if (raf) cancelAnimationFrame(raf)
      if (dRaf) cancelAnimationFrame(dRaf)
    }
  }, [])

  const screenApps = (
    <>
      <div className="lp-apps">
        <TerminalApp
          basics={data.basics}
          projects={data.projects}
          work={data.work}
          subscribe={subscribe}
          pages={[0, 2, 3]}
          onOpen={openDetail}
        />
        <BrowserApp data={contributions} subscribe={subscribe} />
        <TerminalApp basics={data.basics} subscribe={subscribe} pages={[4]} />
      </div>

      {/* project visuals, parked one screen to the right */}
      <div className="lp-detail">
        <div className="lp-detail-pane" data-d="waypoint">
          <WaypointApp onReturn={closeDetail} />
        </div>
        <div className="lp-detail-pane" data-d="getbud">
          <GetbudApp onReturn={closeDetail} />
        </div>
        <div className="lp-detail-pane" data-d="nebula">
          <ObsidianApp subscribe={subscribe} onReturn={closeDetail} />
        </div>
        <div className="lp-detail-pane" data-d="kube-cats">
          <TerminalApp basics={data.basics} subscribe={subscribe} pages={[1]} onReturn={closeDetail} />
        </div>
      </div>
    </>
  )

  return (
    <section
      className="lp-scroll"
      ref={rootRef}
      data-beat="0"
      data-mood={night ? 'night' : 'day'}
      aria-label="Jonathan Ng — portfolio"
    >
      <h1 className="sr-only">{data.basics.name} — {data.basics.label}</h1>

      <div className="lp-stage">
        {!reduced && <Sky />}
        {reduced ? (
          <div className="lp-static">
            <div className="lp-screen">{screenApps}</div>
          </div>
        ) : (
          <Canvas
            className="lp-canvas"
            shadows
            // phones/tablets render at ≤1.5× — 2× on a 3× screen is ~1.8×
            // the pixels (and the antialias buffers) for little visible gain
            dpr={lowPower ? [1, 1.5] : [1, 2]}
            gl={{ antialias: true, toneMappingExposure: 1.25 }}
            camera={{ fov: 42, near: 20, far: 150000, position: [690, 1886, 2974] }}
          >
            <World3D
              subscribe={subscribe}
              panRef={panRef}
              data={data}
              contributions={contributions}
              onOpen={openDetail}
              onClose={closeDetail}
              night={night}
              onToggleMood={toggleMood}
              lowPower={lowPower}
              onEnter={enterScreen}
              isAtRoom={isAtRoom}
            />
          </Canvas>
        )}

        {/* screen-space overlays */}
        <div className="lp-intro" aria-hidden="true">
          <div className="lp-intro-name">
            <SplitFlap text="jonathan ng" startDelay={250} tickMs={60} settleMs={2750} />
          </div>
          <div className="lp-intro-sub mono">
            <SplitFlap text="site reliability engineer · syde 2021 · toronto" startDelay={500} tickMs={45} settleMs={2500} />
          </div>
        </div>

        <div className="lp-caps mono" aria-hidden="true">
          {CAPTIONS.map((c, i) => (
            <span className="lp-cap" data-i={i} key={c}>
              ✦ {c}
            </span>
          ))}
          {Object.entries(DETAILS).map(([id, c]) => (
            <span className="lp-cap" data-d={id} key={id}>
              ✦ {c}
            </span>
          ))}
        </div>

        <div className="lp-cta-kb mono">
          <a href="https://blog.j6n.ca/keyboards/index" target="_blank" rel="noreferrer">
            view my keyboards <span className="card-arrow">↗</span>
          </a>
          <button type="button" className="lp-return" onClick={closeDetail}>
            ← return to projects
          </button>
        </div>

        <div className="lp-hint" aria-hidden="true">
          <span className="mouse" />
          scroll
        </div>

        <div className="lp-foot mono">
          {mobileHref && <a href={mobileHref}>mobile view</a>}
          <span>© {data.basics.name}</span>
        </div>
      </div>
    </section>
  )
}

export default LaptopScene
