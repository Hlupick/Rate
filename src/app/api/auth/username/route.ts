import { NextResponse } from 'next/server'
import { getUserByUsername } from '@/lib/queries'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { checkUsernameFormat } from '@/lib/username'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Live availability check for the registration form. Usernames are public. */
export async function GET(request: Request) {
  const limiter = rateLimit(`username-check:${clientIp(request)}`, 40, 60_000)
  if (!limiter.ok) {
    return NextResponse.json(
      { available: false, error: 'Слишком много проверок. Подождите немного.' },
      { status: 429, headers: { 'Retry-After': String(limiter.retryAfter) } },
    )
  }

  const value = new URL(request.url).searchParams.get('u') ?? ''
  const check = checkUsernameFormat(value)
  if (!check.ok) {
    return NextResponse.json({ available: false, error: check.error })
  }
  if (getUserByUsername(check.username)) {
    return NextResponse.json({ available: false, error: 'Этот ник уже занят' })
  }
  return NextResponse.json({ available: true, username: check.username })
}
