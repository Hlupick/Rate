import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getTotalUnread } from '@/lib/chat'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ unread: 0 })
  return NextResponse.json({ unread: getTotalUnread(user.id) })
}
