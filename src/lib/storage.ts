import fsp from 'node:fs/promises'
import { STORAGE_DIR } from './db'

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
