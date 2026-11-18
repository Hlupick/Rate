export type ImportProvider = 'deezer'

export type ImportedPlaylist = {
  provider: ImportProvider
  sourceUrl: string
  name: string
  description: string | null
  coverUrl: string | null
  total: number
  rows: { title: string; artist: string }[]
}

export class ImportError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

const MAX_TRACKS = 500
const TIMEOUT = 9000

async function getJson<T>(url: string, headers?: Record<string, string>): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT) })
  } catch {
    throw new ImportError('network', 'Сервис не ответил вовремя. Попробуйте ещё раз.')
  }
  if (response.status === 429) {
    throw new ImportError('rate-limit', 'Слишком много запросов к сервису. Попробуйте через минуту.')
  }
  if (!response.ok) {
    throw new ImportError('http', `Сервис вернул ошибку ${response.status}.`)
  }
  return (await response.json()) as T
}

type DeezerPlaylist = {
  id: number
  title?: string
  description?: string
  picture_xl?: string
  picture_big?: string
  nb_tracks?: number
  error?: { message?: string; code?: number }
}

type DeezerTracks = {
  data?: { title?: string; artist?: { name?: string } }[]
  total?: number
  next?: string
  error?: { message?: string }
}

function deezerIdFromUrl(input: string): string | null {
  const match = input.match(/deezer\.com\/(?:[a-z]{2}\/)?playlist\/(\d+)/i)
  return match ? match[1] : null
}

async function resolveDeezerId(input: string): Promise<string> {
  const direct = deezerIdFromUrl(input)
  if (direct) return direct

  if (!/link\.deezer\.com\//i.test(input)) {
    throw new ImportError('unsupported', 'Не похоже на ссылку плейлиста Deezer.')
  }

  let response: Response
  try {
    response = await fetch(input, { redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT) })
  } catch {
    throw new ImportError('network', 'Не удалось открыть короткую ссылку Deezer.')
  }
  const fromFinal = deezerIdFromUrl(response.url)
  if (fromFinal) return fromFinal
  const html = await response.text()
  const fromHtml = html.match(/deezer\.com\/(?:[a-z]{2}\/)?playlist\/(\d+)/i)
  if (fromHtml) return fromHtml[1]
  throw new ImportError('not-found', 'Не удалось определить плейлист по короткой ссылке.')
}

async function importDeezer(input: string): Promise<ImportedPlaylist> {
  const id = await resolveDeezerId(input)
  const sourceUrl = `https://www.deezer.com/playlist/${id}`
  const meta = await getJson<DeezerPlaylist>(`https://api.deezer.com/playlist/${id}`)

  if (meta.error) {
    throw new ImportError(
      'not-found',
      meta.error.code === 800
        ? 'Плейлист Deezer не найден или удалён.'
        : meta.error.message || 'Deezer не отдал плейлист.',
    )
  }

  const rows: ImportedPlaylist['rows'] = []
  let index = 0

  while (rows.length < MAX_TRACKS) {
    const page = await getJson<DeezerTracks>(
      `https://api.deezer.com/playlist/${id}/tracks?limit=100&index=${index}`,
    )
    if (page.error) break
    const data = page.data ?? []
    if (data.length === 0) break

    for (const track of data) {
      const title = (track.title ?? '').trim()
      if (!title) continue
      rows.push({ title, artist: (track.artist?.name ?? '').trim() })
      if (rows.length >= MAX_TRACKS) break
    }

    index += data.length
    if (!page.next || index >= Number(page.total ?? 0)) break
  }

  if (rows.length === 0) {
    throw new ImportError('empty', 'В этом плейлисте Deezer нет треков.')
  }

  return {
    provider: 'deezer',
    sourceUrl,
    name: (meta.title ?? 'Плейлист Deezer').trim(),
    description: meta.description?.trim() || null,
    coverUrl: meta.picture_xl || meta.picture_big || null,
    total: rows.length,
    rows,
  }
}

export async function resolvePlaylistUrl(input: string): Promise<ImportedPlaylist> {
  const url = input.trim()
  if (!/^https?:\/\//i.test(url)) {
    throw new ImportError('invalid', 'Вставьте ссылку на плейлист Deezer.')
  }
  if (/deezer\.com/i.test(url)) return importDeezer(url)
  if (/sk-?lane\.com/i.test(url)) {
    throw new ImportError(
      'lane-file',
      'LANE не открывает плейлисты по ссылке извне. Экспортируйте плейлист в M3U, JSON или CSV и загрузите файл во вкладке «CSV / M3U / JSON».',
    )
  }
  throw new ImportError('unsupported', 'Сейчас поддерживается импорт по ссылке только из Deezer.')
}

export function providerLabel(_provider: ImportProvider): string {
  return 'Deezer'
}
