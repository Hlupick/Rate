import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createPlaylist, getPlaylistsByOwner } from '@/lib/queries'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ playlists: [] })
  return NextResponse.json({ playlists: getPlaylistsByOwner(user.id) })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  let body: { name?: string; description?: string | null; isPublic?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  if (body.isPublic !== undefined && typeof body.isPublic !== 'boolean') {
    return NextResponse.json({ error: 'Некорректная настройка доступа' }, { status: 400 })
  }

  const name = (body.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'Введите название' }, { status: 400 })

  const playlist = createPlaylist(
    user.id,
    name.slice(0, 80),
    body.description ? String(body.description).slice(0, 200) : null,
    { isPublic: body.isPublic !== false },
  )
  return NextResponse.json({ id: playlist.id, playlist })
}
