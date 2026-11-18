import { normalizeText } from './text'

export type ImportProvider = 'spotify' | 'deezer'

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

/* --------------------------------- Deezer --------------------------------- */

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

/* -------------------------------- Spotify --------------------------------- */

type SpotifyToken = { access_token?: string; expires_in?: number; error?: string }
type SpotifyPlaylist = {
  name?: string
  description?: string
  images?: { url?: string }[]
  tracks?: { total?: number }
  error?: { message?: string; status?: number }
}
type SpotifyTracks = {
  items?: {
    track?: {
      name?: string
      type?: string
      is_local?: boolean
      artists?: { name?: string }[]
    } | null
  }[]
  next?: string | null
  error?: { message?: string; status?: number }
}

let spotifyToken: { value: string; expiresAt: number } | null = null

function spotifyCredentials(): { id: string; secret: string } {
  const id = process.env.SPOTIFY_CLIENT_ID?.trim()
  const secret = process.env.SPOTIFY_CLIENT_SECRET?.trim()
  if (!id || !secret) {
    throw new ImportError(
      'not-configured',
      'Импорт Spotify не настроен: добавьте SPOTIFY_CLIENT_ID и SPOTIFY_CLIENT_SECRET.',
    )
  }
  return { id, secret }
}

async function getSpotifyToken(force = false): Promise<string> {
  if (!force && spotifyToken && spotifyToken.expiresAt > Date.now() + 30_000) {
    return spotifyToken.value
  }
  const { id, secret } = spotifyCredentials()
  const auth = Buffer.from(`${id}:${secret}`).toString('base64')

  let response: Response
  try {
    response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(TIMEOUT),
    })
  } catch {
    throw new ImportError('network', 'Не удалось получить токен Spotify.')
  }

  const data = (await response.json().catch(() => ({}))) as SpotifyToken
  if (!response.ok || !data.access_token) {
    throw new ImportError('spotify-auth', 'Spotify отклонил ключи приложения.')
  }

  spotifyToken = {
    value: data.access_token,
    expiresAt: Date.now() + Math.max(60, Number(data.expires_in ?? 3600) - 60) * 1000,
  }
  return spotifyToken.value
}

function spotifyIdFromUrl(input: string): string | null {
  const web = input.match(/open\.spotify\.com\/(?:int-[a-z]+\/)?playlist\/([A-Za-z0-9]+)/i)
  if (web) return web[1]
  const uri = input.match(/spotify:playlist:([A-Za-z0-9]+)/i)
  return uri ? uri[1] : null
}

async function spotifyRequest<T>(path: string): Promise<T> {
  let token = await getSpotifyToken()
  let response = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(TIMEOUT),
  })

  if (response.status === 401) {
    token = await getSpotifyToken(true)
    response = await fetch(`https://api.spotify.com/v1${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT),
    })
  }

  if (response.status === 404) {
    throw new ImportError(
      'not-found',
      'Плейлист не найден или приватный. Приватные плейлисты требуют входа в Spotify.',
    )
  }
  if (response.status === 429) {
    throw new ImportError('rate-limit', 'Spotify временно ограничил запросы. Попробуйте позже.')
  }
  if (!response.ok) {
    throw new ImportError('http', `Spotify вернул ошибку ${response.status}.`)
  }
  return (await response.json()) as T
}

async function importSpotify(input: string): Promise<ImportedPlaylist> {
  const id = spotifyIdFromUrl(input)
  if (!id) throw new ImportError('unsupported', 'Не похоже на ссылку плейлиста Spotify.')

  const meta = await spotifyRequest<SpotifyPlaylist>(`/playlists/${id}`)
  const rows: ImportedPlaylist['rows'] = []
  const seen = new Set<string>()
  let offset = 0

  while (rows.length < MAX_TRACKS) {
    const page = await spotifyRequest<SpotifyTracks>(
      `/playlists/${id}/tracks?limit=100&offset=${offset}`,
    )
    const items = page.items ?? []
    if (items.length === 0) break

    for (const item of items) {
      const track = item.track
      if (!track || track.is_local || (track.type && track.type !== 'track')) continue
      const title = (track.name ?? '').trim()
      if (!title) continue
      const artist = (track.artists ?? []).map((a) => a.name).filter(Boolean).join(', ')
      const key = `${normalizeText(title)}|${normalizeText(artist)}`
      if (seen.has(key)) continue
      seen.add(key)
      rows.push({ title, artist })
      if (rows.length >= MAX_TRACKS) break
    }

    offset += items.length
    if (!page.next) break
  }

  if (rows.length === 0) {
    throw new ImportError('empty', 'В этом плейлисте Spotify нет доступных треков.')
  }

  return {
    provider: 'spotify',
    sourceUrl: `https://open.spotify.com/playlist/${id}`,
    name: (meta.name ?? 'Плейлист Spotify').trim(),
    description: meta.description?.trim() || null,
    coverUrl: meta.images?.[0]?.url ?? null,
    total: rows.length,
    rows,
  }
}

/* -------------------------------- Facade ---------------------------------- */

export async function resolvePlaylistUrl(input: string): Promise<ImportedPlaylist> {
  const url = input.trim()
  if (!/^https?:\/\//i.test(url) && !/^spotify:playlist:/i.test(url)) {
    throw new ImportError('invalid', 'Вставьте ссылку на плейлист Spotify или Deezer.')
  }

  if (/spotify\.com|spotify:playlist:/i.test(url)) return importSpotify(url)
  if (/deezer\.com/i.test(url)) return importDeezer(url)

  throw new ImportError('unsupported', 'Поддерживаются только Spotify и Deezer.')
}

export function providerLabel(provider: ImportProvider): string {
  return provider === 'spotify' ? 'Spotify' : 'Deezer'
}
