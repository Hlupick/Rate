import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  STREAK_GOAL_SECONDS,
  claimStreakReturn,
  dayKey,
  isDayKey,
  shiftDay,
} from '@/lib/queries'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Saves yesterday's missed streak day with one of the monthly returns. */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const limiter = rateLimit(`streak-return:${user.id}`, 10, 60_000)
  if (!limiter.ok) {
    return NextResponse.json(
      { error: 'Слишком много попыток. Повторите позже.' },
      { status: 429, headers: { 'Retry-After': String(limiter.retryAfter) } },
    )
  }

  let body: { day?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const today = dayKey()
  // The browser knows its own midnight; accept its date but only around today.
  const day =
    typeof body.day === 'string' && isDayKey(body.day) && body.day >= shiftDay(today, -1) &&
    body.day <= shiftDay(today, 1)
      ? body.day
      : today

  const result = claimStreakReturn(user.id, day)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    current: result.streak.current,
    best: result.streak.best,
    goal: STREAK_GOAL_SECONDS,
    todaySeconds: result.streak.todaySeconds,
    self: true,
    returnsLeft: result.streak.returnsLeft,
    returnsLimit: result.streak.returnsLimit,
    canReturn: result.streak.canReturn,
    atRisk: result.streak.atRisk,
  })
}
