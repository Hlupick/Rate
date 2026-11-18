import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { removePushSubscription } from '@/lib/push'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  let body: { endpoint?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const endpoint = typeof body.endpoint === 'string' ? body.endpoint : ''
  if (!endpoint) return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })

  removePushSubscription(user.id, endpoint)
  return NextResponse.json({ ok: true })
}
