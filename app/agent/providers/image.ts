import { config, log } from '../config'
import { FRUIT_THEMES, type FruitKey } from '../../src/data/series'
import { publicPath, publicUrl, writeText, writeBinary } from '../util'
import { geminiImage } from './gemini'

export interface ImageRequest {
  seriesId: string
  fruit: FruitKey
  prompt: string
  /** file stem, e.g. "poster" or "shot-0" */
  name: string
  ratio: 'portrait' | 'landscape'
}

const DIMS = {
  portrait: { w: 720, h: 1080 },
  landscape: { w: 1280, h: 720 },
}

/* ------------------------- mock: local SVG key art ------------------------- */

function mockSvg(req: ImageRequest): string {
  const t = FRUIT_THEMES[req.fruit] ?? FRUIT_THEMES.strawberry
  const { w, h } = DIMS[req.ratio]
  const glyphSize = req.ratio === 'portrait' ? 560 : 460
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="g" cx="78%" cy="14%" r="80%">
      <stop offset="0%" stop-color="${t.glow}" stop-opacity="0.5"/>
      <stop offset="55%" stop-color="${t.to}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="b" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${t.from}"/>
      <stop offset="130%" stop-color="${t.to}"/>
    </linearGradient>
    <linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="55%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.75"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#b)"/>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <text x="${w - 40}" y="${h - 60}" font-size="${glyphSize}" text-anchor="end"
        opacity="0.9" transform="rotate(-8 ${w - 40} ${h - 60})">${t.glyph}</text>
  <rect width="${w}" height="${h}" fill="url(#s)"/>
</svg>`
}

/* ----------------------- pollinations: free, no key ------------------------ */

async function pollinations(req: ImageRequest, absPng: string, urlPng: string) {
  const { w, h } = DIMS[req.ratio]
  const u = `https://image.pollinations.ai/prompt/${encodeURIComponent(req.prompt)}?width=${w}&height=${h}&nologo=true`
  const res = await fetch(u)
  if (!res.ok) throw new Error(`pollinations ${res.status}`)
  await writeBinary(absPng, Buffer.from(await res.arrayBuffer()))
  return urlPng
}

/* --------------------------- fal-flux: cheap flux -------------------------- */

async function falFlux(req: ImageRequest, absPng: string, urlPng: string) {
  const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
    method: 'POST',
    headers: { Authorization: `Key ${config.falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: req.prompt, image_size: req.ratio === 'portrait' ? 'portrait_16_9' : 'landscape_16_9' }),
  })
  if (!res.ok) throw new Error(`fal ${res.status}`)
  const json = await res.json()
  const imgUrl = json.images?.[0]?.url
  if (!imgUrl) throw new Error('fal: no image url')
  const bin = await fetch(imgUrl)
  await writeBinary(absPng, Buffer.from(await bin.arrayBuffer()))
  return urlPng
}

/** Renders one image; returns its public URL. Falls back to mock SVG on failure. */
export async function generateImage(req: ImageRequest): Promise<string> {
  const dir = ['generated', req.seriesId]
  const svgAbs = publicPath(...dir, `${req.name}.svg`)
  const svgUrl = publicUrl(...dir, `${req.name}.svg`)
  const pngAbs = publicPath(...dir, `${req.name}.png`)
  const pngUrl = publicUrl(...dir, `${req.name}.png`)

  if (config.image === 'gemini' && config.geminiKey) {
    try {
      log('image', `gemini ← ${req.name}`)
      const ratioHint =
        req.ratio === 'portrait'
          ? ' Vertical 2:3 movie-poster composition.'
          : ' Wide 16:9 cinematic composition.'
      const { data, ext } = await geminiImage(req.prompt + ratioHint)
      const abs = publicPath(...dir, `${req.name}.${ext}`)
      await writeBinary(abs, data)
      return publicUrl(...dir, `${req.name}.${ext}`)
    } catch (e) {
      log('image', `gemini failed (${(e as Error).message}); SVG fallback`)
    }
  } else if (config.image === 'pollinations') {
    try {
      log('image', `pollinations ← ${req.name}`)
      return await pollinations(req, pngAbs, pngUrl)
    } catch (e) {
      log('image', `pollinations failed (${(e as Error).message}); SVG fallback`)
    }
  } else if (config.image === 'fal-flux' && config.falKey) {
    try {
      log('image', `flux ← ${req.name}`)
      return await falFlux(req, pngAbs, pngUrl)
    } catch (e) {
      log('image', `flux failed (${(e as Error).message}); SVG fallback`)
    }
  }

  log('image', `mock SVG ← ${req.name}`)
  await writeText(svgAbs, mockSvg(req))
  return svgUrl
}
