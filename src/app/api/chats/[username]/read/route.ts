import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { markChatRead } from '@/lib/chat'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const { username } = await params
  const unread = markChatRead(user.id, decodeURIComponent(username))
  return NextResponse.json({ unread })
}
