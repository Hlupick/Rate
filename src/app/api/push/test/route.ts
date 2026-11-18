import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sendPushToUser } from '@/lib/push'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const limiter = rateLimit(`push-test:${user.id}`, 5, 60_000)
  if (!limiter.ok) {
    return NextResponse.json(
      { error: 'Слишком много тестов. Подождите минуту.' },
      { status: 429, headers: { 'Retry-After': String(limiter.retryAfter) } },
    )
  }

  const sent = await sendPushToUser(
    user.id,
    'messages',
    {
      title: 'Rate',
      body: 'Push-уведомления работают. Новые сообщения придут сюда.',
      url: '/settings',
      tag: 'rate-test',
    },
    { ignorePrefs: true },
  )

  if (sent === 0) {
    return NextResponse.json(
      { error: 'Нет активной подписки на этом устройстве' },
      { status: 400 },
    )
  }
  return NextResponse.json({ ok: true, sent })
}
