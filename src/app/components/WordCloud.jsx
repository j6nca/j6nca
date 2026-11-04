'use client'

import { useEffect, useState } from 'react'
import { cloudWords } from './wordCloudWords'

const WIDTH = 1200
const HEIGHT = 660
const GAP = 5
const normalize = value => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en')

// Pack complete horizontal words *inside* the actual letter strokes.
// Unlike a clipPath, this rejects any position that would truncate a word.
function layoutWords(words) {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return []

  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  ctx.fillStyle = '#000'
  ctx.font = '900 610px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const glyphWidth = ctx.measureText('j6n').width
  ctx.save()
  ctx.translate(WIDTH / 2, 0)
  ctx.scale(Math.min(1, 1090 / glyphWidth), 1)
  ctx.fillText('j6n', 0, 525)
  ctx.restore()

  const pixels = ctx.getImageData(0, 0, WIDTH, HEIGHT).data
  const stride = WIDTH + 1
  const integral = new Uint32Array(stride * (HEIGHT + 1))
  for (let y = 1; y <= HEIGHT; y++) {
    let row = 0
    for (let x = 1; x <= WIDTH; x++) {
      const i = ((y - 1) * WIDTH + x - 1) * 4
      row += pixels[i] < 80 ? 1 : 0
      integral[y * stride + x] = integral[(y - 1) * stride + x] + row
    }
  }
  const ink = (x, y, w, h) => {
    const x2 = x + w
    const y2 = y + h
    return integral[y2 * stride + x2] - integral[y * stride + x2] -
      integral[y2 * stride + x] + integral[y * stride + x]
  }

  const placed = []
  const ordered = [...words].sort((a, b) =>
    b.weight - a.weight || b.text.length - a.text.length
  )
  const intersects = (a, b) =>
    a.x < b.x + b.width + GAP && a.x + a.width + GAP > b.x &&
    a.y < b.y + b.height + GAP && a.y + a.height + GAP > b.y

  ordered.forEach((word, index) => {
    const preferred = word.weight === 3 ? 43 : word.weight === 2 ? 32 : 25
    let best = null
    for (let fontSize = preferred; fontSize >= 12 && !best; fontSize -= 2) {
      ctx.font = `800 ${fontSize}px Arial, sans-serif`
      const width = Math.ceil(ctx.measureText(word.text).width) + 4
      const height = Math.ceil(fontSize * 1.05)
      if (width >= WIDTH) continue
      const candidates = []
      // Offset each search to avoid a visually mechanical row/column grid.
      const xStart = (index * 17) % 9
      const yStart = (index * 11) % 9
      for (let y = yStart; y + height < HEIGHT; y += 9) {
        for (let x = xStart; x + width < WIDTH; x += 9) {
          const box = { x, y, width, height }
          if (placed.some(other => intersects(box, other))) continue
          // Every pixel of the word's bounding box must be inside the glyph.
          if (ink(x, y, width, height) < width * height * .985) continue
          // Prefer a spread across the silhouette, not vertical stacks.
          const nearest = placed.length
            ? Math.min(...placed.map(other => Math.hypot(
                x + width / 2 - (other.x + other.width / 2),
                y + height / 2 - (other.y + other.height / 2)
              )))
            : 200
          const score = nearest + ((x * 13 + y * 7 + index * 19) % 31)
          candidates.push({ ...box, score, fontSize })
        }
      }
      if (candidates.length) {
        candidates.sort((a, b) => b.score - a.score)
        best = candidates[0]
      }
    }
    if (best) placed.push({ ...best, ...word })
  })
  return placed
}

export default function WordCloud() {
  const [placements, setPlacements] = useState([])
  useEffect(() => {
    const unique = cloudWords.filter((word, index, words) =>
      words.findIndex(candidate => normalize(candidate.text) === normalize(word.text)) === index
    )
    setPlacements(layoutWords(unique))
  }, [])

  return (
    <div className="editorial-wordcloud">
      <h1 id="editorial-heading" className="editorial-visually-hidden">Built out of curiosity.</h1>
      <svg viewBox="0 0 1200 660" preserveAspectRatio="xMidYMid meet" role="img" aria-label="j6n formed from unique, horizontal words about engineering, creativity and personal interests">
        <g fontFamily="Arial, Helvetica, sans-serif" fontWeight="800">
          {placements.map(word => (
            <text
              key={normalize(word.text)}
              x={word.x + word.width / 2}
              y={word.y + word.height * .84}
              textAnchor="middle"
              fontSize={word.fontSize}
              className={`editorial-cloud-word editorial-cloud-weight-${word.weight}`}
            >{word.text}</text>
          ))}
        </g>
      </svg>
      <p className="editorial-cloud-tagline">Built out of curiosity.</p>
    </div>
  )
}
