import { cloudWords } from './wordCloudWords'

// Construct the lettering from complete words, never from a clipping mask.
// Each column traces a loose j / 6 / n silhouette; every term stays horizontal.
const normalize = value => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en')
const columns = [
  { center: 195, width: 285 },
  { center: 600, width: 375 },
  { center: 1005, width: 325 },
]
const lineHeight = 29
const top = 48

function placeWords(words) {
  const groups = [[], [], []]
  words.forEach((word, index) => groups[index % 3].push(word))
  return groups.flatMap((group, column) => {
    const { center, width } = columns[column]
    return group.map((word, row) => {
      const count = group.length
      const progress = count > 1 ? row / (count - 1) : 0
      // Loose letterform contours, without ever cutting into the text.
      let offset = 0
      let available = width
      if (column === 0) {
        // j: narrow upright and a gentle hook at the bottom.
        offset = progress > .78 ? -55 * ((progress - .78) / .22) : 38
        available = progress < .16 ? width * .66 : width * .8
      } else if (column === 1) {
        // 6: upper curve and a broad lower bowl.
        offset = progress < .3 ? -36 * (1 - progress / .3) : 0
        available = progress > .4 && progress < .7 ? width * .72 : width
      } else {
        // n: left stem, arched top, and rightward lower sweep.
        offset = progress < .25 ? -25 : 30 * progress
        available = progress < .3 ? width * .82 : width * .9
      }
      const preferred = word.weight === 3 ? 33 : word.weight === 2 ? 27 : 22
      // Approximate text width conservatively so long terms fit entirely.
      const estimatedUnits = [...word.text].reduce((sum, char) =>
        sum + (char === ' ' ? .34 : char === 'I' || char === 'L' ? .38 : .68), 0)
      const size = Math.max(14, Math.min(preferred, available / Math.max(estimatedUnits, 1)))
      return { ...word, x: center + offset, y: top + row * lineHeight, size }
    })
  })
}

export default function WordCloud() {
  const uniqueWords = cloudWords.filter((word, index, words) =>
    words.findIndex(candidate => normalize(candidate.text) === normalize(word.text)) === index
  )
  const placements = placeWords(uniqueWords)

  return (
    <div className="editorial-wordcloud">
      <h1 id="editorial-heading" className="editorial-visually-hidden">Built out of curiosity.</h1>
      <svg viewBox="0 0 1200 660" preserveAspectRatio="xMidYMid meet" role="img" aria-label="j6n shaped from complete, horizontal words about engineering, creativity and personal interests">
        <g fontFamily="Arial, Helvetica, sans-serif" fontWeight="800">
          {placements.map(word => (
            <text
              key={normalize(word.text)}
              x={word.x}
              y={word.y}
              textAnchor="middle"
              fontSize={word.size}
              className={`editorial-cloud-word editorial-cloud-weight-${word.weight}`}
            >{word.text}</text>
          ))}
        </g>
      </svg>
      <p className="editorial-cloud-tagline">Built out of curiosity.</p>
    </div>
  )
}
