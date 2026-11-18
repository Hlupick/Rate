import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  STREAK_GOAL_SECONDS,
  addListeningTime,
  dayKey,
  getStreak,
  isDayKey,
  isStreakMilestone,
  shiftDay,
} from '@/lib/queries'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** A single ping covers at most one minute; the player sends a few per minute. */
const MAX_SECONDS = 60

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const limiter = rateLimit(`listen:${user.id}`, 10, 60_000)
  if (!limiter.ok) {
    return NextResponse.json(
      { ok: false },
      { status: 429, headers: { 'Retry-After': String(limiter.retryAfter) } },
    )
  }

  let body: { seconds?: number; day?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const seconds = Math.floor(Number(body.seconds))
  if (!Number.isFinite(seconds) || seconds < 1 || seconds > MAX_SECONDS) {
    return NextResponse.json({ error: 'Некорректная длительность' }, { status: 400 })
  }

  const today = dayKey()
  // The client knows its own timezone; accept its date but only around today.
  const day =
    typeof body.day === 'string' && isDayKey(body.day) && body.day >= shiftDay(today, -1) &&
    body.day <= shiftDay(today, 1)
      ? body.day
      : today

  const before = getStreak(user.id, day)
  addListeningTime(user.id, day, seconds)
  const after = getStreak(user.id, day)

  const extended =
    before.todaySeconds < STREAK_GOAL_SECONDS && after.todaySeconds >= STREAK_GOAL_SECONDS
  const milestone = extended && isStreakMilestone(after.current) ? after.current : null

  return NextResponse.json({
    ...after,
    goal: STREAK_GOAL_SECONDS,
    extended,
    milestone,
  })
}
