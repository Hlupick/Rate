import fsp from 'node:fs/promises'
import path from 'node:path'
import { STORAGE_DIR } from './db'

/** One downloadable Windows build. */
export type DesktopFile = {
  file: string
  size: number
  sha256: string
}

/** Metadata written next to the installers by the desktop build script. */
export type DesktopRelease = {
  version: string
  builtAt: string
  installer: DesktopFile
  portable: DesktopFile
}

const DESKTOP_DIR = path.join(STORAGE_DIR, 'app', 'desktop')
const META_NAME = 'build.json'

export async function readDesktopRelease(): Promise<DesktopRelease | null> {
  try {
    const raw = await fsp.readFile(path.join(DESKTOP_DIR, META_NAME), 'utf8')
    const meta = JSON.parse(raw) as Partial<DesktopRelease>
    if (!meta.version || !meta.installer?.file || !meta.portable?.file) return null

    const resolve = async (entry: DesktopFile): Promise<DesktopFile | null> => {
      const file = path.basename(entry.file)
      const stat = await fsp.stat(path.join(DESKTOP_DIR, file))
      if (stat.size < 1024) return null
      return { file, size: stat.size, sha256: String(entry.sha256 ?? '') }
    }

    const [installer, portable] = await Promise.all([
      resolve(meta.installer as DesktopFile),
      resolve(meta.portable as DesktopFile),
    ])
    if (!installer || !portable) return null

    return {
      version: String(meta.version),
      builtAt: String(meta.builtAt ?? ''),
      installer,
      portable,
    }
  } catch {
    return null
  }
}

export async function readDesktopFile(
  kind: 'setup' | 'portable',
): Promise<{ release: DesktopRelease; target: DesktopFile } | null> {
  const release = await readDesktopRelease()
  if (!release) return null
  return { release, target: kind === 'setup' ? release.installer : release.portable }
}

export function desktopFilePath(file: string): string {
  return path.join(DESKTOP_DIR, path.basename(file))
}
