import { config } from '../config'

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

interface Part {
  text?: string
  inlineData?: { mimeType: string; data: string }
}

async function call(model: string, body: unknown): Promise<Part[]> {
  const res = await fetch(`${BASE}/${model}:generateContent?key=${config.geminiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 140)}`)
  const json = await res.json()
  const parts: Part[] = json.candidates?.[0]?.content?.parts ?? []
  if (!parts.length) throw new Error('gemini: empty response')
  return parts
}

export async function geminiText(system: string, user: string): Promise<string> {
  const parts = await call(config.geminiTextModel, {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: { temperature: 1.0 },
  })
  return parts.map((p) => p.text ?? '').join('')
}

export async function geminiImage(prompt: string): Promise<{ data: Buffer; ext: string }> {
  const parts = await call(config.geminiImageModel, {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  })
  const img = parts.find((p) => p.inlineData?.data)
  if (!img?.inlineData) throw new Error('gemini: no image part')
  const ext = img.inlineData.mimeType.includes('png') ? 'png' : 'jpg'
  return { data: Buffer.from(img.inlineData.data, 'base64'), ext }
}

export async function geminiTTS(text: string, voiceName?: string): Promise<Buffer> {
  const parts = await call(config.geminiTTSModel, {
    contents: [{ role: 'user', parts: [{ text }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName || config.geminiVoiceName } },
      },
    },
  })
  const audio = parts.find((p) => p.inlineData?.data)
  if (!audio?.inlineData) throw new Error('gemini: no audio part')
  const pcm = Buffer.from(audio.inlineData.data, 'base64')
  // Gemini TTS returns raw 24kHz 16-bit mono PCM — wrap it in a WAV container.
  const rate = Number(/rate=(\d+)/.exec(audio.inlineData.mimeType)?.[1] ?? 24000)
  return wavFromPcm(pcm, rate)
}

function wavFromPcm(pcm: Buffer, sampleRate: number): Buffer {
  const header = Buffer.alloc(44)
  const dataLen = pcm.length
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + dataLen, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16) // PCM chunk size
  header.writeUInt16LE(1, 20) // audio format = PCM
  header.writeUInt16LE(1, 22) // channels = mono
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * 2, 28) // byte rate (16-bit mono)
  header.writeUInt16LE(2, 32) // block align
  header.writeUInt16LE(16, 34) // bits per sample
  header.write('data', 36)
  header.writeUInt32LE(dataLen, 40)
  return Buffer.concat([header, pcm])
}
