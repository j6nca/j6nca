'use client'

const terms = [
  'KUBERNETES','CREATIVITY','GUITAR','BUILD','OBSERVABILITY','SYSTEMS','CURIOSITY',
  'HOMELAB','OPEN SOURCE','RELIABILITY','GAMES','DESIGN','AUTOMATION','EXPERIMENTS',
  'INFRASTRUCTURE','RUST','KEYBOARDS','TOOLS','EXPLORATION','ENGINEERING',
  'LEARNING','DEVOPS','MAKING','IDEAS','MUSIC','CODING','COMMUNITY'
]

// A dense, repeating typographic texture clipped to the j6n wordmark.
// The text is decorative; the accessible heading is provided separately.
export default function WordCloud() {
  const rows = Array.from({ length: 19 }, (_, row) => {
    const count = 5 + row % 3
    return Array.from({ length: count }, (_, column) => ({
      text: terms[(row * 7 + column * 3) % terms.length],
      x: -65 + column * 250 + (row % 2) * 90,
      y: 42 + row * 42,
      size: 17 + ((row + column) % 3) * 4,
    }))
  }).flat()

  return (
    <div className="editorial-wordcloud">
      <h1 id="editorial-heading" className="editorial-visually-hidden">Built out of curiosity.</h1>
      <svg viewBox="0 0 1200 660" preserveAspectRatio="xMidYMid meet" role="img" aria-label="j6n formed from words about engineering, curiosity, creativity, and making things">
        <defs>
          <clipPath id="editorial-cloud-letters">
            <text x="600" y="526" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontSize="610" fontWeight="900" letterSpacing="-47">j6n</text>
          </clipPath>
        </defs>
        <g clipPath="url(#editorial-cloud-letters)" fill="var(--ink)" fontFamily="Arial, sans-serif" fontWeight="800">
          {rows.map((word, index) => <text key={index} x={word.x} y={word.y} fontSize={word.size} letterSpacing="1.1">{word.text}</text>)}
        </g>
      </svg>
      <p className="editorial-cloud-tagline">Built out of curiosity.</p>
    </div>
  )
}
