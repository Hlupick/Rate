import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getTrack, toggleLike } from '@/lib/queries'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  let body: { trackId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const trackId = body.trackId
  const track = trackId ? getTrack(trackId) : null
  if (
    !track ||
    (track.reviewStatus !== 'approved' &&
      track.uploaderId !== user.id &&
      !user.isModerator)
  ) {
    return NextResponse.json({ error: 'Трек не найден' }, { status: 404 })
  }

  const liked = toggleLike(user.id, track.id)
  return NextResponse.json({ liked })
}
