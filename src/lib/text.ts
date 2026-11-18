export type ImportRow = { title: string; artist: string }

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(feat|ft|featuring)\b\.?.*$/u, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          quoted = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      quoted = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char !== '\r') {
      field += char
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

function headerIndex(header: string[], needles: string[]): number {
  return header.findIndex((cell) => needles.some((needle) => cell.includes(needle)))
}

export function parseImportCsv(input: string): ImportRow[] {
  const table = parseCsv(input).filter((row) => row.some((cell) => cell.trim() !== ''))
  if (table.length === 0) return []

  const header = table[0].map((cell) => cell.trim().toLowerCase())
  const titleIndex = headerIndex(header, ['track name', 'song', 'title', 'название'])
  const artistIndex = headerIndex(header, ['artist', 'исполнитель'])
  const hasHeader = titleIndex !== -1 || artistIndex !== -1

  const body = hasHeader ? table.slice(1) : table
  const titleCol = hasHeader && titleIndex !== -1 ? titleIndex : 0
  const artistCol = hasHeader && artistIndex !== -1 ? artistIndex : 1

  return body
    .map((row) => ({
      title: (row[titleCol] ?? '').trim(),
      artist: (row[artistCol] ?? '').trim(),
    }))
    .filter((row) => row.title.length > 0)
    .slice(0, 2000)
}

export function parseImportLines(input: string): ImportRow[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => {
      if (line.includes('\t')) {
        const [title, ...rest] = line.split('\t')
        return { title: title.trim(), artist: rest.join(' ').trim() }
      }
      const parts = line.split(/\s+[—–-]\s+/)
      if (parts.length >= 2) {
        return { title: parts[0].trim(), artist: parts.slice(1).join(' — ').trim() }
      }
      return { title: line, artist: '' }
    })
    .filter((row) => row.title.length > 0)
    .slice(0, 2000)
}

function splitArtistTitle(value: string): ImportRow {
  const parts = value.split(/\s+[—–-]\s+/)
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), title: parts.slice(1).join(' — ').trim() }
  }
  return { title: value.trim(), artist: '' }
}

export function parseImportM3u(input: string): ImportRow[] {
  const rows: ImportRow[] = []
  const seen = new Set<string>()
  const hasExtinf = /^#EXTINF:/m.test(input)
  const push = (row: ImportRow) => {
    if (!row.title) return
    const key = `${row.title.toLowerCase()}|${row.artist.toLowerCase()}`
    if (seen.has(key)) return
    seen.add(key)
    rows.push(row)
  }

  for (const raw of input.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue

    if (line.startsWith('#EXTINF:')) {
      const comma = line.indexOf(',')
      if (comma === -1) continue
      push(splitArtistTitle(line.slice(comma + 1)))
      continue
    }
    if (line.startsWith('#')) continue
    if (hasExtinf) continue

    // File paths without EXTINF: derive "Artist - Title" from the file name.
    const withoutQuery = line.split('?')[0]
    const base = withoutQuery.split(/[\\/]/).pop() ?? ''
    const name = base.replace(/\.[a-z0-9]{1,5}$/i, '').replace(/_/g, ' ').trim()
    if (name && !/^[a-z]+:$/i.test(name)) push(splitArtistTitle(name))
  }

  return rows.slice(0, 2000)
}

function artistFromValue(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item.trim()
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>
          const name = obj.name ?? obj.title
          return typeof name === 'string' ? name.trim() : ''
        }
        return ''
      })
      .filter(Boolean)
      .join(', ')
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const name = obj.name ?? obj.title
    return typeof name === 'string' ? name.trim() : ''
  }
  return ''
}

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

export function parseImportJson(input: string): ImportRow[] {
  let data: unknown
  try {
    data = JSON.parse(input)
  } catch {
    return []
  }

  const rows: ImportRow[] = []
  const seen = new Set<string>()
  const push = (title: string, artist: string) => {
    if (!title) return
    const key = `${title.toLowerCase()}|${artist.toLowerCase()}`
    if (seen.has(key)) return
    seen.add(key)
    rows.push({ title, artist })
  }

  if (Array.isArray(data) && data.every((item) => typeof item === 'string')) {
    for (const item of data) {
      const row = splitArtistTitle(item)
      push(row.title, row.artist)
    }
    return rows.slice(0, 2000)
  }

  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }
    if (!value || typeof value !== 'object') return

    const obj = value as Record<string, unknown>
    const title = pickString(obj, [
      'trackName',
      'track_name',
      'songTitle',
      'song_title',
      'title',
      'name',
      'song',
    ])
    const artist = artistFromValue(
      obj.artistName ??
        obj.artist_name ??
        obj.artist ??
        obj.artists ??
        obj.performers ??
        obj.albumArtist ??
        obj.album_artist,
    )
    const trackish =
      'trackName' in obj ||
      'track_name' in obj ||
      'album' in obj ||
      'albumName' in obj ||
      'duration' in obj ||
      'duration_ms' in obj ||
      'isrc' in obj

    if (title && (artist || trackish)) push(title, artist)

    for (const nested of Object.values(obj)) {
      if (nested && typeof nested === 'object') visit(nested)
    }
  }

  visit(data)
  return rows.slice(0, 2000)
}

function looksLikeCsv(value: string): boolean {
  const first = value.split(/\r?\n/, 1)[0]?.toLowerCase() ?? ''
  return (
    first.includes(',') &&
    (first.includes('track name') ||
      first.includes('artist') ||
      first.includes('title') ||
      first.split(',').length >= 3)
  )
}

export function parsePlaylistFile(input: string, fileName?: string): ImportRow[] {
  const text = input.trim()
  if (!text) return []

  const ext = fileName?.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'm3u' || ext === 'm3u8' || text.startsWith('#EXTM3U')) return parseImportM3u(text)
  if (ext === 'json' || text.startsWith('{') || text.startsWith('[')) return parseImportJson(text)
  if (ext === 'csv' || looksLikeCsv(text)) return parseImportCsv(text)
  return parseImportLines(text)
}
