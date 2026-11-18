import fsp from 'node:fs/promises'
import path from 'node:path'
import { STORAGE_DIR } from './db'

/** Release metadata written by `npm run apk:release` next to the APK. */
export type AppRelease = {
  versionName: string
  versionCode: number
  builtAt: string
  size: number
  file: string
}

const APP_DIR = path.join(STORAGE_DIR, 'app')
const APK_NAME = 'monah.apk'
const META_NAME = 'build.json'

export async function readAppRelease(): Promise<AppRelease | null> {
  try {
    const raw = await fsp.readFile(path.join(APP_DIR, META_NAME), 'utf8')
    const meta = JSON.parse(raw) as { versionName?: string; versionCode?: number; builtAt?: string }
    const file = path.join(APP_DIR, APK_NAME)
    const stat = await fsp.stat(file)
    if (stat.size < 1024) return null
    return {
      versionName: String(meta.versionName ?? '1.0.0'),
      versionCode: Number(meta.versionCode ?? 1),
      builtAt: String(meta.builtAt ?? ''),
      size: stat.size,
      file,
    }
  } catch {
    return null
  }
}
