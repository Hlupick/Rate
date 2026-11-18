import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { setChatMuted } from '@/lib/chat'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const limiter = rateLimit(`chat-mute:${user.id}`, 30, 60_000)
  if (!limiter.ok) {
    return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 })
  }

  let body: { muted?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const { username } = await params
  const result = setChatMuted(user.id, decodeURIComponent(username), body.muted !== false)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ ok: true, muted: result.muted })
}
