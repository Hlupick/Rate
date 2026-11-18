import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createSession, getCurrentUser } from '@/lib/auth'
import { setUserPassword, getUserPasswordHash } from '@/lib/queries'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const limiter = rateLimit(`password:${user.id}:${clientIp(request)}`, 5, 15 * 60_000)
  if (!limiter.ok) {
    return NextResponse.json(
      { error: 'Слишком много попыток. Повторите позже.' },
      { status: 429, headers: { 'Retry-After': String(limiter.retryAfter) } },
    )
  }

  let body: { currentPassword?: string; newPassword?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const current = body.currentPassword ?? ''
  const next = body.newPassword ?? ''

  if (!bcrypt.compareSync(current, getUserPasswordHash(user.id) ?? '')) {
    return NextResponse.json({ error: 'Текущий пароль неверный' }, { status: 400 })
  }
  if (next.length < 8) {
    return NextResponse.json({ error: 'Новый пароль должен быть не короче 8 символов' }, { status: 400 })
  }
  if (next === current) {
    return NextResponse.json({ error: 'Новый пароль совпадает с текущим' }, { status: 400 })
  }

  setUserPassword(user.id, bcrypt.hashSync(next, 10))
  // Keep this device signed in, sign out every other session.
  await createSession(user.id)

  return NextResponse.json({ ok: true })
}
