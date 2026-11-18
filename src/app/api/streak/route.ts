import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  STREAK_GOAL_SECONDS,
  dayKey,
  getStreak,
  getUserByUsername,
  isDayKey,
  shiftDay,
} from '@/lib/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Streak for one listener. Public: `?user=<username>` returns only the streak
 * length; listening seconds for today are shared with the owner alone.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const viewer = await getCurrentUser()
  const username = url.searchParams.get('user')?.trim() ?? ''
  const dayParam = url.searchParams.get('day') ?? ''
  const today = dayKey()
  const day = isDayKey(dayParam) && dayParam >= shiftDay(today, -1) && dayParam <= shiftDay(today, 1)
    ? dayParam
    : today

  let userId: string
  let self = false

  if (username) {
    const target = getUserByUsername(username)
    if (!target) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    userId = target.id
    self = viewer?.id === target.id
  } else if (viewer) {
    userId = viewer.id
    self = true
  } else {
    return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })
  }

  const streak = getStreak(userId, day)
  return NextResponse.json({
    current: streak.current,
    best: streak.best,
    goal: STREAK_GOAL_SECONDS,
    todaySeconds: self ? streak.todaySeconds : null,
    self,
    returnsLeft: self ? streak.returnsLeft : null,
    returnsLimit: streak.returnsLimit,
    canReturn: self ? streak.canReturn : false,
    atRisk: self ? streak.atRisk : 0,
  })
}
