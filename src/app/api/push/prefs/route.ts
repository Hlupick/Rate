import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPushPrefs, setPushPrefs } from '@/lib/push'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })
  return NextResponse.json(getPushPrefs(user.id))
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  let body: { messages?: boolean; social?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  return NextResponse.json(
    setPushPrefs(user.id, {
      messages: typeof body.messages === 'boolean' ? body.messages : undefined,
      social: typeof body.social === 'boolean' ? body.social : undefined,
    }),
  )
}
