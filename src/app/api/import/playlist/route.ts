import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createMatcher } from '@/lib/matching'
import {
  addPlaylistDraft,
  addTrackToPlaylist,
  createPlaylist,
  listTracks,
} from '@/lib/queries'
import { IMPORT_MAX_ROWS } from '@/lib/import-file'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Row = { title: string; artist: string }

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const limiter = rateLimit(`import-create:${user.id}`, 10, 60 * 60_000)
  if (!limiter.ok) {
    return NextResponse.json(
      { error: 'Слишком много импортов. Повторите позже.' },
      { status: 429, headers: { 'Retry-After': String(limiter.retryAfter) } },
    )
  }

  let body: { name?: string; rows?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const name = (body.name ?? '').trim().slice(0, 80)
  if (!name) return NextResponse.json({ error: 'Введите название плейлиста' }, { status: 400 })
  if (!Array.isArray(body.rows)) {
    return NextResponse.json({ error: 'Нет списка треков' }, { status: 400 })
  }

  const rows: Row[] = (body.rows as unknown[])
    .slice(0, IMPORT_MAX_ROWS)
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
    listTracks({ limit: 5000, reviewStatus: 'approved' }).map((track) => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
    })),
  )

  const matchedIds: string[] = []
  const missing: Row[] = []
  const seen = new Set<string>()

  for (const row of rows) {
    const trackId = matcher(row)
    if (!trackId) {
      missing.push(row)
      continue
    }
    if (!seen.has(trackId)) {
      seen.add(trackId)
      matchedIds.push(trackId)
    }
  }

  const playlist = createPlaylist(
    user.id,
    name,
    `Импорт: ${matchedIds.length} из ${rows.length} треков.`,
    { source: 'file' },
  )
  for (const trackId of matchedIds) {
    addTrackToPlaylist(playlist.id, trackId, user.id)
  }
  missing.forEach((row, index) => {
    addPlaylistDraft(playlist.id, user.id, row.title, row.artist, index)
  })

  return NextResponse.json({
    playlistId: playlist.id,
    matched: matchedIds.length,
    total: rows.length,
    missing: missing.length,
  })
}
