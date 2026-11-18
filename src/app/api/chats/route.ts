import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getTotalUnread, listChats } from '@/lib/chat'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })

  const chats = listChats(user.id)
  return NextResponse.json({
    chats,
    unread: chats.reduce((total, chat) => total + chat.unread, 0),
  })
}

export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 })
  return NextResponse.json({ unread: getTotalUnread(user.id) })
}
