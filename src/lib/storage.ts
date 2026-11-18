import fsp from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { COVERS_DIR, STORAGE_DIR } from './db'

export const QUOTAS = {
  tracksPerUser: Number(process.env.UPLOAD_LIMIT_TRACKS ?? 100),
  bytesPerUser: Number(process.env.UPLOAD_LIMIT_BYTES ?? 2 * 1024 * 1024 * 1024),
  minFreeBytes: Number(process.env.MIN_FREE_BYTES ?? 1024 * 1024 * 1024),
}

export async function diskFreeBytes(): Promise<number> {
  try {
    const stats = await fsp.statfs(STORAGE_DIR)
    return Number(stats.bavail) * Number(stats.bsize)
  } catch {
    return Number.MAX_SAFE_INTEGER
  }
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 Б'
  const units = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ']
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / 1024 ** index
  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`
}

const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export function isAllowedCoverUrl(value: string): boolean {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return false
    const host = url.hostname.toLowerCase()
    return host.endsWith('.dzcdn.net')
  } catch {
    return false
  }
}

export async function downloadCover(url: string): Promise<string | null> {
  if (!/^https?:\/\//i.test(url)) return null
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(9000),
    })
    if (!response.ok) return null

    const type = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    const ext = IMAGE_TYPES[type]
    if (!ext) return null

    const declared = Number(response.headers.get('content-length') ?? 0)
    if (declared > 5 * 1024 * 1024) return null

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) return null

    const name = `${randomUUID()}.${ext}`
    await fsp.writeFile(path.join(COVERS_DIR, name), buffer)
    return name
  } catch {
    return null
  }
}
