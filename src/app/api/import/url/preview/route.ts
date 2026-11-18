import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { findPlaylistBySource } from '@/lib/queries'
import { ImportError, resolvePlaylistUrl } from '@/lib/importers'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const limit = rateLimit(`import-url:${user.id}:${clientIp(request)}`, 20, 60 * 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Слишком много проверок. Повторите через ${Math.ceil(limit.retryAfter / 60)} мин.` },
      { status: 429 },
    )
  }

  let body: { url?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const url = (body.url ?? '').trim().slice(0, 500)
  if (!url) return NextResponse.json({ error: 'Вставьте ссылку' }, { status: 400 })

  try {
    const playlist = await resolvePlaylistUrl(url)
    const existing = findPlaylistBySource(user.id, playlist.sourceUrl)

    return NextResponse.json({
      ...playlist,
      existingPlaylistId: existing?.id ?? null,
    })
  } catch (error) {
    if (error instanceof ImportError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Не удалось прочитать плейлист. Попробуйте другую ссылку.' },
      { status: 500 },
    )
  }
}
