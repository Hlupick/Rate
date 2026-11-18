import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { savePushSubscription, type PushSubscriptionInput } from '@/lib/push'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function readSubscription(value: unknown): PushSubscriptionInput | null {
  if (!value || typeof value !== 'object') return null
  const input = value as {
    endpoint?: unknown
    keys?: { p256dh?: unknown; auth?: unknown }
  }
  if (typeof input.endpoint !== 'string' || input.endpoint.length > 2048) return null
  if (!input.endpoint.startsWith('https://')) return null
  if (!input.keys || typeof input.keys.p256dh !== 'string' || typeof input.keys.auth !== 'string') {
    return null
  }
  if (input.keys.p256dh.length > 512 || input.keys.auth.length > 256) return null
  return {
    endpoint: input.endpoint,
    keys: { p256dh: input.keys.p256dh, auth: input.keys.auth },
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const limiter = rateLimit(`push-subscribe:${user.id}`, 20, 60_000)
  if (!limiter.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Повторите позже.' },
      { status: 429, headers: { 'Retry-After': String(limiter.retryAfter) } },
    )
  }

  let body: { subscription?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const subscription = readSubscription(body.subscription)
  if (!subscription) {
    return NextResponse.json({ error: 'Некорректная подписка' }, { status: 400 })
  }

  savePushSubscription(user.id, subscription, request.headers.get('user-agent'))
  return NextResponse.json({ ok: true })
}
