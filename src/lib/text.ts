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
