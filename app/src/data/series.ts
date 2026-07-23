export type FruitKey =
  | 'strawberry'
  | 'blueberry'
  | 'grape'
  | 'orange'
  | 'watermelon'
  | 'lemon'
  | 'cherry'
  | 'peach'
  | 'banana'
  | 'pineapple'
  | 'kiwi'
  | 'mango'
  | 'coconut'
  | 'apple'
  | 'avocado'
  | 'dragonfruit'
  | 'pomegranate'
  | 'pear'
  | 'raspberry'
  | 'lime'

export interface FruitTheme {
  glyph: string
  from: string
  to: string
  glow: string
  ink: string // text color that reads on the poster
}

export const FRUIT_THEMES: Record<FruitKey, FruitTheme> = {
  strawberry:  { glyph: '🍓', from: '#7a0b23', to: '#e8384f', glow: '#ff5a72', ink: '#fff0f2' },
  blueberry:   { glyph: '🫐', from: '#111a52', to: '#4457c4', glow: '#6f80ff', ink: '#eef1ff' },
  grape:       { glyph: '🍇', from: '#341347', to: '#8b4a9c', glow: '#c07ad6', ink: '#f7edfb' },
  orange:      { glyph: '🍊', from: '#7a3405', to: '#ff8a2a', glow: '#ffb15e', ink: '#fff4e6' },
  watermelon:  { glyph: '🍉', from: '#0d4d2b', to: '#f0426b', glow: '#57e08a', ink: '#eafff0' },
  lemon:       { glyph: '🍋', from: '#6b5c00', to: '#e9d23a', glow: '#fff06b', ink: '#1a1600' },
  cherry:      { glyph: '🍒', from: '#5c0512', to: '#c31026', glow: '#ff445c', ink: '#fff0f1' },
  peach:       { glyph: '🍑', from: '#7a2e33', to: '#ff9a8b', glow: '#ffb7ad', ink: '#3a1418' },
  banana:      { glyph: '🍌', from: '#5c4a00', to: '#ffce3a', glow: '#fff07a', ink: '#241d00' },
  pineapple:   { glyph: '🍍', from: '#5c4a06', to: '#e0b62c', glow: '#ffe06b', ink: '#1f1900' },
  kiwi:        { glyph: '🥝', from: '#274d0a', to: '#8fb93a', glow: '#c3ec6b', ink: '#f2ffe0' },
  mango:       { glyph: '🥭', from: '#7a3d00', to: '#ffa62b', glow: '#ffcf6b', ink: '#2b1600' },
  coconut:     { glyph: '🥥', from: '#3a2a1e', to: '#9c7a5c', glow: '#d8bfa6', ink: '#fff6ec' },
  apple:       { glyph: '🍎', from: '#5c0a10', to: '#d61e2b', glow: '#ff4a56', ink: '#fff0f0' },
  avocado:     { glyph: '🥑', from: '#25400f', to: '#7a9b34', glow: '#b6d96b', ink: '#f2ffe0' },
  dragonfruit: { glyph: '🐉', from: '#4a0b3d', to: '#e83a8f', glow: '#ff6bb5', ink: '#fff0f8' },
  pomegranate: { glyph: '🍎', from: '#5c0716', to: '#b91232', glow: '#ff445c', ink: '#fff0f2' },
  pear:        { glyph: '🍐', from: '#3f4d0a', to: '#a6c23a', glow: '#d0ec6b', ink: '#f4ffe0' },
  raspberry:   { glyph: '🍓', from: '#5c0a2e', to: '#c72366', glow: '#ff5a95', ink: '#fff0f6' },
  lime:        { glyph: '🍋', from: '#274d0a', to: '#7ab933', glow: '#b6ec6b', ink: '#f2ffe0' },
}

/** Defensive theme lookup — never crashes on an unknown/generated fruit. */
export const fruitTheme = (fruit: string): FruitTheme =>
  FRUIT_THEMES[fruit as FruitKey] ?? FRUIT_THEMES.strawberry

