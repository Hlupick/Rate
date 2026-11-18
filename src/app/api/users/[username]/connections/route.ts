import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUserByUsername } from '@/lib/queries'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { listConnections, type ConnectionTab } from '@/lib/social'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TABS: ConnectionTab[] = ['friends', 'followers', 'following']

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const limiter = rateLimit(`connections:${clientIp(request)}`, 60, 60_000)
  if (!limiter.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Повторите позже.' },
      { status: 429, headers: { 'Retry-After': String(limiter.retryAfter) } },
    )
  }

  const { username } = await params
  const target = getUserByUsername(decodeURIComponent(username))
  if (!target) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })

  const url = new URL(request.url)
  const tabParam = url.searchParams.get('tab') ?? 'friends'
  const tab = TABS.includes(tabParam as ConnectionTab)
    ? (tabParam as ConnectionTab)
    : 'friends'
  const offset = Math.max(0, Number(url.searchParams.get('offset') ?? 0) || 0)
  const limit = Math.max(1, Math.min(Number(url.searchParams.get('limit') ?? 40) || 40, 80))

  const viewer = await getCurrentUser()
  const result = listConnections(target.id, tab, viewer?.id ?? null, limit, offset)

  return NextResponse.json({
    tab,
    total: result.total,
    items: result.items,
    nextOffset: offset + result.items.length < result.total ? offset + result.items.length : null,
  })
}
