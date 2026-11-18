import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createSession } from '@/lib/auth'
import { createUser, getUserByLogin } from '@/lib/queries'
import { clientIp, rateLimit } from '@/lib/rate-limit'

const USERNAME_RE = /^[a-z0-9_]{3,24}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  const limit = rateLimit(`register:${clientIp(request)}`, 5, 60 * 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Слишком много регистраций с этого адреса. Повторите через ${limit.retryAfter} с.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    )
  }

  let body: {
    displayName?: string
    username?: string
    email?: string
    password?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const displayName = (body.displayName ?? '').trim()
  const username = (body.username ?? '').trim().toLowerCase()
  const email = (body.email ?? '').trim().toLowerCase()
  const password = body.password ?? ''

  if (displayName.length < 2) {
    return NextResponse.json({ error: 'Имя слишком короткое' }, { status: 400 })
  }
  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: 'Имя пользователя: 3–24 символа, латиница, цифры и _' },
      { status: 400 },
    )
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Проверьте e-mail' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Пароль минимум 6 символов' }, { status: 400 })
  }
  if (getUserByLogin(email)) {
    return NextResponse.json({ error: 'Этот e-mail уже занят' }, { status: 409 })
  }
  if (getUserByLogin(username)) {
    return NextResponse.json({ error: 'Такое имя пользователя уже есть' }, { status: 409 })
  }

  const user = createUser({
    email,
    username,
    displayName,
    passwordHash: bcrypt.hashSync(password, 10),
  })
  await createSession(user.id)

  return NextResponse.json({ ok: true, user: { id: user.id, username: user.username } })
}
