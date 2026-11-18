import { NextResponse } from 'next/server'
import { createSession, getCurrentUser } from '@/lib/auth'
import { bumpSessionVersion } from '@/lib/queries'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

/** Signs out every other device, keeping the current one signed in. */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const limiter = rateLimit(`sessions:${user.id}:${clientIp(request)}`, 10, 15 * 60_000)
  if (!limiter.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Повторите позже.' },
      { status: 429, headers: { 'Retry-After': String(limiter.retryAfter) } },
    )
  }

  bumpSessionVersion(user.id)
  await createSession(user.id)

  return NextResponse.json({ ok: true })
}
