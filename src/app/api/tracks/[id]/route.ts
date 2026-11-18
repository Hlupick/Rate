import fsp from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { TRACKS_DIR } from '@/lib/db'
import { deleteTrackRow, getTrack } from '@/lib/queries'

export const runtime = 'nodejs'

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
