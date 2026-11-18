import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getTrack, recordPlay } from '@/lib/queries'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

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
