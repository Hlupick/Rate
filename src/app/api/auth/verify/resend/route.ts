import { NextResponse } from 'next/server'
import { getUserByLogin } from '@/lib/queries'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { sendMail, verificationLetter } from '@/lib/mail'
import {
  CODE_TTL_MS,
  RESEND_COOLDOWN_MS,
  generateCode,
  hashCode,
} from '@/lib/verification'
import {
  getEmailVerification,
  refreshVerificationCode,
} from '@/lib/verification-queries'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const limit = rateLimit(`resend:${clientIp(request)}`, 20, 60 * 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Повторите позже.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    )
  }

  let body: { email?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const email = (body.email ?? '').trim().toLowerCase()
  const pending = getEmailVerification(email)
  if (!pending) {
    return NextResponse.json(
      { error: 'Заявка устарела. Заполните форму заново.' },
      { status: 400 },
    )
  }

  const elapsed = Date.now() - pending.createdAt
  if (elapsed < RESEND_COOLDOWN_MS) {
    return NextResponse.json(
      {
        error: `Повторно отправить можно через ${Math.ceil(
          (RESEND_COOLDOWN_MS - elapsed) / 1000,
        )} с.`,
      },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000)) } },
    )
  }

  // No more than five letters per address per day, whoever asks for them.
  const daily = rateLimit(`resend-day:${email}`, 5, 24 * 60 * 60_000)
  if (!daily.ok) {
    return NextResponse.json(
      { error: 'На этот адрес сегодня уже отправляли много кодов. Попробуйте завтра.' },
      { status: 429, headers: { 'Retry-After': String(daily.retryAfter) } },
    )
  }
  if (getUserByLogin(email)) {
    return NextResponse.json({ error: 'Этот e-mail уже занят' }, { status: 409 })
  }

  const code = generateCode()
  refreshVerificationCode(pending.id, hashCode(code), CODE_TTL_MS)
  const sent = await sendMail(verificationLetter(email, code))
  if (!sent) {
    return NextResponse.json({ error: 'Не удалось отправить письмо' }, { status: 502 })
  }

  return NextResponse.json({ ok: true, resendAfter: Math.round(RESEND_COOLDOWN_MS / 1000) })
}
