'use client'

import React, { useState } from 'react'

/**
 * Renders a job's highlight bullets, showing the first `preview` (default 3) and
 * tucking the rest behind a "See more" toggle. Client component so the timeline
 * itself can stay a server component.
 */
const PREVIEW = 3

const WorkHighlights = ({ highlights = [] }) => {
  const [expanded, setExpanded] = useState(false)

  if (highlights.length === 0) return null

  const hidden = highlights.length - PREVIEW
  const shown = expanded ? highlights : highlights.slice(0, PREVIEW)

  return (
    <>
      <ul className="tl-highlights">
        {shown.map((h, hi) => (
          <li key={hi} className={hi >= PREVIEW ? 'tl-extra' : undefined}>
            {h}
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          className="tl-more"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'See less ↑' : `See more (+${hidden}) ↓`}
        </button>
      )}
    </>
  )
}

export default WorkHighlights
