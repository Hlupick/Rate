import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPlaylist, getPlaylistTracks, reorderPlaylist } from '@/lib/queries'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const { id } = await params
  const playlist = getPlaylist(id)
  if (!playlist) return NextResponse.json({ error: 'Плейлист не найден' }, { status: 404 })
  if (playlist.ownerId !== user.id) {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
  }

  let body: { trackIds?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  if (!Array.isArray(body.trackIds) || body.trackIds.some((value) => typeof value !== 'string')) {
    return NextResponse.json({ error: 'Неверный порядок треков' }, { status: 400 })
  }

  const existing = new Set(getPlaylistTracks(id).map((track) => track.id))
  const ordered = (body.trackIds as string[]).filter((trackId) => existing.has(trackId))
  if (ordered.length !== existing.size) {
    return NextResponse.json({ error: 'Список треков устарел' }, { status: 409 })
  }

  reorderPlaylist(id, user.id, ordered)
  return NextResponse.json({ ok: true })
}
