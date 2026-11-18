import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { touchChatTyping } from '@/lib/chat'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const limiter = rateLimit(`chat-typing:${user.id}`, 60, 60_000)
  if (!limiter.ok) return NextResponse.json({ ok: true, skipped: true })

  const { username } = await params
  const ok = touchChatTyping(user.id, decodeURIComponent(username))
  return NextResponse.json({ ok })
}