export interface Series {
  id: string
  title: string
  fruit: FruitKey
  year: number
  maturity: string
  seasons: number
  match: number
  genres: string[]
  tags: string[]
  synopsis: string
  runtime: string
  featured?: boolean
  trending?: boolean
  newBadge?: boolean
  /* --- populated for AI-generated titles loaded from /catalog.json --- */
  generated?: boolean
  comingSoon?: boolean
  posterUrl?: string
  episodeManifest?: string
  episodes?: {
    number: number
    title: string
    /** DB episode UUID (present for Supabase-sourced episodes) — used for view stats. */
    id?: string
    manifest?: string
    /** Inline manifest (DB-sourced episodes) — used instead of fetching `manifest`. */
    manifestData?: unknown
    durationSec: number
    season?: number
    ep?: number
  }[]
  producedBy?: string
}

export const SERIES: Series[] = [
  {
    id: 'strawberry-uprising',
    title: 'Strawberry Uprising',
    fruit: 'strawberry',
    year: 2026,
    maturity: '13+',
    seasons: 3,
    match: 98,
    genres: ['Sci-Fi', 'Drama', 'AI Original'],
    tags: ['Surreal', 'Bingeable', 'Emotional'],
    synopsis:
      "When the last strawberry in the greenhouse gains consciousness, it must rally the berry patch against the harvest machines. A juicy tale of rebellion, seeds, and destiny — generated frame by frame.",
    runtime: '4 min episodes',
    featured: true,
    trending: true,
  },
  {
    id: 'blueberry-heist',
    title: 'The Blueberry Heist',
    fruit: 'blueberry',
    year: 2026,
    maturity: '16+',
    seasons: 2,
    match: 96,
    genres: ['Thriller', 'Crime', 'AI Original'],
    tags: ['Twisty', 'Stylish'],
    synopsis:
      'A crew of pint-sized blueberries plans the impossible: escape the smoothie factory before dawn. Every second counts.',
    runtime: '3 min episodes',
    trending: true,
    newBadge: true,
  },
  {
    id: 'grape-expectations',
    title: 'Grape Expectations',
    fruit: 'grape',
    year: 2025,
    maturity: '13+',
    seasons: 4,
    match: 94,
    genres: ['Drama', 'Period', 'AI Original'],
    tags: ['Prestige', 'Slow-burn'],
    synopsis:
      'A single grape dreams of becoming the finest wine in the valley — but the whole vine has other plans.',
    runtime: '5 min episodes',
    trending: true,
  },
  {
    id: 'orange-you-glad',
    title: 'Orange You Glad',
    fruit: 'orange',
    year: 2026,
    maturity: '7+',
    seasons: 2,
    match: 91,
    genres: ['Comedy', 'Family', 'AI Original'],
    tags: ['Feel-good', 'Punny'],
    synopsis:
      'A relentlessly optimistic orange rolls through the citrus grove spreading terrible jokes and genuine warmth.',
    runtime: '2 min episodes',
    trending: true,
    newBadge: true,
  },
  {
    id: 'melon-drama',
    title: 'Melon Collie',
    fruit: 'watermelon',
    year: 2025,
    maturity: '13+',
    seasons: 1,
    match: 89,
    genres: ['Drama', 'Indie', 'AI Original'],
    tags: ['Melancholic', 'Artsy'],
    synopsis:
      'One watermelon. One endless summer. A meditation on ripeness, patience, and the picnic that never came.',
    runtime: '6 min episodes',
    trending: true,
  },
  {
    id: 'lemon-law',
    title: 'Lemon Law',
    fruit: 'lemon',
    year: 2026,
    maturity: '16+',
    seasons: 3,
    match: 93,
    genres: ['Legal', 'Drama', 'AI Original'],
    tags: ['Sharp', 'Bingeable'],
    synopsis:
      'In the highest citrus court, a sour little lemon defends the pulp of the innocent. Objection: sustained zest.',
    runtime: '4 min episodes',
    trending: true,
  },
  {
    id: 'cherry-bomb',
    title: 'Cherry Bomb',
    fruit: 'cherry',
    year: 2026,
    maturity: '18+',
    seasons: 2,
    match: 95,
    genres: ['Action', 'Thriller', 'AI Original'],
    tags: ['Explosive', 'Adrenaline'],
    synopsis:
      'A pair of twin cherries with a shared stem take down the syrup cartel one glazed operation at a time.',
    runtime: '3 min episodes',
    newBadge: true,
  },
  {
    id: 'peach-perfect',
    title: 'Peach Perfect',
    fruit: 'peach',
    year: 2025,
    maturity: '7+',
    seasons: 3,
    match: 90,
    genres: ['Musical', 'Comedy', 'AI Original'],
    tags: ['Catchy', 'Feel-good'],
    synopsis:
      'An a-cappella orchard of peaches harmonizes their way to the county fair finals. Fuzzy and flawless.',
    runtime: '4 min episodes',
  },
  {
    id: 'banana-split',
    title: 'Banana Split',
    fruit: 'banana',
    year: 2026,
    maturity: '13+',
    seasons: 2,
    match: 88,
    genres: ['Rom-Com', 'AI Original'],
    tags: ['Charming', 'Bittersweet'],
    synopsis:
      'Two bananas in the same bunch fall for the same spoon. Only one can be the sundae. A peel-back romance.',
    runtime: '3 min episodes',
    newBadge: true,
  },
  {
    id: 'pineapple-express',
    title: 'Pineapple Express Line',
    fruit: 'pineapple',
    year: 2025,
    maturity: '16+',
    seasons: 1,
    match: 87,
    genres: ['Adventure', 'Comedy', 'AI Original'],
    tags: ['Road-trip', 'Wild'],
    synopsis:
      'A spiky pineapple hijacks the tropical express and drags the whole fruit bowl on an unhinged getaway.',
    runtime: '5 min episodes',
  },
  {
    id: 'kiwi-confidential',
    title: 'Kiwi Confidential',
    fruit: 'kiwi',
    year: 2026,
    maturity: '16+',
    seasons: 2,
    match: 92,
    genres: ['Noir', 'Mystery', 'AI Original'],
    tags: ['Moody', 'Detective'],
    synopsis:
      'Beneath the fuzz, every kiwi hides a secret. One hard-boiled detective peels back the truth, seed by seed.',
    runtime: '6 min episodes',
  },
  {
    id: 'mango-tango',
    title: 'Mango Tango',
    fruit: 'mango',
    year: 2025,
    maturity: '13+',
    seasons: 3,
    match: 91,
    genres: ['Dance', 'Drama', 'AI Original'],
    tags: ['Passionate', 'Vibrant'],
    synopsis:
      'On the ballroom floor of the fruit stand, one mango must dance for the crown — and for love that never ripens twice.',
    runtime: '4 min episodes',
  },
  {
    id: 'coconut-castaway',
    title: 'Coconut Castaway',
    fruit: 'coconut',
    year: 2026,
    maturity: '13+',
    seasons: 1,
    match: 86,
    genres: ['Survival', 'Drama', 'AI Original'],
    tags: ['Tense', 'Lonely'],
    synopsis:
      'Adrift on an endless ocean, a single coconut narrates its slow drift toward an island of hope. Or a blender.',
    runtime: '7 min episodes',
    newBadge: true,
  },
  {
    id: 'bad-apple',
    title: 'Bad Apple',
    fruit: 'apple',
    year: 2026,
    maturity: '18+',
    seasons: 3,
    match: 94,
    genres: ['Crime', 'Drama', 'AI Original'],
    tags: ['Dark', 'Gripping'],
    synopsis:
      'One rotten apple runs the whole barrel. A rise-and-fall saga of worms, orchards, and empire.',
    runtime: '5 min episodes',
    trending: true,
  },
  {
    id: 'avocado-toast',
    title: 'Avocado Toast',
    fruit: 'avocado',
    year: 2025,
    maturity: '13+',
    seasons: 4,
    match: 89,
    genres: ['Sitcom', 'Comedy', 'AI Original'],
    tags: ['Millennial', 'Cozy'],
    synopsis:
      'Six avocados share one overpriced city loft and figure out adulthood one perfectly ripe morning at a time.',
    runtime: '3 min episodes',
  },
  {
    id: 'dragonfruit-dynasty',
    title: 'Dragonfruit Dynasty',
    fruit: 'dragonfruit',
    year: 2026,
    maturity: '16+',
    seasons: 2,
    match: 97,
    genres: ['Fantasy', 'Epic', 'AI Original'],
    tags: ['Grand', 'Mythic'],
    synopsis:
      'In a realm where fruit is power, the exiled dragonfruit heir returns to reclaim a throne carved from stone and seed.',
    runtime: '8 min episodes',
    trending: true,
    newBadge: true,
  },
]

