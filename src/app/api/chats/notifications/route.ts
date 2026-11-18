import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { listNotifications } from '@/lib/chat'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ items: [], latest: 0 })

  const limiter = rateLimit(`chat-notifications:${user.id}`, 30, 60_000)
  if (!limiter.ok) {
    return NextResponse.json({ items: [], latest: 0 }, { status: 429 })
  }

  const after = Number(new URL(request.url).searchParams.get('after') ?? 0) || 0
  return NextResponse.json(listNotifications(user.id, after))
}
