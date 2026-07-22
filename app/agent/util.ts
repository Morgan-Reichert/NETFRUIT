import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { config } from './config'

/** Absolute path inside the served public dir. */
export const publicPath = (...parts: string[]) => join(config.outDir, ...parts)

/** Public-relative URL the browser uses (always forward slashes, leading /). */
export const publicUrl = (...parts: string[]) => '/' + parts.join('/')

export async function ensureDir(abs: string) {
  await mkdir(abs, { recursive: true })
}

export async function writeText(abs: string, data: string) {
  await ensureDir(join(abs, '..'))
  await writeFile(abs, data, 'utf8')
}

export async function writeBinary(abs: string, data: Buffer | Uint8Array) {
  await ensureDir(join(abs, '..'))
  await writeFile(abs, data)
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