/* ------------------------------------------------------------------ *
 * Runtime registry: built-in SERIES + AI-generated titles injected at
 * runtime from /catalog.json. `allSeries()` is the source of truth the
 * recommendation engine and UI rank over.
 * ------------------------------------------------------------------ */
let dynamicSeries: Series[] = []

export function registerDynamic(list: Series[]) {
  // de-dupe by id, generated titles win over any same-id built-in
  const ids = new Set(list.map((s) => s.id))
  dynamicSeries = list
  void ids
}

export function allSeries(): Series[] {
  // Once real (AI-generated) series exist, show ONLY those — the hardcoded
  // placeholder catalog is just a first-run stand-in.
  return dynamicSeries.length > 0 ? dynamicSeries : SERIES
}

export const byId = (id: string) => allSeries().find((s) => s.id === id)

/** Botanical-ish families used by the recommendation engine for "similar taste". */
export const FRUIT_FAMILY: Record<FruitKey, string> = {
  strawberry: 'berry',
  blueberry: 'berry',
  grape: 'berry',
  cherry: 'berry',
  watermelon: 'melon',
  orange: 'citrus',
  lemon: 'citrus',
  banana: 'tropical',
  pineapple: 'tropical',
  mango: 'tropical',
  coconut: 'tropical',
  kiwi: 'tropical',
  dragonfruit: 'tropical',
  peach: 'stone',
  apple: 'pome',
  avocado: 'stone',
  pomegranate: 'berry',
  pear: 'pome',
  raspberry: 'berry',
  lime: 'citrus',
}

