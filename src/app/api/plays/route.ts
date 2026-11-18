import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getTrack, recordPlay } from '@/lib/queries'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  // A single listener cannot play more than a few tracks per minute; this also
  // stops scripted play-count inflation. recordPlay dedupes per track as well.
  const limiter = rateLimit(`play:${user.id}`, 120, 60_000)
  if (!limiter.ok) {
    return NextResponse.json(
      { ok: false },
      { status: 429, headers: { 'Retry-After': String(limiter.retryAfter) } },
    )
  }

  let body: { trackId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  if (!body.trackId || !getTrack(body.trackId)) {
    return NextResponse.json({ ok: false }, { status: 404 })
  }

  recordPlay(user.id, body.trackId)
  return NextResponse.json({ ok: true })
}
