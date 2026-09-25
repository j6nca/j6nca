'use client'

import React, { useEffect, useState } from 'react'
import LaptopScene from './laptop/LaptopScene'
import MobileSite from './mobile/MobileSite'

const MOBILE_MQ = '(max-width: 767px)'

/*
 * Picks the site for the viewport. The mobile site is server-rendered (it's
 * plain HTML that works without JS) and hidden on wide screens by CSS; once
 * mounted, wide viewports swap in the laptop scene. `?desktop` in the URL
 * — set by the mobile footer's "view desktop mode" link — forces the scene
 * on any viewport, and the scene then offers a "mobile view" link back.
 */
const SiteSwitch = ({ data, contributions }) => {
  // 'mobile' | 'desktop' | 'forced' (scene on a phone-sized viewport)
  const [mode, setMode] = useState('mobile')

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ)
    const forced = new URLSearchParams(window.location.search).has('desktop')
    const update = () => {
      if (forced) setMode(mq.matches ? 'forced' : 'desktop')
      else setMode(mq.matches ? 'mobile' : 'desktop')
    }
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  if (mode === 'mobile') {
    return <MobileSite data={data} contributions={contributions} />
  }
  return (
    <>
      <div className="progress-bar" aria-hidden="true" />
      <main className="shell">
        <LaptopScene
          data={data}
          contributions={contributions}
          mobileHref={mode === 'forced' ? './' : null}
        />
      </main>
    </>
  )
}

export default SiteSwitch
