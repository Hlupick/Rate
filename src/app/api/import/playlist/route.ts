import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  addPlaylistDraft,
  addTrackToPlaylist,
  createPlaylist,
  findPlaylistBySource,
  listTracks,
} from '@/lib/queries'
import { createMatcher } from '@/lib/matching'
import { downloadCover, isAllowedCoverUrl } from '@/lib/storage'
import { clientIp, rateLimit } from '@/lib/rate-limit'

type Row = { title: string; artist: string }
const PROVIDERS = new Set(['spotify', 'deezer'])

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const limit = rateLimit(`import:${user.id}:${clientIp(request)}`, 10, 60 * 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Слишком много импортов. Повторите через ${Math.ceil(limit.retryAfter / 60)} мин.` },
      { status: 429 },
    )
  }

  let body: {
    name?: string
    description?: string
    rows?: unknown
    sourceUrl?: string
    source?: string
    coverUrl?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const name = (body.name ?? '').trim().slice(0, 80)
  const description = (body.description ?? '').trim().slice(0, 200) || null
  const sourceUrl = (body.sourceUrl ?? '').trim().slice(0, 500) || null
  const source =
    body.source && PROVIDERS.has(body.source) ? (body.source as 'spotify' | 'deezer') : null
  const coverUrl = (body.coverUrl ?? '').trim().slice(0, 1000) || null

  if (!name) return NextResponse.json({ error: 'Введите название плейлиста' }, { status: 400 })
  if (!Array.isArray(body.rows)) {
    return NextResponse.json({ error: 'Нет списка треков' }, { status: 400 })
  }
  if (sourceUrl && !source) {
    return NextResponse.json({ error: 'Неизвестный источник плейлиста' }, { status: 400 })
  }
  if (sourceUrl) {
    const existing = findPlaylistBySource(user.id, sourceUrl)
    if (existing) {
      return NextResponse.json(
        { error: 'Этот плейлист уже импортирован', playlistId: existing.id },
        { status: 409 },
      )
    }
  }

  const rows: Row[] = (body.rows as unknown[])
    .slice(0, 2000)
    .map((item) => {
      const row = item as { title?: unknown; artist?: unknown }
      return {
        title: typeof row.title === 'string' ? row.title.trim().slice(0, 200) : '',
        artist: typeof row.artist === 'string' ? row.artist.trim().slice(0, 200) : '',
      }
    })
    .filter((row) => row.title.length > 0)

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Не удалось распознать ни одного трека' }, { status: 400 })
  }

  const matcher = createMatcher(
    listTracks({ limit: 5000 }).map((track) => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
    })),
  )

  const matchedIds: string[] = []
  const missing: Row[] = []
  const seen = new Set<string>()

  for (const row of rows) {
    const id = matcher(row)
    if (!id) {
      missing.push(row)
      continue
    }
    if (!seen.has(id)) {
      seen.add(id)
      matchedIds.push(id)
    }
  }

  const cover = coverUrl && isAllowedCoverUrl(coverUrl) ? await downloadCover(coverUrl) : null

  const playlist = createPlaylist(
    user.id,
    name,
    description ?? `Импорт: ${matchedIds.length} из ${rows.length} треков.`,
    { sourceUrl, source, cover },
  )
  for (const trackId of matchedIds) {
    addTrackToPlaylist(playlist.id, trackId, user.id)
  }
  missing.forEach((row, index) => {
    addPlaylistDraft(playlist.id, user.id, row.title, row.artist, index)
  })

  return NextResponse.json({
    playlistId: playlist.id,
    name: playlist.name,
    matched: matchedIds.length,
    total: rows.length,
    missing: missing.slice(0, 500),
  })
}
