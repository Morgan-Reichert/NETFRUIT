import { readFile } from 'node:fs/promises'
import type { GeneratedSeries } from './types'
import { publicPath, publicUrl, writeText } from './util'

const CATALOG_ABS = () => publicPath('catalog.json')
export const CATALOG_URL = publicUrl('catalog.json')

export async function readCatalog(): Promise<GeneratedSeries[]> {
  try {
    return JSON.parse(await readFile(CATALOG_ABS(), 'utf8'))
  } catch {
    return []
  }
}

export async function upsertCatalog(entry: GeneratedSeries): Promise<GeneratedSeries[]> {
  const all = await readCatalog()
  const idx = all.findIndex((s) => s.id === entry.id)
  if (idx >= 0) all[idx] = entry
  else all.unshift(entry)
  await writeText(CATALOG_ABS(), JSON.stringify(all, null, 2))
  return all
}
