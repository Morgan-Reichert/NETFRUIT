import { config, providerSignature } from './config'
import { runAgent } from './agent'
import { produceSeries } from './pipeline'
import { readCatalog } from './catalog'
import type { FruitKey } from '../src/data/series'

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function main() {
  const argv = process.argv.slice(2)

  if (argv.includes('--list')) {
    const cat = await readCatalog()
    console.log(`\n📚 catalog.json — ${cat.length} generated series`)
    for (const s of cat) console.log(`   • ${s.title.padEnd(28)} ${s.fruit.padEnd(12)} [${s.producedBy}]`)
    return
  }

  console.log(`\x1b[1mNETFRUIT generation agent\x1b[0m  ·  ${providerSignature()}`)
  console.log(`out: ${config.outDir}`)

  const fruit = arg('--fruit') as FruitKey | undefined
  const hint = arg('--hint')

  if (fruit) {
    await produceSeries({ fruit, hint })
    return
  }

  const count = Number(argv.find((a) => /^\d+$/.test(a)) ?? 3)
  await runAgent(count, hint)
}

main().catch((e) => {
  console.error('\n💥 agent crashed:', e)
  process.exit(1)
})
