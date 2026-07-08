'use client'

import React, { useLayoutEffect, useRef } from 'react'

const ASCII_NAME = `     ██╗ ██████╗ ███╗   ██╗ █████╗ ████████╗██╗  ██╗ █████╗ ███╗   ██╗
     ██║██╔═══██╗████╗  ██║██╔══██╗╚══██╔══╝██║  ██║██╔══██╗████╗  ██║
     ██║██║   ██║██╔██╗ ██║███████║   ██║   ███████║███████║██╔██╗ ██║
██   ██║██║   ██║██║╚██╗██║██╔══██║   ██║   ██╔══██║██╔══██║██║╚██╗██║
╚█████╔╝╚██████╔╝██║ ╚████║██║  ██║   ██║   ██║  ██║██║  ██║██║ ╚████║
 ╚════╝  ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝

███╗   ██╗ ██████╗
████╗  ██║██╔════╝
██╔██╗ ██║██║  ███╗
██║╚██╗██║██║   ██║
██║ ╚████║╚██████╔╝
╚═╝  ╚═══╝ ╚═════╝`

const LINES = ASCII_NAME.split('\n')

// Bottom-of-letter shading per figlet block: the last ██ row dims a step,
// the ╚═╝ base row dims further.
const SHADE_CLASS = {
  4: 'shade-1',
  5: 'shade-2',
  11: 'shade-1',
  12: 'shade-2',
}

/**
 * Figlet name, scaled to fit its container. The art keeps a fixed font size
 * and shrinks via transform: font-size-based shrinking rounds each glyph's
 * advance width independently at tiny sizes, which visibly warps the columns
 * on mobile. A uniform scale of a full-size layout can't misalign.
 */
const AsciiName = () => {
  const boxRef = useRef(null)
  const preRef = useRef(null)

  useLayoutEffect(() => {
    const box = boxRef.current
    const pre = preRef.current
    if (!box || !pre) return

    const fit = () => {
      const scale = Math.min(1, box.clientWidth / pre.offsetWidth)
      pre.style.transform = `scale(${scale})`
      box.style.height = `${pre.offsetHeight * scale}px`
    }

    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={boxRef} className="term-name-box" aria-hidden="true">
      <pre ref={preRef} className="term-name">
        {LINES.map((line, i) => (
          <React.Fragment key={i}>
            {SHADE_CLASS[i] ? <span className={SHADE_CLASS[i]}>{line}</span> : line}
            {i < LINES.length - 1 ? '\n' : ''}
          </React.Fragment>
        ))}
      </pre>
    </div>
  )
}

export default AsciiName
