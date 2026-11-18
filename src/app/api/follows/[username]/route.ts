import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { setFollow } from '@/lib/social'
import { sendPushToUser } from '@/lib/push'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const limiter = rateLimit(`follow:${user.id}`, 30, 60_000)
  if (!limiter.ok) {
    return NextResponse.json(
      { error: 'Слишком много действий. Повторите позже.' },
      { status: 429, headers: { 'Retry-After': String(limiter.retryAfter) } },
    )
  }

  const { username } = await params
  let body: { follow?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const result = setFollow(user.id, decodeURIComponent(username), body.follow !== false)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  if (result.created && body.follow !== false) {
    const mutual = result.relation === 'friends'
    void sendPushToUser(result.targetId, 'social', {
      title: mutual ? 'Взаимная подписка' : 'Новая подписка',
      body: mutual
        ? `${user.displayName} тоже подписался на вас`
        : `${user.displayName} подписался на вас`,
      url: `/profile/${encodeURIComponent(user.username)}`,
      tag: `rate-follow-${user.username}`,
    }).catch(() => undefined)
  }

  return NextResponse.json({
    relation: result.relation,
    stats: result.stats,
  })
}
