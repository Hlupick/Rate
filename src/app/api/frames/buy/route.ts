import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { buyFrame } from '@/lib/frames'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const limiter = rateLimit(`buy-frame:${user.id}`, 10, 60_000)
  if (!limiter.ok) {
    return NextResponse.json(
      { error: 'Слишком много попыток. Повторите через минуту.' },
      { status: 429, headers: { 'Retry-After': String(limiter.retryAfter) } },
    )
  }

  let body: { frame?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const result = buyFrame(user.id, typeof body.frame === 'string' ? body.frame : '')
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, points: result.points, owned: result.owned },
      { status: 400 },
    )
  }

  return NextResponse.json({
    ok: true,
    frame: result.frame,
    points: result.points,
    owned: result.owned,
  })
}
