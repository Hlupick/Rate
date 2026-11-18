import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { addTrackToPlaylist, createPlaylist, listTracks } from '@/lib/queries'
import { normalizeText } from '@/lib/text'
import { clientIp, rateLimit } from '@/lib/rate-limit'

type Row = { title: string; artist: string }

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

  let body: { name?: string; description?: string; rows?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const name = (body.name ?? '').trim().slice(0, 80)
  const description = (body.description ?? '').trim().slice(0, 200) || null
  if (!name) return NextResponse.json({ error: 'Введите название плейлиста' }, { status: 400 })
  if (!Array.isArray(body.rows)) {
    return NextResponse.json({ error: 'Нет списка треков' }, { status: 400 })
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

  const library = listTracks({ limit: 5000 }).map((track) => ({
    id: track.id,
    title: normalizeText(track.title),
    artist: normalizeText(track.artist),
  }))

  const exact = new Map<string, string>()
  const byTitle = new Map<string, string[]>()
  for (const track of library) {
    exact.set(`${track.title}|${track.artist}`, track.id)
    const bucket = byTitle.get(track.title) ?? []
    bucket.push(track.id)
    byTitle.set(track.title, bucket)
  }

  function findTrack(row: Row): string | null {
    const title = normalizeText(row.title)
    const artist = normalizeText(row.artist)

    if (artist) {
      const direct = exact.get(`${title}|${artist}`)
      if (direct) return direct

      const loose = library.find(
        (track) =>
          track.title === title &&
          (track.artist.includes(artist) || artist.includes(track.artist)),
      )
      if (loose) return loose.id
    }

    const candidates = byTitle.get(title) ?? []
    return candidates.length === 1 ? candidates[0] : null
  }

  const matchedIds: string[] = []
  const missing: Row[] = []
  const seen = new Set<string>()

  for (const row of rows) {
    const id = findTrack(row)
    if (!id) {
      missing.push(row)
      continue
    }
    if (!seen.has(id)) {
      seen.add(id)
      matchedIds.push(id)
    }
  }

  if (matchedIds.length === 0) {
    return NextResponse.json({
      playlistId: null,
      name,
      matched: 0,
      total: rows.length,
      missing: missing.slice(0, 500),
    })
  }

  const playlist = createPlaylist(
    user.id,
    name,
    description ?? `Импортировано ${matchedIds.length} из ${rows.length} треков.`,
  )
  for (const trackId of matchedIds) {
    addTrackToPlaylist(playlist.id, trackId, user.id)
  }

  return NextResponse.json({
    playlistId: playlist.id,
    name: playlist.name,
    matched: matchedIds.length,
    total: rows.length,
    missing: missing.slice(0, 500),
  })
}
