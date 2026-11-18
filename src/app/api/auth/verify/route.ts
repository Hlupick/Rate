import { NextResponse } from 'next/server'
import { createSession } from '@/lib/auth'
import { createUser, getUserByLogin } from '@/lib/queries'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { CODE_RE, MAX_CODE_ATTEMPTS, codeMatches } from '@/lib/verification'
import {
  bumpVerificationAttempts,
  deleteEmailVerification,
  getEmailVerification,
} from '@/lib/verification-queries'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const limit = rateLimit(`verify:${clientIp(request)}`, 30, 60 * 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Слишком много попыток. Повторите позже.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    )
  }

  let body: { email?: string; code?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const email = (body.email ?? '').trim().toLowerCase()
  const code = (body.code ?? '').trim()
  if (!email) return NextResponse.json({ error: 'Проверьте e-mail' }, { status: 400 })

  const pending = getEmailVerification(email)
  if (!pending) {
    return NextResponse.json(
      { error: 'Заявка не найдена или код устарел. Заполните форму заново.' },
      { status: 400 },
    )
  }
  if (pending.expiresAt < Date.now() || pending.attempts >= MAX_CODE_ATTEMPTS) {
    deleteEmailVerification(pending.id)
    return NextResponse.json(
      { error: 'Код истёк. Вернитесь назад и запросите новый.' },
      { status: 400 },
    )
  }
  if (!CODE_RE.test(code) || !codeMatches(code, pending.codeHash)) {
    const attempts = bumpVerificationAttempts(pending.id)
    if (attempts >= MAX_CODE_ATTEMPTS) {
      deleteEmailVerification(pending.id)
      return NextResponse.json(
        { error: 'Слишком много неверных попыток. Заполните форму заново.' },
        { status: 400 },
      )
    }
    return NextResponse.json(
      { error: `Неверный код. Осталось попыток: ${MAX_CODE_ATTEMPTS - attempts}.` },
      { status: 400 },
    )
  }

  // The address or username could have been taken while the code was travelling.
  if (getUserByLogin(pending.email) || getUserByLogin(pending.username)) {
    deleteEmailVerification(pending.id)
    return NextResponse.json(
      { error: 'Этот e-mail или имя пользователя уже заняли. Заполните форму заново.' },
      { status: 409 },
    )
  }

  const user = createUser({
    email: pending.email,
    username: pending.username,
    displayName: pending.displayName,
    passwordHash: pending.passwordHash,
  })
  deleteEmailVerification(pending.id)
  await createSession(user.id)

  return NextResponse.json({ ok: true, user: { id: user.id, username: user.username } })
}
