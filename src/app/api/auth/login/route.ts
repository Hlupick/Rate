import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createSession } from '@/lib/auth'
import { getUserByLogin } from '@/lib/queries'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const limit = rateLimit(`login:${clientIp(request)}`, 10, 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Слишком много попыток. Повторите через ${limit.retryAfter} с.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    )
  }

  let body: { login?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const login = (body.login ?? '').trim()
  const password = body.password ?? ''
  if (!login || !password) {
    return NextResponse.json({ error: 'Введите логин и пароль' }, { status: 400 })
  }

  const user = getUserByLogin(login)
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 })
  }
  if (user.isBanned) {
    return NextResponse.json({ error: 'Аккаунт заблокирован' }, { status: 403 })
  }

  await createSession(user.id)
  return NextResponse.json({ ok: true, user: { id: user.id, username: user.username } })
}
