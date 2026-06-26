'use client'

import React, { useEffect, useRef, useState } from 'react'

/**
 * Reveal — zero-dependency scroll-triggered animation wrapper.
 *
 * Wraps children in an element that fades/slides into view the first time it
 * enters the viewport, using IntersectionObserver. Falls back to visible if
 * the API is unavailable (e.g. very old browsers / SSR snapshot).
 *
 * Props:
 *   variant  'up' | 'scale' | 'left' | 'right'  (default 'up')
 *   delay    ms to stagger the reveal (default 0)
 *   as       element tag to render (default 'div')
 *   once     only animate the first time it's seen (default true)
 */
const variantClass = {
  up: '',
  scale: 'v-scale',
  left: 'v-left',
  right: 'v-right',
}

const Reveal = ({
  children,
  variant = 'up',
  delay = 0,
  as: Tag = 'div',
  once = true,
  className = '',
  style,
  ...rest
}) => {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true)
            if (once) observer.unobserve(entry.target)
          } else if (!once) {
            setVisible(false)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [once])

  const classes = [
    'reveal',
    variantClass[variant] || '',
    visible ? 'is-visible' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Tag
      ref={ref}
      className={classes}
      style={{ '--reveal-delay': `${delay}ms`, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export default Reveal
