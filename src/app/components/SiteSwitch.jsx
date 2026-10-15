'use client'

import React, { useEffect, useState } from 'react'
import LaptopScene from './laptop/LaptopScene'
import MobileSite from './mobile/MobileSite'

const MOBILE_MQ = '(max-width: 767px)'

/*
 * Picks the site. The 3D scene is the default on every screen size; the
 * text-only mobile site is opt-in via `?mobile` — linked as "mobile view"
 * from the scene on phone-sized screens — and is also what server renders,
 * so it works without JS. (A pre-paint script in layout.tsx hides it while
 * the scene is on its way, so phones don't see it flash.) The old `?desktop`
 * link still lands on the scene.
 */
const SiteSwitch = ({ data, contributions }) => {
  // 'text' (mobile site) until mounted, then 'scene' unless ?mobile
  const [mode, setMode] = useState('text')
  const [small, setSmall] = useState(false)

  useEffect(() => {
    const wantText = new URLSearchParams(window.location.search).has('mobile')
    setMode(wantText ? 'text' : 'scene')
    const mq = window.matchMedia(MOBILE_MQ)
    const update = () => setSmall(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  if (mode === 'text') {
    return <MobileSite data={data} contributions={contributions} />
  }
  return (
    <>
      <div className="progress-bar" aria-hidden="true" />
      <main className="shell">
        <LaptopScene data={data} contributions={contributions} mobileHref={small ? '?mobile' : null} />
      </main>
    </>
  )
}

export default SiteSwitch
