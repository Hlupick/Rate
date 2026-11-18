import fsp from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { TRACKS_DIR } from '@/lib/db'
import { deleteTrackRow, getTrack, updateTrack } from '@/lib/queries'

export const runtime = 'nodejs'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const { id } = await params
  const track = getTrack(id)
  if (!track) return NextResponse.json({ error: 'Трек не найден' }, { status: 404 })
  if (track.uploaderId !== user.id) {
    return NextResponse.json({ error: 'Изменять трек может только автор загрузки' }, { status: 403 })
  }

  let body: { title?: string; artist?: string; album?: string | null; genre?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const title = body.title === undefined ? undefined : String(body.title).trim().slice(0, 120)
  const artist = body.artist === undefined ? undefined : String(body.artist).trim().slice(0, 80)
  const album =
    body.album === undefined ? undefined : String(body.album).trim().slice(0, 120) || null
  const genre =
    body.genre === undefined ? undefined : String(body.genre).trim().slice(0, 40) || null

  if (title !== undefined && !title) {
    return NextResponse.json({ error: 'Название не может быть пустым' }, { status: 400 })
  }
  if (artist !== undefined && !artist) {
    return NextResponse.json({ error: 'Исполнитель не может быть пустым' }, { status: 400 })
  }

  const ok = updateTrack(id, user.id, { title, artist, album, genre })
  if (!ok) return NextResponse.json({ error: 'Не удалось сохранить' }, { status: 400 })

  return NextResponse.json({ track: getTrack(id, user.id) })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const { id } = await params
  const track = getTrack(id)
  if (!track) return NextResponse.json({ error: 'Трек не найден' }, { status: 404 })
  if (track.uploaderId !== user.id) {
    return NextResponse.json({ error: 'Удалять трек может только автор загрузки' }, { status: 403 })
  }

  const removed = deleteTrackRow(id, user.id)
  if (!removed) return NextResponse.json({ error: 'Не удалось удалить' }, { status: 400 })

  await fsp.unlink(path.join(TRACKS_DIR, removed.fileName)).catch(() => undefined)

  return NextResponse.json({ ok: true })
}
