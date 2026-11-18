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

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const STORED_IMAGE_NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$/i

export function imageExtensionForMime(mime: string): string | null {
  return IMAGE_TYPES[mime.split(';')[0].trim().toLowerCase()] ?? null
}

export function detectImageExtension(buffer: Buffer): string | null {
  if (buffer.length < 12) return null
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg'
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'png'
  }
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'webp'
  }
  return null
}

export function isValidImageName(name: unknown): name is string {
  return typeof name === 'string' && STORED_IMAGE_NAME.test(name)
}

export async function saveImageFile(buffer: Buffer, ext: string): Promise<string> {
  const name = `${randomUUID()}.${ext}`
  await fsp.writeFile(path.join(COVERS_DIR, name), buffer)
  return name
}

/** Delete a replaced image, unless another entity still references the same file. */
export async function removeImageFile(
  name: string | null | undefined,
  stillUsed: (string | null | undefined)[] = [],
): Promise<void> {
  if (!isValidImageName(name) || stillUsed.includes(name)) return
  await fsp.unlink(path.join(COVERS_DIR, path.basename(name))).catch(() => undefined)
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
    if (!IMAGE_TYPES[type]) return null

    const declared = Number(response.headers.get('content-length') ?? 0)
    if (declared > 5 * 1024 * 1024) return null

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) return null

    const ext = detectImageExtension(buffer)
    if (!ext) return null

    const name = `${randomUUID()}.${ext}`
    await fsp.writeFile(path.join(COVERS_DIR, name), buffer)
    return name
  } catch {
    return null
  }
}

/**
 * Deletes cover files that are no longer referenced by a profile or playlist.
 * Files newer than `minAgeMs` are kept so an upload that is still in a modal
 * is never removed before it gets saved.
 */
export async function sweepOrphanImages(
  used: string[],
  minAgeMs = 24 * 60 * 60 * 1000,
): Promise<number> {
  const keep = new Set(used)
  const files = await fsp.readdir(COVERS_DIR).catch(() => [] as string[])
  const now = Date.now()
  let removed = 0

  for (const file of files) {
    if (keep.has(file)) continue
    const full = path.join(COVERS_DIR, file)
    const stat = await fsp.stat(full).catch(() => null)
    if (!stat?.isFile() || now - stat.mtimeMs < minAgeMs) continue
    await fsp.unlink(full).catch(() => undefined)
    removed += 1
  }

  return removed
}

/** Total bytes used by audio files and artwork on disk. */
export async function storageUsageBytes(): Promise<{ tracks: number; covers: number }> {
  const measure = async (dir: string) => {
    const files = await fsp.readdir(dir).catch(() => [] as string[])
    let total = 0
    for (const file of files) {
      const stat = await fsp.stat(path.join(dir, file)).catch(() => null)
      if (stat?.isFile()) total += stat.size
    }
    return total
  }
  const [tracks, covers] = await Promise.all([
    measure(path.join(STORAGE_DIR, 'tracks')),
    measure(COVERS_DIR),
  ])
  return { tracks, covers }
}
