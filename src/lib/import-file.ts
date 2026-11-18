export type ImportRow = { title: string; artist: string }
export type ParsedImport = {
  name: string
  format: 'csv' | 'm3u'
  rows: ImportRow[]
  total: number
}

export class ImportFileError extends Error {}

export const IMPORT_FILE_MAX_BYTES = 2 * 1024 * 1024
export const IMPORT_MAX_ROWS = 2000

const TITLE_KEYS = new Set([
  'title',
  'trackname',
  'song',
  'songname',
  'name',
  'название',
  'трек',
  'трекназвание',
  'композиция',
])
const ARTIST_KEYS = new Set([
  'artist',
  'artistname',
  'artistnames',
  'artists',
  'исполнитель',
  'артист',
  'исполнители',
])

function headerKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

function decode(buffer: Buffer): string {
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    text = new TextDecoder('windows-1251').decode(buffer)
  }
  return text.replace(/^\uFEFF/, '')
}

function splitArtistTitle(value: string): ImportRow {
  const cleaned = value.trim()
  const dash = cleaned.indexOf(' - ')
  if (dash > 0) {
    return {
      artist: cleaned.slice(0, dash).trim().slice(0, 200),
      title: cleaned.slice(dash + 3).trim().slice(0, 200),
    }
  }
  return { title: cleaned.slice(0, 200), artist: '' }
}

function cleanFilename(value: string): string {
  const base = value.replace(/\\/g, '/').split('/').pop() ?? value
  return base
    .replace(/\.(csv|m3u8?|txt)$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .slice(0, 80)
}

function parseCsvRows(text: string): { rows: string[][]; delimiter: string } {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const counts = [',', ';', '\t'].map((delimiter) => ({
    delimiter,
    count: firstLine.split(delimiter).length - 1,
  }))
  counts.sort((a, b) => b.count - a.count)
  const delimiter = counts[0].count > 0 ? counts[0].delimiter : ','

  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"'
          index += 1
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
    } else if (char === delimiter) {
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

  return { rows, delimiter }
}

function importCsv(text: string): ImportRow[] {
  const { rows } = parseCsvRows(text)
  if (rows.length === 0) return []

  const headers = rows[0].map(headerKey)
  const titleIndex = headers.findIndex((key) => TITLE_KEYS.has(key))
  const artistIndex = headers.findIndex((key) => ARTIST_KEYS.has(key))

  if (titleIndex < 0) {
    throw new ImportFileError(
      'В CSV не нашлась колонка с названием трека. Нужны заголовки Title / Track Name / Название.',
    )
  }

  return rows
    .slice(1)
    .map((row) => {
      const title = (row[titleIndex] ?? '').trim()
      const artist = (row[artistIndex] ?? '').trim()
      return { title: title.slice(0, 200), artist: artist.slice(0, 200) }
    })
    .filter((row) => row.title.length > 0)
}

function importM3u(text: string): ImportRow[] {
  const rows: ImportRow[] = []
  let pendingMeta: string | null = null

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    if (line.startsWith('#EXTINF:')) {
      const comma = line.indexOf(',')
      pendingMeta = comma >= 0 ? line.slice(comma + 1).trim() : null
      continue
    }
    if (line.startsWith('#')) continue

    if (pendingMeta) {
      rows.push(splitArtistTitle(pendingMeta))
      pendingMeta = null
      continue
    }

    // A plain playlist without EXTINF: use the file name as a fallback.
    const file = line.replace(/\\/g, '/').split('/').pop() ?? line
    const name = file.replace(/\.[a-z0-9]{1,5}$/i, '').replace(/[_-]+/g, ' ').trim()
    if (name) rows.push(splitArtistTitle(name))
  }

  return rows
}

/**
 * Parses an exported playlist. Supported formats: CSV with a title column and
 * M3U/M3U8. The uploaded file is never stored; only the parsed rows are kept.
 */
export function parseImportFile(filename: string, buffer: Buffer): ParsedImport {
  if (buffer.length === 0) throw new ImportFileError('Файл пустой')
  if (buffer.length > IMPORT_FILE_MAX_BYTES) {
    throw new ImportFileError('Файл больше 2 МБ')
  }

  const lower = filename.toLowerCase()
  const isM3u = lower.endsWith('.m3u') || lower.endsWith('.m3u8')
  const isCsv = lower.endsWith('.csv')
  if (!isCsv && !isM3u) {
    throw new ImportFileError('Поддерживаются только CSV и M3U/M3U8')
  }

  const text = decode(buffer)
  const format: ParsedImport['format'] = isM3u ? 'm3u' : 'csv'
  const parsed = isM3u ? importM3u(text) : importCsv(text)

  const seen = new Set<string>()
  const rows = parsed
    .filter((row) => row.title.length > 0)
    .filter((row) => {
      const key = `${row.title.toLowerCase()}|${row.artist.toLowerCase()}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, IMPORT_MAX_ROWS)

  if (rows.length === 0) {
    throw new ImportFileError('В файле не нашлось ни одного трека')
  }

  return {
    format,
    name: cleanFilename(filename) || 'Импортированный плейлист',
    rows,
    total: rows.length,
  }
}
