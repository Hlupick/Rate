import { NextResponse } from 'next/server'
import { getUserByEmail } from '@/lib/queries'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { isMailConfigured, passwordResetLetter, sendMail } from '@/lib/mail'
import { CODE_TTL_MS, generateCode, hashCode } from '@/lib/verification'
import { savePasswordReset } from '@/lib/verification-queries'

export const runtime = 'nodejs'

const GENERIC = {
  ok: true,
  message: 'Если такой адрес есть в Rate, мы отправили на него код.',
}

export async function POST(request: Request) {
  if (!isMailConfigured()) {
    return NextResponse.json(
      { error: 'Восстановление пароля пока недоступно. Напишите администратору.' },
      { status: 503 },
    )
  }

  const ipLimit = rateLimit(`reset-request:${clientIp(request)}`, 10, 60 * 60_000)
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Повторите позже.' },
      { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfter) } },
    )
  }

  let body: { email?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const email = (body.email ?? '').trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'Введите e-mail' }, { status: 400 })

  const emailLimit = rateLimit(`reset-email:${email}`, 3, 60 * 60_000)
  if (!emailLimit.ok) {
    return NextResponse.json(
      { error: 'Код уже отправляли. Подождите немного и попробуйте снова.' },
      { status: 429, headers: { 'Retry-After': String(emailLimit.retryAfter) } },
    )
  }

  const user = getUserByEmail(email)
  // Always the same answer: the form must not reveal which addresses exist.
  if (!user || user.isBanned) return NextResponse.json(GENERIC)

  const code = generateCode()
  savePasswordReset({
    userId: user.id,
    email: user.email,
    codeHash: hashCode(code),
    ip: clientIp(request),
    ttlMs: CODE_TTL_MS,
  })
  const sent = await sendMail(passwordResetLetter(user.email, code))
  if (!sent) {
    return NextResponse.json({ error: 'Не удалось отправить письмо' }, { status: 502 })
  }

  return NextResponse.json(GENERIC)
}
