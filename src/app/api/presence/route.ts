import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPresence, getPresenceByUsername, touchPresence } from '@/lib/presence'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const limiter = rateLimit(`presence:${user.id}`, 4, 60_000)
  if (!limiter.ok) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const lastSeenAt = touchPresence(user.id)
  return NextResponse.json({ ok: true, lastSeenAt })
}

export async function GET(request: Request) {
  const limiter = rateLimit(`presence-read:${clientIp(request)}`, 120, 60_000)
  if (!limiter.ok) {
    return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 })
  }

  const url = new URL(request.url)
  const username = url.searchParams.get('user')?.trim() ?? ''
  if (!username) {
    const viewer = await getCurrentUser()
    if (!viewer) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })
    return NextResponse.json(getPresence(viewer.id))
  }

  const presence = getPresenceByUsername(username)
  if (!presence) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
  return NextResponse.json(presence)
}
