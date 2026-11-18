import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  addTrackToPlaylist,
  getPlaylist,
  getTrack,
  removeTrackFromPlaylist,
} from '@/lib/queries'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const { id } = await params
  const playlist = getPlaylist(id)
  if (!playlist) return NextResponse.json({ error: 'Плейлист не найден' }, { status: 404 })
  if (playlist.ownerId !== user.id) {
    return NextResponse.json({ error: 'Это чужой плейлист' }, { status: 403 })
  }

  let body: { trackId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  if (!body.trackId || !getTrack(body.trackId)) {
    return NextResponse.json({ error: 'Трек не найден' }, { status: 404 })
  }

  addTrackToPlaylist(id, body.trackId, user.id)
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const { id } = await params
  const trackId = new URL(request.url).searchParams.get('trackId')
  if (!trackId) return NextResponse.json({ error: 'Не указан трек' }, { status: 400 })

  const ok = removeTrackFromPlaylist(id, trackId, user.id)
  if (!ok) return NextResponse.json({ error: 'Не удалось убрать трек' }, { status: 400 })
  return NextResponse.json({ ok: true })
}