export interface Row {
  title: string
  ids: string[]
}

export const ROWS: Row[] = [
  {
    title: 'Trending Fruits',
    ids: [
      'dragonfruit-dynasty',
      'strawberry-uprising',
      'blueberry-heist',
      'bad-apple',
      'grape-expectations',
      'lemon-law',
      'melon-drama',
      'orange-you-glad',
    ],
  },
  {
    title: 'Freshly Squeezed — New This Week',
    ids: [
      'cherry-bomb',
      'banana-split',
      'coconut-castaway',
      'orange-you-glad',
      'blueberry-heist',
      'dragonfruit-dynasty',
    ],
  },
  {
    title: 'NETFRUIT Originals',
    ids: [
      'strawberry-uprising',
      'grape-expectations',
      'kiwi-confidential',
      'mango-tango',
      'bad-apple',
      'dragonfruit-dynasty',
      'lemon-law',
    ],
  },
  {
    title: 'Berry Bingeable Comedies',
    ids: [
      'orange-you-glad',
      'avocado-toast',
      'banana-split',
      'peach-perfect',
      'pineapple-express',
    ],
  },
  {
    title: 'Ripe for a Cry',
    ids: [
      'melon-drama',
      'coconut-castaway',
      'grape-expectations',
      'peach-perfect',
      'mango-tango',
    ],
  },
]

export const CATEGORIES = [
  'All',
  'AI Originals',
  'Comedy',
  'Drama',
  'Thriller',
  'Fantasy',
  'Feel-good',
]
