import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { redeemInvite } from '@/lib/queries'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const limit = rateLimit(`invite:${user.id}:${clientIp(request)}`, 10, 60 * 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Слишком много попыток. Повторите через ${Math.ceil(limit.retryAfter / 60)} мин.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    )
  }

  let body: { code?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const result = redeemInvite(user.id, body.code ?? '')
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
