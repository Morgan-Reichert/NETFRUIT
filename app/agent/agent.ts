import { log } from './config'
import { readCatalog } from './catalog'
import { produceSeries } from './pipeline'
import { FRUIT_THEMES, SERIES, type FruitKey } from '../src/data/series'
import type { Brief, GeneratedSeries } from './types'

const ALL_FRUITS = Object.keys(FRUIT_THEMES) as FruitKey[]

/** Ranks fruits by how little they appear in the current catalog (least first). */
async function fruitGaps(): Promise<FruitKey[]> {
  const used = new Map<FruitKey, number>()
  for (const f of ALL_FRUITS) used.set(f, 0)
  const bump = (f: FruitKey) => used.set(f, (used.get(f) ?? 0) + 1)
  for (const s of SERIES) bump(s.fruit)
  for (const s of await readCatalog()) bump(s.fruit)
  return [...ALL_FRUITS].sort((a, b) => (used.get(a)! - used.get(b)!) || a.localeCompare(b))
}

/** Lightweight quality gate before a title is considered shippable. */
function qa(entry: GeneratedSeries): string[] {
  const issues: string[] = []
  if (!entry.title || entry.title.length < 3) issues.push('title too short')
  if (!entry.synopsis || entry.synopsis.length < 40) issues.push('synopsis too short')
  if (!entry.genres.includes('AI Original')) issues.push("missing 'AI Original' genre")
  if (entry.match < 1 || entry.match > 100) issues.push('match out of range')
  if (!entry.posterUrl) issues.push('no poster')
  return issues
}

export interface AgentResult {
  produced: GeneratedSeries[]
  failed: { brief: Brief; error: string }[]
}

/**
 * Autonomous producer: fills the N least-covered fruits with fresh series,
 * QA-gating each. Retries a failed title once before giving up.
 */
export async function runAgent(count: number, hint?: string): Promise<AgentResult> {
  const gaps = await fruitGaps()
  const briefs: Brief[] = gaps.slice(0, count).map((fruit) => ({ fruit, hint }))
  console.log(`\n🤖 NETFRUIT agent: producing ${briefs.length} series → [${briefs.map((b) => b.fruit).join(', ')}]`)

  const produced: GeneratedSeries[] = []
  const failed: AgentResult['failed'] = []

  for (const brief of briefs) {
    let attempt = 0
    while (attempt < 2) {
      attempt++
      try {
        const entry = await produceSeries(brief)
        const issues = qa(entry)
        if (issues.length) {
          log('qa', `⚠ ${entry.title}: ${issues.join(', ')}`)
          if (attempt < 2) continue
        } else {
          log('qa', `✔ ${entry.title} passed`)
        }
        produced.push(entry)
        break
      } catch (e) {
        if (attempt >= 2) failed.push({ brief, error: (e as Error).message })
      }
    }
  }

  console.log(`\n✅ Done. ${produced.length} produced, ${failed.length} failed.`)
  if (failed.length) for (const f of failed) console.log(`   ✗ ${f.brief.fruit}: ${f.error}`)
  return { produced, failed }
}
