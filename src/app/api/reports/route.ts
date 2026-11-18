import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createReport, getTrack } from '@/lib/queries'
import { clientIp, rateLimit } from '@/lib/rate-limit'

const REASONS = new Set(['Копирайт', 'Спам', 'Неприемлемый контент', 'Другое'])

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const limit = rateLimit(`report:${user.id}:${clientIp(request)}`, 10, 60 * 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Слишком много жалоб. Повторите через ${Math.ceil(limit.retryAfter / 60)} мин.` },
      { status: 429 },
    )
  }

  let body: { trackId?: string; reason?: string; comment?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  if (!body.trackId || !getTrack(body.trackId)) {
    return NextResponse.json({ error: 'Трек не найден' }, { status: 404 })
  }
  if (!body.reason || !REASONS.has(body.reason)) {
    return NextResponse.json({ error: 'Выберите причину жалобы' }, { status: 400 })
  }

  createReport({
    trackId: body.trackId,
    reporterId: user.id,
    reason: body.reason,
    comment: body.comment ? String(body.comment).slice(0, 500) : null,
  })

  return NextResponse.json({ ok: true })
}
