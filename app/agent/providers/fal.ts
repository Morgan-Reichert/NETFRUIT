import { config } from '../config'

const headers = () => ({ Authorization: `Key ${config.falKey}`, 'Content-Type': 'application/json' })
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Synchronous fal endpoint — for fast models (LLM, image, TTS). */
export async function falRun<T = any>(model: string, body: unknown): Promise<T> {
  const res = await fetch(`https://fal.run/${model}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`fal ${model} ${res.status}: ${(await res.text()).slice(0, 140)}`)
  return res.json() as Promise<T>
}

/** Async queue endpoint with polling — for slow models (video, lip-sync). */
export async function falQueue<T = any>(model: string, body: unknown): Promise<T> {
  const submit = await fetch(`https://queue.fal.run/${model}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })
  if (!submit.ok) throw new Error(`fal submit ${model} ${submit.status}: ${(await submit.text()).slice(0, 140)}`)
  const { status_url, response_url } = await submit.json()
  if (!status_url || !response_url) throw new Error(`fal ${model}: no queue urls`)
  for (let i = 0; i < 200; i++) {
    await sleep(3000)
    const st = await (await fetch(status_url, { headers: headers() })).json()
    if (st.status === 'COMPLETED') break
    if (st.status === 'FAILED' || st.status === 'ERROR') throw new Error(`fal ${model} job failed`)
    if (i === 199) throw new Error(`fal ${model} poll timeout`)
  }
  const out = await fetch(response_url, { headers: headers() })
  if (!out.ok) throw new Error(`fal ${model} result ${out.status}`)
  return out.json() as Promise<T>
}

/** Download a remote asset to a Buffer. */
export async function fetchBytes(url: string): Promise<Buffer> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`download ${r.status}`)
  return Buffer.from(await r.arrayBuffer())
}
