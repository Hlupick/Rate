/**
 * Filename parsing for uploads: "09. Yeat - 2093 (Official Audio).mp3"
 * becomes artist "Yeat" and title "2093". Shared by the upload form (client)
 * and the upload API (server), so both agree on the fallback values.
 */

const NOISE = [
  'official',
  'lyrics',
  'lyric video',
  'music video',
  'visualizer',
  'audio',
  'explicit',
  'hd',
  'hq',
  'prod.',
  'prod ',
  'remaster',
  'премьера',
  'минус',
  'инструментал',
]

function isNoise(inner: string): boolean {
  const value = inner.trim().toLowerCase()
  if (!value || value.length > 60) return false
  return NOISE.some((word) => value.startsWith(word) || value.includes(` ${word}`))
}

/** Trim trailing "(Official Audio)", "[HD]", "(prod. by …)" and the like. */
function stripNoise(value: string): string {
  let out = value.trim()
  for (;;) {
    const match = out.match(/\s*[[(]([^[\]()]{1,60})[)\]]\s*$/)
    if (!match || !isNoise(match[1])) return out.trim()
    out = out.slice(0, match.index).trim()
  }
}

/** "01. Name.mp3" / "7 - Name.flac" -> "Name" (extension, underscores, track numbers). */
export function cleanTrackName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? raw
  return stripNoise(
    base
      .replace(/\.[^.]+$/, '')
      .replace(/_+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^\d{1,3}\s*[.)\]]\s*/, '')
      .replace(/^\d{1,3}\s*[-–—]\s+/, ''),
  )
}

/**
 * Splits "Artist - Title" on the first spaced dash. A dash without spaces
 * ("Jay-Z") is part of the name and is left untouched.
 */
export function splitFileName(raw: string): { title: string; artist: string } {
  const cleaned = cleanTrackName(raw)
  const match = cleaned.match(/^(.{1,60}?)\s+[-–—]\s+(.{1,120})$/)
  if (match) {
    const artist = match[1].trim()
    const title = match[2].trim()
    if (artist && title) return { title, artist }
  }
  return { title: cleaned, artist: '' }
}

/** First non-empty tag value, collapsed to a single line. */
export function tagValue(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}
