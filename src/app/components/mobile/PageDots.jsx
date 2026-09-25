'use client'

import React, { useEffect, useState } from 'react'

// Page rail for the mobile site: one dot per full-screen section. The active
// dot is whichever section straddles the middle of the scroller (a 1px-tall
// root margin band at 50%), which also works for sections taller than the
// viewport. Tapping a dot scrolls its page into view.
const PageDots = ({ pages }) => {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const root = document.querySelector('.m-pages')
    const els = pages.map((p) => document.getElementById(p.id)).filter(Boolean)
    if (!root || !els.length) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(els.indexOf(e.target))
        })
      },
      { root, rootMargin: '-50% 0px -50% 0px', threshold: 0 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [pages])

  const go = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav className="m-dots" aria-label="Sections">
      {pages.map((p, i) => (
        <button
          key={p.id}
          type="button"
          className={`m-dot${i === active ? ' on' : ''}`}
          aria-label={p.label}
          aria-current={i === active ? 'page' : undefined}
          onClick={() => go(p.id)}
        />
      ))}
    </nav>
  )
}

export default PageDots
