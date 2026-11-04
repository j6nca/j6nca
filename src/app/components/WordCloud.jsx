import { cloudWords } from './wordCloudWords'

// Deliberately composed rather than repeating a texture.
// Each term is rendered exactly once, horizontally (no rotation); the mask preserves the j6n silhouette.
const placements = [
  [165, 92], [585, 88], [980, 98],
  [185, 152], [620, 158], [985, 160],
  [155, 220], [595, 226], [960, 222],
  [190, 282], [600, 290], [1000, 287],
  [170, 354], [605, 358], [980, 353],
  [175, 422], [590, 425], [975, 426],
  [160, 484], [605, 490], [975, 486],
  [170, 545], [595, 550], [970, 546],
  [220, 604], [745, 604],
  [360, 330], [800, 390], [1040, 585],
  [315, 105], [785, 130], [1110, 205],
  [310, 260], [810, 310], [1110, 365],
  [325, 450], [800, 465], [360, 580], [850, 590],
  [265, 180], [780, 195], [1030, 260], [290, 390],
  [805, 415], [1030, 515], [280, 520], [800, 535],
]

const normalize = value => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en')

export default function WordCloud() {
  const uniqueWords = cloudWords.filter((word, index, words) =>
    words.findIndex(candidate => normalize(candidate.text) === normalize(word.text)) === index
  )

  return (
    <div className="editorial-wordcloud">
      <h1 id="editorial-heading" className="editorial-visually-hidden">Built out of curiosity.</h1>
      <svg viewBox="0 0 1200 660" preserveAspectRatio="xMidYMid meet" role="img" aria-label="j6n formed from unique words describing engineering, creativity, projects, and personal interests">
        <defs>
          <clipPath id="editorial-cloud-letters">
            <text x="600" y="526" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontSize="610" fontWeight="900" letterSpacing="-47">j6n</text>
          </clipPath>
        </defs>
        <g clipPath="url(#editorial-cloud-letters)" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800">
          {uniqueWords.map((word, index) => {
            const [x, y] = placements[index] || [600, 625]
            const size = word.weight === 3 ? 43 : word.weight === 2 ? 30 : 22
            return (
              <text
                key={normalize(word.text)}
                x={x}
                y={y}
                textAnchor="middle"
                fontSize={size}
                letterSpacing={word.weight === 3 ? '-1' : '.5'}
                className={`editorial-cloud-word editorial-cloud-weight-${word.weight}`}
              >{word.text}</text>
            )
          })}
        </g>
      </svg>
      <p className="editorial-cloud-tagline">Built out of curiosity.</p>
    </div>
  )
}
