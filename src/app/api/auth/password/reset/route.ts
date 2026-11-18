import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createSession } from '@/lib/auth'
import { getUserById, setUserPassword } from '@/lib/queries'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { CODE_RE, MAX_CODE_ATTEMPTS, codeMatches } from '@/lib/verification'
import {
  bumpResetAttempts,
  deletePasswordReset,
  getPasswordReset,
} from '@/lib/verification-queries'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const limit = rateLimit(`reset:${clientIp(request)}`, 20, 60 * 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Слишком много попыток. Повторите позже.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    )
  }

  let body: { email?: string; code?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const email = (body.email ?? '').trim().toLowerCase()
  const code = (body.code ?? '').trim()
  const password = body.password ?? ''
  if (password.length < 6) {
    return NextResponse.json({ error: 'Пароль минимум 6 символов' }, { status: 400 })
  }

  const pending = getPasswordReset(email)
  if (!pending) {
    return NextResponse.json(
      { error: 'Код не найден. Запросите новый.' },
      { status: 400 },
    )
  }
  if (pending.expiresAt < Date.now() || pending.attempts >= MAX_CODE_ATTEMPTS) {
    deletePasswordReset(pending.id)
    return NextResponse.json(
      { error: 'Код истёк. Запросите новый.' },
      { status: 400 },
    )
  }
  if (!CODE_RE.test(code) || !codeMatches(code, pending.codeHash)) {
    const attempts = bumpResetAttempts(pending.id)
    if (attempts >= MAX_CODE_ATTEMPTS) {
      deletePasswordReset(pending.id)
      return NextResponse.json(
        { error: 'Слишком много неверных попыток. Запросите новый код.' },
        { status: 400 },
      )
    }
    return NextResponse.json(
      { error: `Неверный код. Осталось попыток: ${MAX_CODE_ATTEMPTS - attempts}.` },
      { status: 400 },
    )
  }

  const user = getUserById(pending.userId)
  if (!user || user.isBanned) {
    deletePasswordReset(pending.id)
    return NextResponse.json({ error: 'Аккаунт недоступен' }, { status: 400 })
  }

  // setUserPassword bumps session_version, signing out every other device.
  setUserPassword(user.id, bcrypt.hashSync(password, 10))
  deletePasswordReset(pending.id)
  await createSession(user.id)

  return NextResponse.json({ ok: true })
}
